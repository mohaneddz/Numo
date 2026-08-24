import { useEffect, useMemo, useRef, useState } from 'react';
import { InteractiveText } from '../shared/InteractiveText';
import type { QuickExerciseProps } from './types';

function countMap(items: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item, (map.get(item) ?? 0) + 1);
  }
  return map;
}

export function PhraseAssemblyQuickExercise({ item, disabled, onAnswer, rapidMode }: QuickExerciseProps) {
  const [built, setBuilt] = useState<string[]>([]);
  const tokens = item.tokens ?? item.answer.split(/\s+/).filter(Boolean);
  const submittedRef = useRef(false);

  useEffect(() => {
    setBuilt([]);
    submittedRef.current = false;
  }, [item.id]);

  const remaining = useMemo(() => {
    const remainingCounts = countMap(tokens);
    for (const token of built) {
      remainingCounts.set(token, (remainingCounts.get(token) ?? 0) - 1);
    }
    return tokens.filter((token) => (remainingCounts.get(token) ?? 0) > 0);
  }, [built, tokens]);

  useEffect(() => {
    const isComplete = tokens.length > 0 && built.length === tokens.length;
    if (!rapidMode || disabled || !isComplete || submittedRef.current) return;
    submittedRef.current = true;
    onAnswer(built.join(' ').trim(), { orderedTokens: built });
  }, [built, disabled, onAnswer, rapidMode, tokens.length]);

  return (
    <div className="grid gap-3">
      <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-mist min-h-[44px]">
        {built.length > 0 ? (
          <InteractiveText text={built.join(' ')} languageCode={item.languageCode} className="text-[14px]" />
        ) : (
          <span className="text-dim text-[13px]">Build your phrase...</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {remaining.map((token, index) => (
          <button
            key={`${token}-${index}`}
            type="button"
            disabled={disabled}
            onClick={() => setBuilt((previous) => [...previous, token])}
            className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[13px] text-mist"
          >
            {token}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled || built.length === 0}
          onClick={() => setBuilt((previous) => previous.slice(0, -1))}
          className="rounded-md border border-white/20 bg-white/5 px-3 py-1 text-[12px] text-dim"
        >
          Undo
        </button>
        {!rapidMode ? (
          <button
            type="button"
            disabled={disabled || built.length === 0}
            onClick={() => onAnswer(built.join(' ').trim(), { orderedTokens: built })}
            className="page-primary-action justify-center"
          >
            Check phrase
          </button>
        ) : null}
      </div>
    </div>
  );
}
