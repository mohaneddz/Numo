import { describe, expect, it } from 'vitest';
import { applyLearnerRule } from './learnerRules';
import type { EvidenceRecord, LearnerNodeStateRecord } from '../../persistence';

function mockEvidence(partial?: Partial<EvidenceRecord>): EvidenceRecord {
  return {
    id: 'ev-1',
    learnerId: 'learner-1',
    languageId: 'lang-1',
    sessionId: null,
    attemptId: null,
    activityType: 'review',
    nodeIds: ['node-1'],
    contentItemId: null,
    rawInputText: null,
    rawOutputText: null,
    rawInputRef: null,
    rawOutputRef: null,
    analysisResult: {},
    scores: { correctness: 80 },
    confidenceEstimate: null,
    timeTakenMs: null,
    hintsUsed: null,
    correctionCount: null,
    transcription: null,
    pronunciationNotes: null,
    metadata: {},
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

function mockState(partial?: Partial<LearnerNodeStateRecord>): LearnerNodeStateRecord {
  return {
    id: 'lns-1',
    learnerId: 'learner-1',
    languageId: 'lang-1',
    nodeId: 'node-1',
    masteryScore: 60,
    confidenceScore: 55,
    exposureCount: 2,
    successCount: 1,
    failureCount: 1,
    lastSeenAt: null,
    nextReviewAt: null,
    forgettingRisk: 45,
    recognitionScore: 60,
    productionScore: 52,
    listeningScore: 50,
    readingScore: 50,
    writingScore: 48,
    speakingScore: 46,
    pronunciationScore: 47,
    weakTags: [],
    errorTags: [],
    manualOverride: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

describe('applyLearnerRule', () => {
  it('increases mastery/confidence on correct evidence', () => {
    const next = applyLearnerRule(mockState(), mockEvidence({ scores: { correctness: 92 } }));
    expect(next.masteryScore).toBeGreaterThan(60);
    expect(next.confidenceScore).toBeGreaterThan(55);
    expect(next.failureDelta).toBe(0);
    expect(next.successDelta).toBe(1);
  });

  it('decreases mastery and increases forgetting risk on incorrect evidence', () => {
    const next = applyLearnerRule(mockState(), mockEvidence({ scores: { correctness: 18 } }));
    expect(next.masteryScore).toBeLessThan(60);
    expect(next.forgettingRisk).toBeGreaterThan(45);
    expect(next.failureDelta).toBe(1);
    expect(next.successDelta).toBe(0);
  });

  it('applies modality-specific deltas for speaking and pronunciation', () => {
    const next = applyLearnerRule(
      mockState({ speakingScore: 40, pronunciationScore: 40 }),
      mockEvidence({
        activityType: 'speak',
        scores: { correctness: 70, pronunciation: 80 },
      }),
    );
    expect(next.speakingScore).toBeGreaterThan(40);
    expect(next.pronunciationScore).toBeGreaterThan(40);
  });
});
