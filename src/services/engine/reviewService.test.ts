import { describe, expect, it } from 'vitest';
import { ReviewService } from './reviewService';
import type { EngineContext } from './types';
import type { ReviewItemRecord } from '../../persistence';

function makeReviewRecord(overrides?: Partial<ReviewItemRecord>): ReviewItemRecord {
  return {
    id: 'review-1',
    learnerId: 'learner-1',
    languageId: 'lang-1',
    nodeId: 'node-1',
    contentItemId: null,
    state: 'due',
    dueAt: new Date(Date.now() - 1000).toISOString(),
    intervalDays: 1,
    easeFactor: 2.3,
    lastReviewedAt: null,
    lastResult: null,
    strength: 'needs work',
    attemptsCount: 0,
    metadata: { term: 'hola', translation: 'hello', type: 'phrase' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('ReviewService', () => {
  it('does not synthesize due-now queue when no persisted due items exist', async () => {
    const context = {
      learnerId: 'learner-1',
      languageId: 'lang-1',
      languageCode: 'es',
      curriculumNodes: [],
      persistence: {
        repositories: {
          review: {
            listItemsByLanguage: async () => [],
            updateReviewItem: async () => {
              throw new Error('Not expected');
            },
            createReviewItem: async () => {
              throw new Error('Not expected');
            },
            fetchDueItemsByLanguage: async () => [],
          },
          evidence: {
            logEvidence: async () => {
              throw new Error('Not expected');
            },
            listEvidenceByLanguage: async () => [],
          },
          learner: {
            getLearnerNodeState: async () => null,
            upsertLearnerNodeState: async () => {
              throw new Error('Not expected');
            },
            upsertWeaknessCluster: async () => {
              throw new Error('Not expected');
            },
            listWeaknessClusters: async () => [],
            listLearnerNodeStates: async () => [],
            ensureDefaultProfile: async () => {
              throw new Error('Not used');
            },
            getProgressAggregate: async () => {
              throw new Error('Not used');
            },
          },
        },
      },
    } as unknown as EngineContext;

    const service = new ReviewService(context);
    const dueNow = await service.getQueue('due-now');
    expect(dueNow).toEqual([]);
  });

  it('submits review result and persists evidence/state updates', async () => {
    const reviewRows: ReviewItemRecord[] = [makeReviewRecord()];
    const loggedEvidence: Array<{ id: string; nodeIds: string[] }> = [];

    const context = {
      learnerId: 'learner-1',
      languageId: 'lang-1',
      languageCode: 'es',
      curriculumNodes: [
        {
          id: 'node-1',
          curriculumId: 'cur-1',
          languageId: 'lang-1',
          domainKey: 'foundations',
          unitKey: 'u1',
          nodeKey: 'es_greetings_cluster',
          nodeType: 'vocabulary_cluster',
          title: 'Greetings',
          description: 'Hello phrases',
          levelBand: 'A1',
          metadata: {},
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      persistence: {
        repositories: {
          review: {
            listItemsByLanguage: async () => reviewRows,
            updateReviewItem: async (input: { id: string }) => {
              const current = reviewRows.find((row) => row.id === input.id) as ReviewItemRecord;
              const next = { ...current, lastResult: 'correct' as const };
              reviewRows[0] = next;
              return next;
            },
            createReviewItem: async () => makeReviewRecord({ id: `review-${Date.now()}` }),
            fetchDueItemsByLanguage: async () => reviewRows,
          },
          evidence: {
            logEvidence: async (input: { nodeIds?: string[] }) => {
              const entry = { id: 'ev-1', nodeIds: input.nodeIds ?? [] };
              loggedEvidence.push(entry);
              return {
                id: entry.id,
                learnerId: 'learner-1',
                languageId: 'lang-1',
                sessionId: null,
                attemptId: null,
                activityType: 'review',
                nodeIds: entry.nodeIds,
                contentItemId: null,
                rawInputText: null,
                rawOutputText: null,
                rawInputRef: null,
                rawOutputRef: null,
                analysisResult: {},
                scores: { correctness: 92 },
                confidenceEstimate: null,
                timeTakenMs: null,
                hintsUsed: null,
                correctionCount: null,
                transcription: null,
                pronunciationNotes: null,
                metadata: {},
                createdAt: new Date().toISOString(),
              };
            },
            listEvidenceByLanguage: async () => [],
          },
          learner: {
            getLearnerNodeState: async () => null,
            upsertLearnerNodeState: async () => ({
              id: 'lns-1',
              learnerId: 'learner-1',
              languageId: 'lang-1',
              nodeId: 'node-1',
              masteryScore: 70,
              confidenceScore: 65,
              exposureCount: 1,
              successCount: 1,
              failureCount: 0,
              lastSeenAt: new Date().toISOString(),
              nextReviewAt: new Date().toISOString(),
              forgettingRisk: 40,
              recognitionScore: 65,
              productionScore: 60,
              listeningScore: 55,
              readingScore: 55,
              writingScore: 55,
              speakingScore: 55,
              pronunciationScore: 55,
              weakTags: [],
              errorTags: [],
              manualOverride: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
            upsertWeaknessCluster: async () => ({
              id: 'wcl-1',
              learnerId: 'learner-1',
              languageId: 'lang-1',
              clusterKey: 'review_accuracy',
              title: 'Weakness',
              description: null,
              severityScore: 12,
              hitCount: 1,
              lastSeenAt: new Date().toISOString(),
              relatedNodeIds: ['node-1'],
              evidenceRefs: ['ev-1'],
              tags: ['review'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
            listWeaknessClusters: async () => [],
            listLearnerNodeStates: async () => [],
            ensureDefaultProfile: async () => {
              throw new Error('Not used');
            },
            getProgressAggregate: async () => {
              throw new Error('Not used');
            },
          },
        },
      },
    } as unknown as EngineContext;

    const service = new ReviewService(context);
    const response = await service.submitResult('review-1', 'correct');

    expect(response).not.toBeNull();
    expect(loggedEvidence.length).toBe(1);
    expect(loggedEvidence[0].nodeIds).toContain('node-1');
  });
});
