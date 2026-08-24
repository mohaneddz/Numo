import { motion } from 'framer-motion';
import { ChevronRight, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { SpotlightCard } from '../ui/SpotlightCard';
import { useCardBackground } from '../../hooks/useCardBackground';
import { useCurriculumState } from '../../hooks/useCurriculumState';
import CachedMediaImage from '../ui/CachedMediaImage';

/**
 * Resume the theme in progress.
 *
 * `activeLanguage.continueLearning` was populated with placeholder text ("<Language>
 * Core Path", "Start your next lesson", progress 0) and its Continue button routed
 * through an action template that carried a module *name* rather than an id, so it
 * could not resume anything specific. This reads the real theme and step.
 */
export function ContinueLearningCard() {
  const { activeLanguage } = useLanguage();
  const navigate = useNavigate();
  const { roadmap, selectedTheme, nextStep, loading } = useCurriculumState();
  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

  const background = useCardBackground(
    roadmap
      ? {
          itemKey: `continue:${activeLanguage.code}:${selectedTheme.id}`,
          itemType: 'course',
          languageCode: activeLanguage.code,
          languageName: activeLanguage.name,
          title: selectedTheme.title,
          lessonTitle: nextStep?.step.title,
          description: selectedTheme.shortDescription,
          topicTags: ['course', 'culture', 'study'],
          cardType: 'continue_learning',
          mood: 'cinematic subtle',
          fallbackAsset: '/continue_learning.png',
        }
      : null,
  );
  const isFallback = !background.selection || background.selection.provider === 'fallback';

  if (loading || !roadmap || !nextStep) return null;

  const percent = roadmap.totalSteps > 0 ? Math.round((roadmap.completedSteps / roadmap.totalSteps) * 100) : 0;

  return (
    <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
      <h3 className="mb-3 text-[15px] font-bold text-[#FAFAFA]">Continue Learning</h3>

      <SpotlightCard interactive className="p-0">
        <div className="flex h-full w-full">
          <div className="h-[160px] w-[200px] shrink-0 overflow-hidden rounded-l-[inherit]">
            {isFallback ? (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1E1B4B] to-[#0A0F24]">
                <span className="text-[72px] opacity-80 drop-shadow-lg">{activeLanguage.flag}</span>
              </div>
            ) : (
              <CachedMediaImage
                src={background.source}
                alt={selectedTheme.title}
                className="h-full w-full object-cover"
              />
            )}
          </div>

          <div className="flex flex-1 flex-col justify-between px-6 py-5">
            <div>
              <h4 className="mb-1 text-[18px] font-bold text-mist">{selectedTheme.title}</h4>
              <p className="text-[13px] text-dim">Up next: {nextStep.step.title}</p>
            </div>

            <div className="flex items-center gap-5">
              <div className="flex-1">
                <div className="mb-2 h-[5px] overflow-hidden rounded-full bg-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full bg-[#8B5CF6] shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                  />
                </div>
                <p className="text-[12px] font-medium text-dim">
                  Checkpoint {roadmap.completedCheckpoints + 1} of {roadmap.checkpoints.length}
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative z-10 inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-[linear-gradient(135deg,#8B5CF6,#9333EA)] px-6 py-2.5 text-[14px] font-bold text-white shadow-[0_4px_12px_rgba(139,92,246,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]"
                onClick={() => navigate(`/learn/session?stepId=${encodeURIComponent(nextStep.step.id)}`)}
              >
                <Zap size={14} fill="currentColor" /> Continue
              </motion.button>
            </div>
          </div>

          <div className="flex shrink-0 items-center pr-4 text-dim-dark">
            <ChevronRight size={18} />
          </div>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}
