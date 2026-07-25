import { Bot, Save } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCurriculumState } from '../../hooks/useCurriculumState';
import { saveToDummyDataFile } from '../../utils/saveDisk';

/**
 * Development-only inspector for the curriculum engine.
 *
 * This panel used to hold a "Generate New Cards" button that called an LLM to
 * invent a curriculum — recommended activities, focus-area percentages, and a
 * "continueLearning" module with a made-up lesson number and progress bar (the
 * prompt literally asked for "realistic numbers for progress"). It wrote that into
 * CurriculumContext, which is what Home rendered. The generator and the context are
 * both gone; progression and mastery are computed from real evidence, so there is
 * nothing to fabricate and this panel only reports.
 */
export function DebugPanel() {
  const { activeLanguage } = useLanguage();
  const { progression, mastery, roadmap, focusAreas, weakSkills } = useCurriculumState();

  const handleSave = () => {
    const snapshot = {
      language: activeLanguage.code,
      exportedAt: new Date().toISOString(),
      progression,
      mastery,
      focusAreas,
      roadmap: roadmap && {
        theme: roadmap.theme.id,
        everdarkLevel: roadmap.everdarkLevel,
        checkpoints: roadmap.checkpoints.length,
        completedSteps: roadmap.completedSteps,
        totalSteps: roadmap.totalSteps,
      },
    };

    saveToDummyDataFile(
      `curriculum_state_${activeLanguage.code}.json`,
      JSON.stringify(snapshot, null, 2),
    );
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex min-w-[280px] flex-col gap-3 rounded-xl border border-white/10 bg-[#1e1e1e] p-4 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <h3 className="flex items-center gap-2 text-sm font-medium text-white">
          <Bot size={16} className="text-violet-400" />
          Curriculum state
        </h3>
        <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
          Debug
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        <dt className="text-white/40">Theme</dt>
        <dd className="text-right text-white/80">
          {progression.currentThemeOrder} / unlocked {progression.unlockedThemeOrder}
        </dd>
        <dt className="text-white/40">Everdark</dt>
        <dd className="text-right text-white/80">{progression.currentEverdarkLevel}</dd>
        <dt className="text-white/40">Steps done</dt>
        <dd className="text-right text-white/80">
          {roadmap ? `${roadmap.completedSteps} / ${roadmap.totalSteps}` : '—'}
        </dd>
        <dt className="text-white/40">Skills tracked</dt>
        <dd className="text-right text-white/80">{Object.keys(mastery).length}</dd>
        <dt className="text-white/40">Weak now</dt>
        <dd className="text-right text-white/80">{weakSkills.length}</dd>
        <dt className="text-white/40">Minutes today</dt>
        <dd className="text-right text-white/80">
          {progression.minutesByDate[new Date().toISOString().slice(0, 10)] ?? 0}
        </dd>
      </dl>

      <button
        onClick={handleSave}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
      >
        <Save size={16} />
        Export state
      </button>
    </div>
  );
}
