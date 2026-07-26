// ===== Core Types =====

export interface ContinueLearning {
  moduleName: string;
  lessonTitle: string;
  description: string;
  currentLesson: number;
  totalLessons: number;
  progress: number;
  image?: string;
}

export interface ReviewItem {
  id: string;
  sourceNotebookId?: string;
  origin?: 'notebook' | 'legacy';
  source?: 'notebook' | 'learn_mistake' | 'weak_node' | 'legacy_unit' | 'immerse_phrase' | 'write_correction' | 'speak_pronunciation';
  sourceRef?: string;
  contentDomain?: 'vocabulary' | 'grammar' | 'pronunciation' | 'sentence' | 'communication';
  term: string;
  translation: string;
  type: 'word' | 'phrase' | 'grammar';
  attempts: number;
  strength: 'very solid' | 'solid' | 'needs work' | 'weak' | 'critical';
  dueDate: string;
  lastReviewed?: string;
  nextDueAt?: string;
  intervalDays?: number;
  ease?: number;
  lastResult?: 'correct' | 'incorrect';
}

export interface RecommendedCard {
  id: string;
  title: string;
  description: string;
  duration: string;
  level: string;
  type: 'listening' | 'speaking' | 'reading' | 'writing' | 'review' | 'grammar';
  icon: string;
  accentColor: string;
}

export interface WritingDraft {
  id: string;
  promptId?: string;
  title: string;
  content: string;
  corrections: number;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  analysis?: WritingCorrection[];
  lastAnalyzedAt?: string;
}

export interface NotebookEntry {
  id: string;
  term: string;
  translation: string;
  type: 'word' | 'phrase' | 'sentence' | 'grammar' | 'pronunciation' | 'translation' | 'mistake';
  context?: string;
  notes?: string;
  collectionId?: string;
  personalHint?: string;
  personalExample?: string;
  isDifficult?: boolean;
  isImportant?: boolean;
  tags: string[];
  createdAt: string;
  mastery: number;
  source?: 'immerse' | 'review' | 'write' | 'learn' | 'manual';
  favorited?: boolean;
  updatedAt?: string;
}

export interface WritingCorrection {
  original: string;
  corrected: string;
  type: 'grammar' | 'spelling' | 'correct' | 'style';
  explanation: string;
}

export interface SpeakingSessionRun {
  id: string;
  sessionId: string;
  recordedAt: string;
  transcript: string;
  accuracy: number;
  fluency: number;
  tip: string;
  feedbackSource: 'ai' | 'fallback';
}

export interface ImmersionProgress {
  contentId: string;
  /** Seconds for media; line index for text. Paired with `totalUnits`. */
  positionSec: number;
  /**
   * Total length in the same unit as `positionSec`, when the player knows it.
   * Without this a percentage cannot be computed honestly, so the UI reports
   * "started" instead of inventing one.
   */
  totalUnits?: number;
  completed: boolean;
  savedPhrases: string[];
  updatedAt: string;
}

