import { ScriptCanvasExercise } from './ScriptCanvasExercise';
import type { ScriptExerciseProps } from './types';

export function FreeDrawScriptExercise(props: ScriptExerciseProps) {
  return <ScriptCanvasExercise {...props} mode="free_draw" note='Free draw: recall from memory, no guide overlay.' />;
}
