import { completeWithEcho } from './aiProvider';
import type { ChatMessage } from '../types/ai';

export interface LearnConceptData {
  title: string;
  concept: string;
  example: string;
  practicePrompt: string;
  answer: string;
}

interface GenerateLearnConceptInput {
  mode?: string;
  source?: string;
  languageCode: string;
  languageName: string;
}

interface GeneratedLearnPayload {
  learnSession?: {
    title?: string;
    concept?: string;
    example?: string;
    practicePrompt?: string;
    answer?: string;
  };
}

function parseJsonPayload<T>(value: string): T {
  const jsonMatch = value.match(/```(?:json)?\n([\s\S]*)\n```/);
  const jsonString = jsonMatch ? jsonMatch[1] : value;
  return JSON.parse(jsonString.trim()) as T;
}

function fallbackLearnConcept(input: GenerateLearnConceptInput): LearnConceptData {
  const languageLabel = input.languageName || input.languageCode.toUpperCase();
  const modeLabel = input.mode === 'review' ? 'Review' : 'New Concept';
  return {
    title: `${modeLabel}: ${languageLabel} Core Pattern`,
    concept: `Practice one high-frequency ${languageLabel} structure and use it in a short sentence.`,
    example: `Example in ${languageLabel}: short practical sentence for daily conversation.`,
    practicePrompt: `Write one simple sentence in ${languageLabel}.`,
    answer: `Sample sentence in ${languageLabel}`,
  };
}

export async function generateLearnConcept(input: GenerateLearnConceptInput): Promise<LearnConceptData> {
  const prompt: ChatMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: `Generate one concise lesson block for language "${input.languageCode}" (${input.languageName}).
Mode is "${input.mode ?? 'start'}". Source is "${input.source ?? 'direct'}".

Return ONLY valid JSON with this exact shape:
{
  "learnSession": {
    "title": "string",
    "concept": "string",
    "example": "string",
    "practicePrompt": "string",
    "answer": "string"
  }
}

Rules:
- Content must be specific to ${input.languageName}.
- Do not default to Spanish unless ${input.languageCode} is "es".
- Keep concept under 24 words.
- Keep example practical and short.
- practicePrompt must expect a short text answer.
- answer must be the expected answer for practicePrompt.
- JSON only.`,
    createdAt: Date.now(),
  };

  try {
    const responseText = await completeWithEcho([prompt], 'analyst', {
      maxTokens: 900,
      responseFormat: { type: 'json_object' },
    });
    const payload = parseJsonPayload<GeneratedLearnPayload>(responseText);
    const data = payload.learnSession;
    if (!data) {
      return fallbackLearnConcept(input);
    }
    const title = data.title?.trim();
    const concept = data.concept?.trim();
    const example = data.example?.trim();
    const practicePrompt = data.practicePrompt?.trim();
    const answer = data.answer?.trim();
    if (!title || !concept || !example || !practicePrompt || !answer) {
      return fallbackLearnConcept(input);
    }
    return { title, concept, example, practicePrompt, answer };
  } catch (error) {
    console.error('Failed to generate learn concept', error);
    return fallbackLearnConcept(input);
  }
}

