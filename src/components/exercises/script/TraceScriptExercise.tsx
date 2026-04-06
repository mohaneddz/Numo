import { ScriptCanvasExercise } from './ScriptCanvasExercise';
import type { ScriptExerciseProps } from './types';

export function TraceScriptExercise(props: ScriptExerciseProps) {
  return <ScriptCanvasExercise {...props} mode="trace" note='Trace mode: follow the ghost template stroke by stroke.' />;
}
