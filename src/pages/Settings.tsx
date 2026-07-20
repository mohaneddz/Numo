import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    User, Globe, Palette, Volume2, HardDrive, Download, Shield, Accessibility, Monitor, Brain, Youtube,
    FolderCog, Wifi, WifiOff, CheckCircle2
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { PageActions, PageContent } from '../components/layout/PageLayout';
import { readKeyboardShortcutsEnabled, writeKeyboardShortcutsEnabled } from '../config/preferences';
import { DropdownSelect } from '../components/ui/DropdownSelect';
import { saveToDummyDataFile } from '../utils/saveDisk';
import { initializePersistence } from '../persistence';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurriculum } from '../contexts/CurriculumContext';
import { useProfileSession } from '../contexts/ProfileSessionContext';
import { useAppData } from '../contexts/AppDataContext';
import { backgroundImageService } from '../services/backgrounds';
import type { BackgroundMappingPreview, BackgroundValidationResult } from '../services/backgrounds';
import { aiConfig } from '../config/aiConfig';
import { validateYouTubeApiKey } from '../services/youtubeService';
import { clearImmersionContentCaches } from '../services/mediaAssetCache';
import {
    chooseBooksFolder,
    getBooksFolder,
    getLocalBooks,
    scanBooksFolder,
} from '../services/localBookService';
import {
    chooseLocalRuntimePath,
    readLocalRuntimeSettings,
    setConnectivityMode,
    setLocalRuntimePath,
    isOnlineMode,
    type LocalRuntimePathKey,
} from '../services/localRuntimeSettings';
import { mirrorNotebookEntry } from '../services/noteMirrorService';

interface SettingItem {
    label: string;
    description: string;
    type: 'select' | 'toggle' | 'info' | 'secret' | 'media-cache' | 'groq-apis' | 'books-folder' | 'connectivity-mode' | 'local-path';
    value: string | boolean | string[];
    options?: string[];
    pathKey?: LocalRuntimePathKey;
    directory?: boolean;
    extensions?: string[];
}

interface SettingsSection {
    id: string;
    title: string;
    icon: typeof User;
    color: string;
    settings: SettingItem[];
}

const settingsSections: SettingsSection[] = [
    {
        id: 'profile', title: 'Profile', icon: User, color: '#8B5CF6',
        settings: [
            { label: 'Display Name', description: 'Your name as shown in the app', type: 'info', value: 'Alex' },
            { label: 'Native Language', description: 'Your first language', type: 'select', value: 'English', options: ['English', 'French', 'German', 'Arabic', 'Chinese'] },
        ],
    },
    {
        id: 'target-language', title: 'Target Language', icon: Globe, color: '#0ea5e9',
        settings: [
            { label: 'Language', description: 'The language you are learning', type: 'select', value: 'Spanish', options: ['Spanish', 'French', 'German', 'Japanese', 'Portuguese'] },
            { label: 'Dialect', description: 'Preferred dialect or regional variant', type: 'select', value: 'Latin American', options: ['Latin American', 'Castilian', 'Mexican', 'Argentine'] },
            { label: 'Level', description: 'Your current proficiency level', type: 'select', value: 'Intermediate', options: ['Beginner', 'Elementary', 'Intermediate', 'Upper Intermediate', 'Advanced'] },
        ],
    },
    {
        id: 'appearance', title: 'Appearance', icon: Palette, color: '#10b981',
        settings: [
            { label: 'Theme', description: 'Select your preferred visual style', type: 'select', value: 'Midnight Signal', options: ['Midnight Signal', 'Deep Ocean', 'Forest Night', 'Light Mode'] },
            { label: 'Font Size', description: 'Adjust text size throughout the app', type: 'select', value: 'Medium', options: ['Small', 'Medium', 'Large', 'Extra Large'] },
            { label: 'Animations', description: 'Enable subtle motion effects', type: 'toggle', value: true },
        ],
    },
    {
        id: 'audio', title: 'Audio & Microphone', icon: Volume2, color: '#f59e0b',
        settings: [
            { label: 'Input Device', description: 'Microphone for speaking exercises', type: 'select', value: 'Default Microphone', options: ['Default Microphone', 'External Mic'] },
            { label: 'Audio Output', description: 'Speaker or headphone output', type: 'select', value: 'Default Speakers', options: ['Default Speakers', 'Headphones'] },
            { label: 'Auto-play Audio', description: 'Automatically play example audio', type: 'toggle', value: true },
            { label: 'Speech Speed', description: 'Default playback speed for audio', type: 'select', value: 'Normal', options: ['Slow', 'Normal', 'Fast'] },
        ],
    },
    {
        id: 'storage', title: 'Storage', icon: HardDrive, color: '#0ea5e9',
        settings: [
            { label: 'Data Location', description: 'Where your learning data is stored', type: 'info', value: 'C:\\Users\\Alex\\AppData\\Numo' },
            {
                label: 'Books Folder',
                description: 'EPUB and TXT books in this folder are imported into Immersion → Readings.',
                type: 'books-folder',
                value: '',
            },
            { label: 'Used Space', description: 'Total space used by the app', type: 'info', value: '148 MB' },
            { label: 'Cache Size', description: 'Temporary files and media cache', type: 'info', value: '23 MB' },
        ],
    },
    {
        id: 'backup', title: 'Backup & Export', icon: Download, color: '#10b981',
        settings: [
            { label: 'Auto Backup', description: 'Automatically back up learning data weekly', type: 'toggle', value: true },
            { label: 'Export Format', description: 'File format for data export', type: 'select', value: 'JSON', options: ['JSON', 'CSV', 'Both'] },
        ],
    },
    {
        id: 'privacy', title: 'Privacy', icon: Shield, color: '#ef4444',
        settings: [
            { label: 'Recording Consent', description: 'Show notice before microphone recording', type: 'toggle', value: true },
            { label: 'Analytics', description: 'Help improve the app with anonymous usage data', type: 'toggle', value: false },
            { label: 'Crash Reports', description: 'Send crash reports to help fix bugs', type: 'toggle', value: true },
        ],
    },
    {
        id: 'accessibility', title: 'Accessibility', icon: Accessibility, color: '#f59e0b',
        settings: [
            { label: 'High Contrast', description: 'Increase contrast for better visibility', type: 'toggle', value: false },
            { label: 'Reduce Motion', description: 'Minimize animations and transitions', type: 'toggle', value: false },
            { label: 'Screen Reader', description: 'Optimize layout for screen readers', type: 'toggle', value: false },
        ],
    },
    {
        id: 'models', title: 'Models & Storage', icon: FolderCog, color: '#a78bfa',
        settings: [
            {
                label: 'Connection Mode',
                description: 'Online uses configured cloud providers and connected media services. Offline blocks remote AI and uses only the local tools below.',
                type: 'connectivity-mode',
                value: readLocalRuntimeSettings().connectivityMode,
            },
            {
                label: 'LLM Runner',
                description: 'The llama.cpp command-line executable used to run the local language model.',
                type: 'local-path',
                value: readLocalRuntimeSettings().paths.llmExecutable,
                pathKey: 'llmExecutable',
                extensions: ['exe'],
            },
            {
                label: 'Local LLM',
                description: 'A GGUF language model used for Chat, generation, explanations, and evaluation while offline.',
                type: 'local-path',
                value: readLocalRuntimeSettings().paths.llmModel,
                pathKey: 'llmModel',
                extensions: ['gguf'],
            },
            {
                label: 'Whisper Runner',
                description: 'The whisper.cpp command-line executable used for local speech recognition.',
                type: 'local-path',
                value: readLocalRuntimeSettings().paths.whisperExecutable,
                pathKey: 'whisperExecutable',
                extensions: ['exe'],
            },
            {
                label: 'Whisper Model',
                description: 'The local whisper.cpp model used to transcribe speaking exercises.',
                type: 'local-path',
                value: readLocalRuntimeSettings().paths.whisperModel,
                pathKey: 'whisperModel',
                extensions: ['bin'],
            },
            {
                label: 'FFmpeg',
                description: 'FFmpeg converts microphone recordings to the 16 kHz WAV input expected by local Whisper.',
                type: 'local-path',
                value: readLocalRuntimeSettings().paths.ffmpegExecutable,
                pathKey: 'ffmpegExecutable',
                extensions: ['exe'],
            },
            {
                label: 'Piper Runner',
                description: 'The Piper executable used for fully local text-to-speech.',
                type: 'local-path',
                value: readLocalRuntimeSettings().paths.piperExecutable,
                pathKey: 'piperExecutable',
                extensions: ['exe'],
            },
            {
                label: 'Active Voice Model',
                description: 'The Piper ONNX voice currently used for local speech generation.',
                type: 'local-path',
                value: readLocalRuntimeSettings().paths.piperVoiceModel,
                pathKey: 'piperVoiceModel',
                extensions: ['onnx'],
            },
            {
                label: 'Voices Folder',
                description: 'Folder for downloaded Piper voice models and their matching JSON configuration files.',
                type: 'local-path',
                value: readLocalRuntimeSettings().paths.voicesFolder,
                pathKey: 'voicesFolder',
                directory: true,
            },
            {
                label: 'Notes Folder',
                description: 'Folder where learner notes can be written as Markdown and JSON alongside the app database.',
                type: 'local-path',
                value: readLocalRuntimeSettings().paths.notesFolder,
                pathKey: 'notesFolder',
                directory: true,
            },
        ],
    },
    {
        id: 'ai', title: 'AI Providers', icon: Brain, color: '#22c55e',
        settings: [
            { label: 'GROQ APIs', description: 'Add one or more GROQ API keys and validate LLM/STT/TTS access.', type: 'groq-apis', value: [] },
        ],
    },
    {
        id: 'integrations', title: 'Media Integrations', icon: Youtube, color: '#ef4444',
        settings: [
            {
                label: 'YouTube API Key',
                description: 'YouTube Data API v3 key used for real video/audio discovery, thumbnails, metadata, and streaming sources in Immersion.',
                type: 'secret',
                value: '',
            },
            {
                label: 'YouTube Region',
                description: 'Region used to improve YouTube resource relevance.',
                type: 'select',
                value: 'US',
                options: ['US', 'GB', 'CA', 'AU', 'ES', 'MX', 'AR'],
            },
            {
                label: 'Immersion Media Cache',
                description: 'Thumbnails, covers, artwork, book text, and provider metadata are cached and pruned automatically.',
                type: 'media-cache',
                value: 'Managed automatically',
            },
        ],
    },
    {
        id: 'desktop', title: 'Desktop Preferences', icon: Monitor, color: '#8b5cf6',
        settings: [
            { label: 'Start with System', description: 'Launch Numo when your computer starts', type: 'toggle', value: false },
            { label: 'Minimize to Tray', description: 'Keep running in the system tray when closed', type: 'toggle', value: true },
            { label: 'Keyboard Shortcuts', description: 'Enable global keyboard shortcuts', type: 'toggle', value: true },
        ],
    },
];

const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) => (
    <button 
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-purple-500' : 'bg-white/10'}`}
        role="switch"
        aria-checked={checked}
    >
        <span 
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-1'}`}
        />
    </button>
);

function createProbeWavFile(): File {
    const sampleRate = 16000;
    const durationSeconds = 1;
    const channelCount = 1;
    const bitsPerSample = 16;
    const totalSamples = sampleRate * durationSeconds;
    const dataSize = totalSamples * channelCount * (bitsPerSample / 8);
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeText = (offset: number, value: string) => {
        for (let i = 0; i < value.length; i += 1) {
            view.setUint8(offset + i, value.charCodeAt(i));
        }
    };

    writeText(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeText(8, 'WAVE');
    writeText(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channelCount, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channelCount * (bitsPerSample / 8), true);
    view.setUint16(32, channelCount * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    writeText(36, 'data');
    view.setUint32(40, dataSize, true);

    let pcmOffset = 44;
    const frequency = 220;
    const amplitude = 0.18;
    for (let sampleIndex = 0; sampleIndex < totalSamples; sampleIndex += 1) {
        const angle = (2 * Math.PI * frequency * sampleIndex) / sampleRate;
        const sample = Math.sin(angle) * amplitude;
        const clamped = Math.max(-1, Math.min(1, sample));
        view.setInt16(pcmOffset, clamped * 0x7fff, true);
        pcmOffset += 2;
    }

    return new File([buffer], 'probe.wav', { type: 'audio/wav' });
}

export default function SettingsPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const SETTINGS_STORAGE_KEY = 'noema_settings_state_v1';
    const SETTINGS_LOG_KEY = 'noema_settings_log_v1';
    const [activeTabId, setActiveTabId] = useState<string>('profile');
    const [status, setStatus] = useState<string | null>(null);
    const [bgBusy, setBgBusy] = useState<string | null>(null);
    const [bgMappings, setBgMappings] = useState<BackgroundMappingPreview[]>([]);
    const [bgValidation, setBgValidation] = useState<BackgroundValidationResult | null>(null);
    const [bgCacheFiles, setBgCacheFiles] = useState(0);
    const [groqCheckStatus, setGroqCheckStatus] = useState<Record<number, { tone: 'ok' | 'warn' | 'error' | 'info'; message: string }>>({});
    const [youtubeCheckStatus, setYoutubeCheckStatus] = useState<{ tone: 'ok' | 'error' | 'info'; message: string } | null>(null);
    const [booksFolder, setBooksFolder] = useState(getBooksFolder);
    const [localBookCount, setLocalBookCount] = useState(() => getLocalBooks().length);
    const [booksFolderBusy, setBooksFolderBusy] = useState(false);
    const [pathBusy, setPathBusy] = useState<string | null>(null);
    const [pathStatus, setPathStatus] = useState<Record<string, { ok: boolean; message: string }>>({});
    const { clearActiveProfile, refresh: refreshProfileSession } = useProfileSession();
    const { state: appDataState } = useAppData();
    const { activeLanguage } = useLanguage();
    const { recommendedCards } = useCurriculum();

    useEffect(() => {
        const tabOpt = searchParams.get('tab');
        if (tabOpt) {
            setActiveTabId(tabOpt === 'export' ? 'backup' : tabOpt);
            // clear the tab param if we want, or keep it.
        }
    }, [searchParams]);
    
    // In a real app we'd manage this state in a context or global store
    const [settingsState, setSettingsState] = useState<Record<string, Record<string, any>>>(() => {
        let savedState: Record<string, Record<string, any>> = {};
        const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (saved) {
            try {
                savedState = JSON.parse(saved) as Record<string, Record<string, any>>;
            } catch {
                // ignore corrupted storage and use defaults
            }
        }
        const initialState: Record<string, Record<string, any>> = {};
        settingsSections.forEach(section => {
            initialState[section.id] = {};
            section.settings.forEach(setting => {
                if (section.id === 'desktop' && setting.label === 'Keyboard Shortcuts') {
                    initialState[section.id][setting.label] =
                        savedState[section.id]?.[setting.label] ?? readKeyboardShortcutsEnabled();
                } else {
                    initialState[section.id][setting.label] =
                        savedState[section.id]?.[setting.label] ?? setting.value;
                }
            });
        });
        return initialState;
    });
    const [actionLog, setActionLog] = useState<Array<{ section: string; label: string; value: string; at: string }>>(() => {
        try {
            const parsed = JSON.parse(localStorage.getItem(SETTINGS_LOG_KEY) || '[]') as Array<{ section: string; label: string; value: string; at: string }>;
            if (!Array.isArray(parsed)) return [];
            const sanitized = parsed.map((entry) =>
                entry.label === 'GROQ APIs' || entry.label.toLowerCase().includes('api key')
                    ? { ...entry, value: '••••••••' }
                    : entry,
            );
            localStorage.setItem(SETTINGS_LOG_KEY, JSON.stringify(sanitized));
            return sanitized;
        } catch {
            return [];
        }
    });

    const activeSection = settingsSections.find(s => s.id === activeTabId) || settingsSections[0];

    useEffect(() => {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsState));
    }, [settingsState]);

    const updateSetting = (sectionId: string, label: string, value: any) => {
        if (sectionId === 'desktop' && label === 'Keyboard Shortcuts') {
            writeKeyboardShortcutsEnabled(Boolean(value));
        }
        if (sectionId === 'models' && label === 'Connection Mode') {
            setConnectivityMode(value === 'offline' ? 'offline' : 'online');
        }
        if (sectionId === 'models') {
            const pathSetting = settingsSections
                .find((section) => section.id === 'models')
                ?.settings.find((setting) => setting.label === label);
            if (pathSetting?.pathKey) {
                setLocalRuntimePath(pathSetting.pathKey, String(value ?? ''));
            }
        }
        setSettingsState(prev => ({
            ...prev,
            [sectionId]: {
                ...prev[sectionId],
                [label]: value
            }
        }));
        const entry = {
            section: sectionId,
            label,
            value:
                label.toLowerCase().includes('api key') || label === 'GROQ APIs'
                    ? '••••••••'
                    : String(value),
            at: new Date().toISOString(),
        };
        setActionLog((prev) => {
            const next = [entry, ...prev].slice(0, 30);
            localStorage.setItem(SETTINGS_LOG_KEY, JSON.stringify(next));
            return next;
        });
        setStatus(`Saved "${label}" in ${sectionId}.`);
    };

    const chooseConfiguredPath = async (setting: SettingItem) => {
        if (!setting.pathKey) return;
        setPathBusy(setting.label);
        setPathStatus((previous) => {
            const next = { ...previous };
            delete next[setting.label];
            return next;
        });
        try {
            const selected = await chooseLocalRuntimePath(setting.pathKey, {
                title: `Choose ${setting.label}`,
                directory: setting.directory,
                extensions: setting.extensions,
            });
            if (!selected) return;
            updateSetting('models', setting.label, selected);
            setPathStatus((previous) => ({
                ...previous,
                [setting.label]: { ok: true, message: 'Path selected and saved.' },
            }));
        } catch (error) {
            setPathStatus((previous) => ({
                ...previous,
                [setting.label]: {
                    ok: false,
                    message: error instanceof Error ? error.message : 'Could not choose this path.',
                },
            }));
        } finally {
            setPathBusy(null);
        }
    };

    const validateConfiguredPath = async (setting: SettingItem) => {
        const path = String(settingsState.models?.[setting.label] ?? '').trim();
        if (!path) {
            setPathStatus((previous) => ({
                ...previous,
                [setting.label]: { ok: false, message: 'Choose a path first.' },
            }));
            return;
        }
        setPathBusy(setting.label);
        try {
            await invoke<string>('validate_local_path', {
                path,
                kind: setting.directory ? 'directory' : 'file',
                extensions: setting.extensions ?? [],
            });
            setPathStatus((previous) => ({
                ...previous,
                [setting.label]: { ok: true, message: 'Path is valid and accessible.' },
            }));
        } catch (error) {
            setPathStatus((previous) => ({
                ...previous,
                [setting.label]: {
                    ok: false,
                    message: typeof error === 'string' ? error : 'Path validation failed.',
                },
            }));
        } finally {
            setPathBusy(null);
        }
    };

    const readGroqApis = (): string[] => {
        const value = settingsState.ai?.['GROQ APIs'];
        if (!Array.isArray(value)) return [];
        return value.map((entry) => String(entry ?? ''));
    };

    const writeGroqApis = (next: string[]) => {
        updateSetting('ai', 'GROQ APIs', next);
    };

    const checkYouTubeApi = async () => {
        if (!isOnlineMode()) {
            setYoutubeCheckStatus({ tone: 'error', message: 'Switch to Online mode before validating YouTube.' });
            return;
        }
        const apiKey = String(settingsState.integrations?.['YouTube API Key'] ?? '').trim();
        if (!apiKey) {
            setYoutubeCheckStatus({ tone: 'error', message: 'Add a YouTube Data API v3 key first.' });
            return;
        }
        setYoutubeCheckStatus({ tone: 'info', message: 'Checking YouTube Data API access...' });
        try {
            const message = await validateYouTubeApiKey(apiKey);
            setYoutubeCheckStatus({ tone: 'ok', message });
        } catch (error) {
            setYoutubeCheckStatus({
                tone: 'error',
                message: error instanceof Error ? error.message : 'YouTube API validation failed.',
            });
        }
    };

    const setGroqApiAt = (index: number, value: string) => {
        const current = readGroqApis();
        const next = [...current];
        next[index] = value;
        writeGroqApis(next);
        setGroqCheckStatus((prev) => ({
            ...prev,
            [index]: { tone: 'info', message: 'Edited. Click check to validate this key.' },
        }));
    };

    const addGroqApi = () => {
        const current = readGroqApis();
        writeGroqApis([...current, '']);
    };

    const detectQuotaIssue = (statusCode: number | undefined, message: string): boolean => {
        if (statusCode === 429) return true;
        const normalized = message.toLowerCase();
        return normalized.includes('quota') || normalized.includes('rate limit') || normalized.includes('limit reached');
    };

    const postJsonWithKey = async (url: string, apiKey: string, body: unknown) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        return response;
    };

    const parseErrorMessage = async (response: Response): Promise<string> => {
        try {
            const data = await response.json() as { error?: { message?: string } };
            return data.error?.message?.trim() || `HTTP ${response.status}`;
        } catch {
            return `HTTP ${response.status}`;
        }
    };

    const checkGroqApi = async (index: number) => {
        if (!isOnlineMode()) {
            setGroqCheckStatus((prev) => ({
                ...prev,
                [index]: { tone: 'error', message: 'Switch to Online mode before validating cloud providers.' },
            }));
            return;
        }
        const configuredApiKey = readGroqApis()[index]?.trim() ?? '';
        const apiKey = configuredApiKey || aiConfig.apiKey.trim();
        if (!apiKey) {
            setGroqCheckStatus((prev) => ({ ...prev, [index]: { tone: 'error', message: 'API key is empty. Add one or set `VITE_GROQ_API_KEY` in `.env`.' } }));
            return;
        }

        setGroqCheckStatus((prev) => ({ ...prev, [index]: { tone: 'info', message: 'Checking LLM/STT/TTS...' } }));

        const base = aiConfig.baseUrl.replace(/\/+$/, '');
        const llmUrl = `${base}/chat/completions`;
        const sttUrl = `${base}/audio/transcriptions`;
        const ttsUrl = `${base}/audio/speech`;

        const checks = {
            llm: { ok: false, quota: false, error: '' },
            stt: { ok: false, quota: false, error: '' },
            tts: { ok: false, quota: false, error: '' },
        };

        try {
            const llmResponse = await postJsonWithKey(llmUrl, apiKey, {
                model: aiConfig.models.chat,
                messages: [{ role: 'user', content: 'ping' }],
                max_tokens: 4,
                temperature: 0,
            });
            if (llmResponse.ok) {
                checks.llm.ok = true;
            } else {
                const message = await parseErrorMessage(llmResponse);
                checks.llm.error = message;
                checks.llm.quota = detectQuotaIssue(llmResponse.status, message);
            }
        } catch (error) {
            checks.llm.error = error instanceof Error ? error.message : 'Request failed';
        }

        try {
            const formData = new FormData();
            formData.append('model', aiConfig.models.stt);
            formData.append('language', 'en');
            formData.append('file', createProbeWavFile());
            const sttResponse = await fetch(sttUrl, {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiKey}` },
                body: formData,
            });
            if (sttResponse.ok) {
                checks.stt.ok = true;
            } else {
                const message = await parseErrorMessage(sttResponse);
                checks.stt.error = message;
                checks.stt.quota = detectQuotaIssue(sttResponse.status, message);
            }
        } catch (error) {
            checks.stt.error = error instanceof Error ? error.message : 'Request failed';
        }

        try {
            const ttsResponse = await postJsonWithKey(ttsUrl, apiKey, {
                model: aiConfig.models.tts,
                voice: aiConfig.models.ttsVoice,
                input: 'test',
                response_format: 'wav',
            });
            if (ttsResponse.ok) {
                checks.tts.ok = true;
            } else {
                const message = await parseErrorMessage(ttsResponse);
                checks.tts.error = message;
                checks.tts.quota = detectQuotaIssue(ttsResponse.status, message);
            }
        } catch (error) {
            checks.tts.error = error instanceof Error ? error.message : 'Request failed';
        }

        const modalities = ['llm', 'stt', 'tts'] as const;
        const failed = modalities.filter((modality) => !checks[modality].ok);
        const quotaHit = failed.some((modality) => checks[modality].quota);

        if (failed.length === 0) {
            setGroqCheckStatus((prev) => ({
                ...prev,
                [index]: { tone: 'ok', message: 'Working: LLM, STT, and TTS are all available.' },
            }));
            return;
        }

        const failedSummary = failed.map((modality) => modality.toUpperCase()).join(', ');
        const details = failed.map((modality) => `${modality.toUpperCase()}: ${checks[modality].error || 'Failed'}`).join(' | ');

        setGroqCheckStatus((prev) => ({
            ...prev,
            [index]: {
                tone: quotaHit ? 'warn' : 'error',
                message: quotaHit
                    ? `Quota/limit detected (${failedSummary}). ${details}`
                    : `Check failed (${failedSummary}). ${details}`,
            },
        }));
    };

    const handleExportSettings = () => {
        const payload = {
            exportedAt: new Date().toISOString(),
            settings: settingsState,
            actionLog,
        };
        saveToDummyDataFile('noema-settings-export.json', JSON.stringify(payload, null, 2));
        setStatus('Settings export generated.');
    };

    const latestLog = useMemo(() => actionLog[0], [actionLog]);

    const refreshBackgroundDiagnostics = async () => {
        const [mappings, validation, stats] = await Promise.all([
            backgroundImageService.listMappings(24),
            backgroundImageService.validateCache(),
            backgroundImageService.getCacheStats(),
        ]);
        setBgMappings(mappings);
        setBgValidation(validation);
        setBgCacheFiles(stats.files);
    };

    useEffect(() => {
        void refreshBackgroundDiagnostics();
    }, []);

    const runBackgroundAction = async (actionKey: string, action: () => Promise<void>) => {
        setBgBusy(actionKey);
        try {
            await action();
            await refreshBackgroundDiagnostics();
            setStatus(`Background action "${actionKey}" completed.`);
        } catch (error) {
            setStatus(error instanceof Error ? error.message : 'Background action failed.');
        } finally {
            setBgBusy(null);
        }
    };

    const handleClearAllData = async () => {
        const firstConfirm = window.confirm('This will permanently delete everything on this device: all profiles/accounts, courses, progress, reviews, content, cache, and local settings. Continue?');
        if (!firstConfirm) return;
        const secondConfirm = window.confirm('Final confirmation: delete the account and sign out now?');
        if (!secondConfirm) return;

        setBgBusy('clear_all_data');
        try {
            await clearActiveProfile();
            await backgroundImageService.clearCache();
            const persistence = await initializePersistence();
            const db = persistence.db;
            const tables = await db.select<{ name: string }>(
                `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> 'schema_migrations';`,
            );

            await db.execute('PRAGMA foreign_keys = OFF;');
            for (const table of tables) {
                const safeTableName = table.name.replace(/"/g, '""');
                await db.execute(`DELETE FROM "${safeTableName}";`);
            }
            await db.execute('PRAGMA foreign_keys = ON;');
            await db.execute('VACUUM;');

            localStorage.clear();
            sessionStorage.clear();
            await refreshProfileSession();
            setStatus('Everything deleted. Signed out.');
            window.setTimeout(() => {
                navigate('/login', { replace: true });
            }, 150);
        } catch (error) {
            setStatus(error instanceof Error ? error.message : 'Failed to clear local data.');
        } finally {
            setBgBusy(null);
        }
    };

    return (
        <PageContent width="wide" className="h-full pb-10">
            <PageActions>
                <button className="page-primary-action" onClick={handleExportSettings}>
                    <Download size={16} /> Export Settings
                </button>
                <button
                    className="page-primary-action !bg-rose-600/20 !border-rose-500/40 !text-rose-200 hover:!bg-rose-600/30"
                    onClick={() => void handleClearAllData()}
                    disabled={Boolean(bgBusy)}
                >
                    Clear All Data
                </button>
            </PageActions>
        <div className="flex h-full w-full bg-transparent overflow-hidden text-gray-200">
            {/* Sidebar */}
            <div className="w-72 lg:w-80 flex-shrink-0 border-r border-white/5 flex flex-col pt-2">
                <div className="flex-1 overflow-y-auto pt-6 pb-8 px-6 scrollbar-hide space-y-2">
                    {settingsSections.map((section) => {
                        const Icon = section.icon;
                        const isActive = activeTabId === section.id;
                        
                        return (
                            <button
                                key={section.id}
                                onClick={() => setActiveTabId(section.id)}
                                className={`w-full flex items-center gap-4 px-4 py-3 text-base rounded-xl transition-colors ${
                                    isActive 
                                        ? 'bg-white/10 text-white font-medium shadow-sm'
                                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                                }`}
                            >
                                <Icon 
                                    size={20} 
                                    className={`${isActive ? 'text-white' : 'text-gray-500'}`}
                                />
                                {section.title}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto scrollbar-default">
                <div className="max-w-4xl 2xl:max-w-5xl mx-auto py-12 px-10 xl:px-16">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTabId}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.15 }}
                        >
                            <div className="mb-10">
                                <h2 className="text-3xl font-semibold text-white tracking-tight leading-none mb-3">
                                    {activeSection.title}
                                </h2>
                                <p className="text-base text-gray-400">
                                    Manage your {activeSection.title.toLowerCase()} preferences and related settings.
                                </p>
                                {status && (
                                    <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-300">
                                        {status}
                                    </p>
                                )}
                                {latestLog && (
                                    <p className="mt-2 text-[12px] text-dim">
                                        Last action: <span className="text-mist">{latestLog.label}</span> = <span className="text-mist">{latestLog.value}</span>
                                    </p>
                                )}
                            </div>

                            <div className={`${activeTabId === 'appearance' ? '' : 'hidden'} mb-8 rounded-2xl border border-white/10 bg-[#0a1222]/60 p-5`}>
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-[16px] font-bold text-white">Background Image Pipeline (Internal)</h3>
                                        <p className="text-[12px] text-dim">
                                            Cached files: {bgCacheFiles} • Mappings: {bgMappings.length} • Missing: {bgValidation?.missing.length ?? 0}
                                        </p>
                                    </div>
                                    <button
                                        className="rounded-lg border border-white/15 px-3 py-1.5 text-[12px] text-mist hover:bg-white/5"
                                        onClick={() => void refreshBackgroundDiagnostics()}
                                        disabled={Boolean(bgBusy)}
                                    >
                                        Refresh Diagnostics
                                    </button>
                                </div>
                                <div className="mb-4 flex flex-wrap gap-2">
                                    <button
                                        className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-[12px] text-cyan-200 disabled:opacity-50"
                                        disabled={Boolean(bgBusy)}
                                        onClick={() =>
                                            void runBackgroundAction('prefetch', async () => {
                                                await backgroundImageService.prefetchLikelyLanguageCards({
                                                    languageCode: activeLanguage.code,
                                                    languageName: activeLanguage.name,
                                                    continueLearning: activeLanguage.continueLearning,
                                                    recommended: recommendedCards.map((card) => ({
                                                        id: card.id,
                                                        title: card.title,
                                                        description: card.description,
                                                        type: card.type,
                                                    })),
                                                    includeGeneric: true,
                                                });
                                            })
                                        }
                                    >
                                        Prefetch Likely Backgrounds
                                    </button>
                                    <button
                                        className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-[12px] text-indigo-200 disabled:opacity-50"
                                        disabled={Boolean(bgBusy)}
                                        onClick={() => void runBackgroundAction('regenerate_all', async () => { await backgroundImageService.regenerateAll(); })}
                                    >
                                        Regenerate All Mappings
                                    </button>
                                    <button
                                        className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[12px] text-amber-200 disabled:opacity-50"
                                        disabled={Boolean(bgBusy)}
                                        onClick={() => void runBackgroundAction('validate', async () => { await backgroundImageService.validateCache(); })}
                                    >
                                        Validate References
                                    </button>
                                    <button
                                        className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[12px] text-rose-200 disabled:opacity-50"
                                        disabled={Boolean(bgBusy)}
                                        onClick={() => void runBackgroundAction('clear_cache', async () => { await backgroundImageService.clearCache(); })}
                                    >
                                        Clear Background Cache
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {bgMappings.map((mapping) => (
                                        <div key={mapping.itemKey} className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                                            <div className="relative h-24 w-full">
                                                <img src={mapping.source} alt={mapping.itemKey} className="h-full w-full object-cover" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#0b1020]/90 to-transparent" />
                                                <div className="absolute bottom-1 left-2 right-2 truncate text-[10px] text-mist">{mapping.itemType}</div>
                                            </div>
                                            <div className="p-2">
                                                <p className="truncate text-[11px] text-mist">{mapping.itemKey}</p>
                                                <p className="truncate text-[10px] text-dim">{mapping.attributionText}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-sm">
                                {activeSection.settings.map((setting, index) => (
                                    <div 
                                        key={setting.label}
                                        className={`flex items-center justify-between p-6 lg:p-8 ${index !== activeSection.settings.length - 1 ? 'border-b border-white/5' : ''}`}
                                    >
                                        <div className="flex-1 pr-8">
                                            <h3 className="text-base font-medium text-gray-200 mb-1">{setting.label}</h3>
                                            <p className="text-sm text-gray-500 leading-relaxed">{setting.description}</p>
                                        </div>
                                        
                                        <div className="flex-shrink-0">
                                            {setting.type === 'select' && (
                                                <DropdownSelect
                                                    value={settingsState[activeSection.id][setting.label] as string}
                                                    onChange={(next) => updateSetting(activeSection.id, setting.label, next)}
                                                    options={(setting.options ?? []).map((opt) => ({ value: opt, label: opt }))}
                                                    triggerClassName="rounded-xl h-[42px] px-4 text-base text-gray-200"
                                                />
                                            )}
                                            {setting.type === 'toggle' && (
                                                <ToggleSwitch 
                                                    checked={settingsState[activeSection.id][setting.label] as boolean} 
                                                    onChange={(val) => updateSetting(activeSection.id, setting.label, val)} 
                                                />
                                            )}
                                            {setting.type === 'connectivity-mode' && (() => {
                                                const online = settingsState.models?.['Connection Mode'] !== 'offline';
                                                return (
                                                    <div className="flex min-w-[300px] items-center justify-end gap-3">
                                                        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-bold ${
                                                            online
                                                                ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
                                                                : 'border-amber-400/25 bg-amber-400/10 text-amber-200'
                                                        }`}>
                                                            {online ? <Wifi size={15} /> : <WifiOff size={15} />}
                                                            {online ? 'Online' : 'Offline'}
                                                        </div>
                                                        <ToggleSwitch
                                                            checked={online}
                                                            onChange={(enabled) =>
                                                                updateSetting('models', 'Connection Mode', enabled ? 'online' : 'offline')
                                                            }
                                                        />
                                                    </div>
                                                );
                                            })()}
                                            {setting.type === 'local-path' && (() => {
                                                const selectedPath = String(settingsState.models?.[setting.label] ?? '');
                                                const check = pathStatus[setting.label];
                                                const busy = pathBusy === setting.label;
                                                return (
                                                    <div className="w-[min(560px,48vw)] min-w-[340px]">
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                title={selectedPath || 'Not configured'}
                                                                className="min-w-0 flex-1 truncate rounded-xl border border-white/10 bg-black/20 px-3 py-3 font-mono text-[11px] text-gray-300"
                                                            >
                                                                {selectedPath || 'Not configured'}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => void chooseConfiguredPath(setting)}
                                                                className="h-[42px] rounded-xl border border-violet-400/30 bg-violet-400/10 px-4 text-sm font-bold text-violet-200 hover:bg-violet-400/20 disabled:opacity-50"
                                                            >
                                                                Choose
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={!selectedPath || busy}
                                                                onClick={() => void validateConfiguredPath(setting)}
                                                                className="h-[42px] rounded-xl border border-white/15 px-3 text-sm font-bold text-gray-200 hover:bg-white/5 disabled:opacity-40"
                                                            >
                                                                Check
                                                            </button>
                                                            {setting.pathKey === 'notesFolder' && (
                                                                <button
                                                                    type="button"
                                                                    disabled={!selectedPath || busy}
                                                                    onClick={() => {
                                                                        setPathBusy(setting.label);
                                                                        void Promise.all(appDataState.notebookEntries.map(mirrorNotebookEntry))
                                                                            .then(() => {
                                                                                setPathStatus((previous) => ({
                                                                                    ...previous,
                                                                                    [setting.label]: {
                                                                                        ok: true,
                                                                                        message: `${appDataState.notebookEntries.length} notebook entries mirrored as Markdown and JSON.`,
                                                                                    },
                                                                                }));
                                                                            })
                                                                            .catch((error) => {
                                                                                setPathStatus((previous) => ({
                                                                                    ...previous,
                                                                                    [setting.label]: {
                                                                                        ok: false,
                                                                                        message: error instanceof Error ? error.message : 'Notes sync failed.',
                                                                                    },
                                                                                }));
                                                                            })
                                                                            .finally(() => setPathBusy(null));
                                                                    }}
                                                                    className="h-[42px] rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 text-sm font-bold text-cyan-200 hover:bg-cyan-400/20 disabled:opacity-40"
                                                                >
                                                                    Sync
                                                                </button>
                                                            )}
                                                        </div>
                                                        {check && (
                                                            <p className={`mt-2 flex items-center gap-1.5 text-[11px] ${
                                                                check.ok ? 'text-emerald-300' : 'text-rose-300'
                                                            }`}>
                                                                {check.ok && <CheckCircle2 size={12} />}
                                                                {check.message}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                            {setting.type === 'info' && (
                                                <span className="text-base text-gray-400 font-mono bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                                                    {settingsState[activeSection.id][setting.label]}
                                                </span>
                                            )}
                                            {setting.type === 'secret' && (
                                                <div className="min-w-[380px]">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="password"
                                                            value={String(settingsState[activeSection.id][setting.label] ?? '')}
                                                            onChange={(event) => {
                                                                updateSetting(activeSection.id, setting.label, event.target.value);
                                                                setYoutubeCheckStatus(null);
                                                            }}
                                                            placeholder="YouTube Data API v3 key"
                                                            className="h-[42px] flex-1 rounded-xl border border-white/15 bg-[#0a1222]/80 px-3 text-sm text-gray-200 outline-none placeholder:text-gray-500 focus:border-red-400/60"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => void checkYouTubeApi()}
                                                            className="h-[42px] rounded-xl border border-red-500/30 bg-red-500/10 px-4 text-sm font-bold text-red-200 hover:bg-red-500/20"
                                                        >
                                                            Check
                                                        </button>
                                                    </div>
                                                    {youtubeCheckStatus && (
                                                        <p className={`mt-2 rounded-lg border px-2.5 py-2 text-[12px] leading-snug ${
                                                            youtubeCheckStatus.tone === 'ok'
                                                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                                                : youtubeCheckStatus.tone === 'error'
                                                                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                                                                    : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                                                        }`}>
                                                            {youtubeCheckStatus.message}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                            {setting.type === 'media-cache' && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        void clearImmersionContentCaches().then(() => {
                                                            setStatus('Immersion media and metadata caches cleared.');
                                                        });
                                                    }}
                                                    className="h-[42px] rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 text-sm font-bold text-amber-200 hover:bg-amber-500/20"
                                                >
                                                    Clear cache
                                                </button>
                                            )}
                                            {setting.type === 'books-folder' && (
                                                <div className="w-[min(520px,46vw)] min-w-[320px]">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            title={booksFolder || 'No folder selected'}
                                                            className="min-w-0 flex-1 truncate rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-[12px] text-gray-300"
                                                        >
                                                            {booksFolder || 'No folder selected'}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            disabled={booksFolderBusy}
                                                            onClick={() => {
                                                                setBooksFolderBusy(true);
                                                                void chooseBooksFolder()
                                                                    .then((folder) => {
                                                                        if (!folder) return;
                                                                        setBooksFolder(folder);
                                                                        const count = getLocalBooks().length;
                                                                        setLocalBookCount(count);
                                                                        setStatus(`Imported ${count} EPUB/TXT book${count === 1 ? '' : 's'} from the books folder.`);
                                                                    })
                                                                    .catch((error) => {
                                                                        setStatus(error instanceof Error ? error.message : 'Could not open the books folder.');
                                                                    })
                                                                    .finally(() => setBooksFolderBusy(false));
                                                            }}
                                                            className="h-[42px] rounded-xl border border-indigo-400/30 bg-indigo-400/10 px-4 text-sm font-bold text-indigo-200 hover:bg-indigo-400/20 disabled:opacity-50"
                                                        >
                                                            Choose
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={!booksFolder || booksFolderBusy}
                                                            onClick={() => {
                                                                setBooksFolderBusy(true);
                                                                void scanBooksFolder()
                                                                    .then((books) => {
                                                                        setLocalBookCount(books.length);
                                                                        setStatus(`Books folder refreshed: ${books.length} book${books.length === 1 ? '' : 's'} found.`);
                                                                    })
                                                                    .catch((error) => {
                                                                        setStatus(error instanceof Error ? error.message : 'Could not scan the books folder.');
                                                                    })
                                                                    .finally(() => setBooksFolderBusy(false));
                                                            }}
                                                            className="h-[42px] rounded-xl border border-white/15 px-4 text-sm font-bold text-gray-200 hover:bg-white/5 disabled:opacity-40"
                                                        >
                                                            Refresh
                                                        </button>
                                                    </div>
                                                    <p className="mt-2 text-[11px] text-gray-500">
                                                        {localBookCount} supported book{localBookCount === 1 ? '' : 's'} indexed
                                                    </p>
                                                </div>
                                            )}
                                            {setting.type === 'groq-apis' && (
                                                <div className="min-w-[380px] space-y-3">
                                                    {readGroqApis().map((apiValue, apiIndex) => {
                                                        const check = groqCheckStatus[apiIndex];
                                                        const toneClasses =
                                                            check?.tone === 'ok'
                                                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                                                : check?.tone === 'warn'
                                                                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                                                                    : check?.tone === 'error'
                                                                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                                                                        : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';

                                                        return (
                                                            <div key={`groq-api-${apiIndex}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="password"
                                                                        value={apiValue}
                                                                        onChange={(event) => setGroqApiAt(apiIndex, event.target.value)}
                                                                        placeholder={`GROQ API key #${apiIndex + 1}`}
                                                                        className="h-[40px] flex-1 rounded-lg border border-white/15 bg-[#0a1222]/80 px-3 text-sm text-gray-200 outline-none placeholder:text-gray-500 focus:border-cyan-400/60"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => void checkGroqApi(apiIndex)}
                                                                        className="h-[40px] rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 text-sm text-cyan-200 hover:bg-cyan-500/20"
                                                                    >
                                                                        Check
                                                                    </button>
                                                                </div>
                                                                {check && (
                                                                    <p className={`mt-2 rounded-lg border px-2.5 py-2 text-[12px] leading-snug ${toneClasses}`}>
                                                                        {check.message}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                    <button
                                                        type="button"
                                                        onClick={addGroqApi}
                                                        className="h-[38px] rounded-lg border border-white/15 px-3 text-sm text-gray-200 hover:bg-white/5"
                                                    >
                                                        Add New
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
        </PageContent>
    );
}
