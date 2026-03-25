import { Cpu, Gauge, PauseCircle, PlayCircle } from 'lucide-react';
import { SpotlightCard } from '../ui/SpotlightCard';
import { useRuntime } from '../../contexts/RuntimeContext';
import type { RuntimeBackgroundMode } from '../../runtime';

const MODE_ORDER: RuntimeBackgroundMode[] = ['off', 'light', 'active'];

function nextMode(current: RuntimeBackgroundMode): RuntimeBackgroundMode {
  const index = MODE_ORDER.indexOf(current);
  const nextIndex = (index + 1) % MODE_ORDER.length;
  return MODE_ORDER[nextIndex];
}

export function RuntimeStatusCard() {
  const { status, setMode } = useRuntime();

  return (
    <SpotlightCard className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-cyan-300" />
          <p className="text-[12px] font-bold uppercase tracking-wider text-dim">Runtime</p>
        </div>
        <span className="pill" style={{ background: 'var(--color-slate)', color: 'var(--color-dim)' }}>
          {status.mode}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[12px] text-dim">
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
          <p>Queued</p>
          <p className="text-[16px] font-bold text-white">{status.queuedCount}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
          <p>Running</p>
          <p className="text-[16px] font-bold text-white">{status.runningCount}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[12px] text-dim">
        <Gauge size={14} className={status.throttled ? 'text-amber-300' : 'text-emerald-300'} />
        <span>{status.throttled ? 'Throttled for foreground activity' : 'Running at configured speed'}</span>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[12px] text-dim">
        {status.suppressedByForeground ? (
          <PauseCircle size={14} className="text-amber-300" />
        ) : (
          <PlayCircle size={14} className="text-emerald-300" />
        )}
        <span>
          {status.suppressedByForeground
            ? 'Foreground model calls are suppressing background work'
            : 'Background processing is not suppressed'}
        </span>
      </div>

      <button
        type="button"
        className="page-primary-action mt-4 w-full justify-center"
        onClick={() => setMode(nextMode(status.mode))}
      >
        Cycle Mode
      </button>
    </SpotlightCard>
  );
}
