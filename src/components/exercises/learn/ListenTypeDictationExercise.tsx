import { TextEntryExercise } from './base/TextEntryExercise';
import type { LearnExerciseProps } from './types';

/**
 * Dictation: hear a line, write it down.
 *
 * Distinct from `listen_choose_written`, which offers written options to pick
 * between, and from `listen_repeat`, which asks the learner to say it back.
 * Producing the spelling from sound is its own skill and nothing else in the
 * app tested it.
 *
 * The prompt deliberately carries no target text — the audio is the whole
 * question, so showing what was said would answer it.
 */
export function ListenTypeDictationExercise(props: LearnExerciseProps) {
  return <TextEntryExercise {...props} rows={2} placeholder="Type what you hear" />;
}
