import { motion } from 'framer-motion';
import { SpotlightCard } from '../ui/SpotlightCard';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCardBackground } from '../../hooks/useCardBackground';
import { useCurriculumState } from '../../hooks/useCurriculumState';
import { THEMES } from '../../services/curriculum';
import CachedMediaImage from '../ui/CachedMediaImage';

/** Phase labels come from the theme data rather than a fixed three-stop scale. */
const PHASE_LABELS: Record<string, string> = {
  survival_entry: 'Survival',
  everyday_life: 'Everyday',
  personal_world: 'Personal',
  wider_world: 'Wider world',
  abstract_fluency: 'Fluency',
};

/**
 * Position along the 30-theme path.
 *
 * The old card read from an empty context, so the bar sat at 0% with "0 / 0 lessons
 * completed", and a "Conversational" pill was positioned over it as a hardcoded
 * literal regardless of the learner's actual level.
 */
export function PathProgressCard() {
  const { activeLanguage } = useLanguage();
  const { progression, selectedTheme, overallProgress, loading } = useCurriculumState();
  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

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

  // Progress along the path is themes completed, not an invented percentage.
  const themesCompleted = Math.max(0, progression.unlockedThemeOrder - 1);
  const pathPercent = Math.round((themesCompleted / THEMES.length) * 100);
  const currentPhase = PHASE_LABELS[selectedTheme.phase] ?? selectedTheme.phase.replace(/_/g, ' ');

  return (
    <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
      <h3 className="mb-3 text-[15px] font-bold text-[#FAFAFA]">Path Progress</h3>

      <SpotlightCard className="relative overflow-hidden p-0">
        {!isFallback && (
          <CachedMediaImage
            src={background.source}
            alt={`${activeLanguage.name} path`}
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        )}
        <div
          className={`absolute inset-0 ${
            isFallback
              ? 'bg-gradient-to-r from-[#171033] via-[#0b1020] to-[#0A0F24]'
              : 'bg-gradient-to-t from-[#0b1020]/90 via-[#0b1020]/65 to-[#0b1020]/35'
          }`}
        />

        <div className="relative px-6 pb-4 pt-5">
          <div className="relative mb-2 h-6">
            {/* The marker sits at the learner's real position and names their real phase. */}
            <div
              className="absolute bottom-0 flex flex-col items-center whitespace-nowrap"
              style={{ left: `${Math.min(Math.max(pathPercent, 12), 88)}%`, transform: 'translateX(-50%)' }}
            >
              <span className="rounded-lg bg-cyan-dim px-3 py-1 text-[12px] font-bold capitalize text-cyan shadow-[0_0_12px_rgba(34,211,238,0.2)]">
                {currentPhase}
              </span>
            </div>
          </div>

          <div className="relative flex h-2.5 items-center overflow-visible rounded-full bg-black/40 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(2, pathPercent)}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="relative h-full rounded-full bg-[linear-gradient(90deg,#8B5CF6,#22D3EE)] shadow-[0_0_14px_rgba(34,211,238,0.6)]"
            >
              <div className="absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
            </motion.div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-mist">Theme 1</span>
            <span className="text-[13px] font-semibold text-dim">Theme {THEMES.length}</span>
          </div>
        </div>

        <div className="relative flex justify-between border-t border-white/5 bg-black/20 px-6 py-3">
          <span className="text-[12px] font-medium text-dim">
            {loading ? 'Loading…' : `Theme ${selectedTheme.order} of ${THEMES.length}`}
          </span>
          <span className="text-[12px] font-medium text-dim">
            {overallProgress.skillsMastered}/{overallProgress.skillsStarted || 0} skills solid
          </span>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}
