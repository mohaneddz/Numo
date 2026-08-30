import { describe, expect, it } from 'vitest';
import {
  countRealCorrections,
  extractCorrectionArray,
  parseWritingCorrections,
} from './writingCorrections';

const valid = JSON.stringify([
  { original: 'yo tengo', corrected: 'tengo', type: 'grammar', explanation: 'Subject is optional.' },
  { original: 'casa', corrected: 'casa', type: 'correct', explanation: 'Fine as written.' },
]);

describe('extractCorrectionArray', () => {
  it('parses a bare array', () => {
    expect(extractCorrectionArray('[{"a":1}]')).toEqual([{ a: 1 }]);
  });

  it('parses an array wrapped in a code fence', () => {
    expect(extractCorrectionArray('```json\n[{"a":1}]\n```')).toEqual([{ a: 1 }]);
  });

  it('parses an array surrounded by prose', () => {
    expect(extractCorrectionArray('Sure! [{"a":1}] hope that helps')).toEqual([{ a: 1 }]);
  });

  it('returns null for text with no array in it', () => {
    expect(extractCorrectionArray('I could not analyse that.')).toBeNull();
  });

  it('returns null for malformed JSON rather than throwing', () => {
    expect(extractCorrectionArray('[{"a":]')).toBeNull();
  });
});

describe('parseWritingCorrections', () => {
  it('keeps well-formed corrections', () => {
    const corrections = parseWritingCorrections(valid);
    expect(corrections).toHaveLength(2);
    expect(corrections[0].original).toBe('yo tengo');
    expect(corrections[0].type).toBe('grammar');
  });

  it('returns nothing when the response is not a list', () => {
    expect(parseWritingCorrections('{"original":"x"}')).toEqual([]);
    expect(parseWritingCorrections('not json at all')).toEqual([]);
  });

  it('drops an entry with nothing to point at in the writing', () => {
    const raw = JSON.stringify([{ corrected: 'tengo', type: 'grammar', explanation: 'x' }]);
    expect(parseWritingCorrections(raw)).toEqual([]);
  });

  it('drops an entry whose type would not render', () => {
    const raw = JSON.stringify([
      { original: 'a', corrected: 'b', type: 'vibes', explanation: 'x' },
    ]);
    expect(parseWritingCorrections(raw)).toEqual([]);
  });

  it('accepts a type in any casing', () => {
    const raw = JSON.stringify([
      { original: 'a', corrected: 'b', type: 'Grammar', explanation: 'x' },
    ]);
    expect(parseWritingCorrections(raw)[0].type).toBe('grammar');
  });

  it('falls back to the original when no correction was supplied', () => {
    const raw = JSON.stringify([{ original: 'casa', type: 'style', explanation: 'x' }]);
    expect(parseWritingCorrections(raw)[0].corrected).toBe('casa');
  });

  it('does not let a "correct" entry claim a change', () => {
    // Marking text correct and then rewriting it is contradictory; the
    // learner's original stands.
    const raw = JSON.stringify([
      { original: 'casa', corrected: 'hogar', type: 'correct', explanation: 'x' },
    ]);
    expect(parseWritingCorrections(raw)[0].corrected).toBe('casa');
  });

  it('tolerates a missing explanation', () => {
    const raw = JSON.stringify([{ original: 'a', corrected: 'b', type: 'grammar' }]);
    expect(parseWritingCorrections(raw)[0].explanation).toBe('');
  });

  it('skips non-object entries mixed into the list', () => {
    const raw = JSON.stringify([
      null,
      'oops',
      42,
      { original: 'a', corrected: 'b', type: 'grammar', explanation: 'x' },
    ]);
    expect(parseWritingCorrections(raw)).toHaveLength(1);
  });
});

describe('countRealCorrections', () => {
  it('counts only entries that changed something', () => {
    expect(countRealCorrections(parseWritingCorrections(valid))).toBe(1);
  });

  it('counts nothing for an empty list', () => {
    expect(countRealCorrections([])).toBe(0);
  });
});
