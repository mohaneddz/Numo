/**
 * Persistence for the practice conversation.
 *
 * Chat messages lived only in component state, so navigating to Review and back
 * threw the whole conversation away. For a language app that is a real loss:
 * the thread is a record of what the learner practised and how they were
 * corrected, and it is the one place their own attempts appear in context.
 *
 * Stored per profile and language — a Spanish thread should not reappear when
 * the learner switches to Japanese.
 */
import { initializePersistence } from '../../persistence';
import type { ChatMessage } from '../../types/ai';

/**
 * Messages retained. A conversation long enough to exceed this is well past
 * the point where the earliest turns are still useful, and the whole thread is
 * re-sent to the model on every turn.
 */
export const MAX_STORED_MESSAGES = 60;

function storageKey(profileId: string, languageCode: string): string {
  return `numo.chat.history.${profileId}.${languageCode}`;
}

/** Keeps the newest messages, dropping the oldest past the cap. */
export function trimHistory(
  messages: readonly ChatMessage[],
  max = MAX_STORED_MESSAGES,
): ChatMessage[] {
  return messages.slice(-max);
}

export async function loadChatHistory(
  profileId: string,
  languageCode: string,
): Promise<ChatMessage[]> {
  try {
    const persistence = await initializePersistence();
    const stored = await persistence.repositories.settings.getJson<ChatMessage[]>(
      storageKey(profileId, languageCode),
    );
    return Array.isArray(stored) ? stored : [];
  } catch {
    // Outside the Tauri runtime there is no database; an empty thread is
    // better than refusing to open the page.
    return [];
  }
}

export async function saveChatHistory(
  profileId: string,
  languageCode: string,
  messages: readonly ChatMessage[],
): Promise<void> {
  try {
    const persistence = await initializePersistence();
    await persistence.repositories.settings.setJson(
      storageKey(profileId, languageCode),
      trimHistory(messages),
      'chat',
    );
  } catch {
    // Losing the transcript is not worth interrupting the conversation over.
  }
}

export async function clearChatHistory(
  profileId: string,
  languageCode: string,
): Promise<void> {
  await saveChatHistory(profileId, languageCode, []);
}
