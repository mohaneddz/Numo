export type AssistantStatus = "idle" | "listening" | "processing" | "speaking" | "error";

export type MessageRole = "user" | "assistant" | "system";

export type VoicePersona = "autumn" | "diana" | "hannah" | "austin" | "daniel" | "troy";

export type SpeechStyle = "natural" | "neutral" | "cheerful" | "professional" | "whisper";

export type EchoMode =
  | "advisor"
  | "therapist"
  | "sassy"
  | "chatty"
  | "coach"
  | "analyst"
  | "creative"
  | "guardian";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  learningReply?: LanguageLearningReply;
}

export interface PronouncedWord {
  text: string;
  pronunciation: string;
}

export interface LanguageLearningReply {
  targetText: string;
  words: PronouncedWord[];
  englishMeaning: string;
}

export interface ApiQuotaSnapshot {
  limitRequests?: number;
  remainingRequests?: number;
  resetRequests?: string;
  limitTokens?: number;
  remainingTokens?: number;
  resetTokens?: string;
  rawHeaders: Record<string, string>;
  updatedAt: number;
}

export interface RuntimeModels {
  chat: string;
  stt: string;
  tts: string;
  ttsVoice: VoicePersona;
}

export interface RuntimeConfig {
  apiKey: string;
  baseUrl: string;
  models: RuntimeModels;
}
