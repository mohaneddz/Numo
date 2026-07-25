import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mirrorNotebookEntry } from './noteMirrorService';

const writeTextFileMock = vi.hoisted(() =>
  vi.fn<(path: string, contents: string) => Promise<void>>(async () => undefined),
);

vi.mock('@tauri-apps/api/path', () => ({
  join: async (...parts: string[]) => parts.join('\\'),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  writeTextFile: writeTextFileMock,
}));

vi.mock('./localRuntimeSettings', () => ({
  readLocalRuntimeSettings: () => ({
    connectivityMode: 'offline',
    paths: { notesFolder: 'D:\\Numo Notes' },
  }),
}));

describe('Notebook note mirroring', () => {
  beforeEach(() => {
    writeTextFileMock.mockClear();
  });

  it('writes matching Markdown and JSON files to the configured folder', async () => {
    await mirrorNotebookEntry({
      id: 'note-1',
      term: '¿Cómo estás?',
      translation: 'How are you?',
      type: 'phrase',
      context: 'A friendly greeting.',
      notes: 'Use with friends.',
      tags: ['greeting'],
      createdAt: '2026-07-20',
      updatedAt: '2026-07-20',
      mastery: 0,
      source: 'manual',
    });

    expect(writeTextFileMock).toHaveBeenCalledTimes(2);
    const markdownCall = writeTextFileMock.mock.calls.find(([path]) => String(path).endsWith('.md'));
    const jsonCall = writeTextFileMock.mock.calls.find(([path]) => String(path).endsWith('.json'));
    expect(markdownCall?.[0]).toContain('D:\\Numo Notes\\');
    expect(markdownCall?.[1]).toContain('# ¿Cómo estás?');
    expect(markdownCall?.[1]).toContain('## Notes');
    expect(jsonCall?.[1]).toContain('"translation": "How are you?"');
  });
});
