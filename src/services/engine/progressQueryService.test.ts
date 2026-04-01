import { describe, expect, it } from 'vitest';
import { ProgressQueryService } from './progressQueryService';
import type { EngineContext } from './types';

describe('ProgressQueryService', () => {
  it('returns core metrics from repositories', async () => {
    const context = {
      learnerId: 'learner-1',
      languageId: 'lang-1',
      languageCode: 'es',
      curriculumNodes: [],
      persistence: {
        repositories: {
          review: {
            fetchDueItemsByLanguage: async () => [{ id: 'due-1', dueAt: new Date().toISOString() }],
            listItemsByLanguage: async () => [{ id: 'due-1', dueAt: new Date().toISOString() }],
          },
          learner: {
            getProgressAggregate: async () => ({
              learnerId: 'learner-1',
              languageId: 'lang-1',
              nodeCount: 1,
              avgMasteryScore: 62,
              avgConfidenceScore: 58,
              avgForgettingRisk: 40,
            }),
            listWeaknessClusters: async () => [
              {
                id: 'w1',
                learnerId: 'learner-1',
                languageId: 'lang-1',
                clusterKey: 'pronunciation',
                title: 'Pronunciation',
                description: null,
                severityScore: 20,
                hitCount: 2,
                lastSeenAt: new Date().toISOString(),
                relatedNodeIds: [],
                evidenceRefs: [],
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          },
          evidence: {
            listEvidenceByLanguage: async () => [
              {
                id: 'ev1',
                learnerId: 'learner-1',
                languageId: 'lang-1',
                sessionId: null,
                attemptId: null,
                activityType: 'speak',
                nodeIds: [],
                contentItemId: null,
                rawInputText: null,
                rawOutputText: null,
                rawInputRef: null,
                rawOutputRef: null,
                analysisResult: {},
                scores: { correctness: 70 },
                confidenceEstimate: null,
                timeTakenMs: null,
                hintsUsed: null,
                correctionCount: null,
                transcription: null,
                pronunciationNotes: null,
                metadata: {},
                createdAt: new Date().toISOString(),
              },
            ],
          },
        },
      },
    } as unknown as EngineContext;

    const metrics = await new ProgressQueryService(context).getCoreMetrics();
    expect(metrics.dueCount).toBe(1);
    expect(metrics.avgMasteryScore).toBe(62);
    expect(metrics.weakClusters[0].key).toBe('pronunciation');
  });
});
