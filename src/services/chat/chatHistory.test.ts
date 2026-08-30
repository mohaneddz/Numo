import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../../types/ai';

const store = new Map<string, unknown>();
let persistenceAvailable = true;

vi.mock('../../persistence', () => ({
  initializePersistence: async () => {
    if (!persistenceAvailable) throw new Error('Persistence is only available inside Tauri runtime.');
    return {
      repositories: {
        settings: {
          getJson: async (key: string) => store.get(key) ?? null,
          setJson: async (key: string, value: unknown) => {
            store.set(key, value);
          },
        },
      },
    };
  },
}));

const { MAX_STORED_MESSAGES, clearChatHistory, loadChatHistory, saveChatHistory, trimHistory } =
  await import('./chatHistory');

const message = (index: number): ChatMessage => ({
  id: `m${index}`,
  role: index % 2 === 0 ? 'user' : 'assistant',
  content: `message ${index}`,
  createdAt: index,
});

beforeEach(() => {
  store.clear();
  persistenceAvailable = true;
});

describe('trimHistory', () => {
  it('keeps a short conversation whole', () => {
    const messages = [message(1), message(2)];
    expect(trimHistory(messages)).toEqual(messages);
  });

  it('keeps the newest messages once the cap is passed', () => {
    const messages = Array.from({ length: MAX_STORED_MESSAGES + 5 }, (_, i) => message(i));
    const trimmed = trimHistory(messages);

    expect(trimmed).toHaveLength(MAX_STORED_MESSAGES);
    expect(trimmed[trimmed.length - 1].content).toBe(`message ${MAX_STORED_MESSAGES + 4}`);
  });

  it('honours a smaller cap', () => {
    expect(trimHistory([message(1), message(2), message(3)], 1)).toHaveLength(1);
  });
});

describe('chat history persistence', () => {
  it('starts empty for a new conversation', async () => {
    expect(await loadChatHistory('p1', 'es')).toEqual([]);
  });

  it('round-trips a conversation', async () => {
    await saveChatHistory('p1', 'es', [message(1), message(2)]);
    const loaded = await loadChatHistory('p1', 'es');

    expect(loaded).toHaveLength(2);
    expect(loaded[0].content).toBe('message 1');
  });

  it('keeps threads apart per language', async () => {
    await saveChatHistory('p1', 'es', [message(1)]);
    // A Spanish thread must not reappear when the learner switches to Japanese.
    expect(await loadChatHistory('p1', 'ja')).toEqual([]);
  });

  it('keeps threads apart per profile', async () => {
    await saveChatHistory('p1', 'es', [message(1)]);
    expect(await loadChatHistory('p2', 'es')).toEqual([]);
  });

  it('trims on the way in, so storage cannot grow without bound', async () => {
    const messages = Array.from({ length: MAX_STORED_MESSAGES + 10 }, (_, i) => message(i));
    await saveChatHistory('p1', 'es', messages);
    expect(await loadChatHistory('p1', 'es')).toHaveLength(MAX_STORED_MESSAGES);
  });

  it('clears a thread on request', async () => {
    await saveChatHistory('p1', 'es', [message(1)]);
    await clearChatHistory('p1', 'es');
    expect(await loadChatHistory('p1', 'es')).toEqual([]);
  });

  it('returns an empty thread rather than failing without a database', async () => {
    persistenceAvailable = false;
    expect(await loadChatHistory('p1', 'es')).toEqual([]);
  });

  it('does not throw when the conversation cannot be saved', async () => {
    persistenceAvailable = false;
    await expect(saveChatHistory('p1', 'es', [message(1)])).resolves.toBeUndefined();
  });

  it('ignores corrupted stored data', async () => {
    store.set('numo.chat.history.p1.es', 'not an array');
    expect(await loadChatHistory('p1', 'es')).toEqual([]);
  });
});
