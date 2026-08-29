/**
 * Statement construction for the true/false family of review cards
 * (`tf`, `tfj`, `seen_unseen`).
 *
 * All three used to hardcode their answer to `true`, so "False" was never once
 * the right response and the cards degraded into "press True to continue" —
 * they tested nothing. A false variant is built by pairing the term with a
 * different queue item's translation, which is a real discrimination test
 * rather than an invented meaning.
 */
import { createRandom } from '../../utils/seededRandom';
import { normalizeAnswer } from '../../utils/textNormalize';

export interface TruthCandidate {
  id: string;
  term: string;
  translation: string;
}

export interface TruthStatement {
  statement: string;
  correctBool: boolean;
  /** The item's real meaning, regardless of what the statement claims. */
  actualMeaning: string;
}

/**
 * Comparison form for rejecting a decoy that means the same thing.
 *
 * Uses the shared Unicode-aware normaliser rather than an `a-z`-only one,
 * which collapsed every CJK, Cyrillic and Arabic translation to an empty
 * string and so treated all of them as identical.
 */
const normalize = (value: string) => normalizeAnswer(value);

/**
 * Builds a true/false statement for `item`, drawing decoys from `pool`.
 *
 * The true/false decision is seeded from `seed` (card identity) so it stays
 * put across re-renders instead of flipping under the learner. With no usable
 * decoy in the pool the statement is true — a card that still grades honestly
 * is better than one asserting a meaning nothing in the queue supports.
 */
export function buildTruthStatement(
  item: TruthCandidate,
  pool: readonly TruthCandidate[],
  seed: string,
): TruthStatement {
  const random = createRandom(seed);
  const wantsFalse = random() < 0.5;

  if (wantsFalse) {
    const decoys = pool.filter(
      (candidate) =>
        candidate.id !== item.id &&
        normalize(candidate.translation) !== normalize(item.translation),
    );
    if (decoys.length > 0) {
      const decoy = decoys[Math.floor(random() * decoys.length)];
      return {
        statement: `"${item.term}" means "${decoy.translation}".`,
        correctBool: false,
        actualMeaning: item.translation,
      };
    }
  }

  return {
    statement: `"${item.term}" means "${item.translation}".`,
    correctBool: true,
    actualMeaning: item.translation,
  };
}
