import { TokenOrderExercise } from './base/TokenOrderExercise';
import type { LearnExerciseProps } from './types';

export function ReorderSentenceExercise(props: LearnExerciseProps) {
  return <TokenOrderExercise {...props} />;
}
