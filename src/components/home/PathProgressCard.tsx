import { motion } from 'framer-motion';
import { useCurriculum } from '../../contexts/CurriculumContext';
import { SpotlightCard } from '../ui/SpotlightCard';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCardBackground } from '../../hooks/useCardBackground';
import CachedMediaImage from '../ui/CachedMediaImage';

export function PathProgressCard() {
    const { activeLanguage } = useLanguage();
    const { pathProgress } = useCurriculum();
    const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };
    const hasProgress = pathProgress.totalLessons > 0;
    const background = useCardBackground({
        itemKey: `path:${activeLanguage.code}`,
        itemType: 'path',
        languageCode: activeLanguage.code,
        languageName: activeLanguage.name,
        title: `${activeLanguage.name} path progress`,
        topicTags: ['learning path', 'culture', 'landscape'],
        cardType: 'path_progress',
        mood: 'atmospheric premium',
        fallbackAsset: '/continue_learning.png',
    });
    
    const isFallback = !background.selection || background.selection.provider === 'fallback';

    return (
        <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
            <h3 className="text-[15px] font-bold mb-3 text-[#FAFAFA]">Path Progress</h3>
            {!hasProgress && (
                <div className="card p-4 text-[13px] text-dim mb-3">
                    No curriculum progress yet. Complete your first lesson to start this tracker.
                </div>
            )}
            <SpotlightCard className="p-0 relative overflow-hidden">
                {!isFallback && <CachedMediaImage src={background.source} alt={`${activeLanguage.name} path`} className="absolute inset-0 h-full w-full object-cover opacity-30" />}
                <div className={`absolute inset-0 ${isFallback ? 'bg-gradient-to-r from-[#171033] via-[#0b1020] to-[#0A0F24]' : 'bg-gradient-to-t from-[#0b1020]/90 via-[#0b1020]/65 to-[#0b1020]/35'}`} />
                <div className="px-6 pt-5 pb-4">
                    <div className="relative h-6 mb-2">
                        {/* Floating conversational pill */}
                        <div
                            className="absolute bottom-0 flex flex-col items-center whitespace-nowrap"
                            style={{ left: `${Math.min(Math.max(pathProgress.overallProgress, 15), 85)}%`, transform: 'translateX(-50%)' }}
                        >
                            <span className="py-1 px-3 rounded-lg bg-cyan-dim text-cyan text-[12px] font-bold shadow-[0_0_12px_rgba(34,211,238,0.2)]">
                                Conversational
                            </span>
                        </div>
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
                    <div className="flex justify-between items-center mt-3">
                        <span className="text-[13px] text-mist font-semibold">Beginner</span>
                        <span className="text-[13px] text-dim font-semibold">Fluent</span>
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
