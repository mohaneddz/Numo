import { motion } from 'framer-motion';
import { Zap, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SpotlightCard } from '../ui/SpotlightCard';

export function ContinueLearningCard() {
    const { activeLanguage } = useLanguage();
    const { continueLearning } = activeLanguage;
    const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

    if (!continueLearning) return null;

    return (
        <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
            <h3 className="text-[15px] font-bold mb-3 text-[#FAFAFA]">Continue Learning</h3>
            <SpotlightCard interactive className="p-0">
                <div className="flex h-full w-full">
                    {/* Image thumbnail */}
                    <div className="w-[200px] h-[160px] shrink-0 overflow-hidden rounded-l-[inherit]">
                        <img
                            src="/continue_learning.png"
                            alt="Traveler Dialogues"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="px-6 py-5 flex-1 flex flex-col justify-between">
                        <div>
                            <h4 className="text-[18px] font-bold mb-1 text-mist">{continueLearning.moduleName}</h4>
                            <p className="text-dim text-[13px]">{continueLearning.description}</p>
                        </div>
                        <div className="flex items-center gap-5">
                            <div className="flex-1">
                                <div className="h-[5px] rounded-full bg-black/40 overflow-hidden mb-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${continueLearning.progress}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                        className="h-full rounded-full bg-[#8B5CF6] shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                                    />
                                </div>
                                <p className="text-[12px] text-dim font-medium">
                                    Lesson {continueLearning.currentLesson} of {continueLearning.totalLessons}
                                </p>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(139, 92, 246, 0.5), inset 0 1px 1px rgba(255,255,255,0.3)' }}
                                whileTap={{ scale: 0.95 }}
                                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[linear-gradient(135deg,#8B5CF6,#9333EA)] text-white text-[14px] font-bold shadow-[0_4px_12px_rgba(139,92,246,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/10 cursor-pointer relative z-10 shrink-0"
                            >
                                <Zap size={14} fill="currentColor" /> Continue
                            </motion.button>
                        </div>
                    </div>
                    <div className="flex items-center pr-4 text-dim-dark shrink-0">
                        <ChevronRight size={18} />
                    </div>
                </div>
            </SpotlightCard>
        </motion.div>
    );
}
