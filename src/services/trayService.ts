import { invoke, isTauri } from '@tauri-apps/api/core';

const STORAGE_KEY = 'numo_minimize_to_tray_v1';

/** Settings -> Desktop Preferences -> "Minimize to Tray". Mirrors localRuntimeSettings.ts's sync-to-Rust pattern. */
export function readMinimizeToTrayEnabled(): boolean {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return true;
  return raw === 'true';
}

export function setMinimizeToTrayEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY, String(enabled));
  if (isTauri()) {
    void invoke('set_minimize_to_tray_enabled', { enabled });
  }
}

/** Syncs the persisted value to the Rust-side window-close handler on boot. */
export function initializeTraySettings(): void {
  if (!isTauri()) return;
  void invoke('set_minimize_to_tray_enabled', { enabled: readMinimizeToTrayEnabled() });
}
