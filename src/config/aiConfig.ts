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

export const DEFAULT_CHAT_MODEL = "openai/gpt-oss-120b";

/**
 * Chat models Groq no longer serves, mapped to their replacement.
 *
 * The old default is still saved in existing settings and `.env` files; without
 * this, Chat fails with "model does not exist" until someone edits the setting by hand.
 */
const RETIRED_CHAT_MODELS: Record<string, string> = {
  "llama-3.3-70b-versatile": DEFAULT_CHAT_MODEL,
};

export function resolveChatModel(model: string | undefined): string {
  const trimmed = model?.trim();
  if (!trimmed) return DEFAULT_CHAT_MODEL;
  return RETIRED_CHAT_MODELS[trimmed] ?? trimmed;
}

export const aiConfig: RuntimeConfig = {
  apiKey,
  baseUrl: (import.meta.env.VITE_GROQ_BASE_URL ?? "https://api.groq.com/openai/v1").replace(/\/+$/, ""),
  models: {
    chat: resolveChatModel(import.meta.env.VITE_GROQ_CHAT_MODEL),
    stt: (import.meta.env.VITE_GROQ_STT_MODEL ?? "whisper-large-v3-turbo").trim(),
    tts: (import.meta.env.VITE_GROQ_TTS_MODEL ?? "canopylabs/orpheus-v1-english").trim(),
    ttsVoice: parseVoice(import.meta.env.VITE_GROQ_TTS_VOICE, "troy"),
  },
};

interface StoredAiSettings {
  ai?: {
    'Groq Base URL'?: string;
    'Online Chat Model'?: string;
    'Online Speech Model'?: string;
    'Online Voice Model'?: string;
    'Online Voice'?: string;
  };
}

export function getEffectiveAiConfig(): RuntimeConfig {
  let saved: StoredAiSettings = {};
  if (typeof localStorage !== 'undefined') {
    try {
      saved = JSON.parse(localStorage.getItem('numo_settings_state_v1') ?? '{}') as StoredAiSettings;
    } catch {
      saved = {};
    }
  }
  const settings = saved.ai ?? {};
  const configuredBaseUrl = settings['Groq Base URL']?.trim();
  const safeBaseUrl = configuredBaseUrl && /^https:\/\//i.test(configuredBaseUrl)
    ? configuredBaseUrl.replace(/\/+$/, '')
    : aiConfig.baseUrl;
  return {
    apiKey: getActiveGroqApiKey(),
    baseUrl: safeBaseUrl,
    models: {
      chat: settings['Online Chat Model']?.trim()
        ? resolveChatModel(settings['Online Chat Model'])
        : aiConfig.models.chat,
      stt: settings['Online Speech Model']?.trim() || aiConfig.models.stt,
      tts: settings['Online Voice Model']?.trim() || aiConfig.models.tts,
      ttsVoice: parseVoice(settings['Online Voice'], aiConfig.models.ttsVoice),
    },
  };
}

export function getConfiguredGroqApiKeys(): string[] {
  let savedKeys: string[] = [];
  if (typeof localStorage !== 'undefined') {
    try {
      const settings = JSON.parse(localStorage.getItem('numo_settings_state_v1') ?? '{}') as {
        ai?: { 'GROQ APIs'?: unknown };
      };
      if (Array.isArray(settings.ai?.['GROQ APIs'])) {
        savedKeys = settings.ai['GROQ APIs']
          .map((entry) => String(entry ?? '').trim())
          .filter(Boolean);
      }
    } catch {
      // Ignore malformed settings and retain the environment fallback.
    }
  }
  return Array.from(new Set([...savedKeys, aiConfig.apiKey].filter(Boolean)));
}

export function getActiveGroqApiKey(): string {
  return getConfiguredGroqApiKeys()[0] ?? '';
}

export function hasGroqKey(): boolean {
  return getConfiguredGroqApiKeys().length > 0;
}
