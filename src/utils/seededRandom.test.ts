import { describe, expect, it } from 'vitest';
import { createRandom, hashString, seededSample, seededShuffle } from './seededRandom';

describe('hashString', () => {
  it('is stable for the same input', () => {
    expect(hashString('casa')).toBe(hashString('casa'));
  });

  it('separates inputs that differ by one character', () => {
    expect(hashString('casa')).not.toBe(hashString('cosa'));
  });

  it('handles an empty string without throwing', () => {
    expect(Number.isFinite(hashString(''))).toBe(true);
  });

  it('handles non-Latin scripts', () => {
    expect(hashString('你好')).not.toBe(hashString('您好'));
  });
});

describe('createRandom', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRandom('seed');
    const b = createRandom('seed');
    const sequence = (random: () => number) => [random(), random(), random()];
    expect(sequence(a)).toEqual(sequence(b));
  });

  it('produces different sequences for different seeds', () => {
    expect(createRandom('a')()).not.toBe(createRandom('b')());
  });

  it('stays within [0, 1)', () => {
    const random = createRandom('range');
    for (let index = 0; index < 500; index += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('accepts a numeric seed as well as a string', () => {
    expect(createRandom(42)()).toBe(createRandom(42)());
  });
});

describe('seededShuffle', () => {
  const items = ['a', 'b', 'c', 'd', 'e', 'f'];

  it('is stable for a seed, which is the whole point', () => {
    // Options that reshuffle between renders move under the learner's cursor.
    expect(seededShuffle(items, 'x')).toEqual(seededShuffle(items, 'x'));
  });

  it('orders differently for different seeds', () => {
    expect(seededShuffle(items, 'x')).not.toEqual(seededShuffle(items, 'y'));
  });

  it('keeps every element exactly once', () => {
    expect([...seededShuffle(items, 'x')].sort()).toEqual([...items].sort());
  });

  it('does not mutate the input', () => {
    const original = [...items];
    seededShuffle(items, 'x');
    expect(items).toEqual(original);
  });

  it('handles empty and single-element inputs', () => {
    expect(seededShuffle([], 'x')).toEqual([]);
    expect(seededShuffle(['only'], 'x')).toEqual(['only']);
  });

  it('actually reorders rather than returning the input order', () => {
    const long = Array.from({ length: 30 }, (_, index) => index);
    expect(seededShuffle(long, 'reorder')).not.toEqual(long);
  });
});

describe('seededSample', () => {
  const items = ['a', 'b', 'c', 'd', 'e'];

  it('takes the requested number of items', () => {
    expect(seededSample(items, 3, 'x')).toHaveLength(3);
  });

  it('never repeats an item', () => {
    const sample = seededSample(items, 4, 'x');
    expect(new Set(sample).size).toBe(4);
  });

  it('returns everything when asked for more than there is', () => {
    expect(seededSample(items, 99, 'x')).toHaveLength(items.length);
  });

  it('returns nothing for a non-positive count', () => {
    expect(seededSample(items, 0, 'x')).toEqual([]);
    expect(seededSample(items, -3, 'x')).toEqual([]);
  });

  it('is stable for a seed', () => {
    expect(seededSample(items, 3, 'x')).toEqual(seededSample(items, 3, 'x'));
  });
});
