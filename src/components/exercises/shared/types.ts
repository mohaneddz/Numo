export type ExerciseGradingStrategy = 'deterministic' | 'ai' | 'hybrid';

export interface ExerciseSubmission {
  canonicalAnswer: string;
  structuredResponse: Record<string, unknown>;
}

export interface ExerciseDraft {
  canonicalAnswer: string;
  structuredResponse: Record<string, unknown>;
  ready: boolean;
}

export const EMPTY_DRAFT: ExerciseDraft = {
  canonicalAnswer: '',
  structuredResponse: {},
  ready: false,
};

