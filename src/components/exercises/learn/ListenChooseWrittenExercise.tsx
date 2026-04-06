import { OptionSelectExercise } from './base/OptionSelectExercise';
import type { LearnExerciseProps } from './types';

export function ListenChooseWrittenExercise(props: LearnExerciseProps) {
  return <OptionSelectExercise {...props} />;
}
