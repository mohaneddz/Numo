/**
 * Deterministic pseudo-random helpers.
 *
 * Exercise option order must be shuffled (a correct answer that is always the
 * first button teaches button position, not language) but it must also be stable
 * across re-renders, or the options reshuffle under the learner's cursor. Seeding
 * from the task identity gives both properties.
 */

/** FNV-1a: small, fast, well-distributed string hash. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32 PRNG. Returns a function producing values in [0, 1). */
export function createRandom(seed: number | string): () => number {
  let state = (typeof seed === 'string' ? hashString(seed) : seed) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle using a seeded generator. Does not mutate the input. */
export function seededShuffle<T>(items: readonly T[], seed: number | string): T[] {
  const random = createRandom(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Picks `count` items without replacement, deterministically. */
export function seededSample<T>(items: readonly T[], count: number, seed: number | string): T[] {
  if (count >= items.length) return seededShuffle(items, seed);
  return seededShuffle(items, seed).slice(0, Math.max(0, count));
}
