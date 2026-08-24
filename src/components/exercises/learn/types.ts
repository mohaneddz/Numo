import type { TaskType } from '../../../types/learningPlan';
import type React from 'react';
import type { ExerciseDraft, ExerciseGradingStrategy } from '../shared/types';

export interface LearnPair {
  left: string;
  right: string;
}

export interface LearnGroup {
  name: string;
  items: string[];
}

export interface LearnTaskPayload {
  languageCode?: string;
  promptText?: string;
  expectedText?: string;
  options?: string[];
  correctOption?: string;
  pairs?: LearnPair[];
  tokens?: string[];
  groups?: LearnGroup[];
  statement?: string;
  audioText?: string;
  /**
   * Wrong answers for option-based exercises.
   *
   * These are NOT hints. They were previously piped straight into `HintSection`,
   * which showed the learner every wrong answer under a lightbulb. Hints now come
   * from `teachingNote` / `translation` / the answer's shape instead.
   */
  distractors?: string[];
  imageUrl?: string;
  imageAlt?: string;
  translation?: string;
  romanization?: string;
  partOfSpeech?: string;
  example?: string;
  /** One-line English explanation of the point being taught. */
  teachingNote?: string;
  /** Stable seed so shuffles do not move under the learner between renders. */
  taskSeed?: string;
}

export interface LearnExerciseProps {
  payload: LearnTaskPayload;
  disabled: boolean;
  onDraftChange: (draft: ExerciseDraft) => void;
  /** Reports hint levels opened, so grading and scheduling can account for support. */
  onHintLevelOpened?: (level: number) => void;
  /** Reports audio replays, as a signal of listening difficulty. */
  onAudioReplay?: (playCount: number) => void;
}

export interface LearnExerciseRegistration {
  component: React.ComponentType<LearnExerciseProps>;
  validatePayload: (payload: Record<string, unknown>, fallback: LearnTaskPayload) => LearnTaskPayload | null;
  grading: ExerciseGradingStrategy;
}

export type LearnExerciseRegistry = Record<TaskType, LearnExerciseRegistration>;

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
}

export function asPairs(value: unknown): LearnPair[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const left = typeof (item as { left?: unknown }).left === 'string' ? (item as { left: string }).left.trim() : '';
      const right = typeof (item as { right?: unknown }).right === 'string' ? (item as { right: string }).right.trim() : '';
      if (!left || !right) return null;
      return { left, right };
    })
    .filter((item): item is LearnPair => Boolean(item));
}

export function asGroups(value: unknown): LearnGroup[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const name = typeof (item as { name?: unknown }).name === 'string' ? (item as { name: string }).name.trim() : '';
      const items = asStringArray((item as { items?: unknown }).items);
      if (!name || items.length === 0) return null;
      return { name, items };
    })
    .filter((item): item is LearnGroup => Boolean(item));
}

/** Shared props for the hint block, assembled from whichever payload fields exist. */
export function hintPropsFor(payload: LearnTaskPayload) {
  return {
    expectedAnswer: payload.expectedText ?? payload.correctOption ?? '',
    languageCode: payload.languageCode,
    teachingNote: payload.teachingNote,
    translation: payload.translation,
    romanization: payload.romanization,
  };
}

/** Stable per-task seed for shuffles. Falls back to the task's own content. */
export function seedFor(payload: LearnTaskPayload): string {
  return payload.taskSeed ?? `${payload.promptText ?? ''}|${payload.expectedText ?? payload.correctOption ?? ''}`;
}
