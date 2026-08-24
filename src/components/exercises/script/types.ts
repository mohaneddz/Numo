import type React from 'react';
import type { ScriptPracticeMode, ScriptPracticePayload } from '../../../types/scriptPractice';
import type { ExerciseGradingStrategy } from '../shared/types';

export interface ScriptExerciseProps {
  payload: ScriptPracticePayload;
  onChange: (payload: ScriptPracticePayload) => void;
}

export interface ScriptExerciseRegistration {
  component: React.ComponentType<ScriptExerciseProps>;
  validate: (payload: ScriptPracticePayload) => boolean;
  grading: ExerciseGradingStrategy;
}

export type ScriptExerciseRegistry = Record<ScriptPracticeMode, ScriptExerciseRegistration>;
