import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type LimitResult = { success: boolean; reset: number };
type Limiter = { limit(id: string): Promise<LimitResult> };

type MemoryBucket = {
  hits: number[];
};

class InMemorySlidingWindowLimiter implements Limiter {
  private readonly buckets = new Map<string, MemoryBucket>();

  constructor(
    private readonly maxHits: number,
    private readonly windowMs: number,
    private readonly prefix: string,
  ) {}

  async limit(id: string): Promise<LimitResult> {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const key = `${this.prefix}:${id}`;
    const bucket = this.buckets.get(key) ?? { hits: [] };
    bucket.hits = bucket.hits.filter((ts) => ts > cutoff);

    const oldest = bucket.hits[0];
    const reset = oldest ? oldest + this.windowMs : now + this.windowMs;
    const success = bucket.hits.length < this.maxHits;

    if (success) {
      bucket.hits.push(now);
      this.buckets.set(key, bucket);
    } else if (bucket.hits.length === 0) {
      this.buckets.delete(key);
    }

    this.prune(now);
    return { success, reset };
  }

  private prune(now: number) {
    if (this.buckets.size < 1000) return;
    const cutoff = now - this.windowMs;
    for (const [key, bucket] of this.buckets.entries()) {
      bucket.hits = bucket.hits.filter((ts) => ts > cutoff);
      if (bucket.hits.length === 0) this.buckets.delete(key);
      if (this.buckets.size < 800) break;
    }
  }
}

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

let _ai: Ratelimit | null = null;
let _checkout: Ratelimit | null = null;
let _demoPatient: Ratelimit | null = null;
let _memoryAi: InMemorySlidingWindowLimiter | null = null;
let _memoryCheckout: InMemorySlidingWindowLimiter | null = null;
let _memoryDemoPatient: InMemorySlidingWindowLimiter | null = null;

export function getAiActionLimiter(): Limiter {
  if (_ai) return _ai;
  const redis = getRedis();
  if (!redis) {
    _memoryAi ??= new InMemorySlidingWindowLimiter(30, 60_000, "ratelimit:ai:memory");
    return _memoryAi;
  }
  _ai = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    analytics: true,
    prefix: "ratelimit:ai",
  });
  return _ai;
}

export function getCheckoutLimiter(): Limiter {
  if (_checkout) return _checkout;
  const redis = getRedis();
  if (!redis) {
    _memoryCheckout ??= new InMemorySlidingWindowLimiter(5, 5 * 60_000, "ratelimit:checkout:memory");
    return _memoryCheckout;
  }
  _checkout = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "5 m"),
    prefix: "ratelimit:checkout",
  });
  return _checkout;
}

/** Anonymous public demo — keyed per IP. Redis is preferred; memory fallback protects single-node/local deployments. */
export function getDemoPatientLimiter(): Limiter {
  if (_demoPatient) return _demoPatient;
  const redis = getRedis();
  if (!redis) {
    _memoryDemoPatient ??= new InMemorySlidingWindowLimiter(
      15,
      10 * 60_000,
      "ratelimit:demo-patient:memory",
    );
    return _memoryDemoPatient;
  }
  _demoPatient = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(15, "10 m"),
    analytics: true,
    prefix: "ratelimit:demo-patient",
  });
  return _demoPatient;
}

export class RateLimitError extends Error {
  retryAfterMs: number;
  constructor(message: string, retryAfterMs = 60_000) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export async function enforceAiLimit(identifier: string | null | undefined): Promise<void> {
  const limiter = getAiActionLimiter();
  const id = identifier && identifier.length > 0 ? identifier : "anon";
  const { success, reset } = await limiter.limit(id);
  if (!success) {
    const retryAfterMs = Math.max(0, reset - Date.now());
    throw new RateLimitError(
      "You're going a little fast — please wait a moment before trying again.",
      retryAfterMs
    );
  }
}

export async function enforceDemoPatientLimit(ipKey: string): Promise<void> {
  const limiter = getDemoPatientLimiter();
  const id = ipKey && ipKey.length > 0 ? `demo:${ipKey}` : "demo:unknown";
  const { success, reset } = await limiter.limit(id);
  if (!success) {
    const retryAfterMs = Math.max(0, reset - Date.now());
    throw new RateLimitError(
      "Demo usage limit reached — please wait or create a free account for full access.",
      retryAfterMs
    );
  }
}

export async function enforceCheckoutLimit(identifier: string | null | undefined): Promise<void> {
  const limiter = getCheckoutLimiter();
  const id = identifier && identifier.length > 0 ? identifier : "anon";
  const { success, reset } = await limiter.limit(id);
  if (!success) {
    const retryAfterMs = Math.max(0, reset - Date.now());
    throw new RateLimitError(
      "Too many checkout attempts. Please wait a few minutes before trying again.",
      retryAfterMs
    );
  }
}
