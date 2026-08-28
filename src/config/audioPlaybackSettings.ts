const SETTINGS_STORAGE_KEY = 'numo_settings_state_v1';

const SPEECH_SPEED_RATE: Record<string, number> = {
  Slow: 0.75,
  Normal: 1,
  Fast: 1.35,
};

/** Settings -> Audio & Microphone -> "Speech Speed". Applied as `HTMLAudioElement.playbackRate` at every TTS playback site. */
export function speechPlaybackRate(): number {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, Record<string, unknown>>) : {};
    const label = String(parsed.audio?.['Speech Speed'] ?? 'Normal');
    return SPEECH_SPEED_RATE[label] ?? 1;
  } catch {
    return 1;
  }
}
