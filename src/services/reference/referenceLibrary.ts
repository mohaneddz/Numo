/**
 * Assembles the reference hub's content from real sources.
 *
 * The page it replaces fabricated its cards: for any language without
 * hand-authored data it sliced up a Latin alphabet, labelled each letter
 * `"<Language> core symbol"`, and marked roughly three quarters of them
 * "unlocked" with an `index % 4 !== 0` rule. Nothing here is invented — cards
 * come from the stroke-order dataset, hand-authored alphabet and pronunciation
 * data, and the learner's own saved vocabulary, and a card counts as familiar
 * only when the learner has genuinely met it.
 */
import { listScriptCharacters } from '../../data/scriptModels';
import { referenceByLanguage, type ReferenceEntry } from '../../data/referenceData';

export type ReferenceTab = 'characters' | 'sounds' | 'words';

export interface ReferenceCard {
  id: string;
  symbol: string;
  reading: string;
  meaning: string;
  /** True when the learner has actually encountered this in their own study. */
  familiar: boolean;
  /** Where practising this card leads, when there is somewhere to go. */
  practiceTo?: string;
}

export interface ReferenceSection {
  title: string;
  subtitle?: string;
  cards: ReferenceCard[];
}

export interface LearnerVocabularyEntry {
  term: string;
  translation: string;
  /** 0-100; used to separate words being learned from words already solid. */
  mastery?: number;
}

export interface ReferenceSource {
  languageCode: string;
  languageName: string;
  vocabulary: readonly LearnerVocabularyEntry[];
}

/**
 * Every character the learner has met, taken from their own saved vocabulary.
 *
 * Individual characters are counted, not just whole words: someone who has
 * saved 你好 has genuinely met 你, and the character reference should say so.
 */
function familiarSymbols(vocabulary: readonly LearnerVocabularyEntry[]): Set<string> {
  const symbols = new Set<string>();
  for (const entry of vocabulary) {
    const term = entry.term?.trim();
    if (!term) continue;
    symbols.add(term.toLowerCase());
    for (const character of term) {
      if (character.trim()) symbols.add(character.toLowerCase());
    }
  }
  return symbols;
}

function toCards(
  prefix: string,
  entries: readonly ReferenceEntry[],
  familiar: ReadonlySet<string>,
): ReferenceCard[] {
  return entries.map((entry, index) => ({
    id: `${prefix}-${index}`,
    symbol: entry.symbol,
    reading: entry.reading,
    meaning: entry.meaning,
    familiar: familiar.has(entry.symbol.toLowerCase()),
  }));
}

/** Characters, grouped by script type, from the stroke-order dataset. */
function characterSections(source: ReferenceSource, familiar: ReadonlySet<string>): ReferenceSection[] {
  const characters = listScriptCharacters(source.languageCode);

  if (characters.length > 0) {
    const groups: Array<{ title: string; subtitle: string; kind: string }> = [
      { title: 'Hiragana', subtitle: 'The core syllabary', kind: 'hiragana' },
      { title: 'Katakana', subtitle: 'Loanwords and emphasis', kind: 'katakana' },
      { title: 'Kanji', subtitle: 'Learned early', kind: 'kanji' },
      { title: 'Characters', subtitle: 'Ordered by how often they appear', kind: 'hanzi' },
    ];

    return groups
      .map(({ title, subtitle, kind }) => ({
        title,
        subtitle,
        cards: characters
          .filter((entry) => entry.kind === kind)
          .map((entry) => ({
            id: entry.key,
            symbol: entry.character,
            reading: entry.reading ?? `${entry.strokeCount} strokes`,
            meaning: `${entry.strokeCount} stroke${entry.strokeCount === 1 ? '' : 's'}`,
            familiar: familiar.has(entry.character.toLowerCase()),
            practiceTo: `/script-practice?script=${encodeURIComponent(entry.key)}`,
          })),
      }))
      .filter((section) => section.cards.length > 0);
  }

  const letters = referenceByLanguage[source.languageCode]?.letters ?? [];
  return letters.map((group) => ({
    title: group.title,
    subtitle: group.subtitle,
    cards: toCards(`${source.languageCode}-letter`, group.entries, familiar),
  }));
}

function soundSections(source: ReferenceSource, familiar: ReadonlySet<string>): ReferenceSection[] {
  const groups = referenceByLanguage[source.languageCode]?.sounds ?? [];
  return groups.map((group) => ({
    title: group.title,
    subtitle: group.subtitle,
    cards: toCards(`${source.languageCode}-sound`, group.entries, familiar),
  }));
}

/**
 * The learner's own vocabulary, split by how well they know it.
 *
 * There is no bundled word list here on purpose: a reference of words the
 * learner has never met, with no meanings attached, is exactly the kind of
 * filler this page used to be made of.
 */
function wordSections(source: ReferenceSource): ReferenceSection[] {
  const entries = source.vocabulary.filter((entry) => entry.term?.trim() && entry.translation?.trim());
  if (entries.length === 0) return [];

  const solid = entries.filter((entry) => (entry.mastery ?? 0) >= 70);
  const learning = entries.filter((entry) => (entry.mastery ?? 0) < 70);

  const toWordCards = (list: readonly LearnerVocabularyEntry[], prefix: string, familiar: boolean) =>
    list.map((entry, index) => ({
      id: `${prefix}-${index}`,
      symbol: entry.term,
      reading: entry.translation,
      meaning:
        entry.mastery === undefined
          ? 'Saved to your notebook'
          : `${Math.round(entry.mastery)}% mastery`,
      familiar,
    }));

  return [
    { title: 'Still learning', subtitle: 'From your notebook and reviews', cards: toWordCards(learning, `${source.languageCode}-learning`, false) },
    { title: 'Solid', subtitle: 'Words you have consistently got right', cards: toWordCards(solid, `${source.languageCode}-solid`, true) },
  ].filter((section) => section.cards.length > 0);
}

export function buildReferenceSections(
  tab: ReferenceTab,
  source: ReferenceSource,
): ReferenceSection[] {
  const familiar = familiarSymbols(source.vocabulary);

  switch (tab) {
    case 'characters':
      return characterSections(source, familiar);
    case 'sounds':
      return soundSections(source, familiar);
    case 'words':
      return wordSections(source);
    default:
      return [];
  }
}

/** Which tabs have real content for this language, so empty ones can be hidden. */
export function availableTabs(source: ReferenceSource): ReferenceTab[] {
  return (['characters', 'sounds', 'words'] as ReferenceTab[]).filter(
    (tab) => buildReferenceSections(tab, source).length > 0,
  );
}

export interface ReferenceProgress {
  total: number;
  familiar: number;
  percent: number;
}

export function summarizeProgress(sections: readonly ReferenceSection[]): ReferenceProgress {
  const total = sections.reduce((sum, section) => sum + section.cards.length, 0);
  const familiar = sections.reduce(
    (sum, section) => sum + section.cards.filter((card) => card.familiar).length,
    0,
  );
  return {
    total,
    familiar,
    percent: total === 0 ? 0 : Math.round((familiar / total) * 100),
  };
}
