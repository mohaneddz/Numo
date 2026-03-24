import { motion } from 'framer-motion';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { Check, ChevronDown, ChevronRight, Play, User, Zap } from 'lucide-react';

const fadeUp = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: 'easeOut' },
};

export default function LearnPage() {
    return (
        <div className="max-w-[1000px] mx-auto pb-24 relative mt-4">
            {/* Header Area matching Mockup */}
            <div className="flex justify-between items-center mb-10 pl-2">
                <h1 className="text-[32px] font-bold tracking-tight text-white">Learn</h1>
                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 px-5 py-2 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold text-[14px] hover:bg-blue-600/30 transition-colors">
                        <Zap size={16} fill="currentColor" /> Quick Start
                    </button>
                </div>
            </div>

            {/* Top Hero Progress Banner */}
            <motion.div {...fadeUp}>
                <SpotlightCard className="mb-14 w-full border border-white/5">
                    <div className="relative z-10 p-8 flex flex-col md:flex-row gap-8 items-center bg-[radial-gradient(100%_100%_at_top_left,rgba(34,211,238,0.08),transparent)]">
                        {/* Glowing Mascot Orb */}
                        <div className="w-[120px] h-[120px] shrink-0 relative flex items-center justify-center">
                            <img src="/figure/excited.png" alt="Echo" className="w-[110px] h-[110px] object-contain drop-shadow-[0_0_40px_rgba(34,211,238,0.8)]" />
                            <div className="absolute inset-0 rounded-full border border-cyan-400/30 shadow-[0_0_50px_rgba(34,211,238,0.2)]" />
                        </div>

                        <div className="flex-1 w-full pt-2">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-[26px] font-bold text-white tracking-tight mb-1.5">Traveler Dialogues — Module 3</h2>
                                    <p className="text-[#94a3b8] text-[15px] font-medium">Ordering food & casual dining</p>
                                </div>
                                <div className="px-5 py-2 rounded-full border border-white/10 bg-[#0F172A]/50 backdrop-blur-md">
                                    <span className="text-[13px] text-white font-medium">Total Time: 2.8 <span className="text-dim text-[11px] uppercase tracking-wide ml-0.5">hours</span></span>
                                </div>
                            </div>

                            {/* Neon Progress Bar */}
                            <div className="relative h-[6px] rounded-full bg-[#1E293B] mb-4 border border-white/5 mx-1">
                                <div className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 w-[70%] shadow-[0_0_20px_rgba(34,211,238,0.6)]" />
                                {/* Glowing Orb Handle */}
                                <div className="absolute top-1/2 -translate-y-1/2 left-[70%] -translate-x-1/2 w-5 h-5 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,1),0_0_0_6px_rgba(34,211,238,0.3)]" />
                            </div>
                            
                            <div className="flex justify-between items-center text-[13px] text-[#94a3b8] font-medium px-1">
                                <span>Target: 1.5 Hours / Week</span>
                                <span>Total Time: 2.8 Hours</span>
                            </div>
                        </div>
                    </div>
                </SpotlightCard>
            </motion.div>

            {/* The Learning Path Timeline */}
            <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="relative pl-[40px] md:pl-[80px]">
                {/* Main Vertical Spine Line */}
                <div className="absolute top-4 bottom-12 left-[19px] md:left-[39px] w-[2px] bg-gradient-to-b from-blue-500 via-cyan-500/30 to-transparent" />

                {/* Node 1: Module 1 */}
                <div className="relative mb-16">
                    {/* Node Icon */}
                    <div className="absolute -left-[35px] md:-left-[55px] top-0.5 w-[32px] h-[32px] rounded-full bg-[#1E1B4B] border-2 border-indigo-500 flex items-center justify-center shadow-[0_0_25px_rgba(99,102,241,0.6)] z-10">
                        <Check size={16} className="text-white" strokeWidth={3} />
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <h3 className="text-[18px] font-bold text-white tracking-tight">Module 1</h3>
                        <ChevronDown size={18} className="text-dim" />
                    </div>

                    {/* Module 1 Sub-tree */}
                    <div className="relative pl-6 md:pl-10">
                        {/* Horizontal connection line */}
                        <div className="absolute top-[20px] -left-10 w-8 h-[2px] bg-white/10" />
                        
                        <div className="flex flex-col md:flex-row gap-6 md:gap-14 items-start">
                            {/* Water Cooler Node */}
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-[10px] h-[10px] rounded-full bg-[#34D399] shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
                                    <span className="text-[14px] text-white font-medium">Water Cooler Talk</span>
                                </div>
                                <div className="inline-flex flex-1 min-w-[190px] items-center justify-between bg-[#161B2C] border border-white/5 rounded-2xl px-4 py-3 shadow-lg">
                                    <div className="flex items-center gap-3 text-mist hover:text-white transition-colors cursor-pointer">
                                        <div className="w-5 h-5 rounded-full bg-[#38BDF8]/20 flex items-center justify-center"><Check size={12} className="text-[#38BDF8] stroke-[3]" /></div>
                                        <span className="text-[14px] font-bold tracking-wide">Beginner</span>
                                    </div>
                                    <ChevronRight size={18} className="text-dim" />
                                </div>
                            </div>

                            {/* Floating node mockups */}
                            <div className="flex flex-col gap-3 mt-1">
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="bg-[#161B2C] border border-white/5 rounded-xl px-4 py-2 flex items-center gap-3">
                                        <Check size={14} className="text-white" />
                                        <span className="text-[13px] text-mist font-bold">Sort Cooler Talk</span>
                                        <span className="text-[12px] text-dim ml-1 font-medium">30%</span>
                                    </div>
                                    <ChevronRight size={16} className="text-dim" />
                                    <div className="bg-[#161B2C]/50 border border-indigo-500/20 rounded-xl px-4 py-2 flex items-center gap-3 text-mist">
                                        <span className="text-[13px] text-mist font-medium">Loss 2 Compact</span>
                                        <span className="text-[12px] text-indigo-400 ml-1 font-bold flex items-center gap-1"><Check size={12}/>31%</span>
                                    </div>
                                </div>
                                <p className="text-[12.5px] text-[#64748B] leading-relaxed mt-3 ml-2 w-full max-w-[280px]">
                                    Review custom concepts:<br/>
                                    13% complete • interference matches
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Node 2: Module 3 (Active) */}
                <div className="relative mb-20">
                    {/* Node Icon - Active Cyan */}
                    <div className="absolute -left-[35px] md:-left-[55px] top-1 w-[32px] h-[32px] rounded-full bg-[#0F172A] border-2 border-[#38BDF8] flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.5)] z-10">
                        <div className="w-3 h-3 rounded-full bg-[#38BDF8] shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
                    </div>

                    <div className="flex items-center gap-4 mb-8">
                        <h3 className="text-[18px] font-bold text-white tracking-tight">Module 3</h3>
                        {/* Horizontal connection line to the card */}
                        <div className="flex-1 h-[2px] bg-gradient-to-r from-blue-500/40 to-transparent ml-2 max-w-[300px]" />
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        {/* Vertical text indicator */}
                        <div className="text-[13px] text-[#94a3b8] mt-12 md:mr-4 font-medium whitespace-nowrap">
                            Lesson 8 of 12
                        </div>

                        {/* Active Module Spotlight Card */}
                        <SpotlightCard className="flex-1 w-full max-w-[600px] border border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.1)]">
                            <div className="relative z-10 bg-[#0A0F1E]/60 backdrop-blur-xl p-5 flex flex-col md:flex-row gap-5 items-center">
                                {/* Top-right user icon representation inside card */}
                                <div className="absolute top-4 left-4 md:static md:top-auto md:left-auto flex items-center gap-1 text-dim text-[12px] font-medium mr-2">
                                    <User size={14} /> 2
                                </div>
                                
                                <div className="w-full md:w-[100px] h-[100px] rounded-[18px] overflow-hidden shrink-0 shadow-lg mt-6 md:mt-0">
                                    <img src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=300&auto=format&fit=crop" alt="Restaurant" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 w-full py-1">
                                    <div className="flex justify-between items-start mb-1.5">
                                        <h4 className="text-[18px] font-bold text-white leading-tight">Traveler Dialogues – Module 3</h4>
                                        <ChevronRight size={20} className="text-dim hidden md:block" />
                                    </div>
                                    <p className="text-[14px] text-[#94a3b8] mb-5">Ordering food & casual dining</p>
                                    
                                    <div className="flex items-center justify-between border-t border-white/5 pt-4">
                                        <div className="text-[13px] text-[#94a3b8] font-medium">
                                            Target: 8 of 12 <span className="mx-2 text-dim">•</span> 1 min
                                        </div>
                                        <button className="bg-gradient-to-r from-violet-600 to-indigo-600 border border-violet-400/30 text-white text-[13px] font-bold px-6 py-2.5 rounded-full flex items-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:scale-105 transition-transform cursor-pointer">
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/80" /> Continue <ChevronRight size={14} className="ml-0.5 opacity-80" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </SpotlightCard>
                    </div>
                </div>

                {/* Node 3: Mission */}
                <div className="relative mb-28">
                    {/* Node Icon */}
                    <div className="absolute -left-[35px] md:-left-[55px] top-6 w-[32px] h-[32px] rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.6)] z-10 border-[3px] border-[#050816]">
                        <Check size={16} className="text-white" strokeWidth={3} />
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center gap-6 mb-4">
                        <div className="flex items-center gap-4">
                            <h3 className="text-[18px] font-bold text-white tracking-tight">Mission</h3>
                            <div className="flex items-center w-[60px] md:w-[80px]">
                                <div className="h-[2px] bg-cyan-500 w-full" />
                                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,1)] shrink-0" />
                            </div>
                        </div>
                        
                        {/* Mission Item Card */}
                        <div className="bg-[#161B2C] border border-indigo-500/20 rounded-2xl p-2.5 pr-5 flex items-center gap-4 w-full md:w-[280px] cursor-pointer hover:bg-white/5 transition-colors shadow-lg shadow-indigo-500/5">
                            <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=150&auto=format&fit=crop" className="w-[60px] h-[45px] rounded-lg object-cover" />
                            <div className="flex-1">
                                <h5 className="text-[15px] text-white font-bold tracking-tight">Check-in</h5>
                                <p className="text-[12.5px] text-[#94a3b8]">Intermediate</p>
                            </div>
                            <ChevronRight size={18} className="text-[#94a3b8]" />
                        </div>

                        {/* Start Mission Button aside */}
                        <div className="ml-2 cursor-pointer group mt-4 md:mt-0">
                            <div className="flex items-center gap-2 text-mist font-bold text-[16px] mb-1.5 group-hover:text-white transition-colors">
                                <div className="w-5 h-5 rounded-full border border-mist flex items-center justify-center">
                                    <Play size={10} fill="currentColor" className="ml-0.5" />
                                </div>
                                Start Mission
                            </div>
                            <p className="text-[13px] text-[#64748B] font-medium ml-7">Your progress 8 of the Encounters</p>
                        </div>
                    </div>
                </div>

                {/* Node 4: Review */}
                <div className="relative mb-20 hidden md:block">
                    <div className="absolute -left-[24px] md:-left-[44px] top-2 w-[10px] h-[10px] rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.8)] z-10" />
                    <h3 className="text-[16px] font-bold text-white tracking-tight">Review</h3>
                </div>
            </motion.div>

            {/* Bottom Section Stack */}
            <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="w-full flex flex-col gap-8 max-w-[900px] mx-auto relative z-20">
                
                {/* Giant Mission Card */}
                <SpotlightCard interactive className="p-0 border border-white/5 overflow-hidden w-full">
                    <div className="relative z-10 flex flex-col md:flex-row w-full bg-[#0B1020]/90">
                        {/* Left Side Content */}
                        <div className="flex-1 p-8 md:p-10 border-b md:border-b-0 md:border-r border-white/5 flex flex-col">
                            <h2 className="text-[20px] font-bold text-white mb-6 tracking-tight">Mission: <span className="text-mist font-normal">Hotel Stay</span></h2>
                            
                            <div className="w-full aspect-[16/8] md:h-[220px] rounded-2xl overflow-hidden mb-8 border border-white/10 shadow-2xl shrink-0">
                                <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover" />
                            </div>
                            
                            <div className="flex justify-between items-center mb-1 w-full">
                                <h3 className="text-[24px] font-bold text-white tracking-tight">Mission: Hotel Stay</h3>
                                <ChevronRight size={24} className="text-[#94a3b8]" />
                            </div>
                            <p className="text-[15px] text-[#94a3b8] font-medium mb-8">
                                ± 5 min <span className="mx-2 opacity-50">•</span> <Check size={14} className="inline text-[#94a3b8] mb-0.5 mx-0.5" /> Intermediate
                            </p>

                            <div className="flex items-center gap-5 mt-auto w-full">
                                <button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold px-8 py-3.5 rounded-[14px] shadow-[0_0_20px_rgba(139,92,246,0.5)] hover:bg-opacity-90 transition-colors cursor-pointer text-[15px]">
                                    Start Mission
                                </button>
                                <span className="text-[#94a3b8] text-[14px] font-medium">- <Check size={14} className="inline pb-0.5"/> 15 min</span>
                                <div className="ml-auto px-4 py-2 rounded-xl bg-[#161B2C] border border-white/5 text-[#94a3b8] text-[13px] font-bold">
                                    40 XP
                                </div>
                            </div>
                        </div>

                        {/* Mascot Side */}
                        <div className="w-full md:w-[380px] p-8 flex flex-col items-center justify-center relative bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.1),transparent_70%)]">
                            <div className="relative w-[220px] h-[220px] flex items-center justify-center mb-10">
                                <img src="/figure/happy.png" className="w-[180px] h-[180px] object-contain drop-shadow-[0_0_40px_rgba(139,92,246,0.8)] z-10" />
                                <div className="absolute bottom-6 w-[120px] h-[15px] bg-violet-500/40 blur-[15px] rounded-full z-0" />
                                <div className="absolute bottom-8 w-[50px] h-[4px] bg-cyan-400/60 blur-[4px] rounded-full z-0" />
                            </div>

                            <div className="bg-[#161B2C] border border-white/10 p-5 rounded-2xl w-full shadow-lg">
                                <div className="flex items-center gap-3 mb-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-[#0B1020] border border-cyan-500/20 flex items-center justify-center shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                                        <img src="/figure/happy.png" className="w-5 h-5 object-contain" />
                                    </div>
                                    <h4 className="text-[16px] font-bold text-[#38BDF8] tracking-tight">Echo's-hint</h4>
                                </div>
                                <p className="text-[13.5px] text-[#94a3b8] leading-relaxed">
                                    We're speaking the waiter in the hotel. Let's practice speaking with these dialogues and phrases you'll use!
                                </p>
                            </div>
                        </div>
                    </div>
                </SpotlightCard>

                {/* Checkpoint 3 Card */}
                <SpotlightCard interactive className="p-0 border border-white/5 w-full">
                    <div className="relative z-10 w-full p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-[#0B1020]/90">
                        <div className="w-full">
                            <div className="flex justify-between items-center mb-6 md:mb-4">
                                <h3 className="text-[20px] font-bold text-white tracking-tight">Review: <span className="text-mist font-normal">Checkpoint 3</span></h3>
                                <ChevronRight size={20} className="text-[#94a3b8] block md:hidden" />
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-[14px] text-[#94a3b8] bg-[#050816]/50 md:bg-transparent p-3 md:p-0 rounded-xl">
                                <span className="text-mist font-medium tracking-wide">Premier: 8 in traleasing</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                <span className="bg-blue-600/30 text-blue-400 px-3 py-1 rounded-lg flex items-center gap-1.5 font-bold border border-blue-500/20 shadow-[0_0_10px_rgba(37,99,235,0.2)]"><Check size={14} className="stroke-[3]"/> 8-9</span>
                                <span className="italic opacity-80 font-medium">Wing more</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <button className="bg-[#1E293B] hover:bg-[#334155] border border-white/10 text-white font-bold px-10 py-3.5 rounded-[14px] transition-colors cursor-pointer w-full md:w-auto text-[15px] flex items-center justify-center">
                                Start Mission
                            </button>
                            <ChevronRight size={20} className="text-[#94a3b8] hidden md:block ml-2" />
                        </div>
                    </div>
                </SpotlightCard>

            </motion.div>
        </div>
    );
}
