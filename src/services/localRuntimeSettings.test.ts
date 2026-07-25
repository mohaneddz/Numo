import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readLocalRuntimeSettings,
  setConnectivityMode,
  setLocalRuntimePath,
} from './localRuntimeSettings';

const values = new Map<string, string>();

describe('local runtime settings persistence', () => {
  beforeEach(() => {
    values.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    vi.stubGlobal('window', {
      dispatchEvent: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to online mode with empty local paths', () => {
    expect(readLocalRuntimeSettings()).toMatchObject({
      connectivityMode: 'online',
      paths: {
        llmExecutable: '',
        llmModel: '',
        notesFolder: '',
        voicesFolder: '',
      },
    });
  });

  it('persists connectivity and paths without overwriting the other values', () => {
    setConnectivityMode('offline');
    setLocalRuntimePath('llmModel', 'D:\\Models\\teacher.gguf');
    setLocalRuntimePath('notesFolder', 'D:\\Numo Notes');

    expect(readLocalRuntimeSettings()).toMatchObject({
      connectivityMode: 'offline',
      paths: {
        llmModel: 'D:\\Models\\teacher.gguf',
        notesFolder: 'D:\\Numo Notes',
      },
    });
  });
});
