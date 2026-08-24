import { useNavigate } from 'react-router-dom';
import { Check, Lock, Play } from 'lucide-react';
import { SpotlightCard } from '../ui/SpotlightCard';
import { useCurriculumState } from '../../hooks/useCurriculumState';

/**
 * Today's plan, taken from the actual checkpoint the learner is on.
 *
 * The previous card built a fixed five-item list ("Warm-up review", "Guided
 * reading/listening input", "One focused output drill", "Quick recap
 * reinforcement", "Optional bonus practice") with fixed minute costs for every
 * learner, none of which corresponded to anything the app could actually run, and
 * whose Continue button always went to /learn regardless of the item.
 */
export function TodayPlanCard() {
  const navigate = useNavigate();
  const { roadmap, nextStep, loading } = useCurriculumState();

  const checkpoint = roadmap?.checkpoints.find((candidate) => candidate.status === 'available') ?? null;
  const steps = checkpoint?.steps ?? [];
  const remainingMinutes = steps
    .filter((step) => step.status !== 'completed')
    .reduce((total, step) => total + step.estimatedMinutes, 0);
  const completedCount = steps.filter((step) => step.status === 'completed').length;

  return (
    <SpotlightCard className="p-6">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-dim">Today</p>

      {loading && <p className="text-[13px] text-dim">Loading your plan…</p>}

      {!loading && !checkpoint && (
        <>
          <h3 className="text-[22px] font-bold text-white">Theme complete</h3>
          <p className="mt-1 text-[13px] text-dim">
            You have finished every checkpoint at this Everdark level. Open the learning path to move on.
          </p>
          <button className="page-primary-action mt-4" onClick={() => navigate('/learn')}>
            Open learning path
          </button>
        </>
      )}

      {!loading && checkpoint && (
        <>
          <h3 className="text-[22px] font-bold text-white">{checkpoint.title}</h3>
          <p className="mt-1 text-[13px] text-dim">
            Checkpoint {checkpoint.number} · {completedCount}/{steps.length} steps done · {remainingMinutes} min left
          </p>

          <div className="mt-4 space-y-2">
            {steps.map((step) => {
              const isDone = step.status === 'completed';
              const isOpen = step.status === 'available';
              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={!isOpen && !isDone}
                  onClick={() => navigate(`/learn/session?stepId=${encodeURIComponent(step.id)}`)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-[13px] transition-colors ${
                    isOpen
                      ? 'border-[#8B5CF6]/40 bg-[#8B5CF6]/10 text-mist hover:bg-[#8B5CF6]/16'
                      : isDone
                        ? 'border-emerald-400/20 bg-emerald-400/[0.06] text-mist hover:bg-emerald-400/10'
                        : 'cursor-not-allowed border-white/10 bg-white/[0.02] text-dim opacity-60'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {isDone ? (
                      <Check size={13} className="shrink-0 text-emerald-300" strokeWidth={3} />
                    ) : isOpen ? (
                      <Play size={12} className="shrink-0 text-[#A78BFA]" fill="currentColor" />
                    ) : (
                      <Lock size={12} className="shrink-0" />
                    )}
                    <span className="truncate">{step.title}</span>
                  </span>
                  <span className="shrink-0 text-dim">{step.estimatedMinutes}m</span>
                </button>
              );
            })}
          </div>

          {nextStep && (
            <button
              className="page-primary-action mt-4 w-full justify-center"
              onClick={() => navigate(`/learn/session?stepId=${encodeURIComponent(nextStep.step.id)}`)}
            >
              <Play size={14} fill="currentColor" /> Continue: {nextStep.step.title}
            </button>
          )}
        </>
      )}
    </SpotlightCard>
  );
}
