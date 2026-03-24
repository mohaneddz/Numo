import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  dueReviewItems,
  recentlySaved as seededRecentlySaved,
} from '../data/learner';
import { immersionContent } from '../data/immersion';
import { vocabularyItems, grammarNotes, mistakeEntries } from '../data/vocabulary';
import { writingDrafts as seededDrafts } from '../data/library';
import type {
  ImmersionProgress,
  NotebookEntry,
  ReviewItem,
  SpeakingSessionRun,
  WritingCorrection,
  WritingDraft,
} from '../data/types';

const STORAGE_KEY = 'noema_app_data_v1';
const SCHEMA_VERSION = 1;

export type ReviewMode = 'due-now' | 'weak' | 'mistakes' | 'cram';

interface ReviewSessionSummary {
  mode: ReviewMode;
  queue: ReviewItem[];
}

interface AppDataState {
  schemaVersion: number;
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
  recentlySaved: NotebookEntry[];
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
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

function todayIso(): string {
  return new Date().toISOString();
}

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

function addDaysIso(baseIso: string, days: number): string {
  const d = new Date(baseIso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function shiftStrength(strength: ReviewItem['strength'], direction: 'up' | 'down'): ReviewItem['strength'] {
  const order: ReviewItem['strength'][] = ['critical', 'weak', 'needs work', 'solid', 'very solid'];
  const idx = order.indexOf(strength);
  if (idx < 0) return strength;
  const next = direction === 'up' ? Math.min(order.length - 1, idx + 1) : Math.max(0, idx - 1);
  return order[next];
}

function seedState(): AppDataState {
  const reviewItems: ReviewItem[] = dueReviewItems.map((item) => ({
    ...item,
    nextDueAt: `${item.dueDate}T08:00:00.000Z`,
    intervalDays: 1,
    ease: 2.5,
    lastResult: item.strength === 'very solid' || item.strength === 'solid' ? 'correct' : 'incorrect',
  }));

  const notebookEntries: NotebookEntry[] = [...vocabularyItems, ...grammarNotes, ...mistakeEntries].map((item) => ({
    ...item,
    source: 'manual',
    favorited: seededRecentlySaved.some((saved) => saved.term === item.term),
    updatedAt: item.createdAt,
  }));

  const immersionProgress: Record<string, ImmersionProgress> = {};
  immersionContent.forEach((content) => {
    immersionProgress[content.id] = {
      contentId: content.id,
      positionSec: Math.round(content.progress * 4),
      completed: content.progress >= 100,
      savedPhrases: [],
      updatedAt: todayIso(),
    };
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    reviewItems,
    speakingRuns: [],
    immersionProgress,
    writingDrafts: seededDrafts,
    notebookEntries,
  };
}

function safeLoadState(): AppDataState {
  const seeded = seedState();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seeded;

  try {
    const parsed = JSON.parse(raw) as Partial<AppDataState>;
    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      return seeded;
    }

    return {
      schemaVersion: SCHEMA_VERSION,
      reviewItems: parsed.reviewItems ?? seeded.reviewItems,
      speakingRuns: parsed.speakingRuns ?? seeded.speakingRuns,
      immersionProgress: parsed.immersionProgress ?? seeded.immersionProgress,
      writingDrafts: parsed.writingDrafts ?? seeded.writingDrafts,
      notebookEntries: parsed.notebookEntries ?? seeded.notebookEntries,
    };
  } catch {
    return seeded;
  }
}

function queueForMode(items: ReviewItem[], mode: ReviewMode): ReviewItem[] {
  const now = new Date();
  const due = items.filter((item) => new Date(item.nextDueAt ?? `${item.dueDate}T00:00:00.000Z`) <= now);

  if (mode === 'due-now') {
    return due.length > 0 ? due : items.slice(0, 10);
  }

  if (mode === 'weak') {
    const weakItems = items.filter((item) => ['critical', 'weak', 'needs work'].includes(item.strength));
    return weakItems.length > 0 ? weakItems : due;
  }

  if (mode === 'mistakes') {
    const mistakes = items.filter((item) => item.lastResult === 'incorrect');
    return mistakes.length > 0 ? mistakes : due;
  }

  const sorted = [...items].sort((a, b) => {
    const scoreA = (a.ease ?? 2.5) + ((a.intervalDays ?? 1) / 10);
    const scoreB = (b.ease ?? 2.5) + ((b.intervalDays ?? 1) / 10);
    return scoreA - scoreB;
  });
  return sorted.slice(0, 15);
}

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppDataState>(safeLoadState);

  const persist = (next: AppDataState) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const startReviewSession = (mode: ReviewMode): ReviewSessionSummary => {
    return {
      mode,
      queue: queueForMode(state.reviewItems, mode),
    };
  };

  const gradeReviewItem = (id: string, result: 'correct' | 'incorrect') => {
    const now = todayIso();
    const nextItems = state.reviewItems.map((item) => {
      if (item.id !== id) return item;

      const previousInterval = item.intervalDays ?? 1;
      const previousEase = item.ease ?? 2.5;
      const intervalDays = result === 'correct'
        ? Math.max(1, Math.round(previousInterval * previousEase))
        : 1;
      const ease = result === 'correct'
        ? Math.min(3, Number((previousEase + 0.15).toFixed(2)))
        : Math.max(1.3, Number((previousEase - 0.2).toFixed(2)));
      const nextDueAt = addDaysIso(now, intervalDays);

      return {
        ...item,
        attempts: item.attempts + 1,
        intervalDays,
        ease,
        nextDueAt,
        dueDate: dateOnly(nextDueAt),
        lastReviewed: dateOnly(now),
        lastResult: result,
        strength: shiftStrength(item.strength, result === 'correct' ? 'up' : 'down'),
      };
    });

    persist({ ...state, reviewItems: nextItems });
  };

  const saveSpeakingResult = (
    sessionId: string,
    run: Omit<SpeakingSessionRun, 'id' | 'sessionId' | 'recordedAt'>,
  ): SpeakingSessionRun => {
    const entry: SpeakingSessionRun = {
      ...run,
      id: `run-${Date.now()}`,
      sessionId,
      recordedAt: todayIso(),
    };

    persist({ ...state, speakingRuns: [entry, ...state.speakingRuns] });
    return entry;
  };

  const createNotebookEntry: AppDataContextValue['createNotebookEntry'] = (entry) => {
    const now = todayIso();
    const newEntry: NotebookEntry = {
      ...entry,
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: dateOnly(now),
      updatedAt: dateOnly(now),
    };

    persist({ ...state, notebookEntries: [newEntry, ...state.notebookEntries] });
    return newEntry;
  };

  const saveImmersionPhrase = (contentId: string, phrase: string, translation?: string) => {
    const progress = state.immersionProgress[contentId] ?? {
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

    const hasEntry = state.notebookEntries.some((entry) => entry.term.toLowerCase() === phrase.toLowerCase());

    const nextState: AppDataState = {
      ...state,
      immersionProgress: {
        ...state.immersionProgress,
        [contentId]: nextProgress,
      },
      notebookEntries: hasEntry
        ? state.notebookEntries
        : [
            {
              id: `note-${Date.now()}`,
              term: phrase,
              translation: translation ?? 'Saved from immersion',
              type: 'phrase',
              tags: ['immersion'],
              createdAt: dateOnly(todayIso()),
              updatedAt: dateOnly(todayIso()),
              mastery: 0,
              source: 'immerse',
              favorited: false,
            },
            ...state.notebookEntries,
          ],
    };

    persist(nextState);
  };

  const updateImmersionProgress = (contentId: string, positionSec: number, completed = false) => {
    const current = state.immersionProgress[contentId] ?? {
      contentId,
      positionSec: 0,
      completed: false,
      savedPhrases: [],
      updatedAt: todayIso(),
    };

    persist({
      ...state,
      immersionProgress: {
        ...state.immersionProgress,
        [contentId]: {
          ...current,
          positionSec,
          completed: completed || current.completed,
          updatedAt: todayIso(),
        },
      },
    });
  };

  const saveDraft: AppDataContextValue['saveDraft'] = (draft) => {
    const now = dateOnly(todayIso());
    const wordCount = draft.content.trim().split(/\s+/).filter(Boolean).length;

    let saved: WritingDraft;
    const existing = draft.id ? state.writingDrafts.find((item) => item.id === draft.id) : undefined;

    if (existing) {
      saved = {
        ...existing,
        ...draft,
        updatedAt: now,
        wordCount,
      };
      persist({
        ...state,
        writingDrafts: state.writingDrafts.map((item) => (item.id === saved.id ? saved : item)),
      });
    } else {
      saved = {
        id: `wd-${Date.now()}`,
        promptId: draft.promptId,
        title: draft.title,
        content: draft.content,
        corrections: 0,
        createdAt: now,
        updatedAt: now,
        wordCount,
      };
      persist({ ...state, writingDrafts: [saved, ...state.writingDrafts] });
    }

    return saved;
  };

  const analyzeDraft = (draftId: string, analysis: WritingCorrection[]) => {
    persist({
      ...state,
      writingDrafts: state.writingDrafts.map((draft) =>
        draft.id === draftId
          ? {
              ...draft,
              analysis,
              corrections: analysis.filter((item) => item.type !== 'correct').length,
              lastAnalyzedAt: dateOnly(todayIso()),
              updatedAt: dateOnly(todayIso()),
            }
          : draft,
      ),
    });
  };

  const updateMastery = (id: string, delta: number) => {
    persist({
      ...state,
      notebookEntries: state.notebookEntries.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              mastery: Math.max(0, Math.min(100, entry.mastery + delta)),
              updatedAt: dateOnly(todayIso()),
            }
          : entry,
      ),
    });
  };

  const toggleFavorite = (id: string) => {
    persist({
      ...state,
      notebookEntries: state.notebookEntries.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              favorited: !entry.favorited,
              updatedAt: dateOnly(todayIso()),
            }
          : entry,
      ),
    });
  };

  const value = useMemo<AppDataContextValue>(() => {
    const dueCount = queueForMode(state.reviewItems, 'due-now').length;
    const weakCount = queueForMode(state.reviewItems, 'weak').length;
    const recentlySaved = [...state.notebookEntries]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8);

    return {
      state,
      dueCount,
      weakCount,
      recentlySaved,
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
    };
  }, [state]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
}
