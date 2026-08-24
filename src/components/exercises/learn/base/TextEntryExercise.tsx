import { useEffect, useMemo, useState } from 'react';
import { hintPropsFor, seedFor, type LearnExerciseProps } from '../types';
import { HintSection } from '../../shared/HintSection';
import { AudioPrompt } from '../../shared/AudioPrompt';

interface TextEntryExerciseProps extends LearnExerciseProps {
  placeholder?: string;
  minLength?: number;
  rows?: number;
}

/**
 * Free-text answer.
 *
 * This component used to render `Expected pattern: {expected}` directly beneath
 * the input — it printed the answer the learner was being asked to produce. Every
 * free-text and hybrid-graded exercise in the app was therefore impossible to get
 * wrong. The answer is gone; support now comes from the graded hint ladder.
 */
export function TextEntryExercise({
  payload,
  disabled,
  onDraftChange,
  onHintLevelOpened,
  onAudioReplay,
  placeholder = 'Type your answer',
  minLength = 1,
  rows = 3,
}: TextEntryExerciseProps) {
  const [value, setValue] = useState('');
  const seed = seedFor(payload);

  useEffect(() => {
    setValue('');
  }, [seed]);

  const ready = useMemo(() => value.trim().length >= minLength, [value, minLength]);

  useEffect(() => {
    onDraftChange({
      canonicalAnswer: value.trim(),
      structuredResponse: { answerText: value.trim() },
      ready,
    });
  }, [onDraftChange, ready, value]);

  return (
    <div className="grid gap-3">
      <AudioPrompt
        text={payload.audioText}
        languageCode={payload.languageCode}
        label="Listen"
        disabled={disabled}
        onPlay={onAudioReplay}
      />

      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-black/20 p-4 text-[15px] text-mist outline-none transition-colors placeholder:text-dim focus:border-cyan-400/40 disabled:opacity-60"
      />

      <HintSection {...hintPropsFor(payload)} disabled={disabled} onHintLevelOpened={onHintLevelOpened} />
    </div>
  );
}
