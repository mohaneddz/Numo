import { TextEntryExercise } from './base/TextEntryExercise';
import type { LearnExerciseProps } from './types';

export function CompleteDialogueExercise(props: LearnExerciseProps) {
  return <TextEntryExercise {...props} placeholder='Complete the dialogue turn...' minLength={2} />;
}
