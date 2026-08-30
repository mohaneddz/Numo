/**
 * Validation for the correction list a model returns for a piece of writing.
 *
 * Every other AI-backed path in the app validates strictly and drops content it
 * cannot use, rather than passing it through to the learner. The writing
 * reviewer was the exception: it parsed the response and stored whatever came
 * back, so a malformed entry reached the UI and the evidence record intact.
 */

export type WritingCorrectionType = 'grammar' | 'spelling' | 'style' | 'correct';

export interface WritingCorrection {
  original: string;
  corrected: string;
  type: WritingCorrectionType;
  explanation: string;
}

const VALID_TYPES: ReadonlySet<string> = new Set(['grammar', 'spelling', 'style', 'correct']);

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Extracts the JSON array from a model response.
 *
 * Models wrap arrays in prose or fences often enough that failing on the first
 * stray character would reject usable output.
 */
export function extractCorrectionArray(raw: string): unknown {
  const fenced = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');

  const start = fenced.indexOf('[');
  const end = fenced.lastIndexOf(']');
  const candidate = start >= 0 && end > start ? fenced.slice(start, end + 1) : fenced;

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

/**
 * Keeps only the corrections that are actually usable.
 *
 * An entry with no original text has nothing to point at in the learner's
 * writing, and an unrecognised type would render as an unstyled tag, so both
 * are dropped instead of shown.
 */
export function parseWritingCorrections(raw: string): WritingCorrection[] {
  const parsed = extractCorrectionArray(raw);
  if (!Array.isArray(parsed)) return [];

  const corrections: WritingCorrection[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') continue;

    const record = entry as Record<string, unknown>;
    const original = asTrimmedString(record.original);
    if (!original) continue;

    const type = asTrimmedString(record.type).toLowerCase();
    if (!VALID_TYPES.has(type)) continue;

    const corrected = asTrimmedString(record.corrected) || original;

    corrections.push({
      original,
      // A "correct" entry marks text that needed no change, so a differing
      // correction on one is contradictory — the original stands.
      corrected: type === 'correct' ? original : corrected,
      type: type as WritingCorrectionType,
      explanation: asTrimmedString(record.explanation),
    });
  }

  return corrections;
}

/** Corrections that represent an actual change, for counting real issues. */
export function countRealCorrections(corrections: readonly WritingCorrection[]): number {
  return corrections.filter((correction) => correction.type !== 'correct').length;
}
