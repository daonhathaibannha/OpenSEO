// Deterministic pseudo-randomness for mock SEO data: the same input (a
// keyword, domain, url, ...) always produces the same synthetic output, so
// results look stable across re-renders/refreshes instead of flickering.

/** djb2 string hash, folded into a 32-bit unsigned seed. */
export function hashSeed(...parts: (string | number)[]): number {
  const joined = parts.join("::").toLowerCase();
  let hash = 5381;
  for (let i = 0; i < joined.length; i++) {
    hash = (hash * 33) ^ joined.charCodeAt(i);
  }
  return hash >>> 0;
}

/** mulberry32: small, fast, decent-quality seeded PRNG returning [0, 1). */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

export function randFloat(
  rand: () => number,
  min: number,
  max: number,
  decimals = 2,
): number {
  const value = rand() * (max - min) + min;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[randInt(rand, 0, items.length - 1)];
}

export function weightedBool(rand: () => number, probability: number): boolean {
  return rand() < probability;
}
