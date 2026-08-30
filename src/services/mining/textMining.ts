/**
 * Analysis for the text miner: given a passage in the target language and the
 * vocabulary the learner already has, work out what is new.
 *
 * Coverage — the share of a text a learner already knows — is the number that
 * makes a passage feel worth reading or not, and nothing in the app computed
 * it. Everything here is derived from the learner's own saved words; no
 * frequency assumptions are baked in.
 */
import { isSpacelessScript, normalizeAnswer } from '../../utils/textNormalize';

export interface MinedWord {
  /** The word as it appears in the text. */
  word: string;
  /** Times it occurs in the passage. */
  count: number;
  /** True when the learner already has it saved. */
  known: boolean;
}

export interface TextAnalysis {
  words: MinedWord[];
  /** Distinct words in the passage. */
  uniqueCount: number;
  /** Total word occurrences, including repeats. */
  totalCount: number;
  knownUnique: number;
  /** Share of all occurrences the learner already knows, 0-100. */
  coveragePercent: number;
}

/**
 * Splits a passage into words.
 *
 * Chinese and Japanese are written without spaces, so a space split would
 * return whole sentences as single "words". Those are split per character
 * instead — coarse, since a word may be two characters, but every character is
 * a real unit the learner can look up, which a sentence-length token is not.
 */
export function extractWords(text: string, languageCode: string): string[] {
  if (isSpacelessScript(languageCode)) {
    return Array.from(text).filter((character) => /[\p{L}\p{N}]/u.test(character));
  }

  return text
    .split(/[\s ]+/)
    .map((token) => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((token) => token.length > 0);
}

/**
 * Analyses a passage against the learner's vocabulary.
 *
 * Known words are matched on the shared normalised form, so casing and
 * punctuation do not make a saved word look new.
 */
export function analyzeText(
  text: string,
  languageCode: string,
  knownVocabulary: readonly string[],
): TextAnalysis {
  const known = new Set<string>();
  for (const entry of knownVocabulary) {
    for (const word of extractWords(entry ?? '', languageCode)) {
      const key = normalizeAnswer(word, languageCode);
      if (key) known.add(key);
    }
  }

  const counts = new Map<string, { word: string; count: number }>();
  let totalCount = 0;

  for (const word of extractWords(text, languageCode)) {
    const key = normalizeAnswer(word, languageCode);
    if (!key) continue;
    totalCount += 1;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { word, count: 1 });
  }

  const words: MinedWord[] = [...counts.entries()]
    .map(([key, entry]) => ({
      word: entry.word,
      count: entry.count,
      known: known.has(key),
    }))
    // Most frequent first: the words worth learning from this passage are the
    // ones it keeps using.
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));

  const knownOccurrences = words
    .filter((entry) => entry.known)
    .reduce((sum, entry) => sum + entry.count, 0);

  return {
    words,
    uniqueCount: words.length,
    totalCount,
    knownUnique: words.filter((entry) => entry.known).length,
    coveragePercent: totalCount === 0 ? 0 : Math.round((knownOccurrences / totalCount) * 100),
  };
}

/**
 * How readable a passage is at the learner's current vocabulary.
 *
 * The bands follow the usual reading-comprehension rule of thumb: below about
 * 90% known words a text is a slog to decode, and around 98% it can be read
 * for meaning rather than deciphered.
 */
export function describeCoverage(coveragePercent: number): string {
  if (coveragePercent >= 98) return 'Comfortable reading';
  if (coveragePercent >= 90) return 'Readable with some lookups';
  if (coveragePercent >= 75) return 'Challenging — expect frequent lookups';
  return 'Very hard at your current vocabulary';
}
