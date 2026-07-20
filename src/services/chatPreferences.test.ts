import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_CHAT_PREFERENCES,
  readChatPreferences,
  writeChatPreferences,
} from './chatPreferences';

describe('chat preferences', () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
  });

  it('defaults to all learning layers and progression memory enabled', () => {
    expect(readChatPreferences()).toEqual(DEFAULT_CHAT_PREFERENCES);
  });

  it('persists chat-specific display and memory controls', () => {
    writeChatPreferences({
      ...DEFAULT_CHAT_PREFERENCES,
      fontSize: 'large',
      showPronunciation: false,
      progressionMemory: false,
    });

    expect(readChatPreferences()).toMatchObject({
      fontSize: 'large',
      showPronunciation: false,
      progressionMemory: false,
    });
  });
});
