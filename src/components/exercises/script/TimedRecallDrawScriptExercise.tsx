import { ScriptCanvasExercise } from './ScriptCanvasExercise';
import type { ScriptExerciseProps } from './types';

export function TimedRecallDrawScriptExercise(props: ScriptExerciseProps) {
  return <ScriptCanvasExercise {...props} mode="timed_recall_draw" note='Timed recall: draw quickly from memory and compare against model.' />;
}
