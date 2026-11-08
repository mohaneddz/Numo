import { describe, expect, it } from 'vitest';
import { extractReadingLines } from './bookContentService';

const wrap = (body: string) =>
  `Header text\n*** START OF THE PROJECT GUTENBERG EBOOK SAMPLE ***\n${body}\n*** END OF THE PROJECT GUTENBERG EBOOK SAMPLE ***\nLicense text`;

describe('extractReadingLines', () => {
  it('reads Chinese paragraphs that are separated normally', () => {
    const paragraph = '感盤古開闢，三皇治世，五帝定倫，世界之間，遂分為四大部洲。這部書單表東勝神洲。海外有一國土，名曰傲來國。國近大海，海中有一座名山，喚為花果山。';
    const lines = extractReadingLines(wrap(`${paragraph}\n\n${paragraph}`), 'zh');
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0].source.startsWith('感盤古開闢')).toBe(true);
    expect(lines.every((line) => !/\s/.test(line.source))).toBe(true);
  });

  it('rejoins Chinese text that was hard-wrapped with a blank line after every line', () => {
    // Gutenberg's 吶喊 is laid out this way; splitting on blank lines gave fragments
    // of about 35 characters, and a space-joining cleaner dropped every one.
    const body = [
      '我在年青時候也曾經做過許多夢，後來大半忘卻了，但自己也並不以為可惜。',
      '所謂回憶者，雖說可以使人歡欣，有時也不免使人寂寞，使精神的絲縷還牽',
      '著已逝的寂寞的時光，又有什麼意味呢，而我偏苦於不能全忘卻。',
    ].join('\n\n');
    const lines = extractReadingLines(wrap(body), 'zh-TW');
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.map((line) => line.source).join('')).toContain('使精神的絲縷還牽著已逝的寂寞的時光');
  });

  it('drops licence and boilerplate passages', () => {
    const body = 'This eBook is for the use of anyone anywhere at no cost and with almost no restrictions whatsoever。'.repeat(2);
    expect(extractReadingLines(wrap(body), 'zh')).toHaveLength(0);
  });

  it('keeps the paragraph behaviour for Latin-script books', () => {
    const paragraph = 'En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco y galgo corredor.';
    const lines = extractReadingLines(wrap(`${paragraph}\n\n${paragraph}`), 'es');
    expect(lines).toHaveLength(2);
    expect(lines[0].source).toBe(paragraph);
  });
});
