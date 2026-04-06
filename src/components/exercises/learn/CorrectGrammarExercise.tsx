import { TextEntryExercise } from './base/TextEntryExercise';
import type { LearnExerciseProps } from './types';

export function CorrectGrammarExercise(props: LearnExerciseProps) {
  return <TextEntryExercise {...props} placeholder='Type corrected sentence...' minLength={2} />;
}
