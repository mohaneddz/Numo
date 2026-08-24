import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Headphones, Mic, RotateCcw, Target, Zap, type LucideIcon } from 'lucide-react';
import { SpotlightCard } from '../ui/SpotlightCard';
import { useAppData } from '../../contexts/AppDataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCurriculumState } from '../../hooks/useCurriculumState';
import { buildRecommendations } from '../../services/curriculum';

const ICONS: Record<string, LucideIcon> = {
  headphones: Headphones,
  mic: Mic,
  'book-open': BookOpen,
  book: BookOpen,
  target: Target,
  'rotate-ccw': RotateCcw,
};

/**
 * Recommendations, each one a real action.
 *
 * This section previously read from `CurriculumContext`, which nothing populated
 * outside a debug button, so in normal use it rendered only its empty state. Cards
 * now come from the learner model and every one navigates somewhere that exists.
 */
export function RecommendedSection() {
  const navigate = useNavigate();
  const { activeLanguage } = useLanguage();
  const { dueCount } = useAppData();
  const { roadmap, nextStep, mastery, seenSkills, loading } = useCurriculumState();
  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

  const recommendations = buildRecommendations({
    roadmap,
    nextStep,
    mastery,
    seenSkills,
    dueReviewCount: dueCount,
    languageName: activeLanguage.name,
  });

  return (
    <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
      <h3 className="mb-4 text-[17px] font-bold text-[#FAFAFA]">Recommended for You</h3>

      {loading && <div className="card p-4 text-[13px] text-dim">Working out what to suggest…</div>}

      {!loading && recommendations.length === 0 && (
        <div className="card p-4 text-[13px] text-dim">
          Nothing to suggest right now — you are up to date. Start a new theme when you are ready.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {recommendations.map((card) => {
          const Icon = ICONS[card.icon] ?? Zap;
          return (
            <SpotlightCard
              key={card.id}
              interactive
              className="group h-full w-full"
              onClick={() => navigate(card.to)}
            >
              <div className="relative flex h-full min-h-[160px] w-full items-start gap-4 p-5">
                <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-[18px] bg-[#161B2C] shadow-[inset_0_2px_4px_rgba(255,255,255,0.06)] ring-1 ring-white/5">
                  <Icon size={26} className="text-[#A78BFA]" strokeWidth={2} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-[#A78BFA]">{card.reason}</p>
                  <h4 className="mb-1.5 truncate pr-8 text-[16px] font-bold tracking-tight text-white">{card.title}</h4>
                  <p className="mb-4 line-clamp-2 text-[13.5px] font-medium text-slate-400/90">{card.description}</p>

                  <div className="mt-auto flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-[10px] border border-white/5 bg-[#161B2C] px-3 py-1.5">
                      <span className="h-3 w-1.5 rounded-full bg-[#6366F1]" />
                      <span className="text-[12px] font-bold text-[#8C9FC0]">{card.duration}</span>
                    </span>
                    <span className="inline-flex items-center rounded-[10px] border border-white/5 bg-[#161B2C] px-4 py-1.5">
                      <span className="text-[12px] font-bold text-[#8C9FC0]">{card.level}</span>
                    </span>
                  </div>
                </div>

                <div className="absolute right-5 top-5 shrink-0 text-slate-600/70 transition-colors group-hover:text-slate-400">
                  <ArrowRight size={22} strokeWidth={2} />
                </div>
              </div>
            </SpotlightCard>
          );
        })}
      </div>
    </motion.div>
  );
}
