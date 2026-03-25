// ===== Core Types =====

export interface LearnerProfile {
  name: string;
  nativeLanguage: string;
  targetLanguage: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  dailyGoalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  todayMinutes: number;
  totalXP: number;
  joinDate: string;
  avatar?: string;
}

export interface DailyMission {
  title: string;
  description: string;
  progress: number;
  total: number;
  xpReward: number;
}

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

export interface FocusArea {
  skill: string;
  percentage: number;
  color: string;
}

export interface SavedItem {
  term: string;
  type: 'Phrase' | 'Noun' | 'Verb' | 'Adjective' | 'Expression' | 'Grammar';
  translation?: string;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  category: 'grammar' | 'vocabulary' | 'conversation' | 'culture' | 'scenario';
  lessonsCount: number;
  completedLessons: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  isLocked: boolean;
  accentColor: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  type: 'grammar' | 'vocabulary' | 'listening' | 'speaking' | 'reading' | 'writing' | 'scenario';
  duration: string;
  status: 'completed' | 'in-progress' | 'locked' | 'available';
  xpEarned: number;
  xpTotal: number;
}

export interface ImmersionContent {
  id: string;
  title: string;
  description: string;
  type: 'story' | 'dialogue' | 'podcast' | 'video';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  thumbnail?: string;
  isNew: boolean;
  progress: number;
  tags: string[];
}

export interface SpeakingSession {
  id: string;
  title: string;
  type: 'pronunciation' | 'shadowing' | 'roleplay' | 'oral-exam' | 'free-talk';
  description: string;
  duration: string;
  difficulty: string;
  fluencyScore?: number;
  confidenceScore?: number;
}

export interface WritingPrompt {
  id: string;
  title: string;
  description: string;
  type: 'email' | 'message' | 'essay' | 'journal' | 'formal' | 'creative';
  difficulty: string;
  wordTarget: number;
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
  type: 'word' | 'phrase' | 'grammar' | 'mistake';
  context?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  mastery: number;
  source?: 'immerse' | 'review' | 'write' | 'manual';
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
  positionSec: number;
  completed: boolean;
  savedPhrases: string[];
  updatedAt: string;
}

export interface AnalyticsData {
  weeklyActivity: { day: string; minutes: number }[];
  vocabGrowth: { month: string; words: number }[];
  skillBreakdown: { skill: string; score: number; color: string }[];
  retentionRate: { week: string; rate: number }[];
  pronunciationTrend: { session: string; score: number }[];
  monthlyStats: {
    totalMinutes: number;
    wordsLearned: number;
    lessonsCompleted: number;
    reviewAccuracy: number;
    speakingSessions: number;
    writingPieces: number;
  };
}

export interface ContentPack {
  id: string;
  title: string;
  description: string;
  category: string;
  itemCount: number;
  installed: boolean;
  size: string;
  author: string;
}
