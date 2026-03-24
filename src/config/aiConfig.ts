import type { RuntimeConfig, VoicePersona } from "../types/ai";

function parseVoice(value: string | undefined, fallback: VoicePersona): VoicePersona {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase() as VoicePersona;
  const supported: VoicePersona[] = ["autumn", "diana", "hannah", "austin", "daniel", "troy"];
  return supported.includes(normalized) ? normalized : fallback;
}

const apiKey = (import.meta.env.VITE_GROQ_API_KEY ?? "").trim();

export const aiConfig: RuntimeConfig = {
  apiKey,
  baseUrl: (import.meta.env.VITE_GROQ_BASE_URL ?? "https://api.groq.com/openai/v1").replace(/\/+$/, ""),
  models: {
    chat: (import.meta.env.VITE_GROQ_CHAT_MODEL ?? "llama-3.3-70b-versatile").trim(),
    stt: (import.meta.env.VITE_GROQ_STT_MODEL ?? "whisper-large-v3-turbo").trim(),
    tts: (import.meta.env.VITE_GROQ_TTS_MODEL ?? "canopylabs/orpheus-v1-english").trim(),
    ttsVoice: parseVoice(import.meta.env.VITE_GROQ_TTS_VOICE, "troy"),
  },
};

export const hasGroqKey = aiConfig.apiKey.length > 0;
