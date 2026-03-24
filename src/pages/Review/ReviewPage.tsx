import { motion } from 'framer-motion';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { 
    Zap, Settings, Flame, RotateCcw, Play, Check, ChevronRight, 
    Headphones, Book, MessageSquare, AlertCircle, TrendingUp 
} from 'lucide-react';

const fadeUp = {
    initial: { opacity: 1, y: 0 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: 'easeOut' },
};

export default function ReviewPage() {
    return (
        <div className="max-w-[1000px] mx-auto pb-24 relative mt-4">
            {/* Header Area */}
            <div className="flex justify-between items-center mb-8 pl-2">
                <div>
                    <h1 className="text-[32px] font-bold tracking-tight text-white mb-1">Review</h1>
                    <p className="text-[14px] text-dim font-medium">Strengthen your memory — one correct answer at a time.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-5 py-2 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold text-[14px] hover:bg-blue-600/30 transition-colors cursor-pointer">
                        <Zap size={16} fill="currentColor" /> Smart Review
                    </button>
                    <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-dim hover:text-white transition-colors cursor-pointer">
                        <Settings size={18} />
                    </button>
                </div>
            </div>

            {/* Hero Section: Progress & Mascot */}
            <motion.div {...fadeUp} className="mb-12">
                <SpotlightCard className="w-full border border-white/5 bg-[#0B1020]/60 overflow-hidden">
                    <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center justify-between">
                        {/* Left: Circular Stats */}
                        <div className="flex items-center gap-10">
                            <div className="relative w-[130px] h-[130px] flex items-center justify-center">
                                {/* SVG Circle Progress */}
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="65" cy="65" r="58"
                                        stroke="currentColor" strokeWidth="12"
                                        fill="transparent" className="text-[#1E293B]"
                                    />
                                    <circle
                                        cx="65" cy="65" r="58"
                                        stroke="currentColor" strokeWidth="12"
                                        fill="transparent" className="text-amber-500"
                                        strokeDasharray={364.4}
                                        strokeDashoffset={364.4 * (1 - 0.7)}
                                        strokeLinecap="round"
                                        style={{ filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.4))' }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-[38px] font-extrabold text-white leading-none">22</span>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-3">
                                <h3 className="text-[18px] font-bold text-white mb-1">Items Due</h3>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-3 text-[13px]">
                                        <div className="w-2.5 h-2.5 rounded-sm bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                        <span className="text-white font-bold">5</span>
                                        <span className="text-dim font-medium uppercase tracking-[0.02em]">Overdue</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[13px]">
                                        <div className="w-2.5 h-2.5 rounded-sm bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                        <span className="text-white font-bold">12</span>
                                        <span className="text-dim font-medium uppercase tracking-[0.02em]">Due Today</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[13px]">
                                        <div className="w-2.5 h-2.5 rounded-sm bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                                        <span className="text-white font-bold">27</span>
                                        <span className="text-dim font-medium uppercase tracking-[0.02em]">Upcoming</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Echo Mascot */}
                        <div className="relative w-[240px] h-[180px] flex items-center justify-center">
                            {/* Glowing circular floor */}
                            <div className="absolute bottom-2 w-[160px] h-[20px] bg-blue-500/30 blur-[20px] rounded-full" />
                            <div className="absolute bottom-4 w-[100px] h-[5px] bg-cyan-400/60 blur-[6px] rounded-full" />
                            
                            <img src="/figure/normal.png" alt="Echo" className="w-[140px] h-[140px] object-contain drop-shadow-[0_0_40px_rgba(34,211,238,0.6)] z-10" />
                            
                            {/* Floating Holo-Tablet Mockup */}
                            <div className="absolute top-[40px] left-[-20px] w-14 h-14 rounded-xl border border-blue-400/40 bg-blue-500/20 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.3)] rotate-[-12deg] z-20">
                                <Check size={20} className="text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" strokeWidth={3} />
                            </div>
                        </div>
                    </div>
                </SpotlightCard>
            </motion.div>

            {/* Review Modes Grid */}
            <h3 className="text-[14px] font-bold text-dim uppercase tracking-wider mb-5 pl-2">Review Mode</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {[
                    { title: 'Due Now', desc: 'Review all due items', count: '22 items', icon: RotateCcw, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30', active: true },
                    { title: 'Weak Points', desc: 'Focus on mistakes', count: '8 weak', icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/10' },
                    { title: 'Mistakes', desc: 'Redo incorrect answers', count: '3 sets', icon: RotateCcw, color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/10' },
                    { title: 'Cram', desc: 'Quick review session', count: '15 min', icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/10' },
                ].map((mode, i) => (
                    <motion.div key={mode.title} {...fadeUp} transition={{ delay: 0.1 + i * 0.05 }}>
                        <SpotlightCard interactive className={`p-6 border ${mode.border} ${mode.active ? 'bg-blue-600/5 ring-1 ring-blue-500/20' : 'bg-transparent'}`}>
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${mode.bg} ${mode.color}`}>
                                    <mode.icon size={22} />
                                </div>
                                <h4 className="text-[16px] font-bold text-white mb-1.5">{mode.title}</h4>
                                <p className="text-[12px] text-dim mb-4 leading-tight">{mode.desc}</p>
                                <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${mode.bg} ${mode.color}`}>
                                    • {mode.count}
                                </span>
                            </div>
                        </SpotlightCard>
                    </motion.div>
                ))}
            </div>

            {/* Start Review Session Banner */}
            <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
                <SpotlightCard interactive className="mb-12 p-0 border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.1)]">
                    <div className="relative z-10 p-4 md:p-6 bg-gradient-to-r from-blue-600/20 via-indigo-600/10 to-transparent flex items-center justify-between">
                        <div className="pl-6">
                            <h3 className="text-[19px] font-bold text-white mb-1">Start Review Session</h3>
                            <p className="text-[12.5px] text-dim font-medium tracking-wide">
                                Adaptive questions • Spaced repetition • Instant feedback
                            </p>
                        </div>
                        <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(79,70,229,0.6)] cursor-pointer hover:scale-105 transition-transform mr-4">
                            <Play size={24} fill="currentColor" strokeWidth={0} className="ml-1" />
                        </div>
                    </div>
                </SpotlightCard>
            </motion.div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Section: Recently Forgotten */}
                <div className="lg:col-span-7">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[17px] font-bold text-white">Recently Forgotten</h3>
                        <button className="text-[12px] text-dim font-bold hover:text-white transition-colors flex items-center gap-1">
                            View All <ChevronRight size={14} />
                        </button>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        {[
                            { word: 'أين', translit: "'Ayna", meaning: 'Where', error: 'Wrong 2x', time: '10m ago', iconBg: 'bg-blue-600/20', iconColor: 'text-blue-400' },
                            { word: 'كل', translit: 'Kullu', meaning: 'Every / All', error: 'Wrong 1x', time: '1h ago', iconBg: 'bg-violet-600/20', iconColor: 'text-violet-400' },
                            { word: 'شكراً', translit: 'Shukran', meaning: 'Thank you', error: 'Wrong 1x', time: 'Yesterday', iconBg: 'bg-amber-600/20', iconColor: 'text-amber-400' },
                        ].map((item, i) => (
                            <motion.div key={item.word} {...fadeUp} transition={{ delay: 0.4 + i * 0.05 }}>
                                <SpotlightCard interactive className="p-4 border border-white/5 bg-[#0F172A]/40 flex items-center gap-5">
                                    <div className={`w-12 h-12 rounded-[14px] ${item.iconBg} flex items-center justify-center text-[18px] font-bold ${item.iconColor}`}>
                                        {item.word}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[14px] text-white font-bold mb-0.5">{item.word}</p>
                                        <p className="text-[12px] text-dim font-medium">{item.translit}</p>
                                    </div>
                                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 min-w-[100px] text-center">
                                        <span className="text-[13px] text-mist font-bold">{item.meaning}</span>
                                    </div>
                                    <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold tracking-wide">
                                        {item.error}
                                    </div>
                                    <span className="text-[12px] text-[#64748B] font-medium w-16 text-right">{item.time}</span>
                                </SpotlightCard>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Right Section: Streak & Sidebar */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    {/* Streak Card */}
                    <SpotlightCard className="p-7 border border-white/5 bg-[#0F172A]/40">
                        <h3 className="text-[14px] font-bold text-dim uppercase tracking-wider mb-6">Review Streak</h3>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                                <Flame size={32} fill="currentColor" />
                            </div>
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[32px] font-black text-white leading-none">7</span>
                                    <span className="text-[18px] font-bold text-mist">days</span>
                                </div>
                                <p className="text-[12px] text-dim font-medium mt-1">Keep it going!</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between gap-2 mb-8 px-1">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                                <div key={day} className="flex flex-col items-center gap-3">
                                    <span className="text-[10px] uppercase font-bold text-[#64748B]">{day}</span>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                                        i < 6 ? 'bg-blue-500/20 border-blue-400 text-blue-400' : 'bg-transparent border-white/10 text-white/10'
                                    }`}>
                                        {i < 6 && <Check size={16} strokeWidth={3} />}
                                        {i === 6 && <div className="w-2.5 h-2.5 rounded-full border border-amber-500/40" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="w-full py-4 px-6 rounded-2xl bg-black/30 border border-white/5 flex items-center justify-center gap-3">
                            <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">
                                <TrendingUp size={14} />
                            </div>
                            <span className="text-[13px] font-bold text-white tracking-tight">
                                Longest: <span className="text-amber-500 ml-1">14 days</span>
                            </span>
                        </div>
                    </SpotlightCard>

                    {/* Echo's Tip */}
                    <div className="flex gap-6 items-start mt-6">
                        <div className="relative w-18 h-18 shrink-0">
                            <img src="/figure/normal.png" className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(139,92,246,0.6)]" />
                        </div>
                        <div className="relative flex-1 bg-[#161B2C] border border-white/5 rounded-2xl p-5 shadow-xl">
                            <h4 className="text-[14px] font-bold text-white mb-2 tracking-tight">Echo's Tip</h4>
                            <p className="text-[13px] text-dim leading-relaxed">
                                Focus on <span className="text-[#38BDF8] font-bold">understanding why</span> you got items wrong, not just memorizing. That’s how they stick!
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-16 pt-10 border-t border-white/5">
                {/* Weak Points to Improve */}
                <div>
                    <h3 className="text-[18px] font-bold text-white mb-2">Weak Points to Improve</h3>
                    <p className="text-[13px] text-dim mb-8">Focus on your most difficult categories.</p>
                    
                    <div className="flex flex-col gap-4">
                        {[
                            { title: 'Listening', desc: 'Missed 4 out of 10', progress: 60, icon: Headphones, color: 'bg-blue-500' },
                            { title: 'Grammar', desc: 'Articles & prepositions', progress: 45, icon: Book, color: 'bg-violet-500' },
                            { title: 'Speaking', desc: 'Verb conjugations', progress: 70, icon: MessageSquare, color: 'bg-amber-500' },
                        ].map(item => (
                            <SpotlightCard key={item.title} className="p-5 border border-white/5 bg-[#0F172A]/40 flex items-center gap-6">
                                <div className="w-12 h-12 rounded-[14px] bg-white/5 flex items-center justify-center text-mist">
                                    <item.icon size={22} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-end mb-2.5">
                                        <div>
                                            <h4 className="text-[15px] font-bold text-white mb-0.5">{item.title}</h4>
                                            <p className="text-[12px] text-dim font-medium">{item.desc}</p>
                                        </div>
                                        <span className="text-[13px] text-white font-bold">{item.progress}%</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.progress}%` }} />
                                    </div>
                                </div>
                                <button className="px-5 py-2.5 rounded-xl border border-white/10 text-mist text-[13px] font-bold hover:bg-white/5 transition-colors cursor-pointer">
                                    Practice
                                </button>
                            </SpotlightCard>
                        ))}
                    </div>
                </div>

                {/* Memory Strength Chart */}
                <div className="flex flex-col h-full">
                    <h3 className="text-[18px] font-bold text-white mb-2">Memory Strength</h3>
                    <p className="text-[13px] text-dim mb-8">How well you're retaining words & phrases</p>
                    
                    <SpotlightCard className="flex-1 p-8 border border-white/5 bg-[#0B1020]/20 min-h-[300px] flex flex-col">
                        <div className="relative flex-1 w-full mb-6">
                            {/* SVG Chart Placeholder */}
                            <svg className="w-full h-full overflow-visible">
                                <defs>
                                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="rgba(139, 92, 246, 0.4)" />
                                        <stop offset="100%" stopColor="transparent" />
                                    </linearGradient>
                                </defs>
                                {/* Grid Lines */}
                                {[0, 0.25, 0.5, 0.75, 1].map(y => (
                                    <line key={y} x1="0" y1={`${y * 100}%`} x2="100%" y2={`${y * 100}%`} stroke="white" strokeOpacity="0.05" />
                                ))}
                                {/* Area Path */}
                                <path
                                    d="M0,180 Q80,165 150,140 T300,90 T450,40 T600,10 L600,200 L0,200 Z"
                                    fill="url(#chartGrad)"
                                    className="opacity-50"
                                />
                                {/* Main Line */}
                                <path
                                    d="M0,180 Q80,165 150,140 T300,90 T450,40 T600,10"
                                    fill="none" stroke="url(#lineGrad)" strokeWidth="3"
                                    className="drop-shadow-[0_0_10px_rgba(139,92,246,0.6)]"
                                >
                                    <animate attributeName="stroke-dasharray" from="0,1000" to="1000,0" dur="2s" />
                                </path>
                                <linearGradient id="lineGrad" x1="0" x2="1">
                                    <stop offset="0%" stopColor="#38BDF8" />
                                    <stop offset="100%" stopColor="#8B5CF6" />
                                </linearGradient>
                                {/* Data Points */}
                                {[
                                    { x: 0, y: 180, d: 'Day 1' },
                                    { x: 150, y: 140, d: 'Day 3' },
                                    { x: 300, y: 90, d: 'Day 7' },
                                    { x: 450, y: 40, d: 'Day 14' },
                                    { x: 600, y: 10, d: 'Day 21' }
                                ].map((pt, i) => (
                                    <g key={i}>
                                        <circle cx={pt.x} cy={pt.y} r="5" className="fill-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
                                        <text x={pt.x} y="225" textAnchor="middle" className="fill-[#64748B] text-[11px] font-bold uppercase tracking-wider">{pt.d}</text>
                                    </g>
                                ))}
                            </svg>
                        </div>
                        
                        <div className="flex items-center justify-between w-full pt-6 border-t border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[12px] font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                    <Check size={14} className="stroke-[3]" /> Good retention!
                                </div>
                                <p className="text-[12.5px] text-dim font-medium">Keep reviewing to reach <span className="text-white font-bold">90%</span></p>
                            </div>
                        </div>
                    </SpotlightCard>
                </div>
            </div>
        </div>
    );
}
