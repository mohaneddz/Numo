import { aiConfig } from '../config/aiConfig';
import { getGroqQuotaSnapshot, runtimeKernel } from '../runtime';
import type {
  ApiQuotaSnapshot,
  ChatMessage,
  EchoMode,
  LanguageLearningReply,
  VoicePersona,
} from '../types/ai';
import type { ChatResponseLength } from './chatPreferences';

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

function extractJsonObject(raw: string): string {
  const withoutFence = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  const start = withoutFence.indexOf('{');
  const end = withoutFence.lastIndexOf('}');
  return start >= 0 && end > start
    ? withoutFence.slice(start, end + 1)
    : withoutFence;
}

export function parseLanguageLearningReply(raw: string): LanguageLearningReply {
  const parsed = JSON.parse(extractJsonObject(raw)) as Partial<LanguageLearningReply>;
  const targetText = typeof parsed.targetText === 'string' ? parsed.targetText.trim() : '';
  const englishMeaning = typeof parsed.englishMeaning === 'string'
    ? parsed.englishMeaning.trim()
    : '';
  const words = Array.isArray(parsed.words)
    ? parsed.words
        .map((word) => ({
          text: typeof word?.text === 'string' ? word.text.trim() : '',
          pronunciation: typeof word?.pronunciation === 'string'
            ? word.pronunciation.trim()
            : '',
        }))
        .filter((word) => word.text)
    : [];
  const hasMissingPronunciation = words.some(
    (word) => /[\p{L}\p{N}]/u.test(word.text) && !word.pronunciation,
  );

  if (!targetText || !englishMeaning || words.length === 0 || hasMissingPronunciation) {
    throw new Error('Echo returned an incomplete language-learning response.');
  }
  return { targetText, words, englishMeaning };
}

function learningResponsePrompt(
  languageName: string,
  languageCode: string,
  responseLength: ChatResponseLength = 'balanced',
): string {
  const pronunciationGuide =
    languageCode === 'zh'
      ? 'Use Hanyu Pinyin with tone marks.'
      : languageCode === 'ja'
        ? 'Use clear Hepburn romaji.'
        : languageCode === 'ko'
          ? 'Use Revised Romanization.'
          : languageCode === 'ru'
            ? 'Use readable Latin transliteration with stress made clear.'
            : languageCode === 'ar'
              ? 'Use readable Latin transliteration with long vowels made clear.'
              : 'Use simple English-readable phonetic respelling, not a translation.';

  return [
    `The learner is studying ${languageName} (${languageCode}).`,
    responseLength === 'brief'
      ? `Reply naturally in ${languageName} using one concise sentence.`
      : responseLength === 'detailed'
        ? `Reply naturally in ${languageName} using 3-5 useful conversational sentences.`
        : `Reply naturally in ${languageName}, using 1-3 concise sentences appropriate for conversation practice.`,
    'Return only one JSON object with this exact structure:',
    '{"targetText":"full target-language reply","words":[{"text":"exact displayed word","pronunciation":"how it is pronounced"}],"englishMeaning":"natural English meaning of the complete reply"}',
    'The words array must preserve every word from targetText in exact reading order.',
    'Keep punctuation attached to the appropriate word. Punctuation-only tokens may have an empty pronunciation.',
    pronunciationGuide,
    'englishMeaning must translate the complete targetText, not explain individual words.',
    'Do not use Markdown and do not add keys outside this structure.',
  ].join(' ');
}

export async function completeLanguageChat(
  messages: ChatMessage[],
  language: { code: string; name: string },
  mode: EchoMode = 'chatty',
  options?: {
    responseLength?: ChatResponseLength;
    progressionContext?: string;
  },
): Promise<LanguageLearningReply> {
  const modeConfig = MODE_CONFIG[mode] ?? MODE_CONFIG.chatty;
  const structurePrompt = learningResponsePrompt(
    language.name,
    language.code,
    options?.responseLength,
  );
  const progressionPrompt = options?.progressionContext?.trim()
    ? `Use this retrieved learner memory only to adapt difficulty, examples, and corrections. Do not mention the memory unless asked: ${options.progressionContext.trim()}`
    : 'No learner progression memory is available. Do not infer private learning history.';
  const requestMessages = [
    {
      role: 'system' as const,
      content: `${BASE_SYSTEM_PROMPT} ${modeConfig.prompt} ${progressionPrompt} ${structurePrompt}`,
    },
    ...messages.map((message) => ({
      role: message.role,
      content: message.learningReply
        ? `${message.learningReply.targetText}\nEnglish meaning: ${message.learningReply.englishMeaning}`
        : message.content,
    })),
  ];

  const response = await runtimeKernel.completeWithForegroundTracking({
    model: aiConfig.models.chat,
    temperature: modeConfig.temperature,
    maxTokens: Math.max(900, modeConfig.maxTokens),
    responseFormat: { type: 'json_object' },
    messages: requestMessages,
  });
  const raw = response.text?.trim();
  if (!raw) throw new Error('AI returned an empty response.');

  try {
    return parseLanguageLearningReply(raw);
  } catch {
    const repaired = await runtimeKernel.completeWithForegroundTracking({
      model: aiConfig.models.chat,
      temperature: 0,
      maxTokens: 1000,
      responseFormat: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `${structurePrompt} Repair the supplied response into the required JSON. Preserve its intended conversational meaning.`,
        },
        { role: 'user', content: raw },
      ],
    });
    const repairedText = repaired.text?.trim();
    if (!repairedText) throw new Error('AI returned an incomplete response.');
    return parseLanguageLearningReply(repairedText);
  }
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
