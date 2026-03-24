import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SpotlightCard } from '../ui/SpotlightCard';

export function DailyGoalCard() {
    const { activeLanguage } = useLanguage();
    const { progress } = activeLanguage;
    const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };
    const progressPercentage = (progress.todayMinutes / progress.dailyGoalMinutes) * 100;

    return (
        <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
            <SpotlightCard className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-[11px] text-dim font-bold uppercase tracking-wider mb-1.5">Daily Goal</p>
                        <div className="flex items-baseline gap-1.5 pt-1">
                            <span className="text-[42px] leading-none font-extrabold tracking-tight text-mist">{progress.todayMinutes}</span>
                            <span className="text-[16px] text-dim-dark font-medium">/ {progress.dailyGoalMinutes} minutes</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-1.5 text-amber text-[12px] font-bold mb-1 justify-end">
                            <Flame size={13} fill="currentColor" /> Current Streak
                        </div>
                        <div className="flex items-baseline gap-1.5 justify-end">
                            <span className="text-[28px] leading-none font-extrabold text-amber">{progress.currentStreak}</span>
                            <span className="text-[14px] text-dim font-medium">days</span>
                        </div>
                        <p className="text-[11px] text-dim-dark mt-1">Longest: {progress.longestStreak} days</p>
                    </div>
                </div>
                <div className="h-2 rounded-full bg-black/40 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] overflow-hidden mb-2.5">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
                        transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
                        className="h-full rounded-full bg-[linear-gradient(90deg,#8B5CF6,#22D3EE)] shadow-[0_0_12px_rgba(34,211,238,0.5)]"
                    />
                </div>
                <p className="text-[12px] text-dim font-medium">{progress.todayMinutes} min completed</p>
            </SpotlightCard>
        </motion.div>
    );
}
