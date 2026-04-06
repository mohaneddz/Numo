import { PairMatchExercise } from './base/PairMatchExercise';
import type { LearnExerciseProps } from './types';

export function MatchSentenceTranslationExercise(props: LearnExerciseProps) {
  return <PairMatchExercise {...props} />;
}
