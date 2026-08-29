/**
 * Option construction for multiple-choice review cards.
 *
 * Distractors used to be manufactured out of the correct answer itself —
 * "<answer> (formal)", "<answer> now", and the answer with a leading "to" or
 * "the" removed. They gave the answer away, and on a non-English translation
 * the word-removal rules matched nothing, so a card could be left with barely
 * any alternatives at all.
 */
import { seededShuffle } from '../../utils/seededRandom';
import { normalizeAnswer } from '../../utils/textNormalize';

export interface ChoiceCandidate {
  id: string;
  translation: string;
}

/** Options offered on a choice card, including the correct one. */
export const MAX_CHOICE_OPTIONS = 4;

/**
 * Builds the options for a choice card, drawing distractors from `pool`.
 *
 * Distractors are other translations the learner actually has in their queue,
 * which makes the card a real discrimination test. The order is seeded from the
 * item so grading one card does not reshuffle the rest of the session.
 *
 * Returns fewer than two options when the pool has nothing genuinely different
 * to offer — the caller is expected to fall back to another card type rather
 * than pad the list out with something invented.
 */
export function buildChoiceOptions(
  item: ChoiceCandidate,
  pool: readonly ChoiceCandidate[],
  seed = `options-${item.id}`,
): string[] {
  const correct = item.translation?.trim();
  if (!correct) return [];

  const seen = new Set([normalizeAnswer(correct)]);
  const distractors: string[] = [];

  for (const candidate of pool) {
    if (distractors.length >= MAX_CHOICE_OPTIONS - 1) break;
    if (candidate.id === item.id) continue;

    const translation = candidate.translation?.trim();
    if (!translation) continue;

    const key = normalizeAnswer(translation);
    if (!key || seen.has(key)) continue;

    seen.add(key);
    distractors.push(translation);
  }

  return seededShuffle([correct, ...distractors], seed);
}
