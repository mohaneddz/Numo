import { completeWithEcho } from './aiProvider';
import type { Language, ContinueLearning } from '../contexts/LanguageContext';
import type { RecommendedCard, FocusArea, DailyMission } from '../data/types';
import type { ChatMessage } from '../types/ai';

export interface GeneratedCurriculum {
  recommendedCards: RecommendedCard[];
  focusAreas: FocusArea[];
  continueLearning: ContinueLearning;
  dailyMission: DailyMission;
}

const ICONS: Array<RecommendedCard['icon']> = ['headphones', 'mic', 'book', 'pen', 'rotate-ccw', 'book-open'];
const CARD_TYPES: Array<RecommendedCard['type']> = ['listening', 'speaking', 'reading', 'writing', 'review', 'grammar'];
const ACCENTS: Array<RecommendedCard['accentColor']> = ['violet', 'blue', 'emerald', 'rose', 'amber', 'indigo'];

function fallbackCurriculum(activeLanguage: Language): GeneratedCurriculum {
  const seed = activeLanguage.code
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const recommendedCards: RecommendedCard[] = Array.from({ length: 4 }, (_, index) => {
    const type = CARD_TYPES[(seed + index) % CARD_TYPES.length];
    return {
      id: String(index + 1),
      title: `${activeLanguage.name} ${type[0].toUpperCase()}${type.slice(1)} Drill ${index + 1}`,
      description: `Deterministic fallback activity for ${activeLanguage.name} ${type} practice.`,
      duration: `${5 + index * 2} min`,
      level: 'Intermediate',
      type,
      icon: ICONS[(seed + index) % ICONS.length],
      accentColor: ACCENTS[(seed + index) % ACCENTS.length],
    };
  });

  const focusAreas: FocusArea[] = [
    { skill: 'Listening', percentage: 58 + (seed % 15), color: 'violet' },
    { skill: 'Speaking', percentage: 48 + ((seed + 3) % 20), color: 'blue' },
    { skill: 'Vocabulary', percentage: 62 + ((seed + 6) % 14), color: 'emerald' },
    { skill: 'Grammar', percentage: 44 + ((seed + 9) % 18), color: 'rose' },
  ];

  const missionTotal = 3;
  const missionProgress = Math.min(
    missionTotal,
    Math.max(0, Math.floor(activeLanguage.progress.todayMinutes / Math.max(1, activeLanguage.progress.dailyGoalMinutes / missionTotal))),
  );

  return {
    continueLearning: {
      moduleName: `${activeLanguage.name} Core Path`,
      lessonTitle: 'High-frequency conversation loop',
      description: 'Fallback plan generated locally while AI services are unavailable.',
      currentLesson: Math.max(1, (seed % 6) + 1),
      totalLessons: 10,
      progress: 20 + (seed % 60),
    },
    recommendedCards,
    focusAreas,
    dailyMission: {
      title: `Complete ${activeLanguage.name} speaking sprint`,
      description: 'Finish one quick drill, one review block, and one active listening pass.',
      progress: missionProgress,
      total: missionTotal,
      xpReward: 50 + (seed % 30),
    },
  };
}

export async function generateCurriculum(
  activeLanguage: Language,
): Promise<GeneratedCurriculum> {
  const prompt: ChatMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: `You are an expert language curriculum designer. 
Generate a personalized learning curriculum for a user studying ${activeLanguage.name}. 
The user is roughly at an intermediate level. They have studied for ${activeLanguage.progress.todayMinutes} mins today out of a ${activeLanguage.progress.dailyGoalMinutes} min goal, and their total XP is ${activeLanguage.progress.totalXP}. 

Respond ONLY with a valid JSON object matching the following structure exactly (no markdown formatting, no explanations, just the JSON):

{
  "continueLearning": {
    "moduleName": "string",
    "lessonTitle": "string",
    "description": "string",
    "currentLesson": 1,
    "totalLessons": 10,
    "progress": 10
  },
  "recommendedCards": [
    {
      "id": "string (1-4)",
      "title": "string",
      "description": "string",
      "duration": "string (e.g. 5 min)",
      "level": "string",
      "type": "listening|speaking|reading|writing|review|grammar",
      "icon": "headphones|mic|book|pen|rotate-ccw|book-open",
      "accentColor": "violet|blue|emerald|rose|amber|indigo"
    } // exactly 4 items
  ],
  "focusAreas": [
    { "skill": "Listening", "percentage": 75, "color": "violet" },
    { "skill": "Speaking", "percentage": 45, "color": "blue" },
    { "skill": "Vocabulary", "percentage": 85, "color": "emerald" },
    { "skill": "Grammar", "percentage": 60, "color": "rose" }
  ],
  "dailyMission": {
    "title": "string",
    "description": "string",
    "progress": 0,
    "total": 3,
    "xpReward": 50
  }
}

Make the content localized and contextually relevant to learning ${activeLanguage.name}. Give realistic numbers for progress.
`,
    createdAt: Date.now()
  };

  try {
    const responseText = await completeWithEcho(
      [prompt], 
      'analyst',
      {
        maxTokens: 2000,
        responseFormat: { type: 'json_object' }
      }
    );
    
    // Extract JSON in case there are markdown blocks
    const jsonMatch = responseText.match(/```(?:json)?\n([\s\S]*)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : responseText;
    
    const data = JSON.parse(jsonString.trim()) as GeneratedCurriculum;
    return data;
  } catch (error) {
    console.error('Failed to generate curriculum:', error);
    return fallbackCurriculum(activeLanguage);
  }
}
