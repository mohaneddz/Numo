import { ScriptCanvasExercise } from './ScriptCanvasExercise';
import type { ScriptExerciseProps } from './types';

export function TimedRecallDrawScriptExercise(props: ScriptExerciseProps) {
  return <ScriptCanvasExercise {...props} mode="timed_recall_draw" note='Timed recall: the character is shown for five seconds, then you draw it from memory.' />;
}
