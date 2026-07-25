import { describe, expect, it } from 'vitest';
import { buildHints, hintPenalty } from './hintService';

describe('buildHints', () => {
  it('never reveals the full answer at any level', () => {
    const hints = buildHints({
      expectedAnswer: 'buenos días',
      languageCode: 'es',
      teachingNote: 'Used before midday.',
      translation: 'good morning',
    });

    expect(hints.length).toBeGreaterThan(0);
    for (const hint of hints) {
      expect(hint.text).not.toContain('buenos días');
    }
  });

  it('escalates from meaning to structure to partial reveal', () => {
    const hints = buildHints({
      expectedAnswer: 'buenos días',
      languageCode: 'es',
      teachingNote: 'Used before midday.',
    });

    expect(hints[0].text).toContain('midday');
    expect(hints[1].text).toContain('2 words');
    expect(hints[2].text).toMatch(/·/);
    expect(hints.map((hint) => hint.level)).toEqual([1, 2, 3]);
  });

  it('reveals the opening letter of each word but masks the rest', () => {
    const hints = buildHints({ expectedAnswer: 'buenos días', languageCode: 'es' });
    const reveal = hints[hints.length - 1].text;
    expect(reveal.startsWith('b')).toBe(true);
    expect(reveal).toContain('d');
    expect(reveal).not.toContain('uenos');
  });

  it('counts characters rather than words for spaceless scripts', () => {
    const hints = buildHints({ expectedAnswer: '你好', languageCode: 'zh', romanization: 'nǐ hǎo' });
    expect(hints.some((hint) => hint.text.includes('2 characters'))).toBe(true);
    expect(hints.some((hint) => hint.text.includes('nǐ hǎo'))).toBe(true);
  });

  it('falls back to the translation when there is no teaching note', () => {
    const hints = buildHints({ expectedAnswer: 'agua', languageCode: 'es', translation: 'water' });
    expect(hints[0].text).toContain('water');
  });

  it('returns nothing without an answer to hint at', () => {
    expect(buildHints({ expectedAnswer: '   ' })).toHaveLength(0);
  });
});

describe('hintPenalty', () => {
  it('costs nothing when no hint is used and is capped', () => {
    expect(hintPenalty(0)).toBe(0);
    expect(hintPenalty(1)).toBeGreaterThan(0);
    expect(hintPenalty(3)).toBeLessThanOrEqual(30);
    expect(hintPenalty(10)).toBe(30);
  });
});
