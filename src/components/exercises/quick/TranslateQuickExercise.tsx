import type { QuickExerciseProps } from './types';
import { QuickTextAreaExercise } from './QuickTextAreaExercise';

export function TranslateQuickExercise(props: QuickExerciseProps) {
  return <QuickTextAreaExercise {...props} placeholder="Type your answer..." />;
}

