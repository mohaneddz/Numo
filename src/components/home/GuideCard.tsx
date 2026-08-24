import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { SpotlightCard } from '../ui/SpotlightCard';
import { useCurriculumState } from '../../hooks/useCurriculumState';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppData } from '../../contexts/AppDataContext';
import { buildGuideMessage } from '../../services/curriculum';

/**
 * Echo's status line.
 *
 * Every learner used to see the same two hardcoded strings: "You're in flow state
 * tonight." and "Listening confidence up 12%" — the second presented as a measured
 * metric while being a literal in the JSX. The copy is now derived from real state,
 * and the metric pill is hidden entirely when there is not enough evidence for a
 * true one.
 */
export function GuideCard() {
  const { activeLanguage } = useLanguage();
  const { dueCount } = useAppData();
  const { mastery, seenSkills, minutesToday, currentStreak } = useCurriculumState();
  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

  const message = buildGuideMessage({
    mastery,
    seenSkills,
    minutesToday,
    currentStreak,
    dueReviewCount: dueCount,
    languageName: activeLanguage.name,
  });

  return (
    <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="relative">
      <SpotlightCard overflowHidden={false} className="border border-white/5 p-6 shadow-2xl">
        <div className="relative z-10 flex h-full min-h-[160px] flex-col">
          <div className="mb-auto pr-[110px]">
            <p className="mb-1 text-[14px] font-medium text-dim">Your Guide</p>
            <h3 className="mb-2 text-[28px] font-extrabold tracking-tight text-white">Echo</h3>
            <p className="pr-2 text-[15px] leading-relaxed text-dim-dark">{message.headline}</p>
            <p className="mt-1 pr-2 text-[13px] leading-relaxed text-dim">{message.body}</p>
          </div>

          {message.highlight && (
            <div className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-black/40 px-4 py-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan/10 text-cyan shadow-[0_0_12px_rgba(34,211,238,0.2)]">
                <ArrowUpRight size={18} />
              </div>
              <span className="text-[13px] font-bold tracking-tight text-cyan">{message.highlight}</span>
            </div>
          )}
        </div>

        {/* Echo mascot */}
        <div className="pointer-events-none absolute right-[-10px] top-0 z-20 flex h-[150px] w-[150px] items-center justify-center">
          <img
            src="/figure/excited.png"
            alt="Echo"
            className="h-[130px] w-[130px] object-contain drop-shadow-[0_0_30px_rgba(34,211,238,0.6)]"
          />
          <div className="absolute bottom-[20px] left-1/2 h-[30px] w-[100px] -translate-x-1/2 rounded-full bg-cyan/40 opacity-60 blur-[20px]" />
          <div className="absolute bottom-[25px] left-1/2 h-[10px] w-[60px] -translate-x-1/2 rounded-full bg-cyan/60 blur-[8px]" />
        </div>
      </SpotlightCard>
    </motion.div>
  );
}
