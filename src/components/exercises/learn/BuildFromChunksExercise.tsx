import { TokenOrderExercise } from './base/TokenOrderExercise';
import type { LearnExerciseProps } from './types';

export function BuildFromChunksExercise(props: LearnExerciseProps) {
  return <TokenOrderExercise {...props} />;
}
