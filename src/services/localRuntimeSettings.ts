import { invoke, isTauri } from '@tauri-apps/api/core';
import { join } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { exists, readDir } from '@tauri-apps/plugin-fs';

export type ConnectivityMode = 'online' | 'offline';

export interface LocalRuntimePaths {
  llmExecutable: string;
  llmModel: string;
  whisperExecutable: string;
  whisperModel: string;
  ffmpegExecutable: string;
  piperExecutable: string;
  piperVoiceModel: string;
  voicesFolder: string;
  notesFolder: string;
}

export interface LocalRuntimeSettings {
  connectivityMode: ConnectivityMode;
  paths: LocalRuntimePaths;
}

export type LocalRuntimePathKey = keyof LocalRuntimePaths;

export interface LocalVoiceModel {
  name: string;
  modelPath: string;
  configPath: string;
  ready: boolean;
}

const STORAGE_KEY = 'numo_local_runtime_settings_v1';
export const LOCAL_RUNTIME_SETTINGS_EVENT = 'numo:local-runtime-settings-changed';

const DEFAULT_SETTINGS: LocalRuntimeSettings = {
  connectivityMode: 'online',
  paths: {
    llmExecutable: '',
    llmModel: '',
    whisperExecutable: '',
    whisperModel: '',
    ffmpegExecutable: '',
    piperExecutable: '',
    piperVoiceModel: '',
    voicesFolder: '',
    notesFolder: '',
  },
};

export function readLocalRuntimeSettings(): LocalRuntimeSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<LocalRuntimeSettings>;
    return {
      connectivityMode: saved.connectivityMode === 'offline' ? 'offline' : 'online',
      paths: { ...DEFAULT_SETTINGS.paths, ...(saved.paths ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function writeLocalRuntimeSettings(settings: LocalRuntimeSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(LOCAL_RUNTIME_SETTINGS_EVENT, { detail: settings }));
  if (isTauri()) {
    void invoke('set_connectivity_mode', {
      online: settings.connectivityMode === 'online',
    });
  }
}

export function setConnectivityMode(mode: ConnectivityMode): void {
  writeLocalRuntimeSettings({ ...readLocalRuntimeSettings(), connectivityMode: mode });
}

export function setLocalRuntimePath(key: LocalRuntimePathKey, value: string): void {
  const current = readLocalRuntimeSettings();
  writeLocalRuntimeSettings({
    ...current,
    paths: { ...current.paths, [key]: value.trim() },
  });
}

export function isOnlineMode(): boolean {
  return readLocalRuntimeSettings().connectivityMode === 'online';
}

export function requireOnline(feature: string): void {
  if (!isOnlineMode()) {
    throw new Error(`${feature} is unavailable while Numo is in offline mode.`);
  }
}

export function initializeLocalRuntimeSettings(): void {
  if (!isTauri()) return;
  const settings = readLocalRuntimeSettings();
  void invoke('set_connectivity_mode', {
    online: settings.connectivityMode === 'online',
  });
}

export async function scanLocalVoices(
  folder = readLocalRuntimeSettings().paths.voicesFolder,
): Promise<LocalVoiceModel[]> {
  if (!folder) return [];
  const entries = await readDir(folder);
  const voices: LocalVoiceModel[] = [];
  for (const entry of entries) {
    if (!entry.isFile || !entry.name?.toLowerCase().endsWith('.onnx')) continue;
    const modelPath = await join(folder, entry.name);
    const configPath = `${modelPath}.json`;
    voices.push({
      name: entry.name.replace(/\.onnx$/i, ''),
      modelPath,
      configPath,
      ready: await exists(configPath),
    });
  }
  return voices.sort((left, right) => left.name.localeCompare(right.name));
}

export async function chooseLocalRuntimePath(
  key: LocalRuntimePathKey,
  options: {
    title: string;
    directory?: boolean;
    extensions?: string[];
  },
): Promise<string | null> {
  const current = readLocalRuntimeSettings().paths[key];
  const selected = await open({
    directory: options.directory ?? false,
    multiple: false,
    title: options.title,
    defaultPath: current || undefined,
    filters: options.directory || !options.extensions
      ? undefined
      : [{ name: options.title, extensions: options.extensions }],
  });
  if (typeof selected !== 'string') return null;
  setLocalRuntimePath(key, selected);
  return selected;
}
