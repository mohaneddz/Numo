import { describe, expect, it } from 'vitest';
import {
  availableTabs,
  buildReferenceSections,
  summarizeProgress,
  type ReferenceSource,
} from './referenceLibrary';

const source = (
  languageCode: string,
  vocabulary: ReferenceSource['vocabulary'] = [],
): ReferenceSource => ({
  languageCode,
  languageName: languageCode.toUpperCase(),
  vocabulary,
});

describe('character sections', () => {
  it('builds Chinese characters from the stroke dataset', () => {
    const sections = buildReferenceSections('characters', source('zh'));
    const total = sections.reduce((sum, section) => sum + section.cards.length, 0);
    expect(total).toBeGreaterThan(400);
  });

  it('separates the Japanese scripts', () => {
    const titles = buildReferenceSections('characters', source('ja')).map((s) => s.title);
    expect(titles).toContain('Hiragana');
    expect(titles).toContain('Katakana');
    expect(titles).toContain('Kanji');
  });

  it('links every character to writing practice', () => {
    const [section] = buildReferenceSections('characters', source('zh'));
    expect(section.cards[0].practiceTo).toContain('/script-practice?script=');
  });

  it('uses the real alphabet for languages with no stroke data', () => {
    const [section] = buildReferenceSections('characters', source('ru'));
    expect(section.cards).toHaveLength(33);
    expect(section.cards.some((card) => card.symbol.includes('Ж'))).toBe(true);
  });

  it('invents nothing for a language with no authored alphabet', () => {
    expect(buildReferenceSections('characters', source('fr'))).toEqual([]);
  });
});

describe('sound sections', () => {
  it('covers the Chinese tones', () => {
    const sections = buildReferenceSections('sounds', source('zh'));
    const tones = sections.find((section) => section.title === 'Tones');
    expect(tones?.cards).toHaveLength(5);
  });

  it('has real content for every language it claims to cover', () => {
    for (const code of ['es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ar']) {
      const sections = buildReferenceSections('sounds', source(code));
      expect(sections.length, `${code} should have sounds`).toBeGreaterThan(0);
      for (const section of sections) {
        for (const card of section.cards) {
          expect(card.meaning.length, `${code}/${card.symbol}`).toBeGreaterThan(3);
          expect(card.meaning).not.toContain('core symbol');
        }
      }
    }
  });
});

describe('word sections', () => {
  it('is empty until the learner has saved something', () => {
    expect(buildReferenceSections('words', source('es'))).toEqual([]);
  });

  it('splits saved vocabulary by mastery', () => {
    const sections = buildReferenceSections(
      'words',
      source('es', [
        { term: 'casa', translation: 'house', mastery: 90 },
        { term: 'mesa', translation: 'table', mastery: 20 },
      ]),
    );

    expect(sections.find((s) => s.title === 'Solid')?.cards[0].symbol).toBe('casa');
    expect(sections.find((s) => s.title === 'Still learning')?.cards[0].symbol).toBe('mesa');
  });

  it('drops entries with no translation rather than showing a blank meaning', () => {
    const sections = buildReferenceSections(
      'words',
      source('es', [{ term: 'casa', translation: '' }]),
    );
    expect(sections).toEqual([]);
  });
});

describe('familiarity', () => {
  it('marks a character met through a saved word', () => {
    const sections = buildReferenceSections(
      'characters',
      source('zh', [{ term: '你好', translation: 'hello' }]),
    );
    const cards = sections.flatMap((section) => section.cards);
    expect(cards.find((card) => card.symbol === '你')?.familiar).toBe(true);
    expect(cards.find((card) => card.symbol === '好')?.familiar).toBe(true);
  });

  it('leaves untouched characters unfamiliar', () => {
    const sections = buildReferenceSections(
      'characters',
      source('zh', [{ term: '你好', translation: 'hello' }]),
    );
    const cards = sections.flatMap((section) => section.cards);
    const unmet = cards.filter((card) => !card.familiar);
    expect(unmet.length).toBeGreaterThan(500);
  });

  it('reports zero progress for a learner who has saved nothing', () => {
    const sections = buildReferenceSections('characters', source('zh'));
    expect(summarizeProgress(sections).familiar).toBe(0);
    expect(summarizeProgress(sections).percent).toBe(0);
  });

  it('counts progress from real study only', () => {
    const sections = buildReferenceSections(
      'characters',
      source('zh', [{ term: '一', translation: 'one' }]),
    );
    const progress = summarizeProgress(sections);
    expect(progress.familiar).toBe(1);
    expect(progress.total).toBeGreaterThan(400);
  });
});

describe('availableTabs', () => {
  it('hides tabs with nothing real behind them', () => {
    expect(availableTabs(source('fr'))).toEqual(['sounds']);
  });

  it('shows the words tab once the learner has vocabulary', () => {
    const tabs = availableTabs(source('fr', [{ term: 'maison', translation: 'house' }]));
    expect(tabs).toEqual(['sounds', 'words']);
  });

  it('offers writing and sounds for Chinese', () => {
    expect(availableTabs(source('zh'))).toEqual(['characters', 'sounds']);
  });
});
