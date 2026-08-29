import { ScriptCanvasExercise } from './ScriptCanvasExercise';
import type { ScriptExerciseProps } from './types';

export function GuidedDrawScriptExercise(props: ScriptExerciseProps) {
  return <ScriptCanvasExercise {...props} mode="guided_draw" note='Guided draw: only the next stroke is shown, one at a time.' />;
}
