import { motion } from 'framer-motion';
import { Mic, Zap, AlertTriangle, ChevronRight } from 'lucide-react';
import { SpotlightCard } from '../ui/SpotlightCard';

export function EchoActionCard() {
    const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

    const startQuickPractice = () => console.log('Starting Quick Practice...');
    const startSpeakingSession = () => console.log('Starting Speaking Session...');
    const analyzeRecentMistakes = () => console.log('Analyzing Recent Mistakes...');

    return (
        <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="relative group">
            <SpotlightCard overflowHidden={false} className="p-6 border border-white/5 shadow-2xl relative bg-[#0A0C10]/40 backdrop-blur-md">
                <div className="relative z-10 flex flex-col pt-2">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-cyan/10 flex items-center justify-center text-cyan shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                            <Zap size={20} fill="currentColor" />
                        </div>
                        <div>
                            <h3 className="text-[20px] font-black text-white tracking-tight">Echo</h3>
                            <p className="text-[12px] text-cyan font-bold uppercase tracking-widest">Active Guide</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={startQuickPractice}
                            className="w-full py-4 px-5 rounded-2xl bg-violet/10 hover:bg-violet/20 border border-violet/20 flex items-center justify-between group/btn transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-3 text-violet font-bold text-[14px]">
                                <Zap size={16} fill="currentColor" />
                                Quick Practice
                            </div>
                            <ChevronRight size={16} className="text-violet/50 group-hover/btn:translate-x-1 transition-transform" />
                        </button>

                        <button 
                            onClick={startSpeakingSession}
                            className="w-full py-4 px-5 rounded-2xl bg-cyan/10 hover:bg-cyan/20 border border-cyan/20 flex items-center justify-between group/btn transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-3 text-cyan font-bold text-[14px]">
                                <Mic size={16} fill="currentColor" />
                                Live Conversation
                            </div>
                            <ChevronRight size={16} className="text-cyan/50 group-hover/btn:translate-x-1 transition-transform" />
                        </button>

                        <button 
                            onClick={analyzeRecentMistakes}
                            className="w-full py-4 px-5 rounded-2xl bg-coral/10 hover:bg-coral/20 border border-coral/20 flex items-center justify-between group/btn transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-3 text-coral font-bold text-[14px]">
                                <AlertTriangle size={16} fill="currentColor" />
                                Review Mistakes
                            </div>
                            <ChevronRight size={16} className="text-coral/50 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Echo mascot - refined positioning */}
                <div className="absolute top-[-30px] right-[-15px] w-[140px] h-[140px] flex items-center justify-center z-20 pointer-events-none transition-transform group-hover:scale-105 duration-500">
                    <img
                        src="/figure/excited.png"
                        alt="Echo"
                        className="w-[120px] h-[120px] object-contain drop-shadow-[0_0_30px_rgba(34,211,238,0.5)]"
                    />
                </div>
            </SpotlightCard>
        </motion.div>
    );
}
