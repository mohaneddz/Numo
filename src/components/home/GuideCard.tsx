import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { SpotlightCard } from '../ui/SpotlightCard';

export function GuideCard() {
    const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

    return (
        <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="relative">
            <SpotlightCard overflowHidden={false} className="p-6 border border-white/5 shadow-2xl">
                <div className="relative z-10 flex flex-col h-full min-h-[160px]">
                    <div className="pr-[110px] mb-auto">
                        <p className="text-[14px] text-dim font-medium mb-1">Your Guide</p>
                        <h3 className="text-[28px] font-extrabold mb-2 tracking-tight text-white">Echo</h3>
                        <p className="text-[15px] text-dim-dark leading-relaxed pr-2">
                            You're in flow state tonight. Ready when you are.
                        </p>
                    </div>

                    {/* Listening Confidence Pill */}
                    <div className="mt-6 w-full py-3 px-4 rounded-2xl bg-black/40 border border-white/5 flex items-center gap-3 backdrop-blur-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                        <div className="w-8 h-8 rounded-lg bg-cyan/10 flex items-center justify-center text-cyan shadow-[0_0_12px_rgba(34,211,238,0.2)]">
                            <ArrowUpRight size={18} />
                        </div>
                        <span className="text-[13px] font-bold text-cyan tracking-tight">
                            Listening confidence up 12%
                        </span>
                    </div>
                </div>

                {/* Echo mascot */}
                <div className="absolute top-0 right-[-10px] w-[150px] h-[150px] flex items-center justify-center z-20 pointer-events-none">
                    <img
                        src="/figure/excited.png"
                        alt="Echo"
                        className="w-[130px] h-[130px] object-contain drop-shadow-[0_0_30px_rgba(34,211,238,0.6)] drop-shadow-[0_0_80px_rgba(34,211,238,0.4)]"
                    />
                    {/* Glow under mascot */}
                    <div className="absolute bottom-[20px] left-1/2 -translate-x-1/2 w-[100px] h-[30px] rounded-full blur-[20px] bg-cyan/40 opacity-60" />
                    <div className="absolute bottom-[25px] left-1/2 -translate-x-1/2 w-[60px] h-[10px] rounded-full blur-[8px] bg-cyan/60" />
                </div>
            </SpotlightCard>
        </motion.div>
    );
}
