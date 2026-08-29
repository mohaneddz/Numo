import { useEffect, useMemo, useRef, useState } from 'react';
import { InteractiveText } from '../shared/InteractiveText';
import { seededShuffle } from '../../../utils/seededRandom';
import type { QuickExerciseProps } from './types';

export function MatchQuickExercise({ item, disabled, onAnswer, rapidMode }: QuickExerciseProps) {
  // Memoised so it is a stable effect dependency: `item.pairs ?? []` produced a
  // fresh array on every render, which re-ran the effect below and reshuffled
  // the answer column under the learner.
  const pairs = useMemo(() => item.pairs ?? [], [item.pairs]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [rightItems, setRightItems] = useState<string[]>([]);
  const submittedRef = useRef(false);

  useEffect(() => {
    setSelectedLeft(null);
    setMapping({});
    // Seeded from the item so the column keeps one order for this exercise.
    setRightItems(seededShuffle(pairs.map((pair) => pair.right), `match-${item.id}`));
    submittedRef.current = false;
  }, [item.id, pairs]);

  const ready = useMemo(() => pairs.length > 0 && pairs.every((pair) => Boolean(mapping[pair.left])), [mapping, pairs]);

  useEffect(() => {
    if (!rapidMode || disabled || !ready || submittedRef.current) return;
    submittedRef.current = true;
    onAnswer(JSON.stringify(mapping), { mapping });
  }, [disabled, mapping, onAnswer, rapidMode, ready]);

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          {pairs.map((pair) => (
            <button
              key={pair.left}
              type="button"
              disabled={disabled}
              onClick={() => setSelectedLeft(pair.left)}
              className="w-full text-left px-3 py-2 rounded-lg border transition-colors text-mist"
              style={{
                borderColor: selectedLeft === pair.left ? 'rgba(34,211,238,0.6)' : 'rgba(255,255,255,0.12)',
                background: mapping[pair.left] ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.04)',
              }}
            >
              <div className="font-medium"><InteractiveText text={pair.left} languageCode={item.languageCode} /></div>
              <div className="text-[12px] text-dim mt-1">{mapping[pair.left] ? `Matched: ${mapping[pair.left]}` : 'Pick then choose a right item'}</div>
            </button>
          ))}
        </div>
        <div className="grid gap-2">
          {rightItems.map((right, index) => {
            const isUsed = Object.values(mapping).includes(right);
            return (
              <button
                key={`${right}-${index}`}
                type="button"
                disabled={disabled || !selectedLeft}
                onClick={() => {
                  if (!selectedLeft) return;
                  setMapping((previous) => {
                    const next = { ...previous };
                    Object.keys(next).forEach((key) => {
                      if (next[key] === right) delete next[key];
                    });
                    next[selectedLeft] = right;
                    return next;
                  });
                  setSelectedLeft(null);
                }}
                className="w-full text-left px-3 py-2 rounded-lg border transition-colors text-mist"
                style={{
                  borderColor: isUsed ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.12)',
                  background: isUsed ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)',
                }}
              >
                <InteractiveText text={right} languageCode={item.languageCode} />
              </button>
            );
          })}
        </div>
      </div>
      {!rapidMode ? (
        <button
          type="button"
          disabled={disabled || !ready}
          onClick={() => onAnswer(JSON.stringify(mapping), { mapping })}
          className="page-primary-action justify-center w-full"
        >
          Check Matches
        </button>
      ) : null}
    </div>
  );
}
