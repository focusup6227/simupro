/**
 * Deterministic seeded 1D Perlin noise.
 *
 * Used by the capnography engine to add a small amount of high-frequency
 * "sensor fuzz" to the rendered waveform — without it the trace looks like a
 * math drawing; with it, like a medical device. Output is in roughly
 * `[-1, 1]` (theoretically `±sqrt(2)/2`); callers scale by an mmHg amplitude.
 *
 * The permutation table is built from a small linear-congruential PRNG so the
 * noise is reproducible across reloads, workers, and SSR. The default seed is
 * arbitrary; pass a different seed for independent streams (e.g. SpO2 pleth).
 */

const DEFAULT_SEED = 0x9e3779b9;
const TABLE_SIZE = 256;

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function buildPermutation(seed: number): Uint8Array {
  const rng = lcg(seed);
  const p = new Uint8Array(TABLE_SIZE);
  for (let i = 0; i < TABLE_SIZE; i++) p[i] = i;
  for (let i = TABLE_SIZE - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = p[i]!;
    p[i] = p[j]!;
    p[j] = tmp;
  }
  const doubled = new Uint8Array(TABLE_SIZE * 2);
  doubled.set(p, 0);
  doubled.set(p, TABLE_SIZE);
  return doubled;
}

const DEFAULT_PERM = buildPermutation(DEFAULT_SEED);

/** Quintic ease curve for smooth Perlin interpolation. */
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function grad1(hash: number, x: number): number {
  return (hash & 1) === 0 ? x : -x;
}

/**
 * Sample 1D Perlin noise at `x`. Output range is approximately `[-1, 1]`.
 * Pass a custom permutation (from {@link makePerlin1dPermutation}) to use a
 * non-default seed.
 */
export function perlin1d(x: number, perm: Uint8Array = DEFAULT_PERM): number {
  const xi = Math.floor(x) & (TABLE_SIZE - 1);
  const xf = x - Math.floor(x);
  const u = fade(xf);
  const a = perm[xi]!;
  const b = perm[xi + 1]!;
  return lerp(grad1(a, xf), grad1(b, xf - 1), u);
}

/** Build a permutation table for an independent noise stream. */
export function makePerlin1dPermutation(seed: number): Uint8Array {
  return buildPermutation(seed >>> 0);
}
