export type PracticeItemType = 'mcq' | 'translate' | 'speak';

export interface PracticeItem {
  id: string;
  type: PracticeItemType;
  prompt: string;
  answer: string;
  options?: string[]; // for mcq
}

export interface SessionState {
  items: PracticeItem[];
  currentIndex: number;
  correctAnswers: number;
  completed: boolean;
}

import { completeWithEcho } from '../services/aiProvider';
import type { ChatMessage } from '../types/ai';

interface GenerateSessionInput {
  mode?: string;
  source?: string;
  languageCode: string;
  languageName: string;
}

interface GeneratedPracticePayload {
  practiceItems?: Array<{
    id?: string;
    type?: PracticeItemType;
    prompt?: string;
    answer?: string;
    options?: string[];
  }>;
}

function parseJsonPayload<T>(value: string): T {
  const jsonMatch = value.match(/```(?:json)?\n([\s\S]*)\n```/);
  const jsonString = jsonMatch ? jsonMatch[1] : value;
  return JSON.parse(jsonString.trim()) as T;
}

function fallbackSession(input: GenerateSessionInput): SessionState {
  const languageLabel = input.languageName || input.languageCode.toUpperCase();
  const modeLabel = input.mode && input.mode.trim().length > 0 ? input.mode.trim() : 'quick';
  const items: PracticeItem[] = [
    {
      id: '1',
      type: 'mcq',
      prompt: `Choose the best greeting in ${languageLabel} for a ${modeLabel} session.`,
      answer: 'Option A',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
    },
    {
      id: '2',
      type: 'translate',
      prompt: `Translate to ${languageLabel}: "I am practicing every day."`,
      answer: `Localized sentence in ${languageLabel}`,
    },
    {
      id: '3',
      type: 'speak',
      prompt: `Say a short self-introduction in ${languageLabel}.`,
      answer: `Short introduction in ${languageLabel}`,
    },
    {
      id: '4',
      type: 'translate',
      prompt: `Translate from ${languageLabel} to your base language: "Thank you for your help."`,
      answer: 'Thank you for your help.',
    },
  ];

  return {
    items,
    currentIndex: 0,
    correctAnswers: 0,
    completed: false,
  };
}

function normalizeItems(payload: GeneratedPracticePayload): PracticeItem[] {
  const normalized = (payload.practiceItems ?? [])
    .filter((item): item is NonNullable<GeneratedPracticePayload['practiceItems']>[number] => Boolean(item))
    .map((item, index): PracticeItem => {
      const type: PracticeItemType =
        item.type === 'mcq' || item.type === 'translate' || item.type === 'speak' ? item.type : 'translate';
      const options = type === 'mcq' ? (item.options ?? []).filter((opt): opt is string => typeof opt === 'string' && opt.trim().length > 0).slice(0, 4) : undefined;
      return {
        id: (item.id && item.id.trim()) || String(index + 1),
        type,
        prompt: (item.prompt && item.prompt.trim()) || 'Practice prompt unavailable.',
        answer: (item.answer && item.answer.trim()) || '',
        options: type === 'mcq' && options && options.length >= 2 ? options : undefined,
      };
    })
    .filter((item) => item.answer.length > 0)
    .slice(0, 6);

  return normalized;
}

export async function generateSession(input: GenerateSessionInput): Promise<SessionState> {
  const prompt: ChatMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: `You are generating language-learning practice data.
Create content for language code "${input.languageCode}" (${input.languageName}) and mode "${input.mode ?? 'quick'}".
Source context is "${input.source ?? 'direct'}".

Return ONLY a valid JSON object with this exact shape:
{
  "practiceItems": [
    {
      "id": "string",
      "type": "mcq|translate|speak",
      "prompt": "string",
      "answer": "string",
      "options": ["string", "string", "string", "string"] // required only for mcq
    }
  ]
}

Rules:
- Generate exactly 4 items.
- All prompts and answers must be relevant to ${input.languageName}.
- Do not default to Spanish unless the language is Spanish.
- Keep each prompt short and practical.
- For mcq items, provide 4 options and ensure answer matches one option exactly.
- Output JSON only.`,
    createdAt: Date.now(),
  };

  try {
    const responseText = await completeWithEcho([prompt], 'analyst', {
      maxTokens: 1200,
      responseFormat: { type: 'json_object' },
    });
    const payload = parseJsonPayload<GeneratedPracticePayload>(responseText);
    const items = normalizeItems(payload);
    if (items.length === 0) {
      return fallbackSession(input);
    }
    return {
      items,
      currentIndex: 0,
      correctAnswers: 0,
      completed: false,
    };
  } catch (error) {
    console.error('Failed to generate session items', error);
    return fallbackSession(input);
  }
}
