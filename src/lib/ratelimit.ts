import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

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

export function getAiActionLimiter(): Ratelimit | null {
  if (_ai) return _ai;
  const redis = getRedis();
  if (!redis) return null;
  _ai = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    analytics: true,
    prefix: "ratelimit:ai",
  });
  return _ai;
}

export function getCheckoutLimiter(): Ratelimit | null {
  if (_checkout) return _checkout;
  const redis = getRedis();
  if (!redis) return null;
  _checkout = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "5 m"),
    prefix: "ratelimit:checkout",
  });
  return _checkout;
}

/** Anonymous public demo — keyed per IP when Redis is configured. */
export function getDemoPatientLimiter(): Ratelimit | null {
  if (_demoPatient) return _demoPatient;
  const redis = getRedis();
  if (!redis) return null;
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
  if (!limiter) return;
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
  if (!limiter) return;
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
  if (!limiter) return;
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
