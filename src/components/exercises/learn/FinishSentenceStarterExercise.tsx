import { TextEntryExercise } from './base/TextEntryExercise';
import type { LearnExerciseProps } from './types';

export function FinishSentenceStarterExercise(props: LearnExerciseProps) {
  return <TextEntryExercise {...props} placeholder='Complete the sentence...' minLength={3} />;
}
