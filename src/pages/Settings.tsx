import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    User, Globe, Palette, Volume2, HardDrive, Download, Shield, Accessibility, Monitor, ChevronRight
} from 'lucide-react';
import { SpotlightCard } from '../components/ui/SpotlightCard';

interface SettingItem {
    label: string;
    description: string;
    type: 'select' | 'toggle' | 'info';
    value: string | boolean;
    options?: string[];
}

interface SettingsSection {
    title: string;
    icon: typeof User;
    color: string;
    settings: SettingItem[];
}

const settingsSections: SettingsSection[] = [
    {
        title: 'Profile', icon: User, color: '#8B5CF6',
        settings: [
            { label: 'Display Name', description: 'Your name as shown in the app', type: 'info', value: 'Alex' },
            { label: 'Native Language', description: 'Your first language', type: 'select', value: 'English', options: ['English', 'French', 'German', 'Arabic', 'Chinese'] },
        ],
    },
    {
        title: 'Target Language', icon: Globe, color: '#22D3EE',
        settings: [
            { label: 'Language', description: 'The language you are learning', type: 'select', value: 'Spanish', options: ['Spanish', 'French', 'German', 'Japanese', 'Portuguese'] },
            { label: 'Dialect', description: 'Preferred dialect or regional variant', type: 'select', value: 'Latin American', options: ['Latin American', 'Castilian', 'Mexican', 'Argentine'] },
            { label: 'Level', description: 'Your current proficiency level', type: 'select', value: 'Intermediate', options: ['Beginner', 'Elementary', 'Intermediate', 'Upper Intermediate', 'Advanced'] },
        ],
    },
    {
        title: 'Appearance', icon: Palette, color: '#34D399',
        settings: [
            { label: 'Theme', description: 'Midnight Signal (Dark)', type: 'select', value: 'Midnight Signal', options: ['Midnight Signal', 'Deep Ocean', 'Forest Night'] },
            { label: 'Font Size', description: 'Adjust text size throughout the app', type: 'select', value: 'Medium', options: ['Small', 'Medium', 'Large', 'Extra Large'] },
            { label: 'Animations', description: 'Enable subtle motion effects', type: 'toggle', value: true },
        ],
    },
    {
        title: 'Audio & Microphone', icon: Volume2, color: '#F59E0B',
        settings: [
            { label: 'Input Device', description: 'Microphone for speaking exercises', type: 'select', value: 'Default Microphone', options: ['Default Microphone', 'External Mic'] },
            { label: 'Audio Output', description: 'Speaker or headphone output', type: 'select', value: 'Default Speakers', options: ['Default Speakers', 'Headphones'] },
            { label: 'Auto-play Audio', description: 'Automatically play example audio', type: 'toggle', value: true },
            { label: 'Speech Speed', description: 'Default playback speed for audio', type: 'select', value: 'Normal', options: ['Slow', 'Normal', 'Fast'] },
        ],
    },
    {
        title: 'Storage', icon: HardDrive, color: '#22D3EE',
        settings: [
            { label: 'Data Location', description: 'Where your learning data is stored', type: 'info', value: 'C:\\Users\\Alex\\AppData\\Numo' },
            { label: 'Used Space', description: 'Total space used by the app', type: 'info', value: '148 MB' },
            { label: 'Cache Size', description: 'Temporary files and media cache', type: 'info', value: '23 MB' },
        ],
    },
    {
        title: 'Backup & Export', icon: Download, color: '#34D399',
        settings: [
            { label: 'Auto Backup', description: 'Automatically back up learning data weekly', type: 'toggle', value: true },
            { label: 'Export Format', description: 'File format for data export', type: 'select', value: 'JSON', options: ['JSON', 'CSV', 'Both'] },
        ],
    },
    {
        title: 'Privacy', icon: Shield, color: '#F87171',
        settings: [
            { label: 'Recording Consent', description: 'Show notice before microphone recording', type: 'toggle', value: true },
            { label: 'Analytics', description: 'Help improve the app with anonymous usage data', type: 'toggle', value: false },
            { label: 'Crash Reports', description: 'Send crash reports to help fix bugs', type: 'toggle', value: true },
        ],
    },
    {
        title: 'Accessibility', icon: Accessibility, color: '#F59E0B',
        settings: [
            { label: 'High Contrast', description: 'Increase contrast for better visibility', type: 'toggle', value: false },
            { label: 'Reduce Motion', description: 'Minimize animations and transitions', type: 'toggle', value: false },
            { label: 'Screen Reader', description: 'Optimize layout for screen readers', type: 'toggle', value: false },
        ],
    },
    {
        title: 'Desktop Preferences', icon: Monitor, color: '#8B5CF6',
        settings: [
            { label: 'Start with System', description: 'Launch Numo when your computer starts', type: 'toggle', value: false },
            { label: 'Minimize to Tray', description: 'Keep running in the system tray when closed', type: 'toggle', value: true },
            { label: 'Keyboard Shortcuts', description: 'Enable global keyboard shortcuts', type: 'toggle', value: true },
        ],
    },
];

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

export default function SettingsPage() {
    const [expandedSection, setExpandedSection] = useState<string>('Profile');

    return (
        <div style={{ maxWidth: 800 }}>
            <motion.div {...fadeUp}>
                <p style={{ color: 'var(--color-dim)', fontSize: 14, marginBottom: 24 }}>
                    Customize your Numo experience.
                </p>
            </motion.div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {settingsSections.map((section, i) => {
                    const Icon = section.icon;
                    const isExpanded = expandedSection === section.title;

                    return (
                        <motion.div
                            key={section.title}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.04 + i * 0.03 }}
                        >
                            <SpotlightCard style={{ overflow: 'hidden', padding: 0 }}>
                                <button
                                    onClick={() => setExpandedSection(isExpanded ? '' : section.title)}
                                    style={{
                                        width: '100%', padding: '14px 18px',
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        background: 'transparent', border: 'none', cursor: 'pointer',
                                        color: 'var(--color-mist)', textAlign: 'left',
                                        transition: 'background 0.2s',
                                    }}
                                >
                                    <div style={{
                                        width: 36, height: 36, borderRadius: 10,
                                        background: `${section.color}15`, display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    }}>
                                        <Icon size={17} style={{ color: section.color }} />
                                    </div>
                                    <span style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>{section.title}</span>
                                    <ChevronRight
                                        size={16}
                                        style={{
                                            color: 'var(--color-dim-dark)',
                                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s ease',
                                        }}
                                    />
                                </button>

                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ borderTop: '1px solid var(--color-slate)' }}
                                    >
                                        {section.settings.map((setting, j) => (
                                            <div
                                                key={setting.label}
                                                style={{
                                                    padding: '14px 18px 14px 66px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    borderBottom: j < section.settings.length - 1 ? '1px solid var(--color-slate)' : 'none',
                                                }}
                                            >
                                                <div>
                                                    <p style={{ fontSize: 13, fontWeight: 600 }}>{setting.label}</p>
                                                    <p style={{ fontSize: 11, color: 'var(--color-dim-dark)' }}>{setting.description}</p>
                                                </div>
                                                {setting.type === 'select' && (
                                                    <select
                                                        defaultValue={setting.value as string}
                                                        style={{
                                                            padding: '6px 12px', borderRadius: 8,
                                                            background: 'var(--color-slate)', color: 'var(--color-mist)',
                                                            border: '1px solid var(--color-slate-light)',
                                                            fontSize: 12, outline: 'none', cursor: 'pointer',
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        {setting.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                )}
                                                {setting.type === 'toggle' && (
                                                    <div style={{
                                                        width: 44, height: 24, borderRadius: 99,
                                                        background: setting.value ? '#8B5CF6' : 'var(--color-slate)',
                                                        cursor: 'pointer', position: 'relative',
                                                        transition: 'background 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        boxShadow: setting.value ? '0 2px 8px rgba(139, 92, 246, 0.3)' : 'none',
                                                    }}>
                                                        <div style={{
                                                            width: 18, height: 18, borderRadius: 99,
                                                            background: '#fff', position: 'absolute',
                                                            top: 3,
                                                            left: setting.value ? 23 : 3,
                                                            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                                                        }} />
                                                    </div>
                                                )}
                                                {setting.type === 'info' && (
                                                    <span style={{ fontSize: 12, color: 'var(--color-dim)', maxWidth: 200, textAlign: 'right', fontWeight: 500 }}>{setting.value as string}</span>
                                                )}
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </SpotlightCard>
                        </motion.div>
                    );
                })}
            </div>

            {/* Version info */}
            <div style={{ textAlign: 'center', marginTop: 32, marginBottom: 24 }}>
                <p style={{ fontSize: 12, color: 'var(--color-dim-dark)' }}>Numo Desktop v0.1.0 • Built with Tauri 2.0</p>
                <p style={{ fontSize: 11, color: 'var(--color-dim-dark)', marginTop: 4 }}>Midnight Signal Theme • Local-first</p>
            </div>
        </div>
    );
}
