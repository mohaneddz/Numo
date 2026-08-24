import type { EchoMode } from '../types/ai';

export type ChatFontSize = 'small' | 'medium' | 'large';
export type ChatResponseLength = 'brief' | 'balanced' | 'detailed';

export interface ChatPreferences {
  assistantMode: EchoMode;
  fontSize: ChatFontSize;
  responseLength: ChatResponseLength;
  showTargetLanguage: boolean;
  showPronunciation: boolean;
  showEnglishMeaning: boolean;
  progressionMemory: boolean;
  notebookMemory: boolean;
}

const STORAGE_KEY = 'numo_chat_preferences_v1';

export const DEFAULT_CHAT_PREFERENCES: ChatPreferences = {
  assistantMode: 'chatty',
  fontSize: 'medium',
  responseLength: 'balanced',
  showTargetLanguage: true,
  showPronunciation: true,
  showEnglishMeaning: true,
  progressionMemory: true,
  notebookMemory: true,
};

export function readChatPreferences(): ChatPreferences {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_CHAT_PREFERENCES };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<ChatPreferences>;
    return {
      assistantMode:
        saved.assistantMode === 'advisor'
        || saved.assistantMode === 'coach'
        || saved.assistantMode === 'analyst'
        || saved.assistantMode === 'creative'
        || saved.assistantMode === 'therapist'
        || saved.assistantMode === 'sassy'
        || saved.assistantMode === 'guardian'
          ? saved.assistantMode
          : 'chatty',
      fontSize: saved.fontSize === 'small' || saved.fontSize === 'large'
        ? saved.fontSize
        : 'medium',
      responseLength:
        saved.responseLength === 'brief' || saved.responseLength === 'detailed'
          ? saved.responseLength
          : 'balanced',
      showTargetLanguage: saved.showTargetLanguage ?? true,
      showPronunciation: saved.showPronunciation ?? true,
      showEnglishMeaning: saved.showEnglishMeaning ?? true,
      progressionMemory: saved.progressionMemory ?? true,
      notebookMemory: saved.notebookMemory ?? true,
    };
  } catch {
    return { ...DEFAULT_CHAT_PREFERENCES };
  }
}

export function writeChatPreferences(preferences: ChatPreferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}
