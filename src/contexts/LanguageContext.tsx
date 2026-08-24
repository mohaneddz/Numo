import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { initializePersistence } from '../persistence';
import { useProfileSession } from './ProfileSessionContext';
import { resolveLanguageFlag } from '../utils/flags';
import { languageCatalog, languageCatalogMap, type LanguageCatalogEntry } from '../data/languageCatalog';

// Re-exported so existing imports from this module keep working; the catalog
// itself lives in src/data/languageCatalog.ts, which has no React dependency, so
// non-UI tooling (e.g. scripts/generateCurriculumSeed.ts) can read it without
// pulling in a context module.
export { languageCatalog, type LanguageCatalogEntry };

export interface Progress {
  dailyGoalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  todayMinutes: number;
  totalXP: number;
}

export interface ContinueLearning {
  moduleName: string;
  lessonTitle: string;
  description: string;
  currentLesson: number;
  totalLessons: number;
  progress: number;
}

export interface Language {
  code: string;
  name: string;
  flag: string;
  progress: Progress;
  continueLearning?: ContinueLearning;
}

interface LanguageContextType {
  activeLanguage: Language;
  languages: Language[];
  languageStatus: 'loading' | 'ready';
  hasSelectedLanguages: boolean;
  availableLanguages: LanguageCatalogEntry[];
  isBaseLanguage: (code: string) => boolean;
  getLanguageScore: (code: string) => number;
  setActiveLanguage: (code: string) => void;
  addLanguage: (code: string) => boolean;
  addLanguages: (codes: string[]) => string[];
  removeLanguage: (_code: string) => void;
  moveLanguage: (_code: string, _direction: 'up' | 'down') => void;
  setLanguageScore: (code: string, score: number) => void;
  updateProgress: (_minutes: number, _xp: number) => void;
  updateContinueLearning: (data: Partial<ContinueLearning>) => void;
}

const catalogMap = languageCatalogMap;

const defaultProgress: Progress = {
  dailyGoalMinutes: 30,
  currentStreak: 0,
  longestStreak: 0,
  todayMinutes: 0,
  totalXP: 0,
};

const DEFAULT_NEW_LANGUAGE_SCORE = 5;

interface LanguagePreferences {
  selectedCodes: string[];
  scores: Record<string, number>;
}

function languagePrefsKey(profileId: string): string {
  return `profile_language_prefs_${profileId}`;
}

function sanitizeScore(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value)));
}

function toLanguage(input: {
  code: string;
  name: string;
  flag?: string | null;
  progress?: Partial<Progress>;
}): Language {
  const catalog = catalogMap.get(input.code);
  const fallbackFlag = catalog?.flag ?? '🌐';
  return {
    code: input.code,
    name: input.name || catalog?.name || input.code.toUpperCase(),
    flag: resolveLanguageFlag(input.code, input.flag ?? fallbackFlag),
    progress: {
      ...defaultProgress,
      ...(input.progress ?? {}),
    },
    continueLearning: catalog
      ? {
          moduleName: catalog.starterModule,
          lessonTitle: catalog.starterLesson,
          description: catalog.starterDescription,
          currentLesson: 1,
          totalLessons: 10,
          progress: 0,
        }
      : undefined,
  };
}

const NO_LANGUAGE_SELECTED = toLanguage({
  code: '',
  name: 'Choose language',
  flag: '🌐',
});

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeProfile, status: profileStatus } = useProfileSession();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [activeLanguageCode, setActiveLanguageCode] = useState<string>('');
  const [languageScores, setLanguageScores] = useState<Record<string, number>>({});
  const [languageStatus, setLanguageStatus] = useState<'loading' | 'ready'>('loading');

  const baseLanguageCodes = useMemo(
    () =>
      new Set(
        [activeProfile?.nativeLanguageCode, activeProfile?.baseLanguageCode]
          .filter((code): code is string => Boolean(code))
          .map((code) => code.trim().toLowerCase()),
      ),
    [activeProfile?.baseLanguageCode, activeProfile?.nativeLanguageCode],
  );

  const persistLanguagePreferences = async (
    profileId: string,
    selectedCodes: string[],
    scores: Record<string, number>,
  ) => {
    try {
      const persistence = await initializePersistence();
      const cleanScores: Record<string, number> = {};
      for (const [code, score] of Object.entries(scores)) {
        if (typeof score === 'number' && Number.isFinite(score)) {
          cleanScores[code] = sanitizeScore(score);
        }
      }
      await persistence.repositories.settings.setJson<LanguagePreferences>(
        languagePrefsKey(profileId),
        { selectedCodes, scores: cleanScores },
        'language_context',
      );
    } catch (error) {
      console.error('Failed to persist language preferences', error);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (profileStatus !== 'ready' || !activeProfile?.id) {
        setLanguageStatus('loading');
        return;
      }
      setLanguageStatus('loading');
      try {
        const persistence = await initializePersistence();
        const persistedLanguages = await persistence.repositories.languages.listLanguages();
        const active = await persistence.repositories.languages.getActiveLanguage();
        const preferences = await persistence.repositories.settings.getJson<LanguagePreferences>(
          languagePrefsKey(activeProfile.id),
        );
        const stateRows = await persistence.db.select<{
          language_id: string;
          code: string;
          daily_goal_minutes: number;
          current_streak: number;
          longest_streak: number;
          today_minutes: number;
          total_xp: number;
        }>(
          `
          SELECT ls.language_id, l.code, ls.daily_goal_minutes, ls.current_streak, ls.longest_streak, ls.today_minutes, ls.total_xp
          FROM learner_language_state ls
          JOIN languages l ON l.id = ls.language_id
          WHERE ls.learner_id = ?;
          `,
          [activeProfile.id],
        );
        const stateByCode = new Map(stateRows.map((row) => [row.code, row]));
        const persistedByCode = new Map(persistedLanguages.map((language) => [language.code, language]));
        const nextSelectedCodes = (preferences?.selectedCodes ?? [])
          .map((code) => code.trim().toLowerCase())
          .filter((code, index, all) => all.indexOf(code) === index)
          .filter((code) => catalogMap.has(code));
        const selectedCodes = nextSelectedCodes;

        const nextLanguages = selectedCodes.map((code) => {
          const language = persistedByCode.get(code);
          const persistedState = stateByCode.get(code);
          return toLanguage({
            code,
            name: language?.name ?? catalogMap.get(code)?.name ?? code.toUpperCase(),
            flag: language?.flag ?? catalogMap.get(code)?.flag ?? null,
            progress: persistedState
              ? {
                  dailyGoalMinutes: Number(persistedState.daily_goal_minutes ?? 30),
                  currentStreak: Number(persistedState.current_streak ?? 0),
                  longestStreak: Number(persistedState.longest_streak ?? 0),
                  todayMinutes: Number(persistedState.today_minutes ?? 0),
                  totalXP: Number(persistedState.total_xp ?? 0),
                }
              : undefined,
          });
        });

        if (cancelled) return;
        if (nextLanguages.length === 0) {
          setLanguages([]);
          setActiveLanguageCode('');
          setLanguageScores({});
          setLanguageStatus('ready');
          return;
        }
        setLanguages(nextLanguages);
        const nextActive = active?.code && selectedCodes.includes(active.code) ? active.code : nextLanguages[0].code;
        setActiveLanguageCode(nextActive);

        const initialScores: Record<string, number> = {};
        for (const language of nextLanguages) {
          const persistedScore = preferences?.scores?.[language.code];
          initialScores[language.code] =
            typeof persistedScore === 'number' ? sanitizeScore(persistedScore) : DEFAULT_NEW_LANGUAGE_SCORE;
        }
        setLanguageScores(initialScores);
        setLanguageStatus('ready');

        if (
          !preferences
          || JSON.stringify(preferences.selectedCodes ?? []) !== JSON.stringify(selectedCodes)
          || Object.keys(preferences.scores ?? {}).length !== Object.keys(initialScores).length
        ) {
          await persistLanguagePreferences(activeProfile.id, selectedCodes, initialScores);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load profile-scoped languages', error);
          setLanguages([]);
          setActiveLanguageCode('');
          setLanguageScores({});
          setLanguageStatus('ready');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeProfile?.id, profileStatus]);

  const activeLanguage = languages.find((language) => language.code === activeLanguageCode) || languages[0] || NO_LANGUAGE_SELECTED;

  const availableLanguages = useMemo(
    () => languageCatalog.filter((entry) => !languages.some((language) => language.code === entry.code)),
    [languages],
  );

  const isBaseLanguage = (code: string): boolean => baseLanguageCodes.has(code.trim().toLowerCase());

  const getLanguageScore = (code: string): number => languageScores[code] ?? DEFAULT_NEW_LANGUAGE_SCORE;

  const setActiveLanguage = (code: string) => {
    if (!languages.some((language) => language.code === code)) {
      return;
    }
    setActiveLanguageCode(code);
    void (async () => {
      try {
        const persistence = await initializePersistence();
        await persistence.repositories.languages.setActiveLanguage(code);
      } catch (error) {
        console.error('Failed to persist active language', error);
      }
    })();
  };

  const addLanguage = (code: string) => {
    if (languages.some((language) => language.code === code)) {
      return false;
    }

    const catalog = catalogMap.get(code);
    if (!catalog) {
      return false;
    }

    const nextLanguage = toLanguage({
      code: catalog.code,
      name: catalog.name,
      flag: catalog.flag,
    });

    setLanguages((prev) => [...prev, nextLanguage]);
    setLanguageScores((prev) => ({ ...prev, [code]: DEFAULT_NEW_LANGUAGE_SCORE }));
    setActiveLanguageCode(code);

    void (async () => {
      if (!activeProfile?.id) {
        return;
      }
      try {
        const persistence = await initializePersistence();
        await persistence.repositories.languages.upsertLanguage({
          code: catalog.code,
          name: catalog.name,
          flag: catalog.flag,
        });
        await persistence.repositories.languages.setActiveLanguage(code);
        await persistence.db.execute(
          `
          INSERT INTO learner_language_state (
            id, learner_id, language_id, total_xp, daily_goal_minutes, today_minutes, current_streak, longest_streak,
            last_activity_at, progress_json, created_at, updated_at
          )
          SELECT
            lower(hex(randomblob(8))), ?, l.id, 0, 30, 0, 0, 0, NULL, '{}', datetime('now'), datetime('now')
          FROM languages l
          WHERE l.code = ?
          ON CONFLICT(learner_id, language_id) DO NOTHING;
          `,
          [activeProfile.id, code],
        );
        const selectedCodes = [...languages.map((language) => language.code), code];
        const nextScores = { ...languageScores, [code]: DEFAULT_NEW_LANGUAGE_SCORE };
        await persistLanguagePreferences(activeProfile.id, selectedCodes, nextScores);
      } catch (error) {
        console.error('Failed to add language', error);
      }
    })();
    return true;
  };

  const addLanguages = (codes: string[]) => {
    const existingCodes = new Set(languages.map((language) => language.code));
    const validCodes = codes
      .map((code) => code.trim().toLowerCase())
      .filter((code, index, all) => all.indexOf(code) === index)
      .filter((code) => catalogMap.has(code) && !existingCodes.has(code));

    if (validCodes.length === 0) {
      return [];
    }

    const addedLanguages = validCodes.map((code) => {
      const catalog = catalogMap.get(code)!;
      return toLanguage({
        code: catalog.code,
        name: catalog.name,
        flag: catalog.flag,
      });
    });
    const nextLanguages = [...languages, ...addedLanguages];
    const nextScores = { ...languageScores };
    for (const code of validCodes) {
      nextScores[code] = DEFAULT_NEW_LANGUAGE_SCORE;
    }

    setLanguages(nextLanguages);
    setLanguageScores(nextScores);
    setActiveLanguageCode(validCodes[0]);

    void (async () => {
      if (!activeProfile?.id) {
        return;
      }
      try {
        const persistence = await initializePersistence();
        for (const code of validCodes) {
          const catalog = catalogMap.get(code)!;
          await persistence.repositories.languages.upsertLanguage({
            code: catalog.code,
            name: catalog.name,
            flag: catalog.flag,
          });
          await persistence.db.execute(
            `
            INSERT INTO learner_language_state (
              id, learner_id, language_id, total_xp, daily_goal_minutes, today_minutes, current_streak, longest_streak,
              last_activity_at, progress_json, created_at, updated_at
            )
            SELECT
              lower(hex(randomblob(8))), ?, l.id, 0, 30, 0, 0, 0, NULL, '{}', datetime('now'), datetime('now')
            FROM languages l
            WHERE l.code = ?
            ON CONFLICT(learner_id, language_id) DO NOTHING;
            `,
            [activeProfile.id, code],
          );
        }
        await persistence.repositories.languages.setActiveLanguage(validCodes[0]);
        await persistLanguagePreferences(
          activeProfile.id,
          nextLanguages.map((language) => language.code),
          nextScores,
        );
      } catch (error) {
        console.error('Failed to add languages', error);
      }
    })();

    return validCodes;
  };

  const removeLanguage = (code: string) => {
    const nextLanguages = languages.filter((language) => language.code !== code);
    if (nextLanguages.length === languages.length) {
      return;
    }

    setLanguages(nextLanguages);
    setLanguageScores((prev) => {
      const next = { ...prev };
      delete next[code];
      return next;
    });

    const removedWasActive = activeLanguageCode === code;
    const nextActive = removedWasActive ? nextLanguages[0]?.code ?? '' : activeLanguageCode;
    if (removedWasActive) {
      setActiveLanguageCode(nextActive);
    }

    void (async () => {
      if (!activeProfile?.id) {
        return;
      }
      try {
        const persistence = await initializePersistence();
        if (removedWasActive && nextActive) {
          await persistence.repositories.languages.setActiveLanguage(nextActive);
        } else if (removedWasActive) {
          await persistence.db.execute('UPDATE languages SET is_active = 0;');
        }
        const selectedCodes = nextLanguages.map((language) => language.code);
        const nextScores = Object.fromEntries(
          Object.entries(languageScores).filter(([languageCode]) => languageCode !== code),
        );
        await persistLanguagePreferences(activeProfile.id, selectedCodes, nextScores);
      } catch (error) {
        console.error('Failed to remove language', error);
      }
    })();
  };

  const moveLanguage = (code: string, direction: 'up' | 'down') => {
    const currentIndex = languages.findIndex((language) => language.code === code);
    if (currentIndex < 0) {
      return;
    }
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= languages.length) {
      return;
    }

    const nextLanguages = [...languages];
    const [moved] = nextLanguages.splice(currentIndex, 1);
    nextLanguages.splice(targetIndex, 0, moved);
    setLanguages(nextLanguages);

    void (async () => {
      if (!activeProfile?.id) {
        return;
      }
      await persistLanguagePreferences(activeProfile.id, nextLanguages.map((language) => language.code), languageScores);
    })();
  };

  const setLanguageScore = (code: string, score: number) => {
    const nextScore = sanitizeScore(score);
    setLanguageScores((prev) => {
      const next = { ...prev, [code]: nextScore };
      void (async () => {
        if (!activeProfile?.id) {
          return;
        }
        const selectedCodes = languages.map((language) => language.code);
        await persistLanguagePreferences(activeProfile.id, selectedCodes, next);
      })();
      return next;
    });
  };

  const updateProgress = (_minutes: number, _xp: number) => undefined;

  const updateContinueLearning = (data: Partial<ContinueLearning>) => {
    setLanguages((prev) =>
      prev.map((language) =>
        language.code === activeLanguageCode
          ? {
              ...language,
              continueLearning: {
                moduleName: language.continueLearning?.moduleName ?? `${language.name} Core Path`,
                lessonTitle: language.continueLearning?.lessonTitle ?? 'Start your next lesson',
                description: language.continueLearning?.description ?? 'Complete one session to build progress.',
                currentLesson: language.continueLearning?.currentLesson ?? 1,
                totalLessons: language.continueLearning?.totalLessons ?? 10,
                progress: language.continueLearning?.progress ?? 0,
                ...data,
              },
            }
          : language,
      ),
    );
  };

  return (
    <LanguageContext.Provider
      value={{
        activeLanguage,
        languages,
        languageStatus,
        hasSelectedLanguages: languages.length > 0,
        availableLanguages,
        isBaseLanguage,
        getLanguageScore,
        setActiveLanguage,
        addLanguage,
        addLanguages,
        removeLanguage,
        moveLanguage,
        setLanguageScore,
        updateProgress,
        updateContinueLearning,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
