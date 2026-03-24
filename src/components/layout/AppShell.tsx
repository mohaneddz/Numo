import { Outlet, useLocation } from 'react-router-dom';
import { Bell, User } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { CosmicShader } from '../../assets/cosmic';
import Sidebar from './Sidebar';
// import Titlebar from './Titlebar';
import { LanguageSelector } from '../ui/LanguageSelector';

const pageMeta: Record<string, { title: string; subtitle?: string }> = {
    '/': { title: 'Home', subtitle: 'Track your daily momentum and jump into the next best action.' },
    '/learn': { title: 'Learn', subtitle: 'Continue your path with guided modules, checkpoints, and focused practice missions.' },
    '/review': { title: 'Review', subtitle: 'Strengthen your memory, one correct answer at a time.' },
    '/immerse': { title: 'Immerse', subtitle: 'Immerse in stories, dialogues, and clips with active transcript mining.' },
    '/speak': { title: 'Speak', subtitle: 'Enhance pronunciation and fluency through interactive speaking challenges.' },
    '/write': { title: 'Write', subtitle: 'Practice writing in Spanish with guided prompts, feedback, and correction.' },
    '/notebook': { title: 'Notebook', subtitle: 'Save words, phrases, and notes in one place for fast review loops.' },
    '/insights': { title: 'Insights', subtitle: 'Your learning analytics and performance trends at a glance.' },
    '/library': { title: 'Your Library', subtitle: 'Your words, phrases, and saved gems — organized for you' },
    '/references': { title: 'References' },
    '/settings': { title: 'Settings', subtitle: 'Customize your Numo experience.' },
};

export default function AppShell() {
    const location = useLocation();
    const basePath = '/' + (location.pathname.split('/')[1] || '');
    const meta = pageMeta[basePath] || { title: '' };
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        const shader = new CosmicShader(canvasRef.current, { maxDpr: 1 });
        shader.start();
        return () => {
            shader.destroy();
        };
    }, []);

    return (
        <div className="flex flex-col h-screen w-screen relative z-0 bg-[#050816] text-white">
            {/* Custom Tauri Titlebar */}
            {/* <Titlebar /> */}

            <div className="flex flex-1 overflow-hidden relative">
                {/* Cosmic Shader Background */}
                <div className="pointer-events-none absolute inset-0 z-[-1] overflow-hidden">
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
                </div>

                <Sidebar />
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
                            {basePath === '/library' && (
                                <button className="px-4 py-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-[13px] font-bold hover:bg-indigo-600/30 hover:border-indigo-500/40 transition-colors flex items-center gap-1.5 backdrop-blur-md">
                                    <span className="text-lg leading-none mb-0.5">+</span> New Collection
                                </button>
                            )}
                            <div className="h-4 w-[1px] bg-white/10 mx-1" />
                            <button className="relative w-9 h-9 rounded-xl bg-graphite border border-white/5 flex items-center justify-center cursor-pointer text-dim transition-colors hover:text-mist hover:border-slate-light backdrop-blur-md">
                                <Bell size={16} />
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-coral border-2 border-obsidian" />
                            </button>
                            <div className="w-9 h-9 rounded-xl bg-[linear-gradient(135deg,var(--color-violet),var(--color-cyan))] flex items-center justify-center cursor-pointer shadow-[0_4px_12px_rgba(139,92,246,0.3)] hover:scale-105 active:scale-95 transition-transform">
                                <User size={16} className="text-white" />
                            </div>
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
        </div>
    );
}
