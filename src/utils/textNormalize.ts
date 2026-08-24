/**
 * Unicode-aware text normalization and comparison for answer grading.
 *
 * The previous implementation stripped every character outside `[a-z0-9]`, which
 * silently reduced any Chinese, Japanese, Korean, Arabic, Hebrew, Russian, Greek,
 * Hindi or Thai answer to the empty string. Every non-Latin answer was therefore
 * graded as "no answer submitted". Grading has to keep the letters of the script
 * the learner is actually studying.
 */

/** Scripts that do not separate words with spaces. */
const SPACELESS_SCRIPT_LANGUAGES = new Set(['zh', 'ja', 'yue', 'wuu', 'th', 'lo', 'km', 'my']);

/**
 * Answer markers (`[[target]]`) are injected by the task pipeline so the UI can
 * highlight target-language spans. They must never reach comparison or display.
 */
const TARGET_MARKER = /\[\[([\s\S]*?)\]\]/g;

export function stripTargetMarkers(value: string): string {
  return value.replace(TARGET_MARKER, '$1');
}

/** Removes combining marks (accents, diacritics) while keeping the base letters. */
export function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/\p{M}+/gu, '').normalize('NFC');
}

/**
 * Canonical comparison form: markers removed, case folded, punctuation dropped,
 * whitespace collapsed. Letters and digits of every script are preserved.
 */
export function normalizeAnswer(value: string, languageCode?: string): string {
  const collapsed = stripTargetMarkers(value)
    .normalize('NFC')
    .toLowerCase()
    // Keep letters, numbers and marks from any script; everything else is separator.
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (languageCode && SPACELESS_SCRIPT_LANGUAGES.has(languageCode)) {
    return collapsed.replace(/\s+/g, '');
  }
  return collapsed;
}

/** Comparison form that additionally ignores accents. */
export function normalizeAnswerLoose(value: string, languageCode?: string): string {
  return stripDiacritics(normalizeAnswer(value, languageCode));
}

export type AnswerMatchKind = 'exact' | 'diacritic' | 'partial' | 'none' | 'empty';

export interface AnswerMatch {
  kind: AnswerMatchKind;
  /** 0-100. Callers decide their own pass threshold. */
  score: number;
  correct: boolean;
  /** Short learner-facing note when the match was not exact. */
  note?: string;
}

/**
 * Grades a free-text answer against an expected answer.
 *
 * An accent-only miss is treated as correct-with-a-note rather than wrong: the
 * learner knew the word, and marking `si` wrong for `sí` teaches keyboard layout,
 * not language. A containment match is partial credit, never full.
 */
export function matchAnswer(expected: string, actual: string, languageCode?: string): AnswerMatch {
  const expectedNorm = normalizeAnswer(expected, languageCode);
  const actualNorm = normalizeAnswer(actual, languageCode);

  if (!actualNorm) {
    return { kind: 'empty', score: 0, correct: false, note: 'No answer submitted.' };
  }
  if (!expectedNorm) {
    // Nothing to compare against; treat any answer as unverifiable rather than wrong.
    return { kind: 'none', score: 0, correct: false, note: 'This task has no reference answer.' };
  }
  if (expectedNorm === actualNorm) {
    return { kind: 'exact', score: 100, correct: true };
  }

  const expectedLoose = stripDiacritics(expectedNorm);
  const actualLoose = stripDiacritics(actualNorm);
  if (expectedLoose === actualLoose) {
    return {
      kind: 'diacritic',
      score: 92,
      correct: true,
      note: 'Right word — check the accent marks.',
    };
  }

  // Partial credit only when the learner produced a real prefix/suffix of the
  // target (or vice versa) and the overlap is substantial.
  const [shorter, longer] = expectedLoose.length <= actualLoose.length
    ? [expectedLoose, actualLoose]
    : [actualLoose, expectedLoose];
  const overlapRatio = shorter.length / longer.length;
  if (longer.includes(shorter) && overlapRatio >= 0.6) {
    return {
      kind: 'partial',
      score: Math.round(55 + overlapRatio * 20),
      correct: false,
      note: 'Close — the full target form is a little different.',
    };
  }

  return { kind: 'none', score: 0, correct: false };
}

/** True when the two strings are the same answer (exact or accent-only difference). */
export function answersEqual(a: string, b: string, languageCode?: string): boolean {
  return matchAnswer(a, b, languageCode).correct;
}

/**
 * Splits text into display tokens, preserving separators, for per-word interaction.
 * CJK text has no word spaces, so it is split per character instead.
 */
export function tokenizeForDisplay(value: string, languageCode?: string): string[] {
  if (languageCode && SPACELESS_SCRIPT_LANGUAGES.has(languageCode)) {
    return Array.from(value);
  }
  return value.split(/(\s+)/).filter((part) => part.length > 0);
}

export function isSpacelessScript(languageCode?: string): boolean {
  return Boolean(languageCode && SPACELESS_SCRIPT_LANGUAGES.has(languageCode));
}
