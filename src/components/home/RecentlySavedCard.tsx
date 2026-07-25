import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SpotlightCard } from '../ui/SpotlightCard';
import { useAppData } from '../../contexts/AppDataContext';

/**
 * The most recently saved notebook entries.
 *
 * This read `recentlySaved` from `CurriculumContext`, which nothing ever wrote to,
 * so the card showed its empty state permanently even for a learner with a full
 * notebook. It now reads the notebook itself, and each chip opens the entry.
 */
export function RecentlySavedCard() {
  const navigate = useNavigate();
  const { state } = useAppData();
  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

  const recent = [...state.notebookEntries]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  return (
    <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
      <SpotlightCard className="p-5">
        <div className="mb-3.5 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-[#FAFAFA]">Recently Saved</h3>
          {state.notebookEntries.length > 0 && (
            <button
              type="button"
              onClick={() => navigate('/notebook')}
              className="text-[11px] font-semibold text-dim transition-colors hover:text-mist"
            >
              View all
            </button>
          )}
        </div>

        {recent.length === 0 && (
          <p className="text-[13px] text-dim">
            Nothing saved yet. Tap any word during a lesson or in immersion to keep it here.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {recent.map((entry) => (
            <motion.button
              key={entry.id}
              type="button"
              whileHover={{ scale: 1.05, y: -2, boxShadow: '0 4px 16px rgba(139,92,246,0.15)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/notebook/${entry.id}`)}
              className="relative z-10 max-w-full rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-left backdrop-blur-md"
            >
              <p className="mb-0.5 truncate text-[13px] font-bold text-[#FAFAFA]">{entry.term}</p>
              <p className="truncate text-[10px] font-medium capitalize text-dim">
                {entry.translation || entry.type}
              </p>
            </motion.button>
          ))}
        </div>
      </SpotlightCard>
    </motion.div>
  );
}
