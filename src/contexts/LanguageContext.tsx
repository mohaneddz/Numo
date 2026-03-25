import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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

export interface LanguageCatalogEntry {
  code: string;
  name: string;
  flag: string;
  starterModule: string;
  starterLesson: string;
  starterDescription: string;
}

interface LanguageContextType {
  activeLanguage: Language;
  languages: Language[];
  availableLanguages: LanguageCatalogEntry[];
  setActiveLanguage: (code: string) => void;
  addLanguage: (code: string) => boolean;
  removeLanguage: (code: string) => void;
  moveLanguage: (code: string, direction: 'up' | 'down') => void;
  updateProgress: (minutes: number, xp: number) => void;
  updateContinueLearning: (data: Partial<ContinueLearning>) => void;
}

export const languageCatalog: LanguageCatalogEntry[] = [
  {
    code: 'es',
    name: 'Spanish',
    flag: '🇪🇸',
    starterModule: 'Traveler Dialogues — Module 3',
    starterLesson: 'Ordering food & casual dining',
    starterDescription: 'Ordering food & casual dining',
  },
  {
    code: 'en',
    name: 'English',
    flag: '🇬🇧',
    starterModule: 'English Foundations',
    starterLesson: 'Daily Conversation Basics',
    starterDescription: 'Build practical fluency with high-frequency conversation patterns.',
  },
  {
    code: 'fr',
    name: 'French',
    flag: '🇫🇷',
    starterModule: 'Basic French — Module 1',
    starterLesson: 'Greetings and Introductions',
    starterDescription: 'Learn how to say hello and introduce yourself.',
  },
  {
    code: 'de',
    name: 'German',
    flag: '🇩🇪',
    starterModule: 'German for Beginners',
    starterLesson: 'Common Phrases',
    starterDescription: 'Master everyday German expressions.',
  },
  {
    code: 'zh',
    name: 'Chinese',
    flag: '🇨🇳',
    starterModule: 'Mandarin Basics',
    starterLesson: 'Core Tones and Greetings',
    starterDescription: 'Start with practical Mandarin sounds and expressions.',
  },
  {
    code: 'ja',
    name: 'Japanese',
    flag: '🇯🇵',
    starterModule: 'Hiragana Mastery',
    starterLesson: 'Writing Basics',
    starterDescription: 'Master the first set of the Japanese alphabet.',
  },
  {
    code: 'it',
    name: 'Italian',
    flag: '🇮🇹',
    starterModule: 'Cafe Italian',
    starterLesson: 'Coffee Culture',
    starterDescription: 'Order your first espresso like a local.',
  },
  {
    code: 'pt',
    name: 'Portuguese',
    flag: '🇧🇷',
    starterModule: 'Brazilian Portuguese 101',
    starterLesson: 'Nasal Vowels',
    starterDescription: 'Get the sounds right from the start.',
  },
  {
    code: 'ru',
    name: 'Russian',
    flag: '🇷🇺',
    starterModule: 'Cyrillic Script',
    starterLesson: 'The Alphabet',
    starterDescription: 'Read and write in Russian.',
  },
  {
    code: 'ko',
    name: 'Korean',
    flag: '🇰🇷',
    starterModule: 'Hangul Core',
    starterLesson: 'Consonants and Vowels',
    starterDescription: 'Learn to read and sound out Hangul quickly.',
  },
  {
    code: 'ar',
    name: 'Arabic',
    flag: '🇸🇦',
    starterModule: 'Modern Standard Arabic',
    starterLesson: 'Script and Short Vowels',
    starterDescription: 'Start decoding Arabic script and frequent roots.',
  },
  {
    code: 'tr',
    name: 'Turkish',
    flag: '🇹🇷',
    starterModule: 'Turkish Kickstart',
    starterLesson: 'Vowel Harmony Basics',
    starterDescription: 'Learn useful sentence blocks with clean pronunciation.',
  },
  {
    code: 'nl',
    name: 'Dutch',
    flag: '🇳🇱',
    starterModule: 'Dutch Everyday',
    starterLesson: 'Introductions and Essentials',
    starterDescription: 'Master practical Dutch for daily situations.',
  },
  {
    code: 'sv',
    name: 'Swedish',
    flag: '🇸🇪',
    starterModule: 'Swedish Survival',
    starterLesson: 'Rhythm and Word Stress',
    starterDescription: 'Develop pronunciation and core travel phrases.',
  },
  {
    code: 'pl',
    name: 'Polish',
    flag: '🇵🇱',
    starterModule: 'Polish Core Patterns',
    starterLesson: 'Consonant Clusters',
    starterDescription: 'Tackle tricky sounds and high-value expressions.',
  },
  {
    code: 'hi',
    name: 'Hindi',
    flag: '🇮🇳',
    starterModule: 'Hindi Basics',
    starterLesson: 'Devanagari Starter Set',
    starterDescription: 'Read simple words and build daily vocabulary.',
  },
  {
    code: 'vi',
    name: 'Vietnamese',
    flag: '🇻🇳',
    starterModule: 'Vietnamese Essentials',
    starterLesson: 'Tone Patterns',
    starterDescription: 'Learn clean tones and practical conversation starters.',
  },
  {
    code: 'id',
    name: 'Indonesian',
    flag: '🇮🇩',
    starterModule: 'Indonesian Core',
    starterLesson: 'Everyday Expressions',
    starterDescription: 'Build confidence with straightforward grammar and vocabulary.',
  },
];

const starterLanguageCodes = ['es', 'fr', 'de', 'zh', 'ja'];

const languageCatalogMap = new Map(languageCatalog.map((entry) => [entry.code, entry]));

const defaultProgress: Progress = {
  dailyGoalMinutes: 30,
  currentStreak: 0,
  longestStreak: 0,
  todayMinutes: 0,
  totalXP: 0,
};

function createLanguageFromCatalog(entry: LanguageCatalogEntry): Language {
  return {
    code: entry.code,
    name: entry.name,
    flag: entry.flag,
    progress: {
      ...defaultProgress,
      dailyGoalMinutes: entry.code === 'es' ? initialLearner.dailyGoalMinutes : 30,
      currentStreak: entry.code === 'es' ? initialLearner.currentStreak : 0,
      longestStreak: entry.code === 'es' ? initialLearner.longestStreak : 0,
      todayMinutes: entry.code === 'es' ? initialLearner.todayMinutes : 0,
      totalXP: entry.code === 'es' ? initialLearner.totalXP : 0,
    },
    continueLearning: {
      moduleName: entry.starterModule,
      lessonTitle: entry.starterLesson,
      description: entry.starterDescription,
      currentLesson: 1,
      totalLessons: 10,
      progress: 10,
    },
  };
}

function getStarterLanguages(): Language[] {
  return starterLanguageCodes
    .map((code) => languageCatalogMap.get(code))
    .filter((entry): entry is LanguageCatalogEntry => Boolean(entry))
    .map((entry) => createLanguageFromCatalog(entry));
}

function mergeSavedLanguage(savedLanguage: Language): Language | null {
  const catalogEntry = languageCatalogMap.get(savedLanguage.code);
  if (!catalogEntry) {
    return null;
  }

  const fallback = createLanguageFromCatalog(catalogEntry);

  return {
    ...fallback,
    ...savedLanguage,
    code: catalogEntry.code,
    name: catalogEntry.name,
    flag: catalogEntry.flag,
    progress: {
      ...fallback.progress,
      ...(savedLanguage.progress || {}),
    },
    continueLearning: {
      ...fallback.continueLearning,
      ...(savedLanguage.continueLearning || {}),
    },
  };
}

function getInitialLanguages(): Language[] {
  const saved = localStorage.getItem('numo_languages');
  if (!saved) {
    return getStarterLanguages();
  }

  try {
    const parsed = JSON.parse(saved) as Language[];
    const merged = parsed
      .map((savedLanguage) => mergeSavedLanguage(savedLanguage))
      .filter((language): language is Language => Boolean(language));

    if (merged.length === 0) {
      return getStarterLanguages();
    }

    return merged;
  } catch (error) {
    console.error('Failed to parse languages from localStorage', error);
    return getStarterLanguages();
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [languages, setLanguages] = useState<Language[]>(() => getInitialLanguages());

  const [activeLanguageCode, setActiveLanguageCode] = useState(() => {
    const savedCode = localStorage.getItem('numo_active_language');
    if (!savedCode) {
      return starterLanguageCodes[0];
    }

    return languageCatalogMap.has(savedCode) ? savedCode : starterLanguageCodes[0];
  });

  useEffect(() => {
    if (languages.length === 0) {
      const starters = getStarterLanguages();
      setLanguages(starters);
      setActiveLanguageCode(starters[0]?.code || 'es');
      return;
    }

    const activeExists = languages.some((language) => language.code === activeLanguageCode);
    if (!activeExists) {
      setActiveLanguageCode(languages[0].code);
    }
  }, [languages, activeLanguageCode]);

  useEffect(() => {
    localStorage.setItem('numo_languages', JSON.stringify(languages));
    localStorage.setItem('numo_active_language', activeLanguageCode);
  }, [languages, activeLanguageCode]);

  const activeLanguage = languages.find((language) => language.code === activeLanguageCode) || languages[0];

  const availableLanguages = useMemo(
    () => languageCatalog.filter((entry) => !languages.some((language) => language.code === entry.code)),
    [languages],
  );

  const setActiveLanguage = (code: string) => {
    if (!languages.some((language) => language.code === code)) {
      return;
    }
    setActiveLanguageCode(code);
  };

  const addLanguage = (code: string) => {
    if (languages.some((language) => language.code === code)) {
      return false;
    }

    const entry = languageCatalogMap.get(code);
    if (!entry) {
      return false;
    }

    setLanguages((prev) => [...prev, createLanguageFromCatalog(entry)]);
    setActiveLanguageCode(code);
    return true;
  };

  const removeLanguage = (code: string) => {
    setLanguages((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((language) => language.code !== code);
    });
  };

  const moveLanguage = (code: string, direction: 'up' | 'down') => {
    setLanguages((prev) => {
      const index = prev.findIndex((language) => language.code === code);
      if (index === -1) {
        return prev;
      }

      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) {
        return prev;
      }

      const reordered = [...prev];
      const [item] = reordered.splice(index, 1);
      reordered.splice(nextIndex, 0, item);
      return reordered;
    });
  };

  const updateProgress = (minutes: number, xp: number) => {
    setLanguages((prev) =>
      prev.map((language) =>
        language.code === activeLanguageCode
          ? {
              ...language,
              progress: {
                ...language.progress,
                todayMinutes: language.progress.todayMinutes + minutes,
                totalXP: language.progress.totalXP + xp,
              },
            }
          : language,
      ),
    );
  };

  const updateContinueLearning = (data: Partial<ContinueLearning>) => {
    setLanguages((prev) =>
      prev.map((language) =>
        language.code === activeLanguageCode
          ? {
              ...language,
              continueLearning: {
                ...language.continueLearning,
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
        availableLanguages,
        setActiveLanguage,
        addLanguage,
        removeLanguage,
        moveLanguage,
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
