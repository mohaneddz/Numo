export const KEYBOARD_SHORTCUTS_ENABLED_KEY = 'numo.keyboard_shortcuts.enabled';
export const PREFERENCES_UPDATED_EVENT = 'numo:preferences-updated';

export function readKeyboardShortcutsEnabled(): boolean {
  const raw = localStorage.getItem(KEYBOARD_SHORTCUTS_ENABLED_KEY);
  if (raw === null) return true;
  return raw === 'true';
}

export function writeKeyboardShortcutsEnabled(enabled: boolean): void {
  localStorage.setItem(KEYBOARD_SHORTCUTS_ENABLED_KEY, String(enabled));
  window.dispatchEvent(new Event(PREFERENCES_UPDATED_EVENT));
}
