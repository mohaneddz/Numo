import { SpeakRepeatExercise } from './base/SpeakRepeatExercise';
import type { LearnExerciseProps } from './types';

export function ListenRepeatExercise(props: LearnExerciseProps) {
  return <SpeakRepeatExercise {...props} />;
}
