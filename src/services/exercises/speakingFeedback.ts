/**
 * Validation for the pronunciation feedback a model returns.
 *
 * The speaking session's outer failure path was fixed to report honestly, but
 * the inner one — the model replying with something unparseable — still
 * fabricated `accuracy: 80, fluency: 75, "Great job! Keep practicing your
 * vowels."` and saved it as a real result. A learner was told they scored 80
 * because the response could not be read, and that score went into their
 * speaking history and the learner model.
 *
 * Missing fields were also defaulted to 75, so a reply with no scores in it
 * still produced a passing grade.
 */

export interface SpeakingFeedback {
  accuracy: number;
  fluency: number;
  tip: string;
}

function asScore(value: unknown): number | null {
  const score = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(score)) return null;
  if (score < 0 || score > 100) return null;
  return Math.round(score);
}

/**
 * Parses a feedback response, or returns null when it cannot be trusted.
 *
 * Null means "say so", not "assume a pass": every field has to be present and
 * in range, because there is no honest way to guess a pronunciation score.
 */
export function parseSpeakingFeedback(raw: string): SpeakingFeedback | null {
  const fenced = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');

  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(fenced.slice(start, end + 1));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const record = parsed as Record<string, unknown>;

  const accuracy = asScore(record.accuracy);
  const fluency = asScore(record.fluency);
  if (accuracy === null || fluency === null) return null;

  const tip = typeof record.tip === 'string' ? record.tip.trim() : '';

  return {
    accuracy,
    fluency,
    // A missing tip is survivable — the scores are the graded part — so this
    // says nothing rather than inventing encouragement.
    tip: tip || 'No specific tip was returned for this attempt.',
  };
}
