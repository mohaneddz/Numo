import { useEffect, useMemo, useState } from 'react';
import type { LearnExerciseProps } from '../types';
import { HintSection } from '../../shared/HintSection';
import { InteractiveText } from '../../shared/InteractiveText';

export function TokenOrderExercise({ payload, disabled, onDraftChange }: LearnExerciseProps) {
  const tokens = payload.tokens ?? [];
  const [built, setBuilt] = useState<string[]>([]);

  useEffect(() => {
    setBuilt([]);
  }, [payload.promptText, payload.expectedText, tokens.join('|')]);

  const ready = built.length > 0;

  const remaining = useMemo(() => {
    const counts = new Map<string, number>();
    built.forEach((token) => counts.set(token, (counts.get(token) ?? 0) + 1));
    return tokens.filter((token) => {
      const used = counts.get(token) ?? 0;
      if (used <= 0) return true;
      counts.set(token, used - 1);
      return false;
    });
  }, [built, tokens]);

  useEffect(() => {
    onDraftChange({
      canonicalAnswer: built.join(' ').trim(),
      structuredResponse: {
        orderedTokens: built,
      },
      ready,
    });
  }, [built, onDraftChange, ready]);

  return (
    <div className="grid gap-3">
      <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-mist">
        {built.length > 0 ? <InteractiveText text={built.join(' ')} languageCode={payload.languageCode} /> : 'Build sentence order...'}
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
            <InteractiveText text={token} languageCode={payload.languageCode} />
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={disabled || built.length === 0}
        onClick={() => setBuilt((previous) => previous.slice(0, -1))}
        className="w-fit rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-[12px] text-dim"
      >
        Remove Last Token
      </button>
      <HintSection hints={payload.distractors} languageCode={payload.languageCode} />
    </div>
  );
}
