import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { seededShuffle } from '../../../../utils/seededRandom';
import { isSpacelessScript } from '../../../../utils/textNormalize';
import { hintPropsFor, seedFor, type LearnExerciseProps } from '../types';
import { HintSection } from '../../shared/HintSection';
import { InteractiveText } from '../../shared/InteractiveText';
import { AudioPrompt } from '../../shared/AudioPrompt';

/**
 * Build a sentence by putting the tokens in order.
 *
 * Previously the tokens were rendered in whatever order they arrived — which, for
 * fallback content, was the answer's own word order, so the task was solved by
 * clicking left to right. `ready` was `built.length > 0`, so it could be submitted
 * after a single token. And the only way to correct a mistake was to pop tokens off
 * the end one at a time.
 *
 * Tokens are now shuffled with a task-stable seed, any placed token can be removed
 * directly, and the answer is only submittable once every token has been used.
 */
export function TokenOrderExercise({
  payload,
  disabled,
  onDraftChange,
  onHintLevelOpened,
  onAudioReplay,
}: LearnExerciseProps) {
  const seed = seedFor(payload);
  const tokens = useMemo(() => payload.tokens ?? [], [payload.tokens]);

  // Tokens are indexed so repeated words stay distinguishable.
  const bank = useMemo(
    () => seededShuffle(tokens.map((token, index) => ({ token, key: `${token}#${index}` })), seed),
    [tokens, seed],
  );

  const [placed, setPlaced] = useState<Array<{ token: string; key: string }>>([]);

  useEffect(() => {
    setPlaced([]);
  }, [seed]);

  const placedKeys = useMemo(() => new Set(placed.map((item) => item.key)), [placed]);
  const remaining = bank.filter((item) => !placedKeys.has(item.key));
  const joiner = isSpacelessScript(payload.languageCode) ? '' : ' ';
  const sentence = placed.map((item) => item.token).join(joiner);

  // A partial sentence is not an answer: every token has to be used.
  const ready = placed.length > 0 && remaining.length === 0;

  useEffect(() => {
    onDraftChange({
      canonicalAnswer: sentence.trim(),
      structuredResponse: { orderedTokens: placed.map((item) => item.token) },
      ready,
    });
  }, [onDraftChange, placed, ready, sentence]);

  return (
    <div className="grid gap-3">
      <AudioPrompt
        text={payload.audioText}
        languageCode={payload.languageCode}
        label="Listen"
        disabled={disabled}
        onPlay={onAudioReplay}
      />

      <div className="min-h-[64px] rounded-xl border border-white/10 bg-black/25 p-3">
        {placed.length === 0 ? (
          <p className="text-[13px] text-dim">Tap the words below to build the sentence.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {placed.map((item, index) => (
              <button
                key={item.key}
                type="button"
                disabled={disabled}
                onClick={() => setPlaced((previous) => previous.filter((_, position) => position !== index))}
                className="group inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-400/15 px-3 py-1.5 text-[14px] text-mist transition-colors hover:border-rose-400/50 hover:bg-rose-400/15 disabled:cursor-not-allowed"
              >
                <InteractiveText text={item.token} languageCode={payload.languageCode} />
                {!disabled && <X size={11} className="text-dim group-hover:text-rose-200" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {remaining.map((item) => (
          <button
            key={item.key}
            type="button"
            disabled={disabled}
            onClick={() => setPlaced((previous) => [...previous, item])}
            className="rounded-lg border border-white/20 bg-white/[0.05] px-3 py-1.5 text-[14px] text-mist transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <InteractiveText text={item.token} languageCode={payload.languageCode} />
          </button>
        ))}
        {remaining.length === 0 && (
          <p className="text-[12px] text-emerald-200/80">All words used — check the order and submit.</p>
        )}
      </div>

      {placed.length > 0 && !disabled && (
        <button
          type="button"
          onClick={() => setPlaced([])}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[12px] text-dim transition-colors hover:text-white"
        >
          <RotateCcw size={12} /> Start over
        </button>
      )}

      <HintSection {...hintPropsFor(payload)} disabled={disabled} onHintLevelOpened={onHintLevelOpened} />
    </div>
  );
}
