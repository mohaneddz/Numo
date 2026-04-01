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
    .filter((entry) => entry.activityType === 'speak' || entry.activityType === 'speaking_attempt')
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
    .filter((entry) => entry.activityType === 'write' || entry.activityType === 'writing_submission')
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
      notebookEntries: mapNotebookEntriesFromReviewItems(reviewItems),
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
            activityType: 'speak',
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
  }, []);

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
            activityType: 'write',
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
            activityType: 'write',
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
    return newEntry;
  }, []);

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
  }, []);

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
  }, []);

  const recordLearnInteraction = useCallback<AppDataContextValue['recordLearnInteraction']>((input) => {
    if (!engine) return;
    void (async () => {
      try {
        const ingestion = await engine.evidenceService.ingest({
          activityType: 'learn',
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
