import React, { createContext, useContext, useState } from 'react';
import type { FocusArea, RecommendedCard, SavedItem } from '../data/types';

interface PathProgress {
  overallProgress: number;
  lessonsCompleted: number;
  totalLessons: number;
  currentLevel: 'Beginner' | 'Conversational' | 'Fluent';
  levels: readonly ['Beginner', 'Conversational', 'Fluent'];
}

interface DailyMission {
  title: string;
  description: string;
  progress: number;
  total: number;
  xpReward: number;
}

interface LearnerSnapshot {
  name: string;
  nativeLanguage: string;
  targetLanguage: string;
  level: string;
  dailyGoalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  todayMinutes: number;
  totalXP: number;
  joinDate: string;
}

export interface CurriculumState {
  recommendedCards: RecommendedCard[];
  focusAreas: FocusArea[];
  recentlySaved: SavedItem[];
  pathProgress: PathProgress;
  dailyMission: DailyMission;
  learner: LearnerSnapshot;
}

export interface CurriculumContextType extends CurriculumState {
  updateCurriculum: (data: Partial<CurriculumState>) => void;
}

const EMPTY_STATE: CurriculumState = {
  recommendedCards: [],
  focusAreas: [],
  recentlySaved: [],
  pathProgress: {
    overallProgress: 0,
    lessonsCompleted: 0,
    totalLessons: 0,
    currentLevel: 'Beginner',
    levels: ['Beginner', 'Conversational', 'Fluent'],
  },
  dailyMission: {
    title: 'No daily plan yet',
    description: 'Complete one short session to start generating a real daily plan.',
    progress: 0,
    total: 1,
    xpReward: 0,
  },
  learner: {
    name: 'Local Learner',
    nativeLanguage: 'en',
    targetLanguage: '',
    level: 'unknown',
    dailyGoalMinutes: 0,
    currentStreak: 0,
    longestStreak: 0,
    todayMinutes: 0,
    totalXP: 0,
    joinDate: '',
  },
};

const CurriculumContext = createContext<CurriculumContextType | undefined>(undefined);

export const CurriculumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<CurriculumState>(EMPTY_STATE);

  const updateCurriculum = (data: Partial<CurriculumState>) => {
    setState((prev) => ({ ...prev, ...data }));
  };

  return (
    <CurriculumContext.Provider value={{ ...state, updateCurriculum }}>
      {children}
    </CurriculumContext.Provider>
  );
};

export const useCurriculum = () => {
  const context = useContext(CurriculumContext);
  if (context === undefined) {
    throw new Error('useCurriculum must be used within a CurriculumProvider');
  }
  return context;
};
