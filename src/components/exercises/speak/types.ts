import type React from 'react';
import type { ExerciseGradingStrategy } from '../shared/types';

export type SpeakExerciseType = 'guided_repeat';

export interface SpeakExerciseProps {
  target: string;
  gloss: string;
  isRecording: boolean;
  audioLevel: number;
  isProcessing: boolean;
  transcription: string;
  error: string | null;
  feedback: { accuracy: number; fluency: number; tip: string } | null;
  audioRef: React.RefObject<HTMLAudioElement>;
  onToggleRecording: () => void;
  onListenNative: () => void;
  onTryAgain: () => void;
}

export interface SpeakExerciseRegistration {
  component: React.ComponentType<SpeakExerciseProps>;
  validate: (payload: { target: string; gloss: string }) => boolean;
  grading: ExerciseGradingStrategy;
}

export type SpeakExerciseRegistry = Record<SpeakExerciseType, SpeakExerciseRegistration>;
