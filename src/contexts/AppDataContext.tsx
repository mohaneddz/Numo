import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  ImmersionProgress,
  NotebookEntry,
  ReviewItem,
  SpeakingSessionRun,
  WritingCorrection,
  WritingDraft,
} from '../data/types';
import { initializeEngineServices, type EngineServices } from '../services/engine';
import type { EvidenceRecord } from '../persistence';
import { useProfileSession } from './ProfileSessionContext';
import { evaluateLearnTaskSubmission, type LearnGradingMode } from '../services/learningPlanService';
import type { TaskType } from '../types/learningPlan';

export type ReviewMode = 'due-now' | 'weak' | 'mistakes' | 'cram';

interface ReviewSessionSummary {
  mode: ReviewMode;
  queue: ReviewItem[];
}

interface AppDataState {
  reviewItems: ReviewItem[];
  speakingRuns: SpeakingSessionRun[];
  immersionProgress: Record<string, ImmersionProgress>;
  writingDrafts: WritingDraft[];
  notebookEntries: NotebookEntry[];
  lessonHistory: Array<{
    lessonId: string;
    taskType: string;
    score: number;
    createdAt: string;
  }>;
}

interface AppDataContextValue {
  state: AppDataState;
  dueCount: number;
  weakCount: number;
  flashCardCount: number;
  recentlySaved: NotebookEntry[];
  dueReviewPreview: ReviewItem[];
  startReviewSession: (mode: ReviewMode) => ReviewSessionSummary;
  gradeReviewItem: (id: string, result: 'correct' | 'incorrect') => void;
  saveSpeakingResult: (sessionId: string, run: Omit<SpeakingSessionRun, 'id' | 'sessionId' | 'recordedAt'>) => SpeakingSessionRun;
  saveImmersionPhrase: (contentId: string, phrase: string, translation?: string) => void;
  updateImmersionProgress: (contentId: string, positionSec: number, completed?: boolean) => void;
  saveDraft: (draft: Partial<WritingDraft> & { content: string; title: string }) => WritingDraft;
  analyzeDraft: (draftId: string, analysis: WritingCorrection[]) => void;
  createNotebookEntry: (entry: Omit<NotebookEntry, 'id' | 'createdAt' | 'updatedAt'>) => NotebookEntry;
  submitLearnTaskAttempt: (input: {
    lessonId: string;
    unitId: string;
    objectiveId: string;
    taskTemplateId: string;
    taskType: TaskType;
    prompt: string;
    expectedAnswer: string;
    learnerAnswer: string;
    payload?: Record<string, unknown>;
    structuredResponse?: Record<string, unknown>;
    gradingMode?: LearnGradingMode;
    durationMs?: number;
  }) => Promise<{ correct: boolean; score: number; feedback: string }>;
  updateMastery: (id: string, delta: number) => void;
  toggleFavorite: (id: string) => void;
  recordLearnInteraction: (input: { moduleId?: string; lessonId?: string; note?: string }) => void;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

const EMPTY_STATE: AppDataState = {
  reviewItems: [],
  speakingRuns: [],
  immersionProgress: {},
  writingDrafts: [],
  notebookEntries: [],
  lessonHistory: [],
};

function todayIso(): string {
  return new Date().toISOString();
}

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

function queueForMode(items: ReviewItem[], mode: ReviewMode): ReviewItem[] {
  const now = new Date();
  const due = items.filter((item) => new Date(item.nextDueAt ?? `${item.dueDate}T00:00:00.000Z`) <= now);

  if (mode === 'due-now') return due;
  if (mode === 'weak') return items.filter((item) => ['critical', 'weak', 'needs work'].includes(item.strength));
  if (mode === 'mistakes') return items.filter((item) => item.lastResult === 'incorrect');

  return [...items]
    .sort((a, b) => {
      const scoreA = (a.ease ?? 2.5) + ((a.intervalDays ?? 1) / 10);
      const scoreB = (b.ease ?? 2.5) + ((b.intervalDays ?? 1) / 10);
      return scoreA - scoreB;
    })
    .slice(0, 15);
}

function mapEngineReviewRecordToItem(record: {
  id: string;
  dueAt: string;
  intervalDays: number;
  easeFactor: number;
  attemptsCount: number;
  lastReviewedAt: string | null;
  lastResult: 'correct' | 'incorrect' | 'partial' | 'skipped' | null;
  strength: string | null;
  source?: string;
  sourceRef?: string | null;
  contentDomain?: string;
  metadata: Record<string, unknown>;
}): ReviewItem {
  const metadata = record.metadata ?? {};
  const typeRaw = metadata.type;
  const type: ReviewItem['type'] = typeRaw === 'grammar' ? 'grammar' : typeRaw === 'phrase' ? 'phrase' : 'word';
  const dueDate = record.dueAt.slice(0, 10);

  return {
    id: record.id,
    term: String(metadata.term ?? 'Curriculum item'),
    translation: metadata.translation == null ? '' : String(metadata.translation),
    type,
    source:
      record.source === 'notebook'
      || record.source === 'learn_mistake'
      || record.source === 'weak_node'
      || record.source === 'legacy_unit'
      || record.source === 'immerse_phrase'
      || record.source === 'write_correction'
      || record.source === 'speak_pronunciation'
        ? record.source
        : 'legacy_unit',
    sourceRef: record.sourceRef ?? undefined,
    contentDomain:
      record.contentDomain === 'vocabulary'
      || record.contentDomain === 'grammar'
      || record.contentDomain === 'pronunciation'
      || record.contentDomain === 'sentence'
      || record.contentDomain === 'communication'
        ? record.contentDomain
        : 'vocabulary',
    attempts: record.attemptsCount,
    strength: (record.strength as ReviewItem['strength']) ?? 'needs work',
    dueDate,
    lastReviewed: record.lastReviewedAt?.slice(0, 10),
    nextDueAt: record.dueAt,
    intervalDays: record.intervalDays,
    ease: record.easeFactor,
    lastResult: record.lastResult === 'correct' ? 'correct' : record.lastResult === 'incorrect' ? 'incorrect' : undefined,
  };
}

function mapSpeakingRunsFromEvidence(evidence: EvidenceRecord[]): SpeakingSessionRun[] {
  return evidence
    .filter((entry) => entry.activityType === 'speak_attempt' || entry.activityType === 'speak' || entry.activityType === 'speaking_attempt')
    .map((entry) => {
      const scores = entry.scores as Record<string, unknown>;
      const metadata = entry.metadata as Record<string, unknown>;
      const feedbackSource: SpeakingSessionRun['feedbackSource'] =
        metadata.feedbackSource === 'fallback' ? 'fallback' : 'ai';
      return {
        id: entry.id,
        sessionId: String(entry.sessionId ?? metadata.sessionId ?? 'session'),
        recordedAt: entry.createdAt,
        transcript: String(entry.transcription ?? entry.rawOutputText ?? ''),
        accuracy: Number(scores.accuracy ?? scores.pronunciation ?? 0),
        fluency: Number(scores.fluency ?? scores.correctness ?? 0),
        tip: String(entry.pronunciationNotes ?? metadata.tip ?? ''),
        feedbackSource,
      };
    })
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

function mapWritingDraftsFromEvidence(evidence: EvidenceRecord[]): WritingDraft[] {
  return evidence
    .filter((entry) => entry.activityType === 'write_attempt' || entry.activityType === 'write' || entry.activityType === 'writing_submission')
    .map((entry) => {
      const metadata = entry.metadata as Record<string, unknown>;
      const content = String(entry.rawInputText ?? '');
      const words = content.trim().split(/\s+/).filter(Boolean).length;
      return {
        id: String(entry.attemptId ?? entry.id),
        title: String(metadata.draftTitle ?? 'Writing Draft'),
        promptId: metadata.promptId == null ? undefined : String(metadata.promptId),
        content,
        corrections: Number(entry.correctionCount ?? 0),
        createdAt: dateOnly(entry.createdAt),
        updatedAt: dateOnly(entry.createdAt),
        wordCount: words,
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function mapNotebookEntriesFromReviewItems(reviewItems: ReviewItem[]): NotebookEntry[] {
  const now = dateOnly(todayIso());
  const dedup = new Map<string, NotebookEntry>();

  reviewItems.forEach((item) => {
    const key = `${item.term}::${item.translation}`.toLowerCase();
    if (dedup.has(key)) return;
    dedup.set(key, {
      id: `nb-${item.id}`,
      term: item.term,
      translation: item.translation || 'No translation yet',
      type: item.type,
      tags: ['review'],
      createdAt: now,
      updatedAt: now,
      mastery: 0,
      source: 'review',
      favorited: false,
    });
  });

  return Array.from(dedup.values());
}

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppDataState>(EMPTY_STATE);
  const [engine, setEngine] = useState<EngineServices | null>(null);
  const { activeProfile, status: profileStatus } = useProfileSession();

  const refreshFromPersistence = useCallback(async (engineServices: EngineServices) => {
    // Guardrail: core study state is hydrated from persistence only; never from seeded/localStorage snapshots.
    const reviewRecords = await engineServices.context.persistence.repositories.review.listItemsByLanguage(
      engineServices.context.learnerId,
      engineServices.context.languageId,
      400,
    );
    const reviewItems = reviewRecords.map((record) => mapEngineReviewRecordToItem(record));
    const notebookItems = await engineServices.context.persistence.repositories.notebook.listItems(
      engineServices.context.learnerId,
      engineServices.context.languageId,
      500,
    );

    const evidence = await engineServices.context.persistence.repositories.evidence.listEvidenceByLanguage(
      engineServices.context.learnerId,
      engineServices.context.languageId,
      300,
    );

    setState((previous) => ({
      ...previous,
      reviewItems,
      speakingRuns: mapSpeakingRunsFromEvidence(evidence),
      writingDrafts: mapWritingDraftsFromEvidence(evidence),
      notebookEntries:
        notebookItems.length > 0
          ? notebookItems.map((item) => ({
              id: item.id,
              term: item.term,
              translation: item.translation ?? '',
              type: item.itemKind,
              context: item.context ?? undefined,
              notes: item.notes ?? undefined,
              collectionId: item.collectionId ?? undefined,
              personalHint: item.personalHint ?? undefined,
              personalExample: item.personalExample ?? undefined,
              isDifficult: item.isDifficult,
              isImportant: item.isImportant,
              tags: item.tags,
              createdAt: item.createdAt.slice(0, 10),
              updatedAt: item.updatedAt.slice(0, 10),
              mastery: item.mastery,
              source:
                item.source === 'immerse'
                || item.source === 'review'
                || item.source === 'write'
                || item.source === 'learn'
                || item.source === 'manual'
                  ? item.source
                  : 'manual',
              favorited: item.favorited,
            }))
          : mapNotebookEntriesFromReviewItems(reviewItems),
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (profileStatus !== 'ready' || !activeProfile?.id) {
        setEngine(null);
        setState(EMPTY_STATE);
        return;
      }

      const initialized = await initializeEngineServices({
        learnerId: activeProfile.id,
        forceReload: true,
      });
      if (cancelled || !initialized) return;
      setEngine(initialized);
      try {
        await refreshFromPersistence(initialized);
      } catch (error) {
        console.error('Failed to load core persisted app data', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProfile?.id, profileStatus, refreshFromPersistence]);

  const startReviewSession = useCallback((mode: ReviewMode): ReviewSessionSummary => {
    return {
      mode,
      queue: queueForMode(state.reviewItems, mode),
    };
  }, [state.reviewItems]);

  const gradeReviewItem = useCallback((id: string, result: 'correct' | 'incorrect') => {
    if (!engine) return;
    void (async () => {
      try {
        await engine.reviewService.submitResult(id, result);
        await refreshFromPersistence(engine);
      } catch (error) {
        console.error('Failed to submit review result via engine', error);
      }
    })();
  }, [engine, refreshFromPersistence]);

  const saveSpeakingResult = useCallback((
    sessionId: string,
    run: Omit<SpeakingSessionRun, 'id' | 'sessionId' | 'recordedAt'>,
  ): SpeakingSessionRun => {
    const entry: SpeakingSessionRun = {
      ...run,
      id: `run-${Date.now()}`,
      sessionId,
      recordedAt: todayIso(),
    };

    setState((previous) => ({ ...previous, speakingRuns: [entry, ...previous.speakingRuns] }));

    if (engine) {
      void (async () => {
        try {
          const ingestion = await engine.evidenceService.ingest({
            activityType: 'speak_attempt',
            sessionId,
            rawInputText: entry.transcript,
            rawOutputText: entry.tip,
            transcription: entry.transcript,
            pronunciationNotes: entry.tip,
            scores: {
              correctness: Math.round((entry.accuracy + entry.fluency) / 2),
              accuracy: entry.accuracy,
              fluency: entry.fluency,
              pronunciation: entry.accuracy,
            },
            weakTags: entry.accuracy < 70 ? ['pronunciation'] : [],
            metadata: {
              feedbackSource: entry.feedbackSource,
            },
          });
          await engine.learnerStateService.applyEvidence(ingestion.evidence);
          if (entry.accuracy < 70) {
            const notebookItem = await engine.context.persistence.repositories.notebook.createItem({
              learnerId: engine.context.learnerId,
              languageId: engine.context.languageId,
              term: entry.transcript.slice(0, 80) || 'Speaking attempt',
              translation: entry.tip,
              itemKind: 'pronunciation',
              source: 'speak',
              sourceRef: entry.id,
              tags: ['speaking', 'pronunciation'],
              isDifficult: true,
              flashcardEnabled: true,
            });
            await engine.context.persistence.repositories.review.createReviewItem({
              learnerId: engine.context.learnerId,
              languageId: engine.context.languageId,
              dueAt: todayIso(),
              source: 'speak_pronunciation',
              sourceRef: notebookItem.id,
              contentDomain: 'pronunciation',
              metadata: {
                term: notebookItem.term,
                translation: notebookItem.translation ?? 'Pronunciation follow-up',
                type: 'phrase',
              },
              strength: 'weak',
              lastResult: 'incorrect',
            });
          }
          await refreshFromPersistence(engine);
        } catch (error) {
          console.error('Failed to ingest speaking evidence', error);
        }
      })();
    }

    return entry;
  }, [engine, refreshFromPersistence]);

  const saveImmersionPhrase = useCallback((contentId: string, phrase: string, translation?: string) => {
    setState((previous) => {
      const progress = previous.immersionProgress[contentId] ?? {
        contentId,
        positionSec: 0,
        completed: false,
        savedPhrases: [],
        updatedAt: todayIso(),
      };

      const savedPhrases = progress.savedPhrases.includes(phrase)
        ? progress.savedPhrases
        : [phrase, ...progress.savedPhrases];

      const nextProgress: ImmersionProgress = {
        ...progress,
        savedPhrases,
        updatedAt: todayIso(),
      };

      const hasEntry = previous.notebookEntries.some((entry) => entry.term.toLowerCase() === phrase.toLowerCase());
      const nextNotebookEntries = hasEntry
        ? previous.notebookEntries
        : [
            {
              id: `note-${Date.now()}`,
              term: phrase,
              translation: translation ?? 'Saved from immersion',
              type: 'phrase' as const,
              tags: ['immersion'],
              createdAt: dateOnly(todayIso()),
              updatedAt: dateOnly(todayIso()),
              mastery: 0,
              source: 'immerse' as const,
              favorited: false,
            },
            ...previous.notebookEntries,
          ];

      return {
        ...previous,
        immersionProgress: {
          ...previous.immersionProgress,
          [contentId]: nextProgress,
        },
        notebookEntries: nextNotebookEntries,
      };
    });
    if (engine) {
      void (async () => {
        try {
          const notebookItem = await engine.context.persistence.repositories.notebook.createItem({
            learnerId: engine.context.learnerId,
            languageId: engine.context.languageId,
            term: phrase,
            translation: translation ?? 'Saved from immersion',
            itemKind: 'phrase',
            source: 'immerse',
            sourceRef: contentId,
            tags: ['immersion'],
            flashcardEnabled: true,
          });
          await engine.context.persistence.repositories.review.createReviewItem({
            learnerId: engine.context.learnerId,
            languageId: engine.context.languageId,
            dueAt: todayIso(),
            source: 'immerse_phrase',
            sourceRef: notebookItem.id,
            contentDomain: 'communication',
            metadata: {
              term: notebookItem.term,
              translation: notebookItem.translation ?? 'Saved from immersion',
              type: 'phrase',
            },
            strength: 'needs work',
          });
          await refreshFromPersistence(engine);
        } catch (error) {
          console.error('Failed to persist immersion phrase', error);
        }
      })();
    }
  }, [engine, refreshFromPersistence]);

  const updateImmersionProgress = useCallback((contentId: string, positionSec: number, completed = false) => {
    setState((previous) => {
      const current = previous.immersionProgress[contentId] ?? {
        contentId,
        positionSec: 0,
        completed: false,
        savedPhrases: [],
        updatedAt: todayIso(),
      };

      return {
        ...previous,
        immersionProgress: {
          ...previous.immersionProgress,
          [contentId]: {
            ...current,
            positionSec,
            completed: completed || current.completed,
            updatedAt: todayIso(),
          },
        },
      };
    });
  }, []);

  const saveDraft = useCallback<AppDataContextValue['saveDraft']>((draft) => {
    const now = dateOnly(todayIso());
    const wordCount = draft.content.trim().split(/\s+/).filter(Boolean).length;
    const existing = draft.id ? state.writingDrafts.find((item) => item.id === draft.id) : undefined;
    const saved: WritingDraft = existing
      ? {
          ...existing,
          ...draft,
          updatedAt: now,
          wordCount,
        }
      : {
          id: `wd-${Date.now()}`,
          promptId: draft.promptId,
          title: draft.title,
          content: draft.content,
          corrections: 0,
          createdAt: now,
          updatedAt: now,
          wordCount,
        };

    setState((previous) => {
      if (existing) {
        return {
          ...previous,
          writingDrafts: previous.writingDrafts.map((item) => (item.id === saved.id ? saved : item)),
        };
      }

      return { ...previous, writingDrafts: [saved, ...previous.writingDrafts] };
    });

    if (engine) {
      void (async () => {
        try {
          const ingestion = await engine.evidenceService.ingest({
            activityType: 'write_attempt',
            attemptId: saved.id,
            rawInputText: saved.content,
            scores: {
              correctness: Math.max(20, 100 - saved.corrections * 10),
              wordCount: saved.wordCount,
            },
            weakTags: [],
            metadata: {
              draftTitle: saved.title,
              promptId: saved.promptId ?? null,
            },
          });
          await engine.learnerStateService.applyEvidence(ingestion.evidence);
          await refreshFromPersistence(engine);
        } catch (error) {
          console.error('Failed to ingest writing evidence', error);
        }
      })();
    }

    return saved;
  }, [engine, refreshFromPersistence]);

  const analyzeDraft = useCallback((draftId: string, analysis: WritingCorrection[]) => {
    const now = dateOnly(todayIso());
    setState((previous) => ({
      ...previous,
      writingDrafts: previous.writingDrafts.map((draft) =>
        draft.id === draftId
          ? {
              ...draft,
              analysis,
              corrections: analysis.filter((item) => item.type !== 'correct').length,
              lastAnalyzedAt: now,
              updatedAt: now,
            }
          : draft,
      ),
    }));

    if (engine) {
      const correctionCount = analysis.filter((item) => item.type !== 'correct').length;
      void (async () => {
        try {
          const draft = state.writingDrafts.find((item) => item.id === draftId);
          const ingestion = await engine.evidenceService.ingest({
            activityType: 'write_attempt',
            attemptId: draftId,
            rawInputText: draft?.content ?? null,
            analysisResult: { corrections: analysis },
            correctionCount,
            weakTags: analysis.filter((item) => item.type !== 'correct').map((item) => item.type),
            scores: {
              correctness: Math.max(10, 100 - correctionCount * 12),
            },
            metadata: {
              draftTitle: draft?.title ?? 'Untitled',
            },
          });
          await engine.learnerStateService.applyEvidence(ingestion.evidence);
          const correctionItems = analysis
            .filter((item) => item.type !== 'correct')
            .slice(0, 6);
          for (const correction of correctionItems) {
            const notebookItem = await engine.context.persistence.repositories.notebook.createItem({
              learnerId: engine.context.learnerId,
              languageId: engine.context.languageId,
              term: correction.original,
              translation: correction.corrected,
              itemKind: correction.type === 'style' ? 'sentence' : 'grammar',
              notes: correction.explanation,
              source: 'write',
              sourceRef: draftId,
              tags: ['writing', correction.type],
              isDifficult: true,
              flashcardEnabled: true,
            });
            await engine.context.persistence.repositories.review.createReviewItem({
              learnerId: engine.context.learnerId,
              languageId: engine.context.languageId,
              dueAt: todayIso(),
              source: 'write_correction',
              sourceRef: notebookItem.id,
              contentDomain: correction.type === 'style' ? 'sentence' : 'grammar',
              metadata: {
                term: correction.original,
                translation: correction.corrected,
                type: correction.type === 'style' ? 'phrase' : 'grammar',
              },
              strength: 'weak',
              lastResult: 'incorrect',
            });
          }
          await refreshFromPersistence(engine);
        } catch (error) {
          console.error('Failed to ingest analyzed draft evidence', error);
        }
      })();
    }
  }, [engine, refreshFromPersistence, state.writingDrafts]);

  const createNotebookEntry = useCallback<AppDataContextValue['createNotebookEntry']>((entry) => {
    const now = todayIso();
    const newEntry: NotebookEntry = {
      ...entry,
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: dateOnly(now),
      updatedAt: dateOnly(now),
    };

    setState((previous) => ({ ...previous, notebookEntries: [newEntry, ...previous.notebookEntries] }));
    if (engine) {
      void (async () => {
        try {
          const persisted = await engine.context.persistence.repositories.notebook.createItem({
            learnerId: engine.context.learnerId,
            languageId: engine.context.languageId,
            collectionId: entry.collectionId ?? null,
            term: entry.term,
            translation: entry.translation,
            itemKind: entry.type,
            context: entry.context,
            notes: entry.notes,
            personalHint: entry.personalHint,
            personalExample: entry.personalExample,
            tags: entry.tags,
            source: entry.source ?? 'manual',
            mastery: entry.mastery,
            favorited: entry.favorited ?? false,
            isDifficult: entry.isDifficult ?? false,
            isImportant: entry.isImportant ?? false,
            flashcardEnabled: true,
          });
          await engine.context.persistence.repositories.review.createReviewItem({
            learnerId: engine.context.learnerId,
            languageId: engine.context.languageId,
            dueAt: todayIso(),
            source: 'notebook',
            sourceRef: persisted.id,
            contentDomain:
              persisted.itemKind === 'grammar'
                ? 'grammar'
                : persisted.itemKind === 'pronunciation'
                  ? 'pronunciation'
                  : persisted.itemKind === 'sentence'
                    ? 'sentence'
                    : 'vocabulary',
            metadata: {
              term: persisted.term,
              translation: persisted.translation ?? '',
              type: persisted.itemKind === 'grammar' ? 'grammar' : persisted.itemKind === 'phrase' ? 'phrase' : 'word',
            },
            strength: 'needs work',
          });
          await refreshFromPersistence(engine);
        } catch (error) {
          console.error('Failed to persist notebook entry', error);
        }
      })();
    }
    return newEntry;
  }, [engine, refreshFromPersistence]);

  const submitLearnTaskAttempt = useCallback<AppDataContextValue['submitLearnTaskAttempt']>(async (input) => {
    const evaluation = await evaluateLearnTaskSubmission({
      taskType: input.taskType,
      expectedAnswer: input.expectedAnswer,
      learnerAnswer: input.learnerAnswer,
      gradingMode: input.gradingMode ?? 'hybrid',
      payload: input.payload,
      structuredResponse: input.structuredResponse,
    });
    if (!engine) {
      return {
        correct: evaluation.isCorrect,
        score: evaluation.score,
        feedback: evaluation.feedback,
      };
    }
    try {
      await engine.context.persistence.repositories.learning.createTaskAttempt({
        learnerId: engine.context.learnerId,
        languageId: engine.context.languageId,
        unitId: input.unitId,
        lessonId: input.lessonId,
        objectiveId: input.objectiveId,
        taskTemplateId: input.taskTemplateId,
        taskType: input.taskType,
        promptText: input.prompt,
        expectedAnswer: input.expectedAnswer,
        learnerAnswer: input.learnerAnswer,
        isCorrect: evaluation.isCorrect,
        score: evaluation.score,
        evaluation: {
          feedback: evaluation.feedback,
          structuredResponse: input.structuredResponse ?? {},
          canonicalAnswer: input.learnerAnswer,
          payload: input.payload ?? {},
          gradingMode: input.gradingMode ?? 'hybrid',
        },
        durationMs: input.durationMs ?? null,
      });
      const ingestion = await engine.evidenceService.ingest({
        activityType: 'learn_task_result',
        rawInputText: input.learnerAnswer,
        rawOutputText: input.expectedAnswer,
        scores: {
          correctness: evaluation.score,
        },
        weakTags: evaluation.isCorrect ? [] : ['learn_accuracy'],
        metadata: {
          lessonId: input.lessonId,
          objectiveId: input.objectiveId,
          taskTemplateId: input.taskTemplateId,
          taskType: input.taskType,
          gradingMode: input.gradingMode ?? 'hybrid',
        },
      });
      await engine.learnerStateService.applyEvidence(ingestion.evidence);
      if (!evaluation.isCorrect) {
        await engine.context.persistence.repositories.review.createReviewItem({
          learnerId: engine.context.learnerId,
          languageId: engine.context.languageId,
          dueAt: todayIso(),
          source: 'learn_mistake',
          sourceRef: input.taskTemplateId,
          contentDomain:
            input.taskType.includes('grammar')
              ? 'grammar'
              : input.taskType.includes('pronunciation') || input.taskType.includes('sound') || input.taskType.includes('listen')
                ? 'pronunciation'
                : input.taskType.includes('sentence') || input.taskType.includes('dialogue')
                  ? 'sentence'
                  : 'vocabulary',
          metadata: {
            term: input.prompt.slice(0, 80),
            translation: input.expectedAnswer,
            type: input.taskType.includes('grammar') ? 'grammar' : 'phrase',
          },
          strength: 'weak',
          lastResult: 'incorrect',
        });
      }

      setState((previous) => ({
        ...previous,
        lessonHistory: [
          {
            lessonId: input.lessonId,
            taskType: input.taskType,
            score: evaluation.score,
            createdAt: todayIso(),
          },
          ...previous.lessonHistory,
        ].slice(0, 200),
      }));

      await refreshFromPersistence(engine);
      return {
        correct: evaluation.isCorrect,
        score: evaluation.score,
        feedback: evaluation.feedback,
      };
    } catch (error) {
      console.error('Failed to submit learn task attempt', error);
      return {
        correct: evaluation.isCorrect,
        score: evaluation.score,
        feedback: evaluation.feedback,
      };
    }
  }, [engine, refreshFromPersistence]);

  const updateMastery = useCallback((id: string, delta: number) => {
    setState((previous) => ({
      ...previous,
      notebookEntries: previous.notebookEntries.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              mastery: Math.max(0, Math.min(100, entry.mastery + delta)),
              updatedAt: dateOnly(todayIso()),
            }
          : entry,
      ),
    }));
    if (engine) {
      void (async () => {
        try {
          const current = state.notebookEntries.find((entry) => entry.id === id);
          if (!current) return;
          await engine.context.persistence.repositories.notebook.updateItem({
            id,
            mastery: Math.max(0, Math.min(100, current.mastery + delta)),
          });
        } catch (error) {
          console.error('Failed to persist mastery update', error);
        }
      })();
    }
  }, [engine, state.notebookEntries]);

  const toggleFavorite = useCallback((id: string) => {
    setState((previous) => ({
      ...previous,
      notebookEntries: previous.notebookEntries.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              favorited: !entry.favorited,
              updatedAt: dateOnly(todayIso()),
            }
          : entry,
      ),
    }));
    if (engine) {
      void (async () => {
        try {
          const current = state.notebookEntries.find((entry) => entry.id === id);
          if (!current) return;
          await engine.context.persistence.repositories.notebook.updateItem({
            id,
            favorited: !Boolean(current.favorited),
          });
        } catch (error) {
          console.error('Failed to persist favorite toggle', error);
        }
      })();
    }
  }, [engine, state.notebookEntries]);

  const recordLearnInteraction = useCallback<AppDataContextValue['recordLearnInteraction']>((input) => {
    if (!engine) return;
    void (async () => {
      try {
        const ingestion = await engine.evidenceService.ingest({
          activityType: 'learn_task_result',
          rawInputText: input.note ?? null,
          analysisResult: {
            moduleId: input.moduleId ?? null,
            lessonId: input.lessonId ?? null,
          },
          scores: {
            correctness: 72,
          },
          weakTags: [],
          metadata: {
            moduleId: input.moduleId ?? null,
            lessonId: input.lessonId ?? null,
          },
        });
        await engine.learnerStateService.applyEvidence(ingestion.evidence);
        await refreshFromPersistence(engine);
      } catch (error) {
        console.error('Failed to log learn interaction', error);
      }
    })();
  }, [engine, refreshFromPersistence]);

  const value = useMemo<AppDataContextValue>(() => {
    const dueCount = queueForMode(state.reviewItems, 'due-now').length;
    const weakCount = queueForMode(state.reviewItems, 'weak').length;
    const flashCardCount = state.reviewItems.length;
    const dueReviewPreview = queueForMode(state.reviewItems, 'due-now').slice(0, 3);
    const recentlySaved = [...state.notebookEntries]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8);

    return {
      state,
      dueCount,
      weakCount,
      flashCardCount,
      recentlySaved,
      dueReviewPreview,
      startReviewSession,
      gradeReviewItem,
      saveSpeakingResult,
      saveImmersionPhrase,
      updateImmersionProgress,
      saveDraft,
      analyzeDraft,
      createNotebookEntry,
      submitLearnTaskAttempt,
      updateMastery,
      toggleFavorite,
      recordLearnInteraction,
    };
  }, [
    analyzeDraft,
    createNotebookEntry,
    gradeReviewItem,
    recordLearnInteraction,
    saveDraft,
    saveImmersionPhrase,
    saveSpeakingResult,
    submitLearnTaskAttempt,
    startReviewSession,
    state,
    toggleFavorite,
    updateImmersionProgress,
    updateMastery,
  ]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
}
