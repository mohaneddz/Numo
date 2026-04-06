import type React from 'react';
import type { ExerciseGradingStrategy } from '../shared/types';

export type ReviewCardType =
  | 'reveal'
  | 'multiple'
  | 'write'
  | 'build'
  | 'tf'
  | 'tfj'
  | 'flash_recall'
  | 'delayed_recall'
  | 'seen_unseen'
  | 'confusion_pair'
  | 'radical_recall'
  | 'reading_recall';

export interface ReviewQuestion {
  id: string;
  type: ReviewCardType;
  term: string;
  prompt: string;
  answer: string;
  hint?: string;
  options?: string[];
  correctIndex?: number;
  statement?: string;
  correctBool?: boolean;
  bank?: string[];
  expectedReason?: string;
  sourceId?: string;
  scriptHint?: string;
}

export interface ReviewExerciseProps {
  question: ReviewQuestion;
  done: boolean;
  checking: boolean;
  onGrade: (result: 'correct' | 'incorrect', message?: string) => void;
  onSetPick?: (index: number | null) => void;
  pick?: number | null;
  onSetText?: (value: string) => void;
  text?: string;
  onSubmitWrite?: () => void;
  onSetBuild?: (value: string[]) => void;
  build?: string[];
  onSetTf?: (value: boolean | null) => void;
  tf?: boolean | null;
  onSetWhy?: (value: string) => void;
  why?: string;
  onSubmitTfj?: () => void;
  onSetReveal?: (value: boolean) => void;
  revealed?: boolean;
  onSkip: () => void;
}

export interface ReviewExerciseRegistration {
  component: React.ComponentType<ReviewExerciseProps>;
  validate: (question: ReviewQuestion) => boolean;
  grading: ExerciseGradingStrategy;
}

export type ReviewExerciseRegistry = Record<ReviewCardType, ReviewExerciseRegistration>;
