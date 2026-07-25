import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { seededShuffle } from '../../../../utils/seededRandom';
import { hintPropsFor, seedFor, type LearnExerciseProps } from '../types';
import { HintSection } from '../../shared/HintSection';
import { InteractiveText } from '../../shared/InteractiveText';

/**
 * Match each left item to its right item.
 *
 * Two things were wrong before. The right column was shuffled with `Math.random()`
 * inside an effect keyed on the pairs array, so it reshuffled whenever the payload
 * object identity changed — options moved under the learner's cursor. And the hint
 * block was a direct child of a two-column CSS grid, so it landed in the grid as a
 * third cell instead of below the exercise.
 *
 * Both columns are now shuffled with a task-stable seed, a match can be undone, and
 * the columns are wrapped so the hints sit underneath.
 */
export function PairMatchExercise({
  payload,
  disabled,
  onDraftChange,
  onHintLevelOpened,
}: LearnExerciseProps) {
  const pairs = useMemo(() => payload.pairs ?? [], [payload.pairs]);
  const seed = seedFor(payload);

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const leftItems = useMemo(
    () => seededShuffle(pairs.map((pair) => pair.left), `${seed}:left`),
    [pairs, seed],
  );
  const rightItems = useMemo(
    () => seededShuffle(pairs.map((pair) => pair.right), `${seed}:right`),
    [pairs, seed],
  );

  useEffect(() => {
    setSelectedLeft(null);
    setMapping({});
  }, [seed]);

  const ready = useMemo(
    () => pairs.length > 0 && pairs.every((pair) => Boolean(mapping[pair.left])),
    [mapping, pairs],
  );

  useEffect(() => {
    onDraftChange({
      canonicalAnswer: JSON.stringify(mapping),
      structuredResponse: { mapping },
      ready,
    });
  }, [mapping, onDraftChange, ready]);

  const assign = (right: string) => {
    if (!selectedLeft) return;
    setMapping((previous) => {
      const next = { ...previous };
      // A right item can only be used once, so release any earlier claim on it.
      for (const key of Object.keys(next)) {
        if (next[key] === right) delete next[key];
      }
      next[selectedLeft] = right;
      return next;
    });
    setSelectedLeft(null);
  };

  const unassign = (left: string) => {
    setMapping((previous) => {
      const next = { ...previous };
      delete next[left];
      return next;
    });
  };

  const matchedRights = new Set(Object.values(mapping));

  return (
    <div className="grid gap-3">
      <p className="text-[12px] text-dim">
        {selectedLeft ? 'Now pick its match on the right.' : 'Pick an item on the left, then its match on the right.'}
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid content-start gap-2">
          {leftItems.map((left) => {
            const matched = mapping[left];
            const isSelected = selectedLeft === left;
            return (
              <div
                key={left}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
                  isSelected
                    ? 'border-cyan-400/60 bg-cyan-400/15'
                    : matched
                      ? 'border-emerald-400/35 bg-emerald-400/10'
                      : 'border-white/10 bg-white/[0.04]'
                }`}
              >
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelectedLeft(isSelected ? null : left)}
                  className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
                >
                  <InteractiveText text={left} languageCode={payload.languageCode} className="text-[14px] text-mist" />
                  {matched && (
                    <span className="mt-0.5 block truncate text-[11px] text-emerald-200/80">→ {matched}</span>
                  )}
                </button>
                {matched && !disabled && (
                  <button
                    type="button"
                    aria-label={`Clear match for ${left}`}
                    onClick={() => unassign(left)}
                    className="shrink-0 rounded-md p-1 text-dim transition-colors hover:text-white"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid content-start gap-2">
          {rightItems.map((right) => {
            const used = matchedRights.has(right);
            return (
              <button
                key={right}
                type="button"
                disabled={disabled || !selectedLeft}
                onClick={() => assign(right)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  used ? 'border-emerald-400/35 bg-emerald-400/10 opacity-70' : 'border-white/10 bg-white/[0.04]'
                } ${selectedLeft && !disabled ? 'hover:border-cyan-400/40 hover:bg-cyan-400/10' : ''} disabled:cursor-not-allowed`}
              >
                <InteractiveText text={right} languageCode={payload.languageCode} className="text-[14px] text-mist" />
              </button>
            );
          })}
        </div>
      </div>

      <HintSection {...hintPropsFor(payload)} disabled={disabled} onHintLevelOpened={onHintLevelOpened} />
    </div>
  );
}
