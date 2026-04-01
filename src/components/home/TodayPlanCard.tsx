import { Link } from 'react-router-dom';
import { SpotlightCard } from '../ui/SpotlightCard';
import { useLanguageProgression } from '../../hooks/useLanguageProgression';

export function TodayPlanCard() {
  const progression = useLanguageProgression();

  return (
    <SpotlightCard className="p-6">
      <p className="text-[11px] text-dim font-bold uppercase tracking-wider mb-2">Today</p>
      <h3 className="text-[22px] font-bold text-white">Guided Daily Plan</h3>
      <p className="mt-1 text-[13px] text-dim">
        Required: {progression.requiredMinutes} min • Optional: {progression.optionalMinutes} min • Target: {progression.targetMinutes} min
      </p>

      <div className="mt-4 space-y-2">
        {progression.todayPlan.map((item) => (
          <div key={item.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-mist flex items-center justify-between gap-3">
            <span>{item.label}</span>
            <span className="text-dim">{item.required ? 'Required' : 'Optional'} • {item.estimatedMinutes}m</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[13px] text-dim">Recommended next action: {progression.recommendedNextAction.label}</p>
        <Link className="no-underline" to={progression.recommendedNextAction.to}>
          <button className="page-primary-action">Continue</button>
        </Link>
      </div>
    </SpotlightCard>
  );
}