import { isTauri } from '@tauri-apps/api/core';

/** Settings -> Desktop Preferences -> "Start with System", backed by tauri-plugin-autostart. */
export async function isAutostartEnabled(): Promise<boolean> {
  if (!isTauri()) return false;
  const { isEnabled } = await import('@tauri-apps/plugin-autostart');
  return isEnabled();
}

export async function setAutostartEnabled(enabled: boolean): Promise<void> {
  if (!isTauri()) return;
  const autostart = await import('@tauri-apps/plugin-autostart');
  if (enabled) {
    await autostart.enable();
  } else {
    await autostart.disable();
  }
}
