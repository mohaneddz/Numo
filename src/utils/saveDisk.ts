import { isTauri } from '@tauri-apps/api/core';

export async function saveToDummyDataFile(filename: string, content: string) {
  if (isTauri()) {
    try {
      // In the future, if you add @tauri-apps/plugin-fs, you can use:
      // import { writeTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';
      // await writeTextFile(filename, content, { dir: BaseDirectory.AppLocalData });
      
      // For now, since plugin-fs is not installed, we fallback to our rust invoke or just web download.
      // If you want to use Tauri's API to edit project files in dev mode, you'll need the fs plugin.
      console.warn('Tauri mode: please install @tauri-apps/plugin-fs to directly modify source files.');
      
      // Fallback to web download behavior to at least save it somewhere
      triggerWebDownload(filename, content);
    } catch (e) {
      console.error('Failed to save via Tauri', e);
      triggerWebDownload(filename, content);
    }
  } else {
    // Web environment: Trigger a file download
    triggerWebDownload(filename, content);
  }
}

function triggerWebDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
