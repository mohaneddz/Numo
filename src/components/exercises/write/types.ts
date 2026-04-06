import type React from 'react';
import type { ExerciseGradingStrategy } from '../shared/types';

export type WriteExerciseType = 'draft_composition' | 'correction_review';

export interface WriteCorrectionItem {
  original: string;
  corrected: string;
  type: 'grammar' | 'spelling' | 'correct' | 'style';
  explanation: string;
}

export interface DraftCompositionProps {
  text: string;
  onTextChange: (value: string) => void;
  onToggleCorrections: () => void;
  onAnalyze: () => void;
  showCorrections: boolean;
  isAnalyzing: boolean;
  wordCount: number;
  error: string | null;
}

export interface CorrectionReviewProps {
  corrections: WriteCorrectionItem[];
}

export interface WriteExerciseRegistration {
  component: React.ComponentType<unknown>;
  validate: (payload: Record<string, unknown>) => boolean;
  grading: ExerciseGradingStrategy;
}
