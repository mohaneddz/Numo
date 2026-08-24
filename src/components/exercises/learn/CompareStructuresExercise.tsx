import { TextEntryExercise } from './base/TextEntryExercise';
import type { LearnExerciseProps } from './types';

export function CompareStructuresExercise(props: LearnExerciseProps) {
  return <TextEntryExercise {...props} placeholder='Choose better structure and briefly explain...' minLength={6} />;
}
