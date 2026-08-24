import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { seededShuffle } from '../../../../utils/seededRandom';
import { hintPropsFor, seedFor, type LearnExerciseProps } from '../types';
import { HintSection } from '../../shared/HintSection';
import { InteractiveText } from '../../shared/InteractiveText';
import { AudioPrompt } from '../../shared/AudioPrompt';
import CachedMediaImage from '../../../ui/CachedMediaImage';

/**
 * Multiple choice.
 *
 * Previously the option list arrived as `[expectedAnswer, ...distractors]` and was
 * rendered in that order, so the correct answer was always the first button — the
 * exercise tested nothing. Options are now shuffled with a task-stable seed, so the
 * order is randomised but does not move while the learner is choosing. Audio and
 * image stimuli are rendered through dedicated components rather than a bare
 * fire-and-forget play call, and the hint block no longer lists the wrong answers.
 */
export function OptionSelectExercise({
  payload,
  disabled,
  onDraftChange,
  onHintLevelOpened,
  onAudioReplay,
}: LearnExerciseProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const seed = seedFor(payload);

  const options = useMemo(() => seededShuffle(payload.options ?? [], seed), [payload.options, seed]);

  useEffect(() => {
    setSelected(null);
  }, [seed]);

  useEffect(() => {
    onDraftChange({
      canonicalAnswer: selected ?? '',
      structuredResponse: { selectedOption: selected ?? '' },
      ready: Boolean(selected),
    });
  }, [onDraftChange, selected]);

  return (
    <div className="grid gap-3">
      {payload.imageUrl && (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
          <CachedMediaImage
            src={payload.imageUrl}
            alt={payload.imageAlt ?? 'Exercise image'}
            className="h-48 w-full object-cover"
          />
        </div>
      )}

      <AudioPrompt
        text={payload.audioText}
        languageCode={payload.languageCode}
        label="Listen"
        disabled={disabled}
        autoPlay
        onPlay={onAudioReplay}
      />

      <div className="grid gap-2">
        {options.map((option) => {
          const isSelected = selected === option;
          return (
            <button
              key={option}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              onClick={() => setSelected(option)}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${
                isSelected
                  ? 'border-cyan-400/60 bg-cyan-400/15'
                  : 'border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  isSelected ? 'border-cyan-300 bg-cyan-400/30 text-cyan-100' : 'border-white/25'
                }`}
              >
                {isSelected && <Check size={12} strokeWidth={3} />}
              </span>
              <InteractiveText text={option} languageCode={payload.languageCode} className="text-[14px] text-mist" />
            </button>
          );
        })}
      </div>

      <HintSection {...hintPropsFor(payload)} disabled={disabled} onHintLevelOpened={onHintLevelOpened} />
    </div>
  );
}
