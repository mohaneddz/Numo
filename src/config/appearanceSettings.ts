/**
 * Applies the visible effects behind Settings -> Appearance / Accessibility.
 *
 * Settings.tsx remains the single source of truth (its settings blob is
 * still what persists), this module just turns specific label/value pairs
 * from that blob into real `document.documentElement` attributes that
 * index.css keys off of, so the Theme/Font Size/Animations/Reduce
 * Motion/High Contrast controls actually change something on screen instead
 * of writing to storage and being read by nothing.
 */

const THEME_LABEL_TO_KEY: Record<string, string> = {
  'Midnight Signal': 'midnight',
  'Deep Ocean': 'ocean',
  'Forest Night': 'forest',
  'Light Mode': 'light',
};

const FONT_SIZE_LABEL_TO_KEY: Record<string, string> = {
  Small: 'sm',
  Medium: 'md',
  Large: 'lg',
  'Extra Large': 'xl',
};

/**
 * Most of this app's text is set in literal pixel sizes (Tailwind arbitrary
 * values like `text-[14px]`), not rem/em, so a root font-size override would
 * do nothing for almost anything on screen. Reusing the zoom mechanism the
 * app already ships (Ctrl +/-, see App.tsx) is the one change that actually
 * scales everything, text included.
 */
export const FONT_SIZE_ZOOM: Record<string, number> = {
  sm: 0.9,
  md: 1,
  lg: 1.15,
  xl: 1.3,
};

/** Fired with the resolved zoom number as `detail` whenever Font Size changes. */
export const FONT_SIZE_ZOOM_EVENT = 'numo:font-size-zoom-changed';

export function applyTheme(label: string): void {
  document.documentElement.dataset.theme = THEME_LABEL_TO_KEY[label] ?? 'midnight';
}

export function applyFontSize(label: string): void {
  const key = FONT_SIZE_LABEL_TO_KEY[label] ?? 'md';
  document.documentElement.dataset.fontSize = key;
  window.dispatchEvent(new CustomEvent(FONT_SIZE_ZOOM_EVENT, { detail: FONT_SIZE_ZOOM[key] ?? 1 }));
}

export function applyContrast(highContrast: boolean): void {
  document.documentElement.dataset.contrast = highContrast ? 'high' : 'normal';
}

/** Fired with the resolved reduced-motion boolean as `detail` whenever Animations/Reduce Motion changes. */
export const MOTION_REDUCED_EVENT = 'numo:motion-reduced-changed';

export function applyMotion(options: { animationsEnabled: boolean; reduceMotion: boolean }): void {
  const reduced = options.reduceMotion || !options.animationsEnabled;
  document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
  window.dispatchEvent(new CustomEvent(MOTION_REDUCED_EVENT, { detail: reduced }));
}

const SETTINGS_STORAGE_KEY = 'numo_settings_state_v1';

function readSettingsBlob(): { appearance: Record<string, unknown>; accessibility: Record<string, unknown> } {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, Record<string, unknown>>) : {};
    return { appearance: parsed.appearance ?? {}, accessibility: parsed.accessibility ?? {} };
  } catch {
    return { appearance: {}, accessibility: {} };
  }
}

/** Synchronous, storage-only read — safe to use as a `useState` initializer before any effect runs. */
export function fontSizeZoomBaseline(): number {
  const { appearance } = readSettingsBlob();
  const key = FONT_SIZE_LABEL_TO_KEY[String(appearance['Font Size'] ?? 'Medium')] ?? 'md';
  return FONT_SIZE_ZOOM[key] ?? 1;
}

/** Synchronous, storage-only read — safe to use as a `useState` initializer before any effect runs. */
export function motionReducedBaseline(): boolean {
  const { appearance, accessibility } = readSettingsBlob();
  const animationsEnabled = Boolean(appearance['Animations'] ?? true);
  const reduceMotion = Boolean(accessibility['Reduce Motion'] ?? false);
  return reduceMotion || !animationsEnabled;
}

/** Settings -> Audio & Microphone -> "Auto-play Audio". Read fresh each time — no event needed, callers check it right before deciding to play. */
export function isAutoPlayAudioEnabled(): boolean {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, Record<string, unknown>>) : {};
    return Boolean(parsed.audio?.['Auto-play Audio'] ?? true);
  } catch {
    return true;
  }
}

/** Re-applies whatever was last saved — call once on app boot so a reload keeps the look. */
export function bootstrapAppearanceSettings(): void {
  const { appearance, accessibility } = readSettingsBlob();
  applyTheme(String(appearance['Theme'] ?? 'Midnight Signal'));
  applyFontSize(String(appearance['Font Size'] ?? 'Medium'));
  applyContrast(Boolean(accessibility['High Contrast'] ?? false));
  applyMotion({
    animationsEnabled: Boolean(appearance['Animations'] ?? true),
    reduceMotion: Boolean(accessibility['Reduce Motion'] ?? false),
  });
}
