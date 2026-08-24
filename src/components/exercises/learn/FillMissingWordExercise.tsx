import { TextEntryExercise } from './base/TextEntryExercise';
import type { LearnExerciseProps } from './types';

export function FillMissingWordExercise(props: LearnExerciseProps) {
  return <TextEntryExercise {...props} placeholder='Type the missing word...' minLength={1} />;
}
