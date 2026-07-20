import { join } from '@tauri-apps/api/path';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import type { NotebookEntry } from '../data/types';
import { readLocalRuntimeSettings } from './localRuntimeSettings';

function safeFilename(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.\-\s]+|[.\-\s]+$/g, '')
    .slice(0, 72) || 'note';
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function toMarkdown(entry: NotebookEntry): string {
  return [
    '---',
    `id: ${yamlString(entry.id)}`,
    `type: ${yamlString(entry.type)}`,
    `translation: ${yamlString(entry.translation)}`,
    `tags: [${entry.tags.map(yamlString).join(', ')}]`,
    `source: ${yamlString(entry.source ?? 'manual')}`,
    `created: ${yamlString(entry.createdAt)}`,
    `updated: ${yamlString(entry.updatedAt ?? entry.createdAt)}`,
    '---',
    '',
    `# ${entry.term}`,
    '',
    entry.translation,
    ...(entry.context ? ['', '## Context', '', entry.context] : []),
    ...(entry.notes ? ['', '## Notes', '', entry.notes] : []),
    ...(entry.personalHint ? ['', '## Personal hint', '', entry.personalHint] : []),
    ...(entry.personalExample ? ['', '## Personal example', '', entry.personalExample] : []),
    '',
  ].join('\n');
}

export async function mirrorNotebookEntry(entry: NotebookEntry): Promise<void> {
  const folder = readLocalRuntimeSettings().paths.notesFolder;
  if (!folder) return;
  const basename = `${safeFilename(entry.term)}--${entry.id}`;
  const markdownPath = await join(folder, `${basename}.md`);
  const jsonPath = await join(folder, `${basename}.json`);
  await Promise.all([
    writeTextFile(markdownPath, toMarkdown(entry)),
    writeTextFile(jsonPath, JSON.stringify(entry, null, 2)),
  ]);
}
