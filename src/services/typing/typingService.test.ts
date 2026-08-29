import { describe, expect, it } from 'vitest';
import {
  buildTestWords,
  computeAccuracy,
  computeConsistency,
  computeRawWpm,
  computeWpm,
  rankProblemCharacters,
  summarizeRun,
  type TypingSample,
  type TypingTestConfig,
} from './typingService';

const baseConfig: TypingTestConfig = {
  mode: 'words',
  amount: 25,
  languageCode: 'es',
  useOwnVocabulary: false,
  includePunctuation: false,
  includeNumbers: false,
};

const sample = (second: number, rawWpm: number): TypingSample => ({
  second,
  rawWpm,
  wpm: rawWpm,
  errors: 0,
});

describe('buildTestWords', () => {
  it('returns exactly the requested word count in words mode', () => {
    expect(buildTestWords(baseConfig, { learnerWords: [] }, 'seed').length).toBe(25);
  });

  it('is deterministic for a seed and varies across seeds', () => {
    const a = buildTestWords(baseConfig, { learnerWords: [] }, 'seed-a');
    const b = buildTestWords(baseConfig, { learnerWords: [] }, 'seed-a');
    const c = buildTestWords(baseConfig, { learnerWords: [] }, 'seed-b');
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('generates a long enough run for a timed test to not run out of words', () => {
    const words = buildTestWords({ ...baseConfig, mode: 'time', amount: 15 }, { learnerWords: [] }, 's');
    expect(words.length).toBeGreaterThan(150);
  });

  it('uses learner vocabulary when there is enough of it', () => {
    const learnerWords = [
      'gato', 'perro', 'pájaro', 'casa', 'mesa', 'silla',
      'ventana', 'puerta', 'libro', 'papel', 'lápiz', 'coche',
    ];
    const words = buildTestWords(
      { ...baseConfig, useOwnVocabulary: true, amount: 60 },
      { learnerWords },
      'seed',
    );
    expect(words.some((word) => learnerWords.includes(word))).toBe(true);
  });

  it('ignores learner vocabulary written in the wrong script', () => {
    const words = buildTestWords(
      { ...baseConfig, languageCode: 'zh', useOwnVocabulary: true, amount: 40 },
      { learnerWords: ['cat', 'dog', 'bird', 'house', 'table', 'chair', 'window', 'door', 'book', 'paper', 'pencil', 'car'] },
      'seed',
    );
    expect(words.some((word) => /^[a-z]+$/.test(word))).toBe(false);
  });

  it('splits saved phrases into individual words', () => {
    const learnerWords = Array.from({ length: 14 }, (_, i) => `palabra${i} extra${i}`);
    const words = buildTestWords(
      { ...baseConfig, useOwnVocabulary: true, amount: 80 },
      { learnerWords },
      'seed',
    );
    expect(words.every((word) => !word.includes(' '))).toBe(true);
  });

  it('adds punctuation only when asked', () => {
    const plain = buildTestWords({ ...baseConfig, amount: 100 }, { learnerWords: [] }, 'seed');
    const punctuated = buildTestWords(
      { ...baseConfig, amount: 100, includePunctuation: true },
      { learnerWords: [] },
      'seed',
    );
    expect(plain.some((word) => /[.,!?;:]$/.test(word))).toBe(false);
    expect(punctuated.some((word) => /[.,!?;:]$/.test(word))).toBe(true);
  });
});

describe('speed calculations', () => {
  it('scores 60 wpm for 300 correct characters in one minute', () => {
    expect(computeWpm(300, 60, 5)).toBe(60);
  });

  it('counts every character for raw speed', () => {
    expect(computeRawWpm(400, 60, 5)).toBe(80);
  });

  it('counts each character as a word for logographic scripts', () => {
    expect(computeWpm(60, 60, 1)).toBe(60);
  });

  it('returns zero rather than dividing by zero elapsed time', () => {
    expect(computeWpm(100, 0, 5)).toBe(0);
    expect(computeRawWpm(100, 0, 5)).toBe(0);
  });
});

describe('computeAccuracy', () => {
  it('reports the share of correct keystrokes', () => {
    expect(computeAccuracy(90, 100)).toBe(90);
  });

  it('treats an untouched test as clean rather than zero', () => {
    expect(computeAccuracy(0, 0)).toBe(100);
  });
});

describe('computeConsistency', () => {
  it('scores a perfectly even run at 100', () => {
    expect(computeConsistency([sample(1, 50), sample(2, 50), sample(3, 50)])).toBe(100);
  });

  it('scores an erratic run below an even one at the same average', () => {
    const steady = computeConsistency([sample(1, 50), sample(2, 50), sample(3, 50)]);
    const erratic = computeConsistency([sample(1, 20), sample(2, 80), sample(3, 50)]);
    expect(erratic).toBeLessThan(steady);
  });

  it('cannot show variation from a single sample', () => {
    expect(computeConsistency([sample(1, 50)])).toBe(100);
    expect(computeConsistency([])).toBe(100);
  });
});

describe('summarizeRun', () => {
  it('assembles a full result from a tally', () => {
    const result = summarizeRun(
      {
        correctCharacters: 250,
        incorrectCharacters: 10,
        extraCharacters: 0,
        missedCharacters: 5,
        totalKeystrokes: 260,
        elapsedSeconds: 60,
        samples: [sample(1, 50), sample(2, 52)],
      },
      baseConfig,
    );

    expect(result.wpm).toBe(50);
    expect(result.rawWpm).toBe(52);
    expect(result.accuracy).toBeCloseTo(96.2, 0);
    expect(result.languageCode).toBe('es');
    expect(result.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('never reports net speed above raw speed', () => {
    const result = summarizeRun(
      {
        correctCharacters: 200,
        incorrectCharacters: 40,
        extraCharacters: 10,
        missedCharacters: 0,
        totalKeystrokes: 250,
        elapsedSeconds: 30,
        samples: [],
      },
      baseConfig,
    );
    expect(result.wpm).toBeLessThanOrEqual(result.rawWpm);
  });
});

describe('rankProblemCharacters', () => {
  it('ranks by miss count and ignores one-off slips', () => {
    const ranked = rankProblemCharacters(new Map([['a', 5], ['b', 2], ['c', 1]]));
    expect(ranked).toEqual([
      { character: 'a', count: 5 },
      { character: 'b', count: 2 },
    ]);
  });

  it('caps the list at the requested limit', () => {
    const errors = new Map(['a', 'b', 'c', 'd', 'e'].map((c, i) => [c, 10 - i]));
    expect(rankProblemCharacters(errors, 3)).toHaveLength(3);
  });
});
