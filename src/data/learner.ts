import type { LearnerProfile, DailyMission, ContinueLearning, FocusArea, SavedItem, RecommendedCard, ReviewItem } from './types';

export const learner: LearnerProfile = {
    name: 'Alex',
    nativeLanguage: 'English',
    targetLanguage: 'Spanish',
    level: 'intermediate',
    dailyGoalMinutes: 30,
    currentStreak: 7,
    longestStreak: 14,
    todayMinutes: 18,
    totalXP: 4820,
    joinDate: '2025-09-15',
};

export const dailyMission: DailyMission = {
    title: 'Hold a 3-minute conversation',
    description: 'about your weekend',
    progress: 2,
    total: 3,
    xpReward: 50,
};

export const continueLearning: ContinueLearning = {
    moduleName: 'Traveler Dialogues — Module 3',
    lessonTitle: 'Ordering food & casual dining',
    description: 'Ordering food & casual dining',
    currentLesson: 8,
    totalLessons: 12,
    progress: 67,
};

export const recommendedCards: RecommendedCard[] = [
    {
        id: '1',
        title: 'Listening Lab',
        description: 'Fast Spanish at the Market',
        duration: '12 min',
        level: 'Intermediate',
        type: 'listening',
        icon: 'headphones',
        accentColor: 'violet',
    },
    {
        id: '2',
        title: 'Shadowing Drill',
        description: 'Improve your rhythm & flow',
        duration: '5 min',
        level: 'Speaking',
        type: 'speaking',
        icon: 'mic',
        accentColor: 'mint',
    },
    {
        id: '3',
        title: 'Read & Extract',
        description: 'Short story with saved phrases',
        duration: '8 min',
        level: '4 new',
        type: 'reading',
        icon: 'book-open',
        accentColor: 'cyan',
    },
    {
        id: '4',
        title: 'Weak Point',
        description: 'Past tense accuracy',
        duration: '',
        level: 'High impact',
        type: 'review',
        icon: 'target',
        accentColor: 'coral',
    },
];

export const dueReviewItems: ReviewItem[] = [
    {
        id: '1',
        term: '¡Buenos días!',
        translation: 'Good morning!',
        type: 'phrase',
        attempts: 3,
        strength: 'very solid',
        dueDate: '2026-03-23',
    },
    {
        id: '2',
        term: '¿Dónde está...?',
        translation: 'Where is...?',
        type: 'phrase',
        attempts: 2,
        strength: 'needs work',
        dueDate: '2026-03-23',
    },
    {
        id: '3',
        term: 'tener',
        translation: 'to have',
        type: 'word',
        attempts: 5,
        strength: 'solid',
        dueDate: '2026-03-23',
    },
    {
        id: '4',
        term: 'aunque',
        translation: 'although / even though',
        type: 'word',
        attempts: 1,
        strength: 'weak',
        dueDate: '2026-03-23',
    },
    {
        id: '5',
        term: 'Me gustaría...',
        translation: 'I would like...',
        type: 'phrase',
        attempts: 4,
        strength: 'solid',
        dueDate: '2026-03-24',
    },
    {
        id: '6',
        term: 'Subjunctive triggers',
        translation: 'que + subjunctive patterns',
        type: 'grammar',
        attempts: 2,
        strength: 'needs work',
        dueDate: '2026-03-23',
    },
    {
        id: '7',
        term: 'por vs para',
        translation: 'for (reason vs purpose)',
        type: 'grammar',
        attempts: 6,
        strength: 'solid',
        dueDate: '2026-03-24',
    },
    {
        id: '8',
        term: 'la cuenta',
        translation: 'the bill / check',
        type: 'word',
        attempts: 3,
        strength: 'very solid',
        dueDate: '2026-03-23',
    },
    {
        id: '9',
        term: '¿Qué tal?',
        translation: 'How are you? (informal)',
        type: 'phrase',
        attempts: 5,
        strength: 'very solid',
        dueDate: '2026-03-24',
    },
    {
        id: '10',
        term: 'hacer falta',
        translation: 'to be needed / to be missing',
        type: 'phrase',
        attempts: 1,
        strength: 'weak',
        dueDate: '2026-03-23',
    },
    {
        id: '11',
        term: 'el propósito',
        translation: 'the purpose',
        type: 'word',
        attempts: 2,
        strength: 'needs work',
        dueDate: '2026-03-23',
    },
    {
        id: '12',
        term: 'sin embargo',
        translation: 'however / nevertheless',
        type: 'phrase',
        attempts: 3,
        strength: 'solid',
        dueDate: '2026-03-24',
    },
];

export const focusAreas: FocusArea[] = [
    { skill: 'Speaking', percentage: 78, color: '#8B5CF6' },
    { skill: 'Listening', percentage: 65, color: '#F87171' },
    { skill: 'Grammar', percentage: 54, color: '#22D3EE' },
];

export const recentlySaved: SavedItem[] = [
    { term: 'de nada', type: 'Phrase', translation: "you're welcome" },
    { term: 'mercado', type: 'Noun', translation: 'market' },
    { term: '¡claro!', type: 'Expression', translation: 'of course!' },
    { term: 'despacio', type: 'Adjective', translation: 'slow / slowly' },
    { term: 'ojalá', type: 'Expression', translation: 'hopefully / I wish' },
    { term: 'mientras tanto', type: 'Phrase', translation: 'meanwhile' },
];

export const pathProgress = {
    overallProgress: 64,
    lessonsCompleted: 32,
    totalLessons: 50,
    currentLevel: 'Conversational' as const,
    levels: ['Beginner', 'Conversational', 'Fluent'] as const,
};
