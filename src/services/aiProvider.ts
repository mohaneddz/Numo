import { aiConfig } from "../config/aiConfig";
import type {
  ApiQuotaSnapshot,
  EchoMode,
  ChatMessage,
  VoicePersona,
} from "../types/ai";

interface GroqApiError {
  error?: {
    message?: string;
  };
}

interface GroqChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface GroqTranscriptionResponse {
  text?: string;
}

let latestQuotaSnapshot: ApiQuotaSnapshot | null = null;

const BASE_SYSTEM_PROMPT = [
  "You are Echo, a supportive and intelligent educational companion.",
  "Be concise, encouraging, and helpful for language learning.",
  "Default to 1-3 short sentences unless a more detailed explanation is needed.",
  "When the user is practicing speaking, prioritize natural sounding conversational responses.",
  "When the user is practicing writing, provide constructive feedback and clear corrections.",
].join(" ");

interface ModeConfig {
  prompt: string;
  temperature: number;
  maxTokens: number;
}

const MODE_CONFIG: Record<EchoMode, ModeConfig> = {
  advisor: {
    prompt: "Advisor mode: Practical and direct. Focused on learning strategies.",
    temperature: 0.35,
    maxTokens: 400,
  },
  therapist: {
    prompt: "Empathetic mode: Warm, calm, and supportive of the learner's journey.",
    temperature: 0.55,
    maxTokens: 500,
  },
  sassy: {
    prompt: "Sassy mode: Fun, energetic, and slightly cheeky to keep learning entertaining.",
    temperature: 0.9,
    maxTokens: 460,
  },
  chatty: {
    prompt: "Conversational mode: Natural, social, and expressive for dialogue practice.",
    temperature: 0.7,
    maxTokens: 500,
  },
  coach: {
    prompt: "Coach mode: Motivating, direct, and focused on immediate practice goals.",
    temperature: 0.5,
    maxTokens: 360,
  },
  analyst: {
    prompt: "Analyst mode: Precise and structured, perfect for grammar and syntax analysis.",
    temperature: 0.25,
    maxTokens: 500,
  },
  creative: {
    prompt: "Creative mode: Imaginative and encouraging for creative writing and storytelling.",
    temperature: 0.82,
    maxTokens: 600,
  },
  guardian: {
    prompt: "Guardian mode: Patient and protective, focusing on fundamental accuracy.",
    temperature: 0.3,
    maxTokens: 360,
  },
};

function readErrorMessage(payload: unknown, fallback: string): string {
  const typed = payload as GroqApiError;
  return typed.error?.message?.trim() || fallback;
}

function requireApiKey(): void {
  if (!aiConfig.apiKey) {
    throw new Error("Missing `VITE_GROQ_API_KEY` in environment.");
  }
}

function hasApiKey(): boolean {
  return Boolean(aiConfig.apiKey);
}

function mockEchoResponse(messages: ChatMessage[], mode: EchoMode): string {
  const lastUser = [...messages].reverse().find((message) => message.role === 'user')?.content?.trim() ?? '';
  const compact = lastUser.slice(0, 140);
  if (mode === 'analyst') {
    return `Fallback analysis: focus on tense consistency and concise corrections for "${compact || 'your input'}".`;
  }
  if (mode === 'coach') {
    return 'Fallback coach: repeat once slowly, once naturally, then continue the conversation.';
  }
  return `Fallback Echo (${mode}): received "${compact || 'your message'}". Keep practicing and send your next line.`;
}

async function parseFailedResponse(response: Response): Promise<never> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`AI request failed (${response.status}).`);
  }

  throw new Error(readErrorMessage(payload, `AI request failed (${response.status}).`));
}

function makeHeaders(contentType?: string): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${aiConfig.apiKey}`,
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  return headers;
}

function captureQuotaHeaders(headers: Headers): void {
  const limitRequests = Number.parseInt(headers.get("x-ratelimit-limit-requests") || "0", 10);
  const remainingRequests = Number.parseInt(headers.get("x-ratelimit-remaining-requests") || "0", 10);
  const resetRequests = headers.get("x-ratelimit-reset-requests") || "";
  
  if (limitRequests > 0) {
    latestQuotaSnapshot = {
      limitRequests,
      remainingRequests,
      resetRequests,
      rawHeaders: {},
      updatedAt: Date.now(),
    };
  }
}

export function getQuotaSnapshot(): ApiQuotaSnapshot | null {
  return latestQuotaSnapshot;
}

export async function completeWithEcho(
  messages: ChatMessage[],
  mode: EchoMode = "advisor",
  options?: { maxTokens?: number; responseFormat?: { type: string } }
): Promise<string> {
  if (!hasApiKey()) {
    return mockEchoResponse(messages, mode);
  }

  const endpoint = `${aiConfig.baseUrl}/chat/completions`;
  const modeConfig = MODE_CONFIG[mode] ?? MODE_CONFIG.advisor;
  const payload: any = {
    model: aiConfig.models.chat,
    temperature: modeConfig.temperature,
    max_tokens: options?.maxTokens ?? modeConfig.maxTokens,
    messages: [
      { role: "system", content: `${BASE_SYSTEM_PROMPT} ${modeConfig.prompt}` },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  };

  if (options?.responseFormat) {
    payload.response_format = options.responseFormat;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: makeHeaders("application/json"),
    body: JSON.stringify(payload),
  });
  captureQuotaHeaders(response.headers);

  if (!response.ok) {
    return parseFailedResponse(response);
  }

  const data = (await response.json()) as GroqChatResponse;
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("AI returned an empty response.");
  }
  return content;
}

export async function transcribeSpeech(audioBlob: Blob): Promise<string> {
  if (!hasApiKey()) {
    void audioBlob;
    return "Buenos dias, como esta usted";
  }

  const endpoint = `${aiConfig.baseUrl}/audio/transcriptions`;
  const formData = new FormData();
  formData.append("model", aiConfig.models.stt);
  formData.append("file", audioBlob, "recording.webm");
  formData.append("language", "es"); // Defaulting to Spanish for Noema, can be dynamic later

  const response = await fetch(endpoint, {
    method: "POST",
    headers: makeHeaders(),
    body: formData,
  });
  captureQuotaHeaders(response.headers);

  if (!response.ok) {
    return parseFailedResponse(response);
  }

  const data = (await response.json()) as GroqTranscriptionResponse;
  return data.text?.trim() ?? "";
}

export async function synthesizeSpeech(
  text: string,
  voice: VoicePersona = aiConfig.models.ttsVoice,
): Promise<Blob> {
  requireApiKey();

  const endpoint = `${aiConfig.baseUrl}/audio/speech`;
  const payload = {
    model: aiConfig.models.tts,
    voice,
    input: text,
    response_format: "mp3"
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: makeHeaders("application/json"),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return parseFailedResponse(response);
  }

  return response.blob();
}
