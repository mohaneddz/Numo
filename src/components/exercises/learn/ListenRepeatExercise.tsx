import { TextEntryExercise } from './base/TextEntryExercise';
import type { LearnExerciseProps } from './types';

export function ListenRepeatExercise(props: LearnExerciseProps) {
  return <TextEntryExercise {...props} placeholder='Type what you repeated...' minLength={2} />;
}
