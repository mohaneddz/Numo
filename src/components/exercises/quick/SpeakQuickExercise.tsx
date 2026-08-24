import type { QuickExerciseProps } from './types';
import { QuickTextAreaExercise } from './QuickTextAreaExercise';

export function SpeakQuickExercise(props: QuickExerciseProps) {
  return <QuickTextAreaExercise {...props} placeholder="Type what you said... (microphone mock)" />;
}

