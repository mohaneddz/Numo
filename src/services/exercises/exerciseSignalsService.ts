import { initializePersistence } from '../../persistence';

export interface ExerciseSignalSnapshot {
  seenCount: number;
  successStreak: number;
  failureStreak: number;
  hintUsage: number;
  confusedUsage: number;
  hoverTranslationUsage: number;
  audioReplayCount: number;
  avgLatencyMs: number;
  latencySamples: number;
  scriptTraceScore: number;
  scriptRecallScore: number;
  recognitionScore: number;
  productionScore: number;
  confusionPairs: Record<string, number>;
  exerciseTypeCounts: Record<string, number>;
  updatedAt: string;
}

export interface ExerciseSignalUpdate {
  wasCorrect?: boolean;
  latencyMs?: number;
  hintUsed?: boolean;
  confusedUsed?: boolean;
  hoverUsed?: number;
  audioReplays?: number;
  scriptTraceScore?: number;
  scriptRecallScore?: number;
  recognitionDelta?: number;
  productionDelta?: number;
  confusionPair?: { a: string; b: string };
  exerciseType?: string;
}

const EMPTY_SIGNALS: ExerciseSignalSnapshot = {
  seenCount: 0,
  successStreak: 0,
  failureStreak: 0,
  hintUsage: 0,
  confusedUsage: 0,
  hoverTranslationUsage: 0,
  audioReplayCount: 0,
  avgLatencyMs: 0,
  latencySamples: 0,
  scriptTraceScore: 0,
  scriptRecallScore: 0,
  recognitionScore: 0,
  productionScore: 0,
  confusionPairs: {},
  exerciseTypeCounts: {},
  updatedAt: new Date(0).toISOString(),
};

function keyForSignals(learnerId: string, languageCode: string): string {
  return `exercise_signals_v2:${learnerId}:${languageCode}`;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function pairKey(a: string, b: string): string {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  return [left, right].sort().join('::');
}

function mergeSignals(base: ExerciseSignalSnapshot, update: ExerciseSignalUpdate): ExerciseSignalSnapshot {
  const next: ExerciseSignalSnapshot = {
    ...base,
    confusionPairs: { ...base.confusionPairs },
    exerciseTypeCounts: { ...base.exerciseTypeCounts },
    seenCount: base.seenCount + 1,
    updatedAt: new Date().toISOString(),
  };

  if (typeof update.wasCorrect === 'boolean') {
    if (update.wasCorrect) {
      next.successStreak = base.successStreak + 1;
      next.failureStreak = 0;
    } else {
      next.failureStreak = base.failureStreak + 1;
      next.successStreak = 0;
    }
  }

  if (typeof update.latencyMs === 'number' && Number.isFinite(update.latencyMs) && update.latencyMs > 0) {
    const samples = base.latencySamples + 1;
    next.avgLatencyMs = Math.round(((base.avgLatencyMs * base.latencySamples) + update.latencyMs) / samples);
    next.latencySamples = samples;
  }

  if (update.hintUsed) next.hintUsage += 1;
  if (update.confusedUsed) next.confusedUsage += 1;
  if (update.hoverUsed) next.hoverTranslationUsage += Math.max(0, update.hoverUsed);
  if (update.audioReplays) next.audioReplayCount += Math.max(0, update.audioReplays);

  if (typeof update.scriptTraceScore === 'number' && Number.isFinite(update.scriptTraceScore)) {
    next.scriptTraceScore = clamp(Math.round((base.scriptTraceScore + update.scriptTraceScore) / 2));
  }
  if (typeof update.scriptRecallScore === 'number' && Number.isFinite(update.scriptRecallScore)) {
    next.scriptRecallScore = clamp(Math.round((base.scriptRecallScore + update.scriptRecallScore) / 2));
  }

  if (typeof update.recognitionDelta === 'number') {
    next.recognitionScore = clamp(base.recognitionScore + update.recognitionDelta);
  }
  if (typeof update.productionDelta === 'number') {
    next.productionScore = clamp(base.productionScore + update.productionDelta);
  }

  if (update.confusionPair) {
    const key = pairKey(update.confusionPair.a, update.confusionPair.b);
    next.confusionPairs[key] = (next.confusionPairs[key] ?? 0) + 1;
  }

  if (update.exerciseType) {
    next.exerciseTypeCounts[update.exerciseType] = (next.exerciseTypeCounts[update.exerciseType] ?? 0) + 1;
  }

  return next;
}

export async function loadExerciseSignals(learnerId: string, languageCode: string): Promise<ExerciseSignalSnapshot> {
  const persistence = await initializePersistence();
  const value = await persistence.repositories.settings.getJson<ExerciseSignalSnapshot>(keyForSignals(learnerId, languageCode));
  if (!value) return { ...EMPTY_SIGNALS };
  return { ...EMPTY_SIGNALS, ...value };
}

export async function updateExerciseSignals(
  learnerId: string,
  languageCode: string,
  update: ExerciseSignalUpdate,
): Promise<ExerciseSignalSnapshot> {
  const persistence = await initializePersistence();
  const key = keyForSignals(learnerId, languageCode);
  const current = (await persistence.repositories.settings.getJson<ExerciseSignalSnapshot>(key)) ?? { ...EMPTY_SIGNALS };
  const merged = mergeSignals({ ...EMPTY_SIGNALS, ...current }, update);
  await persistence.repositories.settings.setJson(key, merged, 'exercise_signals');
  return merged;
}

export function topConfusionPairs(signals: ExerciseSignalSnapshot, limit = 5): Array<{ pair: string; count: number }> {
  return Object.entries(signals.confusionPairs)
    .map(([pair, count]) => ({ pair, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function recognitionProductionGap(signals: ExerciseSignalSnapshot): number {
  return Math.max(0, signals.recognitionScore - signals.productionScore);
}
