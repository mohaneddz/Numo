import React, { createContext, useContext, useState, useEffect } from 'react';
import { learner as initialLearner } from '../data/learner';

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
  continueLearning: ContinueLearning;
}

interface LanguageContextType {
  activeLanguage: Language;
  languages: Language[];
  setActiveLanguage: (code: string) => void;
  updateProgress: (minutes: number, xp: number) => void;
}

const defaultLanguages: Language[] = [
  {
    code: 'es',
    name: 'Spanish',
    flag: '🇪🇸',
    progress: {
      dailyGoalMinutes: initialLearner.dailyGoalMinutes,
      currentStreak: initialLearner.currentStreak,
      longestStreak: initialLearner.longestStreak,
      todayMinutes: initialLearner.todayMinutes,
      totalXP: initialLearner.totalXP,
    },
    continueLearning: {
      moduleName: 'Traveler Dialogues — Module 3',
      lessonTitle: 'Ordering food & casual dining',
      description: 'Ordering food & casual dining',
      currentLesson: 8,
      totalLessons: 12,
      progress: 67,
    },
  },
  {
    code: 'fr',
    name: 'French',
    flag: '🇫🇷',
    progress: {
      dailyGoalMinutes: 30,
      currentStreak: 0,
      longestStreak: 5,
      todayMinutes: 0,
      totalXP: 1200,
    },
    continueLearning: {
      moduleName: 'Basic French — Module 1',
      lessonTitle: 'Greetings and Introductions',
      description: 'Learn how to say hello and introduce yourself.',
      currentLesson: 2,
      totalLessons: 10,
      progress: 20,
    },
  },
  {
    code: 'de',
    name: 'German',
    flag: '🇩🇪',
    progress: {
      dailyGoalMinutes: 30,
      currentStreak: 0,
      longestStreak: 3,
      todayMinutes: 0,
      totalXP: 800,
    },
    continueLearning: {
      moduleName: 'German for Beginners',
      lessonTitle: 'Common Phrases',
      description: 'Master everyday German expressions.',
      currentLesson: 1,
      totalLessons: 15,
      progress: 6,
    },
  },
  {
    code: 'ja',
    name: 'Japanese',
    flag: '🇯🇵',
    progress: {
      dailyGoalMinutes: 45,
      currentStreak: 12,
      longestStreak: 12,
      todayMinutes: 15,
      totalXP: 2450,
    },
    continueLearning: {
      moduleName: 'Hiragana Mastery',
      lessonTitle: 'Writing Basics',
      description: 'Master the first set of the Japanese alphabet.',
      currentLesson: 4,
      totalLessons: 8,
      progress: 50,
    },
  },
  {
    code: 'it',
    name: 'Italian',
    flag: '🇮🇹',
    progress: {
      dailyGoalMinutes: 20,
      currentStreak: 2,
      longestStreak: 2,
      todayMinutes: 0,
      totalXP: 300,
    },
    continueLearning: {
      moduleName: 'Cafe Italian',
      lessonTitle: 'Coffee Culture',
      description: 'Order your first espresso like a local.',
      currentLesson: 1,
      totalLessons: 5,
      progress: 20,
    },
  },
  {
    code: 'pt',
    name: 'Portuguese',
    flag: '🇧🇷',
    progress: {
      dailyGoalMinutes: 30,
      currentStreak: 0,
      longestStreak: 0,
      todayMinutes: 0,
      totalXP: 0,
    },
    continueLearning: {
      moduleName: 'Brazilian Portuguese 101',
      lessonTitle: 'Nasal Vowels',
      description: 'Get the sounds right from the start.',
      currentLesson: 1,
      totalLessons: 10,
      progress: 10,
    },
  },
  {
    code: 'ru',
    name: 'Russian',
    flag: '🇷🇺',
    progress: {
      dailyGoalMinutes: 40,
      currentStreak: 5,
      longestStreak: 10,
      todayMinutes: 10,
      totalXP: 1500,
    },
    continueLearning: {
      moduleName: 'Cyrillic Script',
      lessonTitle: 'The Alphabet',
      description: 'Read and write in Russian.',
      currentLesson: 3,
      totalLessons: 12,
      progress: 25,
    },
  },
];

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [languages, setLanguages] = useState<Language[]>(() => {
    const saved = localStorage.getItem('numo_languages');
    if (!saved) return defaultLanguages;

    try {
      const parsed = JSON.parse(saved) as Language[];
      // CRITICAL: Map over defaultLanguages to ensure all base languages are kept.
      // Then merge any saved progress/state from localStorage.
      return defaultLanguages.map(defaultLang => {
        const savedLang = parsed.find(l => l.code === defaultLang.code);
        if (!savedLang) return defaultLang;
        
        return {
          ...defaultLang,
          ...savedLang,
          progress: {
            ...defaultLang.progress,
            ...(savedLang.progress || {})
          },
          continueLearning: savedLang.continueLearning || defaultLang.continueLearning
        };
      });
    } catch (e) {
      console.error('Failed to parse languages from localStorage', e);
      return defaultLanguages;
    }
  });

  const [activeLanguageCode, setActiveLanguageCode] = useState(() => {
    return localStorage.getItem('numo_active_language') || 'es';
  });

  useEffect(() => {
    localStorage.setItem('numo_languages', JSON.stringify(languages));
    localStorage.setItem('numo_active_language', activeLanguageCode);
  }, [languages, activeLanguageCode]);

  const activeLanguage = languages.find((l) => l.code === activeLanguageCode) || languages[0];

  const setActiveLanguage = (code: string) => {
    setActiveLanguageCode(code);
  };

  const updateProgress = (minutes: number, xp: number) => {
    setLanguages((prev) =>
      prev.map((l) =>
        l.code === activeLanguageCode
          ? {
            ...l,
            progress: {
              ...l.progress,
              todayMinutes: l.progress.todayMinutes + minutes,
              totalXP: l.progress.totalXP + xp,
            },
          }
          : l
      )
    );
  };

  return (
    <LanguageContext.Provider
      value={{
        activeLanguage,
        languages,
        setActiveLanguage,
        updateProgress,
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
