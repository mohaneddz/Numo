import { motion } from 'framer-motion';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { 
    Zap, Settings, Search, ChevronRight, ChevronDown, Play, 
    Bookmark, Volume2, Maximize2, Menu, Bell, Check
} from 'lucide-react';

const fadeUp = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: 'easeOut' },
};

const fallbackImage = '/continue_learning.png';

export default function ImmersePage() {
    const handleImageError = (e: any) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = fallbackImage;
    };

    return (
        <PageContent className="pb-24 relative">
            <PageActions>
                <button className="flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-600/20 px-5 py-2 text-[14px] font-bold text-blue-400 transition-colors hover:bg-blue-600/30 cursor-pointer">
                    <Zap size={16} fill="currentColor" /> Smart Review
                </button>
                <button className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-dim transition-colors hover:text-white cursor-pointer">
                    <Settings size={18} />
                </button>
            </PageActions>

            {/* Main Two-Column Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
                
                {/* LEFT COLUMN: Content Discovery */}
                <div className="flex flex-col gap-10">
                    {/* Sticky Search & Filter Bar */}
                    <div className="sticky top-0 z-20 rounded-2xl border border-white/5 bg-[#0F172A]/80 backdrop-blur-xl p-4 flex flex-col items-start gap-4">
                        <div className="flex w-full gap-4">
                            <div className="flex-1 flex items-center gap-3 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5">
                                <Search size={18} className="text-dim" />
                                <input 
                                    type="text" 
                                    placeholder="Search stories, clips, phrases..." 
                                    className="bg-transparent border-none outline-none text-white text-[14px] w-full placeholder:text-dim"
                                />
                            </div>
                            <div className="flex items-center gap-3 px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
                                <span className="text-[14px] text-dim font-medium">Sort:</span>
                                <span className="text-[14px] text-mist font-bold">Latest</span>
                                <ChevronDown size={16} className="text-dim" />
                            </div>
                        </div>

                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                                {['Stories', 'Dialogues', 'Podcasts', 'Clips'].map((pill, i) => (
                                    <button key={pill} className={`px-5 py-2 rounded-full text-[14px] font-bold whitespace-nowrap transition-colors ${i === 0 ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-dim border border-transparent hover:text-white hover:bg-white/5 hover:border-white/10'}`}>
                                        {pill}
                                    </button>
                                ))}
                            </div>
                            <button className="w-8 h-8 flex items-center justify-center text-dim hover:text-white transition-colors">
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                    
                    {/* Featured Hero Story */}
                    <motion.div {...fadeUp}>
                        <SpotlightCard interactive className="p-0 border border-white/10 overflow-hidden w-full h-[280px] group cursor-pointer relative shadow-[0_0_40px_rgba(0,0,0,0.3)]">
                            <img src="https://images.unsplash.com/photo-1583422409516-15ep9a6b4p56?q=80&w=1200&auto=format&fit=crop" onError={handleImageError} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Barcelona" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1020] via-[#0B1020]/40 to-transparent" />
                            
                            <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col">
                                <h2 className="text-[28px] font-bold text-white tracking-tight mb-4 drop-shadow-lg">La noche en Barcelona</h2>
                                <div className="flex items-center gap-4 text-[13px] font-medium text-mist w-full">
                                    <span>5 min</span>
                                    <span className="text-dim uppercase tracking-wider text-[11px] font-bold">Intermediate</span>
                                    
                                    {/* Inline Progress Bar */}
                                    <div className="flex-1 h-1.5 bg-white/10 rounded-full mx-2 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
                                        <div className="h-full bg-indigo-500 w-[90%] shadow-[0_0_10px_rgba(99,102,241,0.8)] rounded-full" />
                                    </div>
                                    <span className="font-bold text-white">90%</span>
                                </div>
                            </div>
                        </SpotlightCard>
                    </motion.div>

                    {/* Recommended Dialogues Grid */}
                    <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
                        <h3 className="text-[16px] font-bold text-white mb-5 pl-2">Recommended Dialogues</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {/* Card 1 */}
                            <SpotlightCard interactive className="p-0 border border-white/5 overflow-hidden flex flex-col group cursor-pointer">
                                <div className="h-[140px] w-full overflow-hidden relative">
                                    <img src="https://images.unsplash.com/photo-1539037116277-4db20d00923d?q=80&w=600&auto=format&fit=crop" onError={handleImageError} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Madrid" />
                                </div>
                                <div className="p-5 flex flex-col bg-[#0F172A]/70 flex-1">
                                    <h4 className="text-[16px] font-bold text-white mb-3 tracking-tight">Walk through Madrid</h4>
                                    <div className="flex items-center justify-between text-[12px] font-medium text-dim mb-4">
                                        <span>8 min</span>
                                        <span className="uppercase tracking-wide text-[10px] font-bold bg-white/5 px-2 py-1 rounded-md">Intermediate</span>
                                        <span className="text-mist font-bold">90%</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                        <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 w-[90%]" />
                                        </div>
                                    </div>
                                </div>
                            </SpotlightCard>

                            {/* Card 2 */}
                            <SpotlightCard interactive className="p-0 border border-white/5 overflow-hidden flex flex-col group cursor-pointer">
                                <div className="h-[140px] w-full overflow-hidden relative">
                                    <img src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=600&auto=format&fit=crop" onError={handleImageError} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Cafe" />
                                </div>
                                <div className="p-5 flex flex-col bg-[#0F172A]/70 flex-1">
                                    <h4 className="text-[16px] font-bold text-white mb-3 tracking-tight">Working from the Cafe</h4>
                                    <div className="flex items-center justify-between text-[12px] font-medium text-dim mb-4">
                                        <span>7 min</span>
                                        <span className="uppercase tracking-wide text-[10px] font-bold bg-white/5 px-2 py-1 rounded-md">Upper Beginner</span>
                                        <span className="text-mist font-bold">78%</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                        <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 w-[78%]" />
                                        </div>
                                    </div>
                                </div>
                            </SpotlightCard>
                        </div>

                        {/* Card 3 (Wide Full) */}
                        <div className="mt-5">
                            <SpotlightCard interactive className="p-0 border border-white/5 overflow-hidden flex flex-col group cursor-pointer w-full">
                                <div className="h-[180px] w-full overflow-hidden relative">
                                    <img src="https://plus.unsplash.com/premium_photo-1661962360541-0b5c192997bf?q=80&w=1200&auto=format&fit=crop" onError={handleImageError} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Night street" />
                                </div>
                                <div className="p-5 flex flex-col bg-[#0F172A]/70 h-auto">
                                    <h4 className="text-[16px] font-bold text-white mb-3 tracking-tight">Conversational Flow</h4>
                                    <div className="flex items-center justify-between text-[12px] font-medium text-dim">
                                        <div className="flex gap-4">
                                            <span>6 min</span>
                                            <span className="uppercase tracking-wide text-[10px] font-bold bg-white/5 px-2 py-1 rounded-md">Intermediate</span>
                                            <span className="text-mist font-bold">51%</span>
                                        </div>
                                        <div className="w-[180px] h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                                            <div className="h-full bg-violet-500 w-[51%]" />
                                        </div>
                                        <span className="text-mist text-[12px] font-bold shadow-[0_0_10px_rgba(255,255,255,0.2)]">51%</span>
                                    </div>
                                </div>
                            </SpotlightCard>
                        </div>
                    </motion.div>

                    {/* Conversational Clips Grid */}
                    <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
                        <h3 className="text-[16px] font-bold text-white mb-5 pl-2">Conversational Clips</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {[
                                { title: 'Restaurant Dialogue', time: '5 min', lvl: 'Intermediate', p: '51%', img: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=600' },
                                { title: 'Cultural Faux Pas', time: '2 min', lvl: 'Upper Beginner', p: '28%', img: 'https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=600' }
                            ].map((clip, i) => (
                                <SpotlightCard key={i} interactive className="p-0 border border-white/5 overflow-hidden flex flex-col group cursor-pointer relative aspect-video">
                                    <img src={clip.img} onError={handleImageError} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1020]/90 to-transparent" />
                                    
                                    {/* Centered Play Button for Clips */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-14 h-14 rounded-full bg-blue-600/40 border border-blue-400/50 flex items-center justify-center backdrop-blur-md shadow-[0_0_30px_rgba(37,99,235,0.6)] group-hover:scale-110 transition-transform">
                                            <Play size={24} fill="white" strokeWidth={0} className="text-white ml-1 opacity-90" />
                                        </div>
                                    </div>

                                    <div className="absolute bottom-0 left-0 w-full p-4 flex flex-col">
                                        <h4 className="text-[15px] font-bold text-white mb-2 tracking-tight">{clip.title}</h4>
                                        <div className="flex items-center gap-3 text-[11px] font-medium text-dim">
                                            <span>{clip.time}</span>
                                            <span className="uppercase tracking-wide font-bold bg-[#161B2C]/80 border border-white/5 px-2 py-0.5 rounded text-indigo-300">{clip.lvl}</span>
                                            <span className="text-mist font-bold ml-auto">{clip.p}</span>
                                        </div>
                                    </div>
                                </SpotlightCard>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* RIGHT COLUMN: Active Sidebar */}
                <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="flex flex-col gap-6">
                    
                    {/* Active Media Header */}
                    <SpotlightCard className="p-0 border border-indigo-500/20 overflow-hidden shadow-[0_0_30px_rgba(99,102,241,0.1)]">
                        <div className="h-[220px] w-full relative">
                            <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop" onError={handleImageError} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/30 to-transparent" />
                        </div>
                        <div className="p-5 flex flex-col bg-[#0F172A]">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-[18px] font-bold text-white tracking-tight leading-snug">Un familiar reencuentro</h3>
                                <ChevronRight size={18} className="text-dim" />
                            </div>
                            <div className="flex items-center justify-between text-[12px] font-medium">
                                <div className="flex items-center gap-2 text-blue-400 font-bold">
                                    <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                        <Check size={10} strokeWidth={4} />
                                    </div>
                                    Upper Beginner
                                </div>
                                <div className="flex items-center justify-between gap-3 flex-1 ml-6">
                                    <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 w-[60%]" />
                                    </div>
                                    <span className="text-mist font-bold">60%</span>
                                </div>
                            </div>
                        </div>
                    </SpotlightCard>

                    {/* Transcript Box */}
                    <div>
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-[16px] font-bold text-white">Transcript</h3>
                            <div className="flex items-center gap-2 bg-[#161B2C] border border-white/5 rounded-lg px-2 py-1 text-dim text-[12px] cursor-pointer hover:bg-white/5 transition-colors">
                                <Volume2 size={14} /> <span className="mx-1">~</span> <Maximize2 size={12} />
                            </div>
                        </div>
                        <SpotlightCard className="p-5 border border-white/5 bg-[#0F172A]/40 min-h-[160px] flex flex-col justify-between">
                            <div className="flex flex-col gap-5 text-[14px] text-[#94a3b8] leading-relaxed mb-6 font-medium">
                                <p>- Hola, Marta. Hace una bella noche.</p>
                                <p className="text-mist bg-white/5 p-2 rounded-lg -mx-2 px-2 shadow-[inset_2px_0_0_rgba(139,92,246,1)]">- Si, hace una noche fantástica.<br/>¿Qué tal tu dia?</p>
                            </div>
                            
                            <div className="flex items-center justify-between border-t border-white/5 pt-4">
                                <div className="flex items-center gap-3">
                                    <button className="flex items-center gap-2 text-dim text-[13px] font-medium hover:text-white transition-colors">
                                        <Menu size={16} /> Save Phrase
                                    </button>
                                    <button className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-mist text-[12px] font-bold hover:bg-white/10 transition-colors">
                                        Save
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-dim hover:text-white"><Settings size={14}/></button>
                                    <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-dim hover:text-white"><Bookmark size={14}/></button>
                                </div>
                            </div>
                        </SpotlightCard>
                    </div>

                    {/* Highlighted Phrase Breakthrough */}
                    <SpotlightCard className="p-5 border border-indigo-500/20 bg-[#0A0D18] shadow-[0_0_20px_rgba(99,102,241,0.05)]">
                        <h4 className="text-[17px] font-bold text-white mb-4">Hace una bella noche</h4>
                        
                        <div className="flex justify-between items-start border-b border-white/5 pb-5 mb-5">
                            <div>
                                <p className="text-[14px] text-mist font-medium mb-1">• A beautiful night</p>
                                <p className="text-[11px] text-dim opacity-70 italic tracking-wider">Literally: Make a night fantastic</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 shadow-[0_0_15px_rgba(79,70,229,0.3)] cursor-pointer">
                                <Volume2 size={16} fill="currentColor" />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mb-4 text-[13px]">
                            <span className="text-dim">3 Tags:</span>
                            <span className="px-2 py-0.5 rounded bg-white/5 text-mist text-[12px]">Situation</span>
                        </div>

                        <div className="flex items-center justify-between text-[12px] font-medium text-dim">
                            <div className="flex items-center gap-2">
                                Memory Status 
                                <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                    <Bell size={12} />
                                </span>
                            </div>
                            <span>Active for 3 days</span>
                        </div>
                    </SpotlightCard>

                    {/* Mined Vocab */}
                    <div>
                        <h3 className="text-[16px] font-bold text-white mb-3 px-1">Mined Vocab</h3>
                        <div className="flex flex-col gap-2">
                            {[
                                { w: 'bonito', t: '[adj] beautiful, lovely' },
                                { w: 'la puesta del sol', t: '[n,f] sunset' },
                                { w: 'la ciudad', t: '[n,f] city, town' }
                            ].map(v => (
                                <SpotlightCard key={v.w} className="p-3.5 px-5 border border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer">
                                    <div>
                                        <span className="text-[14px] font-bold text-white mr-2">{v.w}</span>
                                        <span className="text-[13px] text-dim font-medium">{v.t}</span>
                                    </div>
                                    <button className="px-4 py-1.5 rounded-lg bg-[#1E293B] group-hover:bg-indigo-600 border border-white/5 text-mist text-[12px] font-bold transition-all">
                                        Save
                                    </button>
                                </SpotlightCard>
                            ))}
                        </div>
                    </div>

                    {/* Echo's Tip (Bottom Right) */}
                    <div className="mt-4 relative p-6 bg-[radial-gradient(ellipse_at_bottom_right,rgba(34,211,238,0.1),transparent)] border border-[#38BDF8]/20 rounded-2xl flex gap-4 overflow-hidden shadow-[inset_0_0_40px_rgba(139,92,246,0.05)]">
                        <div className="flex-1 relative z-10">
                            <h4 className="text-[14px] font-bold text-[#38BDF8] mb-2 tracking-tight">Echo's Tip</h4>
                            <p className="text-[13px] text-dim leading-relaxed font-medium">
                                Pick up phrases that stand out to you today. They go direct to your notebook, ready for review later.
                            </p>
                        </div>
                        <img src="/figure/happy.png" className="w-[80px] h-[80px] object-contain drop-shadow-[0_0_20px_rgba(34,211,238,0.6)] absolute -bottom-2 -right-2 z-10" />
                    </div>

                </motion.div>
            </div>
        </PageContent>
    );
}
