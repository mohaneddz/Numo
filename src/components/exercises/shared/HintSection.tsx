import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { InteractiveText } from './InteractiveText';
import { buildHints, type BuildHintsInput } from '../../../services/exercises/hintService';

interface HintSectionProps extends BuildHintsInput {
  /** Reports how many hint levels the learner has opened, for grading and signals. */
  onHintLevelOpened?: (level: number) => void;
  disabled?: boolean;
}

/**
 * Progressive hints, revealed one level at a time.
 *
 * This component previously received `payload.distractors` — the list of wrong
 * answers — and displayed them all at once under a "Hints" heading, which solved
 * multiple-choice tasks by elimination. Hints are now derived from the task's own
 * teaching note, translation and answer shape, and never contain the full answer.
 */
export function HintSection({ onHintLevelOpened, disabled, ...hintInput }: HintSectionProps) {
  const [revealed, setRevealed] = useState(0);
  const hints = buildHints(hintInput);

  if (hints.length === 0) return null;

  const nextHint = hints[revealed];
  const openNext = () => {
    if (!nextHint) return;
    const level = revealed + 1;
    setRevealed(level);
    onHintLevelOpened?.(level);
  };

  return (
    <div className="mt-2">
      {revealed > 0 && (
        <div className="mb-2 space-y-1.5">
          {hints.slice(0, revealed).map((hint) => (
            <div key={hint.level} className="rounded-md border border-blue-400/25 bg-blue-500/10 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-300/80">{hint.label}</p>
              <p className="mt-0.5 text-[13px] text-blue-100">
                <InteractiveText text={hint.text} languageCode={hintInput.languageCode} />
              </p>
            </div>
          ))}
        </div>
      )}

      {nextHint && !disabled && (
        <button
          type="button"
          onClick={openNext}
          className="text-[12px] text-blue-300 transition-colors hover:text-blue-200"
        >
          <span className="flex items-center gap-1">
            <Lightbulb size={12} />
            {revealed === 0 ? 'Show a hint' : `Show another hint (${revealed}/${hints.length})`}
          </span>
        </button>
      )}
    </div>
  );
}
