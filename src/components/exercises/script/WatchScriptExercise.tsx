import { ScriptCanvasExercise } from './ScriptCanvasExercise';
import type { ScriptExerciseProps } from './types';

export function WatchScriptExercise(props: ScriptExerciseProps) {
  return <ScriptCanvasExercise {...props} mode="watch" note='Watch mode: inspect stroke order, numbers, and direction cues before drawing.' />;
}
