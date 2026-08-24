import { TextEntryExercise } from './base/TextEntryExercise';
import type { LearnExerciseProps } from './types';

export function ReplaceSynonymExercise(props: LearnExerciseProps) {
  return <TextEntryExercise {...props} placeholder='Rewrite with a synonym...' minLength={2} />;
}
