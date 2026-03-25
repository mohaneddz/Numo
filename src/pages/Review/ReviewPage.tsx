import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import {
    Zap,
    Flame,
    RotateCcw,
    Play,
    Check,
    ChevronRight,
    Headphones,
    Book,
    MessageSquare,
    AlertCircle,
    TrendingUp,
    Clock3,
    Target,
    Brain,
} from 'lucide-react';
import { PageActions, PageContent, PageMainColumn, PageMainSidebarLayout, PageSidebar } from '../../components/layout/PageLayout';
import { useAppData, type ReviewMode } from '../../contexts/AppDataContext';
import { buildTemplateUrl } from '../../navigation/actionTemplates';
import { useLanguage } from '../../contexts/LanguageContext';

const fadeUp = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: 'easeOut' },
};

export default function ReviewPage() {
    const navigate = useNavigate();
    const { activeLanguage } = useLanguage();
    const { dueCount, weakCount, flashCardCount } = useAppData();
    const [showAllForgotten, setShowAllForgotten] = useState(false);
    const modeCards: Array<{
        mode: ReviewMode;
        title: string;
        desc: string;
        count: string;
        icon: typeof RotateCcw;
        color: string;
        bg: string;
        border: string;
        active?: boolean;
    }> = [
        { mode: 'due-now', title: 'Due Now', desc: 'Review all due flash cards', count: `${dueCount} cards`, icon: RotateCcw, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30', active: true },
        { mode: 'weak', title: 'Weak Points', desc: 'Focus on difficult cards', count: `${weakCount} weak`, icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/10' },
        { mode: 'mistakes', title: 'Mistakes', desc: 'Redo incorrect answers', count: 'Auto queue', icon: RotateCcw, color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/10' },
        { mode: 'cram', title: 'Cram', desc: 'Quick review session', count: '15 max', icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/10' },
    ];
    const forgottenItems = [
        { word: 'أين', translit: "'Ayna", meaning: 'Where', error: 'Wrong 2x', time: '10m ago', iconBg: 'bg-blue-600/20', iconColor: 'text-blue-400' },
        { word: 'كل', translit: 'Kullu', meaning: 'Every / All', error: 'Wrong 1x', time: '1h ago', iconBg: 'bg-violet-600/20', iconColor: 'text-violet-400' },
        { word: 'شكراً', translit: 'Shukran', meaning: 'Thank you', error: 'Wrong 1x', time: 'Yesterday', iconBg: 'bg-amber-600/20', iconColor: 'text-amber-400' },
        { word: 'أريد', translit: 'Ureed', meaning: 'I want', error: 'Wrong 3x', time: 'Yesterday', iconBg: 'bg-cyan-600/20', iconColor: 'text-cyan-400' },
        { word: 'متى', translit: 'Mata', meaning: 'When', error: 'Wrong 1x', time: '2d ago', iconBg: 'bg-rose-600/20', iconColor: 'text-rose-400' },
        { word: 'كيف', translit: 'Kayfa', meaning: 'How', error: 'Wrong 2x', time: '2d ago', iconBg: 'bg-emerald-600/20', iconColor: 'text-emerald-400' },
    ];

    return (
        <PageContent className="pb-24" width="wide">
            <PageActions>
                <Link to="/review/session?mode=due-now" className="no-underline">
                    <button className="page-primary-action">
                        <Zap size={16} fill="currentColor" /> Smart Flash Cards
                    </button>
                </Link>
            </PageActions>

            <PageMainSidebarLayout>
                <PageMainColumn>
                    <motion.div {...fadeUp}>
                        <SpotlightCard className="mb-10 w-full border border-white/5 bg-[#0B1020]/60 overflow-hidden">
                            <div className="relative z-10 flex flex-col items-center justify-between gap-8 p-8 md:flex-row md:p-10">
                                <div className="flex items-center gap-10">
                                    <div className="relative flex h-[130px] w-[130px] items-center justify-center">
                                        <svg className="h-full w-full -rotate-90 transform">
                                            <circle cx="65" cy="65" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-[#1E293B]" />
                                            <circle
                                                cx="65"
                                                cy="65"
                                                r="58"
                                                stroke="currentColor"
                                                strokeWidth="12"
                                                fill="transparent"
                                                className="text-amber-500"
                                                strokeDasharray={364.4}
                                                strokeDashoffset={364.4 * (1 - 0.7)}
                                                strokeLinecap="round"
                                                style={{ filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.4))' }}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-[38px] font-extrabold leading-none text-white">{dueCount}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <h3 className="mb-1 text-[18px] font-bold text-white">Flash Cards Due</h3>
                                        <div className="flex flex-col gap-2 text-[13px]">
                                            <div className="flex items-center gap-3">
                                                <div className="h-2.5 w-2.5 rounded-sm bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                                <span className="font-bold text-white">5</span>
                                                <span className="font-medium uppercase tracking-[0.02em] text-dim">Overdue</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="h-2.5 w-2.5 rounded-sm bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                                <span className="font-bold text-white">{dueCount}</span>
                                                <span className="font-medium uppercase tracking-[0.02em] text-dim">Due Today</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="h-2.5 w-2.5 rounded-sm bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                                                <span className="font-bold text-white">27</span>
                                                <span className="font-medium uppercase tracking-[0.02em] text-dim">Upcoming</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative flex h-[180px] w-[240px] items-center justify-center">
                                    <div className="absolute bottom-2 h-[20px] w-[160px] rounded-full bg-blue-500/30 blur-[20px]" />
                                    <div className="absolute bottom-4 h-[5px] w-[100px] rounded-full bg-cyan-400/60 blur-[6px]" />
                                    <img src="/figure/normal.png" alt="Echo" className="z-10 h-[140px] w-[140px] object-contain drop-shadow-[0_0_40px_rgba(34,211,238,0.6)]" />
                                    <div className="absolute left-[-20px] top-[40px] z-20 flex h-14 w-14 rotate-[-12deg] items-center justify-center rounded-xl border border-blue-400/40 bg-blue-500/20 backdrop-blur-md shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                                        <Check size={20} className="text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" strokeWidth={3} />
                                    </div>
                                </div>
                            </div>
                        </SpotlightCard>
                    </motion.div>

                    <h3 className="mb-5 pl-2 text-[14px] font-bold uppercase tracking-wider text-dim">Review Mode</h3>
                    <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-4">
                        {modeCards.map((mode, i) => (
                            <motion.div key={mode.title} {...fadeUp} transition={{ delay: 0.08 + i * 0.05 }}>
                                <SpotlightCard interactive className={`border ${mode.border} p-6 ${mode.active ? 'bg-blue-600/5 ring-1 ring-blue-500/20' : 'bg-transparent'}`}>
                                    <div className="relative z-10 flex flex-col items-center text-center">
                                        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${mode.bg} ${mode.color}`}>
                                            <mode.icon size={22} />
                                        </div>
                                        <h4 className="mb-1.5 text-[16px] font-bold text-white">{mode.title}</h4>
                                        <p className="mb-4 text-[12px] leading-tight text-dim">{mode.desc}</p>
                                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${mode.bg} ${mode.color}`}>• {mode.count}</span>
                                        <button
                                            className="mt-4 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] font-bold text-mist hover:bg-white/5"
                                            onClick={() => navigate(`/review/session?mode=${mode.mode}`)}
                                        >
                                            Start
                                        </button>
                                    </div>
                                </SpotlightCard>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div {...fadeUp} transition={{ delay: 0.22 }}>
                        <SpotlightCard interactive className="mb-10 border border-indigo-500/30 p-0 shadow-[0_0_30px_rgba(99,102,241,0.1)]">
                            <div className="relative z-10 flex items-center justify-between bg-gradient-to-r from-blue-600/20 via-indigo-600/10 to-transparent p-4 md:p-6">
                                <div className="pl-2 md:pl-6">
                                    <h3 className="mb-1 text-[19px] font-bold text-white">Start Flash Cards Session</h3>
                                    <p className="text-[12.5px] font-medium tracking-wide text-dim">Adaptive questions • Spaced repetition • Instant feedback</p>
                                </div>
                                <button
                                    className="mr-2 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.6)] transition-transform hover:scale-105 md:mr-4"
                                    onClick={() => navigate('/review/session?mode=due-now')}
                                >
                                    <Play size={24} fill="currentColor" strokeWidth={0} className="ml-1" />
                                </button>
                            </div>
                        </SpotlightCard>
                    </motion.div>

                    <div className="">
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-[17px] font-bold text-white">Recently Forgotten</h3>
                            <button
                                className="flex items-center gap-1 text-[12px] font-bold text-dim transition-colors hover:text-white"
                                onClick={() => setShowAllForgotten((prev) => !prev)}
                            >
                                {showAllForgotten ? 'Show Less' : 'View All'} <ChevronRight size={14} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">
                            {(showAllForgotten ? forgottenItems : forgottenItems.slice(0, 3)).map((item, i) => (
                                <motion.div key={item.word} {...fadeUp} transition={{ delay: 0.3 + i * 0.05 }}>
                                    <SpotlightCard interactive className="flex items-center gap-5 border border-white/5 bg-[#0F172A]/40 p-4">
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-[14px] text-[18px] font-bold ${item.iconBg} ${item.iconColor}`}>
                                            {item.word}
                                        </div>
                                        <div className="flex-1">
                                            <p className="mb-0.5 text-[14px] font-bold text-white">{item.word}</p>
                                            <p className="text-[12px] font-medium text-dim">{item.translit}</p>
                                        </div>
                                        <div className="min-w-[100px] rounded-xl border border-white/5 bg-white/5 px-4 py-2 text-center">
                                            <span className="text-[13px] font-bold text-mist">{item.meaning}</span>
                                        </div>
                                        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold tracking-wide text-red-500">
                                            {item.error}
                                        </div>
                                        <span className="w-16 text-right text-[12px] font-medium text-[#64748B]">{item.time}</span>
                                    </SpotlightCard>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-10 border-t border-white/5 pt-10 lg:grid-cols-2">
                        <div>
                            <h3 className="mb-2 text-[18px] font-bold text-white">Weak Points to Improve</h3>
                            <p className="mb-8 text-[13px] text-dim">Focus on your most difficult categories.</p>

                            <div className="flex flex-col gap-4">
                                {[
                                    { title: 'Listening', desc: 'Missed 4 out of 10', progress: 60, icon: Headphones, color: 'bg-blue-500' },
                                    { title: 'Grammar', desc: 'Articles & prepositions', progress: 45, icon: Book, color: 'bg-violet-500' },
                                    { title: 'Speaking', desc: 'Verb conjugations', progress: 70, icon: MessageSquare, color: 'bg-amber-500' },
                                ].map((item) => (
                                    <SpotlightCard key={item.title} className="flex items-center gap-6 border border-white/5 bg-[#0F172A]/40 p-5">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-white/5 text-mist">
                                            <item.icon size={22} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="mb-2.5 flex items-end justify-between">
                                                <div>
                                                    <h4 className="mb-0.5 text-[15px] font-bold text-white">{item.title}</h4>
                                                    <p className="text-[12px] font-medium text-dim">{item.desc}</p>
                                                </div>
                                                <span className="text-[13px] font-bold text-white">{item.progress}%</span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                                                <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.progress}%` }} />
                                            </div>
                                        </div>
                                        <button
                                            className="cursor-pointer rounded-xl border border-white/10 px-5 py-2.5 text-[13px] font-bold text-mist transition-colors hover:bg-white/5"
                                            onClick={() =>
                                                navigate(
                                                    buildTemplateUrl({
                                                        templateId: 'review-practice-weak-point',
                                                        entityId: item.title.toLowerCase(),
                                                        params: { from: '/review', lang: activeLanguage.code },
                                                    }),
                                                )
                                            }
                                        >
                                            Practice
                                        </button>
                                    </SpotlightCard>
                                ))}
                            </div>
                        </div>

                        <div className="flex h-full flex-col">
                            <h3 className="mb-2 text-[18px] font-bold text-white">Memory Strength</h3>
                            <p className="mb-8 text-[13px] text-dim">How well you're retaining words & phrases</p>

                            <SpotlightCard className="flex min-h-[300px] flex-1 flex-col border border-white/5 bg-[#0B1020]/20 p-8">
                                <div className="relative mb-6 flex-1 w-full">
                                    <svg className="h-full w-full overflow-visible">
                                        <defs>
                                            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="rgba(139, 92, 246, 0.4)" />
                                                <stop offset="100%" stopColor="transparent" />
                                            </linearGradient>
                                            <linearGradient id="lineGrad" x1="0" x2="1">
                                                <stop offset="0%" stopColor="#38BDF8" />
                                                <stop offset="100%" stopColor="#8B5CF6" />
                                            </linearGradient>
                                        </defs>
                                        {[0, 0.25, 0.5, 0.75, 1].map((y) => (
                                            <line key={y} x1="0" y1={`${y * 100}%`} x2="100%" y2={`${y * 100}%`} stroke="white" strokeOpacity="0.05" />
                                        ))}
                                        <path d="M0,180 Q80,165 150,140 T300,90 T450,40 T600,10 L600,200 L0,200 Z" fill="url(#chartGrad)" className="opacity-50" />
                                        <path d="M0,180 Q80,165 150,140 T300,90 T450,40 T600,10" fill="none" stroke="url(#lineGrad)" strokeWidth="3" className="drop-shadow-[0_0_10px_rgba(139,92,246,0.6)]" />
                                        {[
                                            { x: 0, y: 180, d: 'Day 1' },
                                            { x: 150, y: 140, d: 'Day 3' },
                                            { x: 300, y: 90, d: 'Day 7' },
                                            { x: 450, y: 40, d: 'Day 14' },
                                            { x: 600, y: 10, d: 'Day 21' },
                                        ].map((pt, i) => (
                                            <g key={i}>
                                                <circle cx={pt.x} cy={pt.y} r="5" className="fill-white" />
                                                <text x={pt.x} y="225" textAnchor="middle" className="fill-[#64748B] text-[11px] font-bold uppercase tracking-wider">{pt.d}</text>
                                            </g>
                                        ))}
                                    </svg>
                                </div>

                                <div className="flex w-full items-center justify-between border-t border-white/5 pt-6">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[12px] font-bold text-emerald-400">
                                            <Check size={14} className="stroke-[3]" /> Good retention!
                                        </div>
                                        <p className="text-[12.5px] font-medium text-dim">Keep reviewing to reach <span className="font-bold text-white">90%</span></p>
                                    </div>
                                </div>
                            </SpotlightCard>
                        </div>
                    </div>
                </PageMainColumn>

                <PageSidebar className="gap-5">
                    <SpotlightCard className="p-5">
                        <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-dim">Today Queue</p>
                        <h4 className="mb-1 text-[20px] font-bold text-white">{dueCount} cards</h4>
                        <p className="mb-4 text-[13px] text-dim">Estimated session time: 18 minutes for full completion.</p>
                        <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full w-[58%] bg-gradient-to-r from-amber-500 to-cyan-400" />
                        </div>
                        <div className="space-y-2 text-[12px] text-dim">
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-2"><Clock3 size={13} className="text-amber-400" /> Due now</span>
                                <span className="font-bold text-white">{dueCount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-2"><Target size={13} className="text-red-400" /> Overdue</span>
                                <span className="font-bold text-white">{Math.max(0, dueCount - weakCount)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-2"><Brain size={13} className="text-cyan-400" /> New cards</span>
                                <span className="font-bold text-white">{Math.min(5, flashCardCount)}</span>
                            </div>
                        </div>
                    </SpotlightCard>

                    <SpotlightCard className="p-5 border border-white/5 bg-[#0F172A]/40">
                        <h3 className="mb-6 text-[14px] font-bold uppercase tracking-wider text-dim">Review Streak</h3>
                        <div className="mb-6 flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                                <Flame size={32} fill="currentColor" />
                            </div>
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[32px] font-black leading-none text-white">7</span>
                                    <span className="text-[18px] font-bold text-mist">days</span>
                                </div>
                                <p className="mt-1 text-[12px] font-medium text-dim">Keep it going!</p>
                            </div>
                        </div>

                        <div className="mb-6 flex items-center justify-between gap-2 px-1">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                                <div key={day} className="flex flex-col items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase text-[#64748B]">{day}</span>
                                    <div className={`flex h-7 w-7 items-center justify-center rounded-full border ${i < 6 ? 'border-blue-400 bg-blue-500/20 text-blue-400' : 'border-white/10 text-white/20'}`}>
                                        {i < 6 ? <Check size={14} strokeWidth={3} /> : <div className="h-2.5 w-2.5 rounded-full border border-amber-500/40" />}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/5 bg-black/30 px-4 py-3">
                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-500">
                                <TrendingUp size={14} />
                            </div>
                            <span className="text-[13px] font-bold tracking-tight text-white">Longest: <span className="ml-1 text-amber-500">14 days</span></span>
                        </div>
                    </SpotlightCard>

                    <SpotlightCard className="p-5">
                        <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-dim">Recommended Flow</p>
                        <div className="space-y-3">
                            {['Due Now Sprint', 'Weak Points Focus', 'Checkpoint Mix'].map((item) => (
                                <button
                                    key={item}
                                    className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition-colors hover:bg-white/10"
                                    onClick={() =>
                                        navigate(
                                            buildTemplateUrl({
                                                templateId: 'review-flow',
                                                entityId: item.toLowerCase().replace(/\s+/g, '-'),
                                                params: { from: '/review', lang: activeLanguage.code },
                                            }),
                                        )
                                    }
                                >
                                    <span className="text-[13px] text-mist">{item}</span>
                                    <ChevronRight size={14} className="text-dim" />
                                </button>
                            ))}
                        </div>
                    </SpotlightCard>

                    <SpotlightCard className="p-5">
                        <div className="mb-3 flex items-center gap-3">
                            <img src="/figure/normal.png" alt="Echo" className="h-11 w-11 object-contain drop-shadow-[0_0_18px_rgba(139,92,246,0.5)]" />
                            <h4 className="text-[15px] font-bold text-white">Echo's Tip</h4>
                        </div>
                        <p className="text-[13px] leading-relaxed text-dim">After every wrong answer, say the corrected sentence out loud once. This boosts retention and pronunciation together.</p>
                    </SpotlightCard>
                </PageSidebar>
            </PageMainSidebarLayout>
        </PageContent>
    );
}
