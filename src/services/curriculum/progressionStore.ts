/**
 * Persisted progression through the curriculum.
 *
 * The Learn page previously recomputed its roadmap from a pure function on every
 * render, with checkpoint 1 hard-coded as the only available one and every other
 * checkpoint permanently locked. Nothing was ever written back, so finishing a
 * session unlocked nothing and the sidebar's "0 of 20 checkpoints" was literal.
 *
 * This store owns the one piece of state that must survive a reload: how far the
 * learner has actually got.
 */

import { initializePersistence } from '../../persistence';
import { THEMES } from './skillGraph';

const STORE_VERSION = 1;

export interface CheckpointResult {
  /** Average score across the checkpoint's steps, 0-100. */
  score: number;
  completedAt: string;
  stepsCompleted: number;
}

export interface ProgressionState {
  /** 1-based order of the theme the learner is currently working through. */
  currentThemeOrder: number;
  /** Highest theme order the learner is allowed to open. */
  unlockedThemeOrder: number;
  /** Everdark level currently selected for the current theme. */
  currentEverdarkLevel: number;
  /** Highest Everdark level unlocked, keyed by theme id. */
  unlockedEverdarkByTheme: Record<string, number>;
  /** Completed step ids. Step ids are stable across sessions. */
  completedStepIds: string[];
  /** Results keyed by checkpoint id. */
  checkpointResults: Record<string, CheckpointResult>;
  /** Total minutes of study attributed to this language. */
  totalMinutes: number;
  /** ISO date (YYYY-MM-DD) → minutes studied, for streaks and the daily goal. */
  minutesByDate: Record<string, number>;
  updatedAt: string;
}

export function createInitialProgression(): ProgressionState {
  return {
    currentThemeOrder: 1,
    unlockedThemeOrder: 1,
    currentEverdarkLevel: 1,
    unlockedEverdarkByTheme: {},
    completedStepIds: [],
    checkpointResults: {},
    totalMinutes: 0,
    minutesByDate: {},
    updatedAt: new Date(0).toISOString(),
  };
}

function storeKey(learnerId: string, languageCode: string): string {
  return `curriculum_progression_v${STORE_VERSION}:${learnerId}:${languageCode}`;
}

const cache = new Map<string, ProgressionState>();

function normalize(state: Partial<ProgressionState> | null): ProgressionState {
  const base = createInitialProgression();
  if (!state) return base;
  return {
    ...base,
    ...state,
    unlockedEverdarkByTheme: state.unlockedEverdarkByTheme ?? {},
    completedStepIds: state.completedStepIds ?? [],
    checkpointResults: state.checkpointResults ?? {},
    minutesByDate: state.minutesByDate ?? {},
  };
}

export async function loadProgression(learnerId: string, languageCode: string): Promise<ProgressionState> {
  const key = storeKey(learnerId, languageCode);
  const cached = cache.get(key);
  if (cached) return cached;

  let stored: ProgressionState | null = null;
  try {
    const persistence = await initializePersistence();
    stored = await persistence.repositories.settings.getJson<ProgressionState>(key);
  } catch (error) {
    console.error('progressionStore: failed to load progression', error);
  }

  const state = normalize(stored);
  cache.set(key, state);
  return state;
}

export function peekProgression(learnerId: string, languageCode: string): ProgressionState | null {
  return cache.get(storeKey(learnerId, languageCode)) ?? null;
}

async function save(learnerId: string, languageCode: string, state: ProgressionState): Promise<ProgressionState> {
  const key = storeKey(learnerId, languageCode);
  const next = { ...state, updatedAt: new Date().toISOString() };
  cache.set(key, next);
  try {
    const persistence = await initializePersistence();
    await persistence.repositories.settings.setJson(key, next, 'curriculum_progression');
  } catch (error) {
    console.error('progressionStore: failed to save progression', error);
  }
  return next;
}

export async function updateProgression(
  learnerId: string,
  languageCode: string,
  mutate: (state: ProgressionState) => ProgressionState,
): Promise<ProgressionState> {
  const current = await loadProgression(learnerId, languageCode);
  return save(learnerId, languageCode, mutate(current));
}

export function isStepCompleted(state: ProgressionState, stepId: string): boolean {
  return state.completedStepIds.includes(stepId);
}

export function isCheckpointCompleted(state: ProgressionState, checkpointId: string): boolean {
  return Boolean(state.checkpointResults[checkpointId]);
}

/** Records a finished step and the study time it took. */
export async function recordStepCompletion(
  learnerId: string,
  languageCode: string,
  input: { stepId: string; minutes: number },
): Promise<ProgressionState> {
  return updateProgression(learnerId, languageCode, (state) => {
    const dateKey = new Date().toISOString().slice(0, 10);
    const minutes = Math.max(0, Math.round(input.minutes));
    return {
      ...state,
      completedStepIds: state.completedStepIds.includes(input.stepId)
        ? state.completedStepIds
        : [...state.completedStepIds, input.stepId],
      totalMinutes: state.totalMinutes + minutes,
      minutesByDate: {
        ...state.minutesByDate,
        [dateKey]: (state.minutesByDate[dateKey] ?? 0) + minutes,
      },
    };
  });
}

/**
 * Records a finished checkpoint and advances the unlocks it earns.
 *
 * Finishing the last checkpoint of a theme unlocks the next theme; finishing a
 * theme at the current Everdark level unlocks the next Everdark level for it.
 */
export async function recordCheckpointCompletion(
  learnerId: string,
  languageCode: string,
  input: {
    checkpointId: string;
    themeId: string;
    themeOrder: number;
    everdarkLevel: number;
    checkpointIndex: number;
    totalCheckpoints: number;
    score: number;
    stepsCompleted: number;
  },
): Promise<ProgressionState> {
  return updateProgression(learnerId, languageCode, (state) => {
    const isFinalCheckpoint = input.checkpointIndex >= input.totalCheckpoints - 1;
    const currentEverdarkUnlock = state.unlockedEverdarkByTheme[input.themeId] ?? 1;

    return {
      ...state,
      checkpointResults: {
        ...state.checkpointResults,
        [input.checkpointId]: {
          score: Math.round(input.score),
          completedAt: new Date().toISOString(),
          stepsCompleted: input.stepsCompleted,
        },
      },
      unlockedThemeOrder: isFinalCheckpoint
        ? Math.min(THEMES.length, Math.max(state.unlockedThemeOrder, input.themeOrder + 1))
        : state.unlockedThemeOrder,
      unlockedEverdarkByTheme: isFinalCheckpoint
        ? {
            ...state.unlockedEverdarkByTheme,
            [input.themeId]: Math.max(currentEverdarkUnlock, input.everdarkLevel + 1),
          }
        : state.unlockedEverdarkByTheme,
    };
  });
}

/** Persists which theme/level the learner is looking at, so it survives navigation. */
export async function setActiveThemeSelection(
  learnerId: string,
  languageCode: string,
  input: { themeOrder: number; everdarkLevel: number },
): Promise<ProgressionState> {
  return updateProgression(learnerId, languageCode, (state) => ({
    ...state,
    currentThemeOrder: input.themeOrder,
    currentEverdarkLevel: input.everdarkLevel,
  }));
}

export function unlockedEverdarkLevel(state: ProgressionState, themeId: string): number {
  return state.unlockedEverdarkByTheme[themeId] ?? 1;
}

export function minutesToday(state: ProgressionState): number {
  return state.minutesByDate[new Date().toISOString().slice(0, 10)] ?? 0;
}

/** Consecutive days with any study time, counting back from today. */
export function currentStreak(state: ProgressionState, now = new Date()): number {
  let streak = 0;
  const cursor = new Date(now);
  // Today only extends the streak if it has minutes; an empty today does not break it.
  if ((state.minutesByDate[cursor.toISOString().slice(0, 10)] ?? 0) === 0) {
    cursor.setDate(cursor.getDate() - 1);
  }
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if ((state.minutesByDate[key] ?? 0) <= 0) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function longestStreak(state: ProgressionState): number {
  const days = Object.keys(state.minutesByDate)
    .filter((key) => (state.minutesByDate[key] ?? 0) > 0)
    .sort();
  let best = 0;
  let run = 0;
  let previous: number | null = null;

  for (const day of days) {
    const time = new Date(`${day}T00:00:00.000Z`).getTime();
    run = previous !== null && time - previous === 86_400_000 ? run + 1 : 1;
    previous = time;
    if (run > best) best = run;
  }
  return best;
}

/** Test/reset hook. */
export function clearProgressionCache(): void {
  cache.clear();
}
