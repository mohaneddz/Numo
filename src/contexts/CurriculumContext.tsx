import React, { createContext, useContext, useState } from 'react';
import type { RecommendedCard, FocusArea, SavedItem } from '../data/types';
import { 
  recommendedCards as initRecommendedCards,
  focusAreas as initFocusAreas,
  recentlySaved as initRecentlySaved,
  pathProgress as initPathProgress,
  dailyMission as initDailyMission,
  learner as initLearner
} from '../data/learner';

export interface CurriculumState {
  recommendedCards: RecommendedCard[];
  focusAreas: FocusArea[];
  recentlySaved: SavedItem[];
  pathProgress: typeof initPathProgress;
  dailyMission: typeof initDailyMission;
  learner: typeof initLearner;
}

export interface CurriculumContextType extends CurriculumState {
  updateCurriculum: (data: Partial<CurriculumState>) => void;
}

const CurriculumContext = createContext<CurriculumContextType | undefined>(undefined);

export const CurriculumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<CurriculumState>({
    recommendedCards: initRecommendedCards,
    focusAreas: initFocusAreas,
    recentlySaved: initRecentlySaved,
    pathProgress: initPathProgress,
    dailyMission: initDailyMission,
    learner: initLearner,
  });

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
