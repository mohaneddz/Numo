/**
 * Typing-trainer engine: builds a test's word sequence and computes the run's
 * statistics.
 *
 * Kept free of React so the scoring maths is testable on its own — the numbers
 * a learner sees at the end of a run are the part worth being sure about.
 */
import { createRandom } from '../../utils/seededRandom';
import { typingWordListForLanguage, type TypingWordList } from '../../data/typingWordLists';

export type TypingTestMode = 'time' | 'words';

export interface TypingTestConfig {
  mode: TypingTestMode;
  /** Seconds for a time test, or the word count for a words test. */
  amount: number;
  languageCode: string;
  /** Draw from the learner's saved vocabulary before the bundled list. */
  useOwnVocabulary: boolean;
  includePunctuation: boolean;
  includeNumbers: boolean;
}

export interface TypingWordSource {
  /** Words the learner has actually saved (notebook entries, review items). */
  learnerWords: string[];
}

/** One character's outcome, in the order the test presents them. */
export type CharacterState = 'pending' | 'correct' | 'incorrect' | 'extra';

export interface TypingSample {
  /** Seconds since the run started. */
  second: number;
  wpm: number;
  rawWpm: number;
  errors: number;
}

export interface TypingResult {
  wpm: number;
  rawWpm: number;
  /** Share of keystrokes that were right, 0-100. */
  accuracy: number;
  /** Evenness of speed across the run, 0-100. */
  consistency: number;
  elapsedSeconds: number;
  correctCharacters: number;
  incorrectCharacters: number;
  extraCharacters: number;
  missedCharacters: number;
  totalKeystrokes: number;
  charsPerWord: number;
  samples: TypingSample[];
  languageCode: string;
  mode: TypingTestMode;
  amount: number;
  completedAt: string;
}

const PUNCTUATION = ['.', ',', '!', '?', ';', ':'];
const CJK_PUNCTUATION = ['。', '，', '！', '？', '；', '：'];

/** Words to generate for a time test, which has no natural length. */
const TIME_TEST_WORD_BUDGET = 220;

/**
 * A learner word is only usable if it is written in the target language.
 * Notebook entries store both sides of a pair, and typing the English gloss
 * would practise the wrong keyboard entirely.
 */
function isTargetScript(word: string, languageCode: string): boolean {
  if (!word) return false;
  switch (languageCode) {
    case 'zh':
      return /[一-鿿]/.test(word);
    case 'ja':
      return /[぀-ヿ一-鿿]/.test(word);
    case 'ko':
      return /[가-힯ᄀ-ᇿ]/.test(word);
    case 'ru':
      return /[Ѐ-ӿ]/.test(word);
    case 'ar':
      return /[؀-ۿ]/.test(word);
    default:
      // Latin-script languages: reject anything carrying a non-Latin script.
      return /[a-zA-ZÀ-ÿ]/.test(word) && !/[Ѐ-ӿ؀-ۿ一-鿿]/.test(word);
  }
}

/**
 * Splits saved vocabulary into single words. Notebook entries are often whole
 * phrases; typing a phrase as one unit would make a single slip cost the entire
 * entry, so they are broken down.
 */
function normalizeLearnerWords(words: readonly string[], languageCode: string): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const raw of words) {
    for (const piece of String(raw).split(/[\s/、,，]+/)) {
      const word = piece.trim().replace(/^[("'¿¡]+|[)"'.,!?;:。，！？]+$/g, '');
      if (!word || word.length > 24) continue;
      if (!isTargetScript(word, languageCode)) continue;
      const key = word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      output.push(word);
    }
  }
  return output;
}

/**
 * Builds the word sequence for a test.
 *
 * Learner vocabulary leads when there is enough of it to avoid the same handful
 * of words cycling every few seconds; the bundled frequency list fills the rest
 * so a test is never padded by repeating one word.
 */
export function buildTestWords(
  config: TypingTestConfig,
  source: TypingWordSource,
  seed: string,
): string[] {
  const list = typingWordListForLanguage(config.languageCode);
  const random = createRandom(seed);

  const learner = config.useOwnVocabulary
    ? normalizeLearnerWords(source.learnerWords, config.languageCode)
    : [];

  // Below this, the learner's own words cycle too tightly to read as text.
  const learnerIsUsable = learner.length >= 12;
  const pool = learnerIsUsable ? [...learner, ...list.words] : list.words;

  const target = config.mode === 'words' ? config.amount : TIME_TEST_WORD_BUDGET;
  const words: string[] = [];
  let previous = '';

  for (let index = 0; index < target; index += 1) {
    let word = pool[Math.floor(random() * pool.length)] ?? list.words[0];
    // One retry is enough to break up immediate repeats without looping on a
    // tiny pool.
    if (word === previous && pool.length > 1) {
      word = pool[Math.floor(random() * pool.length)] ?? word;
    }
    previous = word;

    if (config.includeNumbers && random() < 0.05) {
      word = String(Math.floor(random() * 1000));
    }
    if (config.includePunctuation && random() < 0.12) {
      const marks = list.charsPerWord === 1 ? CJK_PUNCTUATION : PUNCTUATION;
      word += marks[Math.floor(random() * marks.length)];
    }
    words.push(word);
  }

  return words;
}

export function wordsToCharacters(words: readonly string[]): string {
  return words.join(' ');
}

/**
 * Gross speed: every character typed, right or wrong.
 */
export function computeRawWpm(
  typedCharacters: number,
  elapsedSeconds: number,
  charsPerWord: number,
): number {
  if (elapsedSeconds <= 0) return 0;
  return (typedCharacters / charsPerWord) / (elapsedSeconds / 60);
}

/**
 * Net speed: only characters that ended up correct.
 */
export function computeWpm(
  correctCharacters: number,
  elapsedSeconds: number,
  charsPerWord: number,
): number {
  if (elapsedSeconds <= 0) return 0;
  return (correctCharacters / charsPerWord) / (elapsedSeconds / 60);
}

export function computeAccuracy(correctKeystrokes: number, totalKeystrokes: number): number {
  if (totalKeystrokes <= 0) return 100;
  return (correctKeystrokes / totalKeystrokes) * 100;
}

/**
 * How even the speed was, as 100 minus the coefficient of variation.
 *
 * A run that holds one pace scores near 100; one that stalls and sprints scores
 * lower at the same average. Fewer than two samples cannot show variation, so
 * they score 100 rather than an invented number.
 */
export function computeConsistency(samples: readonly TypingSample[]): number {
  const values = samples.map((sample) => sample.rawWpm).filter((value) => value > 0);
  if (values.length < 2) return 100;

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean <= 0) return 0;

  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  const coefficientOfVariation = Math.sqrt(variance) / mean;
  return Math.max(0, Math.min(100, (1 - coefficientOfVariation) * 100));
}

export interface TypingRunTally {
  correctCharacters: number;
  incorrectCharacters: number;
  extraCharacters: number;
  missedCharacters: number;
  totalKeystrokes: number;
  elapsedSeconds: number;
  samples: TypingSample[];
}

export function summarizeRun(
  tally: TypingRunTally,
  config: TypingTestConfig,
  list: TypingWordList = typingWordListForLanguage(config.languageCode),
): TypingResult {
  const round = (value: number) => Math.round(value * 10) / 10;

  return {
    wpm: round(computeWpm(tally.correctCharacters, tally.elapsedSeconds, list.charsPerWord)),
    rawWpm: round(
      computeRawWpm(
        tally.correctCharacters + tally.incorrectCharacters + tally.extraCharacters,
        tally.elapsedSeconds,
        list.charsPerWord,
      ),
    ),
    accuracy: round(computeAccuracy(tally.correctCharacters, tally.totalKeystrokes)),
    consistency: round(computeConsistency(tally.samples)),
    elapsedSeconds: round(tally.elapsedSeconds),
    correctCharacters: tally.correctCharacters,
    incorrectCharacters: tally.incorrectCharacters,
    extraCharacters: tally.extraCharacters,
    missedCharacters: tally.missedCharacters,
    totalKeystrokes: tally.totalKeystrokes,
    charsPerWord: list.charsPerWord,
    samples: tally.samples,
    languageCode: config.languageCode,
    mode: config.mode,
    amount: config.amount,
    completedAt: new Date().toISOString(),
  };
}

/**
 * Characters the learner got wrong most often, for the post-run breakdown.
 * Only characters missed more than once are reported — a single slip is noise,
 * not a weakness.
 */
export function rankProblemCharacters(
  errors: ReadonlyMap<string, number>,
  limit = 8,
): Array<{ character: string; count: number }> {
  return [...errors.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([character, count]) => ({ character, count }));
}
