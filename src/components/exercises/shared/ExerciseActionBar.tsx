import type { ReactNode } from 'react';
import { AlertOctagon, Lightbulb, SkipForward, Volume2 } from 'lucide-react';

interface ExerciseActionBarProps {
  onHint?: () => void;
  onSkip?: () => void;
  onConfused?: () => void;
  onHear?: () => void;
  hintLabel?: string;
  skipLabel?: string;
  confusedLabel?: string;
  hearLabel?: string;
}

function ActionButton({ onClick, label, icon }: { onClick: () => void; label: string; icon: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-mist hover:bg-white/10"
    >
      <span className="flex items-center gap-1.5">{icon}{label}</span>
    </button>
  );
}

export function ExerciseActionBar({
  onHint,
  onSkip,
  onConfused,
  onHear,
  hintLabel = 'Hint',
  skipLabel = 'Skip',
  confusedLabel = "I'm confused",
  hearLabel = 'Hear',
}: ExerciseActionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {onHint ? <ActionButton onClick={onHint} label={hintLabel} icon={<Lightbulb size={13} />} /> : null}
      {onSkip ? <ActionButton onClick={onSkip} label={skipLabel} icon={<SkipForward size={13} />} /> : null}
      {onConfused ? <ActionButton onClick={onConfused} label={confusedLabel} icon={<AlertOctagon size={13} />} /> : null}
      {onHear ? <ActionButton onClick={onHear} label={hearLabel} icon={<Volume2 size={13} />} /> : null}
    </div>
  );
}
