import { CorrectionReviewExercise } from './CorrectionReviewExercise';
import { DraftCompositionExercise } from './DraftCompositionExercise';

export const writeExerciseRegistry = {
  draft_composition: {
    component: DraftCompositionExercise,
    validate: (payload: Record<string, unknown>) => typeof payload.text === 'string',
    grading: 'hybrid',
  },
  correction_review: {
    component: CorrectionReviewExercise,
    validate: (payload: Record<string, unknown>) => Array.isArray(payload.corrections),
    grading: 'deterministic',
  },
} as const;
