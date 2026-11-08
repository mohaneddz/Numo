import { afterEach, describe, expect, it, vi } from 'vitest';
import { aiConfig, DEFAULT_CHAT_MODEL, getEffectiveAiConfig, resolveChatModel } from './aiConfig';

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

  it('replaces a retired saved chat model with the current default', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => key === 'numo_settings_state_v1'
        ? JSON.stringify({ ai: { 'Online Chat Model': 'llama-3.3-70b-versatile' } })
        : null,
    });

    expect(getEffectiveAiConfig().models.chat).toBe(DEFAULT_CHAT_MODEL);
    expect(resolveChatModel('  ')).toBe(DEFAULT_CHAT_MODEL);
    expect(resolveChatModel('openai/gpt-oss-20b')).toBe('openai/gpt-oss-20b');
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
