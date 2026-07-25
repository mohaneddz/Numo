import { motion } from 'framer-motion';
import { SpotlightCard } from '../ui/SpotlightCard';
import { useCurriculumState } from '../../hooks/useCurriculumState';

/** Colour ramp from weak (rose) to solid (emerald). */
function strengthColor(strength: number): string {
  if (strength < 40) return '#F87171';
  if (strength < 60) return '#FBBF24';
  if (strength < 82) return '#818CF8';
  return '#34D399';
}

/**
 * Category-level strengths, computed from actual attempts.
 *
 * The percentages here used to come from `CurriculumContext`, which was either
 * empty (the normal case) or filled by an LLM that had been asked to produce
 * "realistic numbers" for Listening/Speaking/Vocabulary/Grammar — four fixed
 * categories with invented values that had never been measured.
 */
export function FocusAreasCard() {
  const { focusAreas, loading } = useCurriculumState();
  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

  // Weakest first, capped so the card stays scannable.
  const areas = focusAreas.slice(0, 5);

  return (
    <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
      <SpotlightCard className="p-5">
        <h3 className="mb-4 text-[15px] font-bold text-[#FAFAFA]">Focus Areas</h3>

        {loading && <p className="text-[13px] text-dim">Loading your progress…</p>}

        {!loading && areas.length === 0 && (
          <p className="text-[13px] text-dim">
            Nothing measured yet. Finish a session and the areas you are weakest in will show up here.
          </p>
        )}

        <div className="flex flex-col gap-3.5">
          {areas.map((area) => {
            const color = strengthColor(area.strength);
            return (
              <div key={area.category}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-medium text-mist">{area.title}</span>
                  <span className="shrink-0 text-[13px] font-bold text-mist">{area.strength}%</span>
                </div>
                <div className="h-[5px] overflow-hidden rounded-full bg-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(2, area.strength)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-dim">
                  {area.skillsTracked} {area.skillsTracked === 1 ? 'skill' : 'skills'} tracked
                  {area.skillsWeak > 0 && ` · ${area.skillsWeak} needing work`}
                </p>
              </div>
            );
          })}
        </div>
      </SpotlightCard>
    </motion.div>
  );
}
