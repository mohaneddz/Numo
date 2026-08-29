/**
 * Persistence for completed typing runs.
 *
 * Stored per profile and language so personal bests are comparable — a best
 * set typing Spanish says nothing about a learner's Chinese, and the two use
 * different word units entirely.
 */
import { initializePersistence } from '../../persistence';
import type { TypingResult, TypingTestMode } from './typingService';

/** Kept short so the store stays small and the history chart stays readable. */
const MAX_STORED_RUNS = 100;

export interface TypingHistoryEntry {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  mode: TypingTestMode;
  amount: number;
  elapsedSeconds: number;
  completedAt: string;
}

export interface TypingPersonalBest {
  wpm: number;
  accuracy: number;
  completedAt: string;
}

export interface TypingHistory {
  entries: TypingHistoryEntry[];
  /** Best run per mode+amount, since a 15s sprint is not comparable to 120s. */
  bests: Record<string, TypingPersonalBest>;
}

const EMPTY_HISTORY: TypingHistory = { entries: [], bests: {} };

function storageKey(profileId: string, languageCode: string): string {
  return `numo.typing.history.${profileId}.${languageCode}`;
}

export function bestKey(mode: TypingTestMode, amount: number): string {
  return `${mode}:${amount}`;
}

export async function loadTypingHistory(
  profileId: string,
  languageCode: string,
): Promise<TypingHistory> {
  try {
    const persistence = await initializePersistence();
    const stored = await persistence.repositories.settings.getJson<TypingHistory>(
      storageKey(profileId, languageCode),
    );
    if (!stored) return EMPTY_HISTORY;
    return { entries: stored.entries ?? [], bests: stored.bests ?? {} };
  } catch {
    // Outside the Tauri runtime there is no database. A trainer that still runs
    // without history is far better than one that refuses to start.
    return EMPTY_HISTORY;
  }
}

export interface RecordRunOutcome {
  history: TypingHistory;
  isPersonalBest: boolean;
  previousBest: TypingPersonalBest | null;
}

/**
 * Appends a run and updates the personal best for its mode and length.
 *
 * A best only counts at 80% accuracy or better — otherwise mashing keys sets an
 * unbeatable record and the number stops meaning anything.
 */
export async function recordTypingRun(
  profileId: string,
  languageCode: string,
  result: TypingResult,
): Promise<RecordRunOutcome> {
  const history = await loadTypingHistory(profileId, languageCode);
  const key = bestKey(result.mode, result.amount);
  const previousBest = history.bests[key] ?? null;

  const entry: TypingHistoryEntry = {
    wpm: result.wpm,
    rawWpm: result.rawWpm,
    accuracy: result.accuracy,
    consistency: result.consistency,
    mode: result.mode,
    amount: result.amount,
    elapsedSeconds: result.elapsedSeconds,
    completedAt: result.completedAt,
  };

  const qualifies = result.accuracy >= 80;
  const isPersonalBest = qualifies && (!previousBest || result.wpm > previousBest.wpm);

  const next: TypingHistory = {
    entries: [...history.entries, entry].slice(-MAX_STORED_RUNS),
    bests: isPersonalBest
      ? {
          ...history.bests,
          [key]: { wpm: result.wpm, accuracy: result.accuracy, completedAt: result.completedAt },
        }
      : history.bests,
  };

  try {
    const persistence = await initializePersistence();
    await persistence.repositories.settings.setJson(
      storageKey(profileId, languageCode),
      next,
      'typing_trainer',
    );
  } catch {
    // Keep the in-memory result usable even when the write fails; the run is
    // already over and losing it silently is worse than not storing it.
  }

  return { history: next, isPersonalBest, previousBest };
}

export interface TypingSummary {
  runCount: number;
  averageWpm: number;
  averageAccuracy: number;
  bestWpm: number;
  recent: TypingHistoryEntry[];
}

export function summarizeHistory(history: TypingHistory, recentCount = 12): TypingSummary {
  const entries = history.entries;
  if (entries.length === 0) {
    return { runCount: 0, averageWpm: 0, averageAccuracy: 0, bestWpm: 0, recent: [] };
  }

  const round = (value: number) => Math.round(value * 10) / 10;
  const total = entries.reduce(
    (accumulator, entry) => ({
      wpm: accumulator.wpm + entry.wpm,
      accuracy: accumulator.accuracy + entry.accuracy,
    }),
    { wpm: 0, accuracy: 0 },
  );

  return {
    runCount: entries.length,
    averageWpm: round(total.wpm / entries.length),
    averageAccuracy: round(total.accuracy / entries.length),
    bestWpm: round(Math.max(...entries.map((entry) => entry.wpm))),
    recent: entries.slice(-recentCount),
  };
}
