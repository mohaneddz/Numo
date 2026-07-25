import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { SpotlightCard } from '../ui/SpotlightCard';
import { useCurriculumState } from '../../hooks/useCurriculumState';

/**
 * Today's study time against the goal.
 *
 * The minutes, streak and goal all came from `activeLanguage.progress`, whose goal
 * defaults to 0 — so the percentage was `todayMinutes / 0`, rendering a NaN-width
 * progress bar for every new learner. Minutes and streaks are now read from
 * persisted progression, and the goal comes from the learner's own onboarding
 * choice with a floor so the division is always defined.
 */
export function DailyGoalCard() {
  const { minutesToday, currentStreak, longestStreak, settings } = useCurriculumState();
  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

  const goalMinutes = Math.max(5, settings.sessionMinutes);
  const percentage = Math.min(100, Math.round((minutesToday / goalMinutes) * 100));
  const metGoal = minutesToday >= goalMinutes;

  return (
    <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
      <SpotlightCard className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-dim">Daily Goal</p>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-[42px] font-extrabold leading-none tracking-tight text-mist">{minutesToday}</span>
              <span className="text-[16px] font-medium text-dim-dark">/ {goalMinutes} minutes</span>
            </div>
          </div>

          <div className="text-right">
            <div className="mb-1 flex items-center justify-end gap-1.5 text-[12px] font-bold text-amber">
              <Flame size={13} fill="currentColor" /> Current Streak
            </div>
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-[28px] font-extrabold leading-none text-amber">{currentStreak}</span>
              <span className="text-[14px] font-medium text-dim">{currentStreak === 1 ? 'day' : 'days'}</span>
            </div>
            <p className="mt-1 text-[11px] text-dim-dark">
              {longestStreak > 0 ? `Longest: ${longestStreak} days` : 'Finish today to start a streak'}
            </p>
          </div>
        </div>

        <div className="mb-2.5 h-2 overflow-hidden rounded-full bg-black/40 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
            className="h-full rounded-full bg-[linear-gradient(90deg,#8B5CF6,#22D3EE)] shadow-[0_0_12px_rgba(34,211,238,0.5)]"
          />
        </div>

        <p className="text-[12px] font-medium text-dim">
          {metGoal
            ? `Goal met — ${minutesToday} min today.`
            : minutesToday === 0
              ? 'Not started today.'
              : `${goalMinutes - minutesToday} min to go.`}
        </p>
      </SpotlightCard>
    </motion.div>
  );
}
