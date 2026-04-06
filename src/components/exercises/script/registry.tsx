import { FreeDrawScriptExercise } from './FreeDrawScriptExercise';
import { GuidedDrawScriptExercise } from './GuidedDrawScriptExercise';
import { TimedRecallDrawScriptExercise } from './TimedRecallDrawScriptExercise';
import { TraceScriptExercise } from './TraceScriptExercise';
import type { ScriptExerciseRegistry } from './types';
import { WatchScriptExercise } from './WatchScriptExercise';

const isPayloadValid = (payload: { width: number; height: number }) => payload.width > 0 && payload.height > 0;

export const scriptExerciseRegistry = {
  watch: { component: WatchScriptExercise, validate: isPayloadValid, grading: 'deterministic' },
  trace: { component: TraceScriptExercise, validate: isPayloadValid, grading: 'deterministic' },
  guided_draw: { component: GuidedDrawScriptExercise, validate: isPayloadValid, grading: 'deterministic' },
  free_draw: { component: FreeDrawScriptExercise, validate: isPayloadValid, grading: 'deterministic' },
  timed_recall_draw: { component: TimedRecallDrawScriptExercise, validate: isPayloadValid, grading: 'deterministic' },
} satisfies ScriptExerciseRegistry;
