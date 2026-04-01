import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const now = new Date();
  const recentIso = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const recentIso2 = new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString();

  const context = {
    db: {
      select: vi.fn(async (query: string, bindValues?: unknown[]) => {
        if (query.includes('SELECT id, code FROM languages')) {
          const code = String(bindValues?.[0] ?? '');
          if (code === 'es') return [{ id: 'lang-es', code: 'es' }];
          if (code === 'zh') return [{ id: 'lang-zh', code: 'zh' }];
          return [];
        }
        if (query.includes('FROM review_items')) {
          const languageId = String(bindValues?.[2] ?? '');
          if (languageId === 'lang-es') return [{ due_count: 4, overdue_count: 1 }];
          return [{ due_count: 0, overdue_count: 0 }];
        }
        if (query.includes('FROM learner_node_state')) {
          const languageId = String(bindValues?.[1] ?? '');
          if (languageId === 'lang-es') {
            return [{
              reading_score: 70,
              listening_score: 64,
              speaking_score: 59,
              writing_score: 52,
              pronunciation_score: 47,
              recognition_score: 68,
              production_score: 53,
              avg_mastery_score: 62,
              unstable_count: 2,
            }];
          }
          return [{
            reading_score: 0,
            listening_score: 0,
            speaking_score: 0,
            writing_score: 0,
            pronunciation_score: 0,
            recognition_score: 0,
            production_score: 0,
            avg_mastery_score: 0,
            unstable_count: 0,
          }];
        }
        if (query.includes('FROM learner_script_state') && query.includes('script_key')) {
          const languageId = String(bindValues?.[1] ?? '');
          if (languageId === 'lang-zh') {
            return [{
              script_key: 'han_ni',
              completion_score: 44,
              trace_score: 41,
              free_score: 33,
              attempts_count: 3,
              failure_count: 2,
              recall_score: 38,
            }];
          }
          return [];
        }
        if (query.includes('FROM learner_language_state')) {
          return [{
            language_id: 'lang-es',
            code: 'es',
            name: 'Spanish',
            current_streak: 5,
            longest_streak: 8,
            today_minutes: 21,
            total_xp: 540,
          }];
        }
        if (query.includes('FROM goals g')) {
          return [{
            id: 'goal-1',
            language_code: 'es',
            goal_type: 'minutes_weekly',
            title: '150 minutes this week',
            target_value: 150,
            current_value: 62,
            status: 'active',
            due_at: null,
          }];
        }
        return [];
      }),
      execute: vi.fn(async () => ({})),
    },
    repositories: {
      languages: {
        listLanguages: vi.fn(async () => [
          {
            id: 'lang-es',
            code: 'es',
            name: 'Spanish',
            flag: '🇪🇸',
            baseLanguageCode: 'en',
            isActive: true,
            createdAt: recentIso2,
            updatedAt: recentIso,
          },
          {
            id: 'lang-zh',
            code: 'zh',
            name: 'Chinese',
            flag: '🇨🇳',
            baseLanguageCode: 'en',
            isActive: false,
            createdAt: recentIso2,
            updatedAt: recentIso,
          },
        ]),
        getActiveLanguage: vi.fn(async () => ({
          id: 'lang-es',
          code: 'es',
          name: 'Spanish',
          flag: '🇪🇸',
          baseLanguageCode: 'en',
          isActive: true,
          createdAt: recentIso2,
          updatedAt: recentIso,
        })),
      },
      learner: {
        getActiveProfile: vi.fn(async () => ({
          id: 'learner-1',
          displayName: 'Real Learner',
          nativeLanguageCode: 'en',
          baseLanguageCode: 'en',
          createdAt: recentIso2,
          updatedAt: recentIso,
        })),
        listWeaknessClusters: vi.fn(async (_learnerId: string, languageId: string) => {
          if (languageId === 'lang-es') {
            return [{
              id: 'wk-es',
              learnerId: 'learner-1',
              languageId,
              clusterKey: 'pronunciation',
              title: 'Pronunciation',
              description: null,
              severityScore: 77,
              hitCount: 6,
              lastSeenAt: recentIso,
              relatedNodeIds: ['node-es-1'],
              evidenceRefs: [],
              tags: ['speaking'],
              createdAt: recentIso2,
              updatedAt: recentIso,
            }];
          }
          return [];
        }),
        listLearnerNodeStates: vi.fn(async (_learnerId: string, languageId: string) => {
          if (languageId !== 'lang-es') return [];
          return [
            {
              id: 'lns-1',
              learnerId: 'learner-1',
              languageId,
              nodeId: 'node-es-1',
              masteryScore: 82,
              confidenceScore: 70,
              exposureCount: 8,
              successCount: 6,
              failureCount: 2,
              lastSeenAt: recentIso,
              nextReviewAt: null,
              forgettingRisk: 21,
              recognitionScore: 72,
              productionScore: 54,
              listeningScore: 60,
              readingScore: 71,
              writingScore: 52,
              speakingScore: 58,
              pronunciationScore: 47,
              weakTags: [],
              errorTags: [],
              manualOverride: {},
              createdAt: recentIso2,
              updatedAt: recentIso,
            },
            {
              id: 'lns-2',
              learnerId: 'learner-1',
              languageId,
              nodeId: 'node-es-2',
              masteryScore: 28,
              confidenceScore: 35,
              exposureCount: 2,
              successCount: 1,
              failureCount: 1,
              lastSeenAt: recentIso,
              nextReviewAt: null,
              forgettingRisk: 70,
              recognitionScore: 52,
              productionScore: 30,
              listeningScore: 46,
              readingScore: 50,
              writingScore: 28,
              speakingScore: 40,
              pronunciationScore: 32,
              weakTags: [],
              errorTags: [],
              manualOverride: {},
              createdAt: recentIso2,
              updatedAt: recentIso,
            },
          ];
        }),
      },
      evidence: {
        listEvidenceByLanguage: vi.fn(async (_learnerId: string, languageId: string) => {
          if (languageId !== 'lang-es') return [];
          return [
            {
              id: 'ev-1',
              learnerId: 'learner-1',
              languageId,
              sessionId: null,
              attemptId: null,
              activityType: 'review_submission',
              nodeIds: [],
              contentItemId: null,
              rawInputText: null,
              rawOutputText: null,
              rawInputRef: null,
              rawOutputRef: null,
              analysisResult: {},
              scores: { correctness: 80 },
              confidenceEstimate: null,
              timeTakenMs: 180000,
              hintsUsed: null,
              correctionCount: null,
              transcription: null,
              pronunciationNotes: null,
              metadata: {},
              createdAt: recentIso,
            },
            {
              id: 'ev-2',
              learnerId: 'learner-1',
              languageId,
              sessionId: null,
              attemptId: null,
              activityType: 'speaking_attempt',
              nodeIds: [],
              contentItemId: null,
              rawInputText: null,
              rawOutputText: null,
              rawInputRef: null,
              rawOutputRef: null,
              analysisResult: {},
              scores: { pronunciation: 50 },
              confidenceEstimate: null,
              timeTakenMs: 420000,
              hintsUsed: null,
              correctionCount: null,
              transcription: null,
              pronunciationNotes: null,
              metadata: {},
              createdAt: recentIso2,
            },
          ];
        }),
      },
      curriculum: {
        getCurriculumByLanguageCode: vi.fn(async (languageCode: string) => {
          if (languageCode !== 'es') {
            return {
              curriculum: {} as never,
              capabilities: [],
              nodes: [],
              edges: [],
              nodeCapabilityLinks: [],
            };
          }
          return {
            curriculum: {} as never,
            capabilities: [
              {
                id: 'cap-1',
                curriculumId: 'cur-es',
                languageId: 'lang-es',
                slug: 'conversation_foundations',
                title: 'Conversation Foundations',
                description: null,
                levelBand: 'A1',
                metadata: {},
                createdAt: recentIso2,
                updatedAt: recentIso,
              },
              {
                id: 'cap-2',
                curriculumId: 'cur-es',
                languageId: 'lang-es',
                slug: 'pronunciation_basics',
                title: 'Pronunciation Basics',
                description: null,
                levelBand: 'A1',
                metadata: {},
                createdAt: recentIso2,
                updatedAt: recentIso,
              },
            ],
            nodes: [],
            edges: [],
            nodeCapabilityLinks: [
              { id: 'link-1', curriculumId: 'cur-es', nodeId: 'node-es-1', capabilityId: 'cap-1', createdAt: recentIso },
              { id: 'link-2', curriculumId: 'cur-es', nodeId: 'node-es-2', capabilityId: 'cap-1', createdAt: recentIso },
              { id: 'link-3', curriculumId: 'cur-es', nodeId: 'node-es-2', capabilityId: 'cap-2', createdAt: recentIso },
            ],
          };
        }),
      },
      review: {},
      content: {},
      settings: {},
    },
  };

  return {
    context,
    initializePersistence: vi.fn(async () => context),
  };
});

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => true,
}));

vi.mock('../persistence', () => ({
  initializePersistence: mocks.initializePersistence,
}));

import { IntegrationService } from './integrationService';

describe('IntegrationService profile monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns profile identity from learner_profile and per-language summaries', async () => {
    const service = new IntegrationService();
    const snapshot = await service.queryProfileDashboard({ rangeDays: 30, includeAllLanguages: true });

    expect(snapshot.profileOverview.displayName).toBe('Real Learner');
    expect(snapshot.languageSummaries.some((item) => item.languageCode === 'es')).toBe(true);

    const es = snapshot.languageSummaries.find((item) => item.languageCode === 'es');
    expect(es?.scores.recognition).toBe(68);
    expect(es?.scores.production).toBe(53);
    expect(es?.scores.pronunciation).toBe(47);
  });

  it('uses honest data states and script-writing applicability', async () => {
    const service = new IntegrationService();
    const snapshot = await service.queryProfileDashboard({ rangeDays: 30, includeAllLanguages: true });

    const esScript = snapshot.scriptWriting.find((item) => item.languageCode === 'es');
    const zhScript = snapshot.scriptWriting.find((item) => item.languageCode === 'zh');
    const zhLanguage = snapshot.languageSummaries.find((item) => item.languageCode === 'zh');

    expect(esScript?.dataState).toBe('not_applicable');
    expect(zhScript?.dataState).toBe('low_data');
    expect(zhLanguage?.dataState).toBe('empty');
  });

  it('infers capability status from learner node-state coverage', async () => {
    const service = new IntegrationService();
    const snapshot = await service.queryProfileDashboard({ rangeDays: 30, includeAllLanguages: true });

    const conversation = snapshot.capabilities.find((item) => item.capabilitySlug === 'conversation_foundations');
    const pronunciation = snapshot.capabilities.find((item) => item.capabilitySlug === 'pronunciation_basics');

    expect(conversation?.status).toBe('partial');
    expect(pronunciation?.status).toBe('blocked');
  });

  it('keeps insights metrics aligned with profile summaries', async () => {
    const service = new IntegrationService();
    const profile = await service.queryProfileDashboard({ rangeDays: 30, includeAllLanguages: true });
    const insights = await service.queryInsights('es', 30);
    const summary = profile.languageSummaries.find((item) => item.languageCode === 'es');

    expect(insights.recognitionScore).toBe(summary?.scores.recognition);
    expect(insights.productionScore).toBe(summary?.scores.production);
    expect(insights.pronunciationScore).toBe(summary?.scores.pronunciation);
    expect(insights.dataState).toBe(summary?.dataState);
  });
});
