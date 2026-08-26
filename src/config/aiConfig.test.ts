import { afterEach, describe, expect, it, vi } from 'vitest';
import { aiConfig, getEffectiveAiConfig } from './aiConfig';

describe('effective online AI configuration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses saved online model settings at request time', () => {
    const saved = {
      ai: {
        'Groq Base URL': 'https://provider.example/v1/',
        'Online Chat Model': 'chat-custom',
        'Online Speech Model': 'speech-custom',
        'Online Voice Model': 'voice-custom',
        'Online Voice': 'diana',
      },
    };
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => key === 'numo_settings_state_v1' ? JSON.stringify(saved) : null,
    });

    expect(getEffectiveAiConfig()).toMatchObject({
      baseUrl: 'https://provider.example/v1',
      models: {
        chat: 'chat-custom',
        stt: 'speech-custom',
        tts: 'voice-custom',
        ttsVoice: 'diana',
      },
    });
  });

  it('rejects an unsafe saved base URL and retains the application default', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => key === 'numo_settings_state_v1'
        ? JSON.stringify({ ai: { 'Groq Base URL': 'http://insecure.example/v1' } })
        : null,
    });

    expect(getEffectiveAiConfig().baseUrl).toBe(aiConfig.baseUrl);
  });
});
