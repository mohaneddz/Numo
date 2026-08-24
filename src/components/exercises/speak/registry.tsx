import { GuidedRepeatSpeakExercise } from './GuidedRepeatSpeakExercise';
import type { SpeakExerciseRegistry } from './types';

export const speakExerciseRegistry = {
  guided_repeat: {
    component: GuidedRepeatSpeakExercise,
    validate: (payload) => payload.target.trim().length > 0 && payload.gloss.trim().length > 0,
    grading: 'hybrid',
  },
} satisfies SpeakExerciseRegistry;
