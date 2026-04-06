import { useEffect, useMemo, useState } from 'react';
import type { LearnExerciseProps } from '../types';
import { HintSection } from '../../shared/HintSection';
import { InteractiveText } from '../../shared/InteractiveText';

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function PairMatchExercise({ payload, disabled, onDraftChange }: LearnExerciseProps) {
  const pairs = payload.pairs ?? [];
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [rightItems, setRightItems] = useState<string[]>([]);

  useEffect(() => {
    setSelectedLeft(null);
    setMapping({});
    setRightItems(shuffle(pairs.map((pair) => pair.right)));
  }, [payload.promptText, pairs]);

  const ready = useMemo(() => pairs.length > 0 && pairs.every((pair) => Boolean(mapping[pair.left])), [mapping, pairs]);

  useEffect(() => {
    onDraftChange({
      canonicalAnswer: JSON.stringify(mapping),
      structuredResponse: {
        mapping,
      },
      ready,
    });
  }, [mapping, onDraftChange, ready]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="grid gap-2">
        {pairs.map((pair) => (
          <button
            key={pair.left}
            type="button"
            disabled={disabled}
            onClick={() => setSelectedLeft(pair.left)}
            className="w-full rounded-lg border px-3 py-2 text-left"
            style={{
              borderColor: selectedLeft === pair.left ? 'rgba(34,211,238,0.6)' : 'rgba(255,255,255,0.12)',
              background: mapping[pair.left] ? 'rgba(34,211,238,0.14)' : 'rgba(255,255,255,0.04)',
              color: 'var(--color-mist)',
            }}
          >
            <div><InteractiveText text={pair.left} languageCode={payload.languageCode} /></div>
            <div className="mt-1 text-[12px] text-dim">{mapping[pair.left] ? `Matched: ${mapping[pair.left]}` : 'Select then pick right item'}</div>
          </button>
        ))}
      </div>
      <div className="grid gap-2">
        {rightItems.map((right) => (
          <button
            key={right}
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
            className="w-full rounded-lg border px-3 py-2 text-left"
            style={{
              borderColor: Object.values(mapping).includes(right) ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.12)',
              background: Object.values(mapping).includes(right) ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)',
              color: 'var(--color-mist)',
            }}
          >
            <InteractiveText text={right} languageCode={payload.languageCode} />
          </button>
        ))}
      </div>
      <HintSection hints={payload.distractors} languageCode={payload.languageCode} />
    </div>
  );
}
