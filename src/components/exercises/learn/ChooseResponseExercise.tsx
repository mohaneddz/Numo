import { OptionSelectExercise } from './base/OptionSelectExercise';
import type { LearnExerciseProps } from './types';

export function ChooseResponseExercise(props: LearnExerciseProps) {
  return <OptionSelectExercise {...props} />;
}
