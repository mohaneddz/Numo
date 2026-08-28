import { isTauri } from '@tauri-apps/api/core';

/**
 * Saves text to disk. Under Tauri, prompts for a real save location and
 * writes via the fs plugin; in a plain browser (dev mode without Tauri) it
 * falls back to a normal browser download, since there's no filesystem to
 * write to directly.
 */
export async function saveTextFile(filename: string, content: string): Promise<void> {
  if (isTauri()) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      const extension = filename.includes('.') ? filename.split('.').pop() : undefined;
      const path = await save({
        defaultPath: filename,
        filters: extension ? [{ name: extension.toUpperCase(), extensions: [extension] }] : undefined,
      });
      if (!path) return; // user cancelled
      await writeTextFile(path, content);
      return;
    } catch (error) {
      console.error('Failed to save file via Tauri, falling back to browser download', error);
    }
  }
  triggerWebDownload(filename, content);
}

function triggerWebDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
