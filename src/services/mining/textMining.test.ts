import { describe, expect, it } from 'vitest';
import { analyzeText, describeCoverage, extractWords } from './textMining';

describe('extractWords', () => {
  it('splits a space-separated language on whitespace', () => {
    expect(extractWords('la casa es grande', 'es')).toEqual(['la', 'casa', 'es', 'grande']);
  });

  it('strips surrounding punctuation but keeps the word', () => {
    expect(extractWords('¡Hola, mundo!', 'es')).toEqual(['Hola', 'mundo']);
  });

  it('keeps accented characters intact', () => {
    expect(extractWords('el día está aquí', 'es')).toContain('día');
  });

  it('splits Chinese per character, since it is written without spaces', () => {
    // A whitespace split would return the whole sentence as one "word".
    expect(extractWords('我喜欢茶。', 'zh')).toEqual(['我', '喜', '欢', '茶']);
  });

  it('drops punctuation entirely in spaceless scripts', () => {
    expect(extractWords('你好，世界！', 'zh')).toEqual(['你', '好', '世', '界']);
  });

  it('returns nothing for empty or punctuation-only input', () => {
    expect(extractWords('', 'es')).toEqual([]);
    expect(extractWords('!!! ???', 'es')).toEqual([]);
  });
});

describe('analyzeText', () => {
  it('counts distinct words and total occurrences separately', () => {
    const analysis = analyzeText('la casa la mesa', 'es', []);
    expect(analysis.uniqueCount).toBe(3);
    expect(analysis.totalCount).toBe(4);
  });

  it('marks saved vocabulary as known', () => {
    const analysis = analyzeText('la casa es grande', 'es', ['casa', 'grande']);
    const known = analysis.words.filter((word) => word.known).map((word) => word.word);
    expect(known.sort()).toEqual(['casa', 'grande']);
  });

  it('ignores casing and punctuation when matching saved words', () => {
    const analysis = analyzeText('¡Casa!', 'es', ['casa']);
    expect(analysis.words[0].known).toBe(true);
  });

  it('reports coverage over occurrences, not distinct words', () => {
    // "la" appears three times; knowing it covers most of the passage even
    // though it is only one of two distinct words.
    const analysis = analyzeText('la la la casa', 'es', ['la']);
    expect(analysis.coveragePercent).toBe(75);
  });

  it('reports full coverage when everything is known', () => {
    expect(analyzeText('la casa', 'es', ['la', 'casa']).coveragePercent).toBe(100);
  });

  it('reports no coverage for a learner with no vocabulary', () => {
    expect(analyzeText('la casa', 'es', []).coveragePercent).toBe(0);
  });

  it('ranks the most frequent words first', () => {
    const analysis = analyzeText('casa casa casa mesa mesa silla', 'es', []);
    expect(analysis.words.map((word) => word.word)).toEqual(['casa', 'mesa', 'silla']);
  });

  it('pulls individual words out of saved phrases', () => {
    // Someone who saved "mi casa" has met "casa".
    const analysis = analyzeText('la casa', 'es', ['mi casa']);
    expect(analysis.words.find((word) => word.word === 'casa')?.known).toBe(true);
  });

  it('handles Chinese, matching characters inside saved words', () => {
    const analysis = analyzeText('我喜欢茶', 'zh', ['我', '茶']);
    expect(analysis.knownUnique).toBe(2);
    expect(analysis.coveragePercent).toBe(50);
  });

  it('returns an empty analysis for empty text rather than dividing by zero', () => {
    const analysis = analyzeText('', 'es', ['casa']);
    expect(analysis).toEqual({
      words: [],
      uniqueCount: 0,
      totalCount: 0,
      knownUnique: 0,
      coveragePercent: 0,
    });
  });

  it('tolerates blank entries in the saved vocabulary', () => {
    const analysis = analyzeText('la casa', 'es', ['', '   ', 'casa']);
    expect(analysis.knownUnique).toBe(1);
  });
});

describe('describeCoverage', () => {
  it('separates comfortable reading from decoding', () => {
    expect(describeCoverage(99)).toBe('Comfortable reading');
    expect(describeCoverage(92)).toBe('Readable with some lookups');
    expect(describeCoverage(80)).toBe('Challenging — expect frequent lookups');
    expect(describeCoverage(40)).toBe('Very hard at your current vocabulary');
  });

  it('places the boundaries where the reading research puts them', () => {
    expect(describeCoverage(98)).toBe('Comfortable reading');
    expect(describeCoverage(97)).toBe('Readable with some lookups');
    expect(describeCoverage(90)).toBe('Readable with some lookups');
    expect(describeCoverage(89)).toBe('Challenging — expect frequent lookups');
  });
});
