import { motion } from 'framer-motion';
import { useCurriculum } from '../../contexts/CurriculumContext';
import { SpotlightCard } from '../ui/SpotlightCard';

export function PathProgressCard() {
    const { pathProgress } = useCurriculum();
    const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

    return (
        <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
            <h3 className="text-[15px] font-bold mb-3 text-[#FAFAFA]">Path Progress</h3>
            <SpotlightCard className="p-0">
                <div className="px-6 pt-5 pb-4">
                    <div className="flex justify-between items-end relative pb-5">
                        <span className="text-[13px] text-mist font-semibold">Beginner</span>
                        {/* Floating conversational pill */}
                        <div
                            className="absolute bottom-1 flex flex-col items-center"
                            style={{ left: `${pathProgress.overallProgress}%`, transform: 'translateX(-50%)' }}
                        >
                            <span className="py-1 px-3 rounded-lg bg-cyan-dim text-cyan text-[12px] font-bold mb-1 shadow-[0_0_12px_rgba(34,211,238,0.2)]">
                                Conversational
                            </span>
                        </div>
                        <span className="text-[13px] text-dim font-semibold">Fluent</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-black/40 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] overflow-visible relative flex items-center">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pathProgress.overallProgress}%` }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                            className="h-full rounded-full bg-[linear-gradient(90deg,#8B5CF6,#22D3EE)] relative shadow-[0_0_14px_rgba(34,211,238,0.6)]"
                        >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)] translate-x-1/2" />
                        </motion.div>
                    </div>
                </div>
                <div className="bg-black/20 px-6 py-3 flex justify-between border-t border-white/5">
                    <span className="text-[12px] text-dim font-medium">{pathProgress.overallProgress}% Overall Progress</span>
                    <span className="text-[12px] text-dim font-medium">
                        {pathProgress.lessonsCompleted} / {pathProgress.totalLessons} lessons completed
                    </span>
                </div>
            </SpotlightCard>
        </motion.div>
    );
}
