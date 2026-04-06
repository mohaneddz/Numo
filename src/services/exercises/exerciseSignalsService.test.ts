import { describe, expect, it } from 'vitest';
import { recognitionProductionGap, topConfusionPairs, type ExerciseSignalSnapshot } from './exerciseSignalsService';

function baseSnapshot(): ExerciseSignalSnapshot {
  return {
    seenCount: 10,
    successStreak: 2,
    failureStreak: 0,
    hintUsage: 1,
    confusedUsage: 0,
    hoverTranslationUsage: 0,
    audioReplayCount: 0,
    avgLatencyMs: 2400,
    latencySamples: 10,
    scriptTraceScore: 60,
    scriptRecallScore: 40,
    recognitionScore: 72,
    productionScore: 45,
    confusionPairs: {
      'a::b': 7,
      'c::d': 2,
      'e::f': 5,
    },
    exerciseTypeCounts: {
      mcq: 5,
    },
    updatedAt: new Date().toISOString(),
  };
}

describe('exerciseSignalsService utilities', () => {
  it('sorts confusion pairs by count', () => {
    const pairs = topConfusionPairs(baseSnapshot(), 2);
    expect(pairs).toEqual([
      { pair: 'a::b', count: 7 },
      { pair: 'e::f', count: 5 },
    ]);
  });

  it('computes recognition-production gap', () => {
    expect(recognitionProductionGap(baseSnapshot())).toBe(27);
  });
});
