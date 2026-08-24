import { describe, expect, it } from 'vitest';
import {
  matchAnswer,
  normalizeAnswer,
  stripTargetMarkers,
  tokenizeForDisplay,
} from './textNormalize';

describe('normalizeAnswer', () => {
  it('preserves non-Latin scripts instead of erasing them', () => {
    expect(normalizeAnswer('你好', 'zh')).toBe('你好');
    expect(normalizeAnswer('こんにちは', 'ja')).toBe('こんにちは');
    expect(normalizeAnswer('مرحبا', 'ar')).toBe('مرحبا');
    expect(normalizeAnswer('Привет', 'ru')).toBe('привет');
    expect(normalizeAnswer('नमस्ते', 'hi')).toBe('नमस्ते');
  });

  it('drops punctuation and collapses whitespace', () => {
    expect(normalizeAnswer('  Hello,   world!  ')).toBe('hello world');
  });

  it('ignores spacing for spaceless scripts', () => {
    expect(normalizeAnswer('你 好', 'zh')).toBe('你好');
  });

  it('strips target markers', () => {
    expect(stripTargetMarkers('[[hola]] amigo')).toBe('hola amigo');
    expect(normalizeAnswer('[[hola]]')).toBe('hola');
  });
});

describe('matchAnswer', () => {
  it('grades non-Latin answers correctly', () => {
    expect(matchAnswer('你好', '你好', 'zh').correct).toBe(true);
    expect(matchAnswer('你好', '再见', 'zh').correct).toBe(false);
  });

  it('accepts an accent-only miss with a note', () => {
    const result = matchAnswer('sí', 'si', 'es');
    expect(result.correct).toBe(true);
    expect(result.kind).toBe('diacritic');
    expect(result.score).toBeLessThan(100);
    expect(result.note).toBeTruthy();
  });

  it('gives partial credit, never full, for a near-complete answer', () => {
    const result = matchAnswer('buenos días', 'buenos día');
    expect(result.correct).toBe(false);
    expect(result.kind).toBe('partial');
    expect(result.score).toBeLessThan(100);
  });

  it('gives no credit when the overlap is too small', () => {
    expect(matchAnswer('buenos días', 'bue').kind).toBe('none');
  });

  it('reports an empty submission distinctly from a wrong one', () => {
    expect(matchAnswer('hola', '   ').kind).toBe('empty');
    expect(matchAnswer('hola', 'adios').kind).toBe('none');
  });

  it('ignores marker wrapping on either side', () => {
    expect(matchAnswer('[[hola]]', 'hola').correct).toBe(true);
  });
});

describe('tokenizeForDisplay', () => {
  it('splits Latin text on whitespace and keeps separators', () => {
    expect(tokenizeForDisplay('hola amigo')).toEqual(['hola', ' ', 'amigo']);
  });

  it('splits spaceless scripts per character', () => {
    expect(tokenizeForDisplay('你好', 'zh')).toEqual(['你', '好']);
  });
});
