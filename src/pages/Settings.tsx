import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Globe, Palette, Volume2, HardDrive, Download, Shield, Accessibility, Monitor
} from 'lucide-react';
import { PageActions, PageContent } from '../components/layout/PageLayout';
import { readKeyboardShortcutsEnabled, writeKeyboardShortcutsEnabled } from '../config/preferences';
import { DropdownSelect } from '../components/ui/DropdownSelect';
import { saveToDummyDataFile } from '../utils/saveDisk';

interface SettingItem {
    label: string;
    description: string;
    type: 'select' | 'toggle' | 'info';
    value: string | boolean;
    options?: string[];
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

export default function SettingsPage() {
    const SETTINGS_STORAGE_KEY = 'noema_settings_state_v1';
    const SETTINGS_LOG_KEY = 'noema_settings_log_v1';
    const [activeTabId, setActiveTabId] = useState<string>('profile');
    const [status, setStatus] = useState<string | null>(null);
    
    // In a real app we'd manage this state in a context or global store
    const [settingsState, setSettingsState] = useState<Record<string, Record<string, any>>>(() => {
        const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (saved) {
            try {
                return JSON.parse(saved) as Record<string, Record<string, any>>;
            } catch {
                // ignore corrupted storage and use defaults
            }
        }
        const initialState: Record<string, Record<string, any>> = {};
        settingsSections.forEach(section => {
            initialState[section.id] = {};
            section.settings.forEach(setting => {
                if (section.id === 'desktop' && setting.label === 'Keyboard Shortcuts') {
                    initialState[section.id][setting.label] = readKeyboardShortcutsEnabled();
                } else {
                    initialState[section.id][setting.label] = setting.value;
                }
            });
        });
        return initialState;
    });
    const [actionLog, setActionLog] = useState<Array<{ section: string; label: string; value: string; at: string }>>(() => {
        try {
            const parsed = JSON.parse(localStorage.getItem(SETTINGS_LOG_KEY) || '[]') as Array<{ section: string; label: string; value: string; at: string }>;
            return Array.isArray(parsed) ? parsed : [];
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
            value: String(value),
            at: new Date().toISOString(),
        };
        setActionLog((prev) => {
            const next = [entry, ...prev].slice(0, 30);
            localStorage.setItem(SETTINGS_LOG_KEY, JSON.stringify(next));
            return next;
        });
        setStatus(`Saved "${label}" in ${sectionId}.`);
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

    return (
        <PageContent width="wide" className="h-full pb-10">
            <PageActions>
                <button className="page-primary-action" onClick={handleExportSettings}>
                    <Download size={16} /> Export Settings
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
                                            {setting.type === 'info' && (
                                                <span className="text-base text-gray-400 font-mono bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                                                    {settingsState[activeSection.id][setting.label]}
                                                </span>
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
