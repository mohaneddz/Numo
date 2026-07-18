import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { initializePersistence } from '../persistence';
import { useProfileSession } from './ProfileSessionContext';

export type JourneyLevel = 'complete_beginner' | 'beginner' | 'lower_intermediate' | 'intermediate_plus';
export type JourneyFocus = 'speaking' | 'understanding' | 'reading' | 'writing' | 'balanced';
export type JourneyIntensity = 'very_light' | 'normal' | 'serious';
export type JourneyPace = 'gentler' | 'standard' | 'harder';
export type ScriptStartTiming = 'start_now' | 'start_later' | 'start_gradually';
export type DifficultyPreference = 'easier' | 'standard' | 'harder';
export type JourneyGoal = 'conversation' | 'travel' | 'career' | 'study' | 'exam' | 'culture';
export type JourneyTimeframe = 'relaxed' | 'three_months' | 'six_months' | 'one_year';

export interface LanguageJourneySettings {
  level: JourneyLevel;
  focus: JourneyFocus;
  intensity: JourneyIntensity;
  pace: JourneyPace;
  difficulty: DifficultyPreference;
  scriptStartTiming: ScriptStartTiming;
  primaryGoal: JourneyGoal;
  timeframe: JourneyTimeframe;
  sessionsPerWeek: number;
  sessionMinutes: number;
  onboardingCompleted: boolean;
  welcomeSeen: boolean;
}

interface LanguageJourneyState {
  byLanguage: Record<string, LanguageJourneySettings>;
}

interface LanguageJourneyContextType {
  state: LanguageJourneyState;
  getSettings: (languageCode: string) => LanguageJourneySettings;
  completeOnboarding: (languageCode: string, input: Partial<LanguageJourneySettings>) => void;
  markWelcomeSeen: (languageCode: string) => void;
  setDifficulty: (languageCode: string, difficulty: DifficultyPreference) => void;
}

const STORAGE_PREFIX = 'language_journey';

const defaultJourneySettings: LanguageJourneySettings = {
  level: 'complete_beginner',
  focus: 'balanced',
  intensity: 'normal',
  pace: 'gentler',
  difficulty: 'easier',
  scriptStartTiming: 'start_gradually',
  primaryGoal: 'conversation',
  timeframe: 'relaxed',
  sessionsPerWeek: 5,
  sessionMinutes: 20,
  onboardingCompleted: false,
  welcomeSeen: false,
};

function settingsKey(profileId: string): string {
  return `${STORAGE_PREFIX}_${profileId}`;
}

function normalizeLanguageCode(languageCode: string): string {
  return languageCode.trim().toLowerCase();
}

const LanguageJourneyContext = createContext<LanguageJourneyContextType | undefined>(undefined);

export const LanguageJourneyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeProfile, status: profileStatus } = useProfileSession();
  const [state, setState] = useState<LanguageJourneyState>({ byLanguage: {} });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (profileStatus !== 'ready' || !activeProfile?.id) {
        setState({ byLanguage: {} });
        return;
      }
      try {
        const persistence = await initializePersistence();
        const stored = await persistence.repositories.settings.getJson<LanguageJourneyState>(settingsKey(activeProfile.id));
        if (!cancelled) {
          setState(stored?.byLanguage ? stored : { byLanguage: {} });
        }
      } catch (error) {
        console.error('Failed to load language journey settings', error);
        if (!cancelled) {
          setState({ byLanguage: {} });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeProfile?.id, profileStatus]);

  const persist = async (nextState: LanguageJourneyState) => {
    if (!activeProfile?.id) return;
    try {
      const persistence = await initializePersistence();
      await persistence.repositories.settings.setJson<LanguageJourneyState>(
        settingsKey(activeProfile.id),
        nextState,
        'language_journey',
      );
    } catch (error) {
      console.error('Failed to persist language journey settings', error);
    }
  };

  const getSettings = (languageCode: string): LanguageJourneySettings => {
    const code = normalizeLanguageCode(languageCode);
    return state.byLanguage[code] ?? defaultJourneySettings;
  };

  const updateSettings = (languageCode: string, patch: Partial<LanguageJourneySettings>) => {
    const code = normalizeLanguageCode(languageCode);
    setState((prev) => {
      const current = prev.byLanguage[code] ?? defaultJourneySettings;
      const next: LanguageJourneyState = {
        byLanguage: {
          ...prev.byLanguage,
          [code]: {
            ...current,
            ...patch,
          },
        },
      };
      void persist(next);
      return next;
    });
  };

  const completeOnboarding = (languageCode: string, input: Partial<LanguageJourneySettings>) => {
    updateSettings(languageCode, {
      ...input,
      onboardingCompleted: true,
      welcomeSeen: false,
    });
    if (activeProfile?.id && typeof input.sessionMinutes === 'number') {
      void (async () => {
        try {
          const persistence = await initializePersistence();
          await persistence.db.execute(
            `
            UPDATE learner_language_state
            SET daily_goal_minutes = ?, updated_at = datetime('now')
            WHERE learner_id = ?
              AND language_id = (SELECT id FROM languages WHERE code = ?);
            `,
            [input.sessionMinutes, activeProfile.id, normalizeLanguageCode(languageCode)],
          );
        } catch (error) {
          console.error('Failed to update the language daily goal', error);
        }
      })();
    }
  };

  const markWelcomeSeen = (languageCode: string) => {
    updateSettings(languageCode, { welcomeSeen: true });
  };

  const setDifficulty = (languageCode: string, difficulty: DifficultyPreference) => {
    updateSettings(languageCode, { difficulty });
  };

  const value = useMemo<LanguageJourneyContextType>(() => ({
    state,
    getSettings,
    completeOnboarding,
    markWelcomeSeen,
    setDifficulty,
  }), [state]);

  return (
    <LanguageJourneyContext.Provider value={value}>
      {children}
    </LanguageJourneyContext.Provider>
  );
};

export function useLanguageJourney(): LanguageJourneyContextType {
  const context = useContext(LanguageJourneyContext);
  if (!context) {
    throw new Error('useLanguageJourney must be used within LanguageJourneyProvider');
  }
  return context;
}
