import { describe, expect, it } from 'vitest';
import { countWritingUnits, formatWritingLength } from './textLength';

describe('countWritingUnits', () => {
  it('counts each Chinese character instead of treating the draft as one word', () => {
    expect(countWritingUnits('你好！我叫小明。')).toBe(6);
  });

  it('counts kana and kanji one each', () => {
    expect(countWritingUnits('私は学生です。')).toBe(6);
  });

  it('counts mixed Chinese and Latin words', () => {
    expect(countWritingUnits('我喜欢 coffee 和 tea')).toBe(6);
  });

  it('keeps counting spaced languages by word and ignores bare punctuation', () => {
    expect(countWritingUnits('Hola, ¿cómo estás? — bien.')).toBe(4);
    expect(countWritingUnits('   ')).toBe(0);
  });
});

describe('formatWritingLength', () => {
  it('labels mostly-Chinese text in characters', () => {
    expect(formatWritingLength('这个周末我和朋友去公园。')).toBe('11 characters');
  });

  it('labels spaced text in words, singular for one', () => {
    expect(formatWritingLength('Hola amigos')).toBe('2 words');
    expect(formatWritingLength('Hola')).toBe('1 word');
  });
});
