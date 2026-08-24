import { TextEntryExercise } from './base/TextEntryExercise';
import type { LearnExerciseProps } from './types';

export function TransformStatementQuestionExercise(props: LearnExerciseProps) {
  return <TextEntryExercise {...props} placeholder='Rewrite as a question...' minLength={2} />;
}
