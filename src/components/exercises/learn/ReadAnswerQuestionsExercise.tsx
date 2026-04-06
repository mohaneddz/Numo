import { TextEntryExercise } from './base/TextEntryExercise';
import type { LearnExerciseProps } from './types';

export function ReadAnswerQuestionsExercise(props: LearnExerciseProps) {
  return <TextEntryExercise {...props} placeholder='Answer the question...' minLength={2} />;
}
