import { Outlet, useLocation } from 'react-router-dom';
import { Bell, User } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { CosmicShader } from '../../assets/cosmic';
import Sidebar from './Sidebar';
// import Titlebar from './Titlebar';
import { LanguageSelector } from '../ui/LanguageSelector';

const pageTitles: Record<string, string> = {
    '/': '',
    '/learn': 'Learn',
    '/review': 'Review',
    '/immerse': 'Immerse',
    '/speak': 'Speak',
    '/write': 'Write',
    '/notebook': 'Notebook',
    '/insights': 'Insights',
    '/library': 'Library',
    '/settings': 'Settings',
};

export default function AppShell() {
    const location = useLocation();
    const basePath = '/' + (location.pathname.split('/')[1] || '');
    const pageTitle = pageTitles[basePath] || '';
    const isHome = basePath === '/';
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
                    {/* Top Bar for non-Home pages */}
                    {!isHome && (
                        <header className="flex items-center justify-between pt-6 px-10 shrink-0">
                            <h1 className="text-[26px] font-bold tracking-tight text-mist">
                                {pageTitle}
                            </h1>
                            <div className="flex items-center gap-4">
                                <LanguageSelector />
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
                    )}
                    {/* Main scrollable content area */}
                    <div className={`flex-1 overflow-auto ${isHome ? 'pt-6 px-8 pb-8' : 'p-8 px-10'}`}>
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
