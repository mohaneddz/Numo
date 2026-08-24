import { TextEntryExercise } from './base/TextEntryExercise';
import type { LearnExerciseProps } from './types';

export function ExplainPronunciationRuleExercise(props: LearnExerciseProps) {
  return <TextEntryExercise {...props} placeholder='Explain in one short line...' minLength={6} />;
}
