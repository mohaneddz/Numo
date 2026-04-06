import { aiConfig } from '../config/aiConfig';
import { getGroqQuotaSnapshot, runtimeKernel } from '../runtime';
import type {
  ApiQuotaSnapshot,
  ChatMessage,
  EchoMode,
  VoicePersona,
} from '../types/ai';

const BASE_SYSTEM_PROMPT = [
  'You are Echo, a supportive and intelligent educational companion.',
  'Be concise, encouraging, and helpful for language learning.',
  'Default to 1-3 short sentences unless a more detailed explanation is needed.',
  'When the user is practicing speaking, prioritize natural sounding conversational responses.',
  'When the user is practicing writing, provide constructive feedback and clear corrections.',
].join(' ');

interface ModeConfig {
  prompt: string;
  temperature: number;
  maxTokens: number;
}

const MODE_CONFIG: Record<EchoMode, ModeConfig> = {
  advisor: {
    prompt: 'Advisor mode: Practical and direct. Focused on learning strategies.',
    temperature: 0.35,
    maxTokens: 400,
  },
  therapist: {
    prompt: "Empathetic mode: Warm, calm, and supportive of the learner's journey.",
    temperature: 0.55,
    maxTokens: 500,
  },
  sassy: {
    prompt: 'Sassy mode: Fun, energetic, and slightly cheeky to keep learning entertaining.',
    temperature: 0.9,
    maxTokens: 460,
  },
  chatty: {
    prompt: 'Conversational mode: Natural, social, and expressive for dialogue practice.',
    temperature: 0.7,
    maxTokens: 500,
  },
  coach: {
    prompt: 'Coach mode: Motivating, direct, and focused on immediate practice goals.',
    temperature: 0.5,
    maxTokens: 360,
  },
  analyst: {
    prompt: 'Analyst mode: Precise and structured, perfect for grammar and syntax analysis.',
    temperature: 0.25,
    maxTokens: 500,
  },
  creative: {
    prompt: 'Creative mode: Imaginative and encouraging for creative writing and storytelling.',
    temperature: 0.82,
    maxTokens: 600,
  },
  guardian: {
    prompt: 'Guardian mode: Patient and protective, focusing on fundamental accuracy.',
    temperature: 0.3,
    maxTokens: 360,
  },
};

export function getQuotaSnapshot(): ApiQuotaSnapshot | null {
  return getGroqQuotaSnapshot();
}

export async function completeWithEcho(
  messages: ChatMessage[],
  mode: EchoMode = 'advisor',
  options?: { maxTokens?: number; responseFormat?: { type: string } },
): Promise<string> {
  const modeConfig = MODE_CONFIG[mode] ?? MODE_CONFIG.advisor;
  const response = await runtimeKernel.completeWithForegroundTracking({
    model: aiConfig.models.chat,
    temperature: modeConfig.temperature,
    maxTokens: options?.maxTokens ?? modeConfig.maxTokens,
    responseFormat: options?.responseFormat,
    messages: [
      { role: 'system', content: `${BASE_SYSTEM_PROMPT} ${modeConfig.prompt}` },
      ...messages.map((message) => ({ role: message.role, content: message.content })),
    ],
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error('AI returned an empty response.');
  }

  return text;
}

export async function transcribeSpeech(audioBlob: Blob, languageCode = 'es'): Promise<string> {
  const normalized = languageCode.trim().toLowerCase();
  const sttLanguage = normalized === 'zh' ? 'zh' : normalized === 'fr' ? 'fr' : normalized === 'de' ? 'de' : normalized;
  const response = await runtimeKernel.transcribeWithForegroundTracking({
    model: aiConfig.models.stt,
    audio: audioBlob,
    language: sttLanguage,
  });
  return response.text?.trim() ?? '';
}

export async function synthesizeSpeech(
  text: string,
  voice: VoicePersona = aiConfig.models.ttsVoice,
): Promise<Blob> {
  const response = await runtimeKernel.synthesizeWithForegroundTracking({
    model: aiConfig.models.tts,
    text,
    voice,
    format: 'wav',
  });
  return response.audio;
}
