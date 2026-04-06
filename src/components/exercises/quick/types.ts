import type React from 'react';
import type { PracticeItem, PracticeItemType } from '../../../lib/sessionEngine';
import type { ExerciseGradingStrategy } from '../shared/types';

export interface QuickExerciseProps {
  item: PracticeItem;
  disabled: boolean;
  onAnswer: (answer: string, structuredResponse?: Record<string, unknown>) => void;
}

export interface QuickExerciseRegistration {
  component: React.ComponentType<QuickExerciseProps>;
  validate: (item: PracticeItem) => boolean;
  grading: ExerciseGradingStrategy;
}

export type QuickExerciseRegistry = Record<PracticeItemType, QuickExerciseRegistration>;

