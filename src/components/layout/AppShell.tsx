import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, User, Keyboard } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CosmicShader } from '../../assets/cosmic';
import Sidebar from './Sidebar';
import Titlebar from './Titlebar';
import { CommandPalette } from './CommandPalette';
import { LanguageSelector } from '../ui/LanguageSelector';
import { DebugPanel } from './DebugPanel';
import { DEBUG } from '../../config/env';
import {
    PREFERENCES_UPDATED_EVENT,
    readKeyboardShortcutsEnabled,
} from '../../config/preferences';
import { buildActionUrl } from '../../navigation/actionTemplates';
import { useLanguage } from '../../contexts/LanguageContext';
import { useRuntime } from '../../contexts/RuntimeContext';
import { useLanguageProgression } from '../../hooks/useLanguageProgression';
import { useNotifications } from '../../hooks/useNotifications';

const pageMeta: Record<string, { title: string; subtitle?: string }> = {
    '/': { title: 'Home', subtitle: 'Track your daily momentum and jump into the next best action.' },
    '/learn': { title: 'Learning', subtitle: 'Continue your path with guided modules, checkpoints, and focused practice missions.' },
    '/review': { title: 'Review', subtitle: 'Strengthen your memory, one correct answer at a time.' },
    '/immerse': { title: 'Immersion', subtitle: 'Immerse in stories, dialogues, and clips with active transcript mining.' },
    '/speak': { title: 'Speaking', subtitle: 'Enhance pronunciation and fluency through interactive speaking challenges.' },
    '/write': { title: 'Writing', subtitle: 'Practice writing in your active language with guided prompts, feedback, and correction.' },
    '/notebook': { title: 'Notebook', subtitle: 'Save words, phrases, and notes in one place for fast review loops.' },
    '/insights': { title: 'Insights', subtitle: 'Your learning analytics and performance trends at a glance.' },
    '/library': { title: 'Libraries', subtitle: 'Explore character, sound, and word collections for your active language.' },
    '/chat': { title: 'Chat', subtitle: 'Have a natural conversation with Echo.' },
    '/web-search': { title: 'Web Search', subtitle: 'Search the web, YouTube, images, podcasts, docs, and more from one place.' },
    '/profile': { title: 'Profile', subtitle: 'Your account details and learning identity.' },
    '/settings': { title: 'Settings', subtitle: 'Customize your Numo experience.' },
    '/language-setup': { title: 'Language Setup', subtitle: 'Set level, focus, pace, and intensity before starting this language.' },
    '/language-welcome': { title: 'Language Welcome', subtitle: 'Your guided start path for this language.' },
};

export default function AppShell() {
    const location = useLocation();
    const navigate = useNavigate();
    const { activeLanguage, languages } = useLanguage();
    const progression = useLanguageProgression();
    const notifications = useNotifications();
    const { setForegroundSurface } = useRuntime();
    const basePath = '/' + (location.pathname.split('/')[1] || '');
    const meta = pageMeta[basePath] || { title: '' };
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const shortcutPrefixRef = useRef<{ key: string; at: number } | null>(null);
    const [showShortcutHelp, setShowShortcutHelp] = useState(false);
    const [shortcutsEnabled, setShortcutsEnabled] = useState(true);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const shortcutRows = useMemo(
        () => [
            { keys: 'Ctrl/Cmd + K', action: 'Open the command palette' },
            { keys: 'Ctrl + Shift + S', action: 'Toggle Sidebar' },
            { keys: 'g h', action: 'Go to Home' },
            { keys: 'g l', action: 'Go to Learning' },
            { keys: 'g r', action: 'Go to Review' },
            { keys: 'g i', action: 'Go to Immersion' },
            { keys: 'g s', action: 'Go to Speaking' },
            { keys: 'g w', action: 'Go to Writing' },
            { keys: 'g n', action: 'Go to Notebook' },
            { keys: 'g y', action: 'Go to Insights' },
            { keys: 'g b', action: 'Go to Libraries' },
            { keys: 'g f', action: 'Go to Libraries' },
            { keys: 'g c', action: 'Go to Chat' },
            { keys: 'g ,', action: 'Go to Settings' },
            { keys: 'r', action: 'Start Due-Now Flash Cards' },
            { keys: 'Esc', action: 'Close help / back from detail session' },
            { keys: '?', action: 'Toggle this shortcuts panel' },
            { keys: 'Ctrl/Cmd + 1..9', action: 'Quick page navigation' },
        ],
        [],
    );

    useEffect(() => {
        setForegroundSurface(location.pathname);
    }, [location.pathname, setForegroundSurface]);

    useEffect(() => {
        const inSetupFlow = location.pathname === '/language-setup' || location.pathname === '/language-welcome';
        if (languages.length === 0) {
            if (location.pathname !== '/language-setup' && location.pathname !== '/settings') {
                navigate('/language-setup', { replace: true });
            }
            return;
        }
        if (location.pathname === '/settings') {
            return;
        }
        if (!progression.onboardingCompleted && !inSetupFlow) {
            navigate(`/language-setup?lang=${activeLanguage.code}`, { replace: true });
            return;
        }
        if (progression.onboardingCompleted && !progression.welcomeSeen && location.pathname !== '/language-welcome') {
            navigate(`/language-welcome?lang=${activeLanguage.code}`, { replace: true });
        }
    }, [
        activeLanguage.code,
        languages.length,
        location.pathname,
        navigate,
        progression.onboardingCompleted,
        progression.welcomeSeen,
    ]);

    useEffect(() => {
        if (!canvasRef.current) return;
        const shader = new CosmicShader(canvasRef.current, { maxDpr: 1 });
        shader.start();
        return () => {
            shader.destroy();
        };
    }, []);

    useEffect(() => {
        const sync = () => setShortcutsEnabled(readKeyboardShortcutsEnabled());
        sync();
        window.addEventListener(PREFERENCES_UPDATED_EVENT, sync);
        window.addEventListener('storage', sync);
        return () => {
            window.removeEventListener(PREFERENCES_UPDATED_EVENT, sync);
            window.removeEventListener('storage', sync);
        };
    }, []);

    useEffect(() => {
        const isTypingTarget = (target: EventTarget | null) => {
            const element = target as HTMLElement | null;
            if (!element) return false;
            const tagName = element.tagName?.toLowerCase();
            return (
                element.isContentEditable ||
                tagName === 'input' ||
                tagName === 'textarea' ||
                tagName === 'select'
            );
        };

        const goBackRoute = () => {
            const path = location.pathname;
            if (path.startsWith('/review/session')) {
                navigate('/review');
                return true;
            }
            if (path.startsWith('/notebook/')) {
                navigate('/notebook');
                return true;
            }
            if (path.startsWith('/learn/')) {
                navigate('/learn');
                return true;
            }
            if (path.startsWith('/immerse/')) {
                navigate('/immerse');
                return true;
            }
            if (path.startsWith('/speak/session/')) {
                navigate('/speak');
                return true;
            }
            if (path.startsWith('/write/editor')) {
                navigate('/write');
                return true;
            }
            return false;
        };

        const routeByDigit = (digit: string) => {
            const mapping: Record<string, string> = {
                '1': '/',
                '2': '/learn',
                '3': '/review',
                '4': '/immerse',
                '5': '/speak',
                '6': '/write',
                '7': '/notebook',
                '8': '/insights',
                '9': '/settings',
            };
            const route = mapping[digit];
            if (route) navigate(route);
        };

        const routeByChord = (key: string) => {
            const mapping: Record<string, string> = {
                h: '/',
                l: '/learn',
                r: '/review',
                i: '/immerse',
                s: '/speak',
                w: '/write',
                n: '/notebook',
                y: '/insights',
                b: '/library',
                f: '/library',
                c: '/chat',
                ',': '/settings',
            };
            const route = mapping[key];
            if (route) navigate(route);
        };

        const onKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            const meta = event.metaKey || event.ctrlKey;
            const inReviewSession = location.pathname.startsWith('/review/session');

            if (event.ctrlKey && event.shiftKey && !event.altKey && key === 's') {
                event.preventDefault();
                setSidebarCollapsed((prev) => !prev);
                return;
            }

            // Deliberately above the shortcutsEnabled gate: the palette is the
            // way to reach pages without shortcuts, so switching them off must
            // not take it away too.
            if (meta && !event.altKey && key === 'k') {
                event.preventDefault();
                setPaletteOpen((prev) => !prev);
                return;
            }

            if (paletteOpen) {
                // The palette owns the keyboard while it is open.
                return;
            }

            if (!shortcutsEnabled) {
                if ((event.key === '?' || (event.key === '/' && event.shiftKey)) && !meta && !event.altKey) {
                    event.preventDefault();
                    setShowShortcutHelp((prev) => !prev);
                }
                return;
            }

            if ((event.key === '?' || (event.key === '/' && event.shiftKey)) && !meta && !event.altKey) {
                event.preventDefault();
                setShowShortcutHelp((prev) => !prev);
                return;
            }

            if (event.key === 'Escape') {
                if (showShortcutHelp) {
                    event.preventDefault();
                    setShowShortcutHelp(false);
                    return;
                }
                if (goBackRoute()) {
                    event.preventDefault();
                }
                return;
            }

            if (inReviewSession) {
                return;
            }

            if (isTypingTarget(event.target)) return;

            if (!progression.onboardingCompleted) {
                return;
            }

            if (meta && key >= '1' && key <= '9') {
                event.preventDefault();
                routeByDigit(key);
                return;
            }

            if (!meta && !event.altKey && !event.shiftKey && key === 'g') {
                shortcutPrefixRef.current = { key: 'g', at: Date.now() };
                return;
            }

            const prefix = shortcutPrefixRef.current;
            if (prefix?.key === 'g' && Date.now() - prefix.at < 1300 && !meta && !event.altKey) {
                routeByChord(key);
                shortcutPrefixRef.current = null;
                event.preventDefault();
                return;
            }
            shortcutPrefixRef.current = null;

            if (!meta && !event.altKey && !event.shiftKey && key === 'r') {
                event.preventDefault();
                navigate('/review/session?mode=due-now');
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [location.pathname, navigate, paletteOpen, shortcutsEnabled, showShortcutHelp]);

    return (
        <div className="flex flex-col h-screen w-screen relative z-0 bg-obsidian text-mist">
            <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

            {/* Custom Tauri Titlebar */}
            <Titlebar />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Cosmic Shader Background */}
                <div className="pointer-events-none absolute inset-0 z-[-1] overflow-hidden">
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
                </div>

                <Sidebar
                    collapsed={sidebarCollapsed}
                    onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
                />
                <main className="flex-1 min-w-0 flex flex-col overflow-hidden relative z-10">
                    {/* Top Bar for all pages */}
                    <header className="flex items-start justify-between shrink-0 px-[clamp(1rem,2.2vw,2.5rem)] pt-[max(1rem,env(safe-area-inset-top))] gap-6">
                        <div className="min-w-0">
                            <h1 className="text-[31px] bg-[linear-gradient(92deg,#FAFAFA,#C7D8FF)] bg-clip-text text-transparent font-bold tracking-tight uppercase">
                                {meta.title.toUpperCase()}
                            </h1>
                            {meta.subtitle && (
                                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <p className="text-dim text-[14px] font-medium">
                                        {meta.subtitle}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <LanguageSelector />
                            <button
                                className="h-9 rounded-xl px-3 bg-black/20 border border-white/10 text-dim hover:text-mist hover:border-white/20 transition-colors text-[12px] font-bold tracking-wide flex items-center gap-2"
                                onClick={() => setShowShortcutHelp((prev) => !prev)}
                                title="Keyboard shortcuts (?)"
                            >
                                <Keyboard size={14} /> Shortcuts
                            </button>
                            {basePath === '/library' && (
                                <button
                                    className="px-4 py-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-[13px] font-bold hover:bg-indigo-600/30 hover:border-indigo-500/40 transition-colors flex items-center gap-1.5 backdrop-blur-md"
                                    onClick={() =>
                                        navigate(
                                            buildActionUrl('app_new_collection', {
                                                params: { from: location.pathname, lang: activeLanguage.code },
                                            }),
                                        )
                                    }
                                >
                                    <span className="text-lg leading-none mb-0.5">+</span> New Collection
                                </button>
                            )}
                            <div className="h-4 w-[1px] bg-white/10 mx-1" />
                            <button
                                className="relative w-9 h-9 rounded-xl bg-graphite border border-white/5 flex items-center justify-center cursor-pointer text-dim transition-colors hover:text-mist hover:border-slate-light backdrop-blur-md"
                                onClick={() =>
                                    navigate(
                                        buildActionUrl('app_notifications', {
                                            params: { from: location.pathname, lang: activeLanguage.code },
                                        }),
                                    )
                                }
                            >
                                <Bell size={16} />
                                {notifications.length > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-coral border-2 border-obsidian" />
                                )}
                            </button>
                            <button
                                className="w-9 h-9 rounded-xl bg-[linear-gradient(135deg,var(--color-violet),var(--color-cyan))] flex items-center justify-center cursor-pointer shadow-[0_4px_12px_rgba(139,92,246,0.3)] hover:scale-105 active:scale-95 transition-transform"
                                onClick={() => navigate('/profile')}
                            >
                                <User size={16} className="text-white" />
                            </button>
                        </div>
                    </header>
                    {/* Main scrollable content area */}
                    <div
                        className="flex-1 overflow-auto px-[clamp(1rem,2.2vw,2.5rem)] pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4"
                    >
                        <Outlet />
                    </div>
                </main>
            </div>
            {showShortcutHelp && (
                <div
                    className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
                    onClick={() => setShowShortcutHelp(false)}
                >
                    <div
                        className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0B1020]/95 shadow-[0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                            <h3 className="text-[18px] font-bold tracking-wide text-white">Keyboard Shortcuts</h3>
                            <span className="text-[12px] text-dim">
                                {shortcutsEnabled ? 'Enabled' : 'Disabled in Settings'}
                            </span>
                        </div>
                        <div className="px-6 py-4 max-h-[65vh] overflow-auto space-y-2">
                            {shortcutRows.map((row) => (
                                <div key={row.keys} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                                    <span className="text-[13px] text-mist">{row.action}</span>
                                    <kbd className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-bold tracking-wider text-white">
                                        {row.keys}
                                    </kbd>
                                </div>
                            ))}
                        </div>
                        <div className="px-6 py-4 border-t border-white/10 text-[12px] text-dim flex items-center justify-between">
                            <span>Press <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px]">?</kbd> to toggle</span>
                            <button
                                className="rounded-lg border border-white/15 px-3 py-1.5 text-mist hover:bg-white/5"
                                onClick={() => setShowShortcutHelp(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {DEBUG && <DebugPanel />}
        </div>
    );
}
