import { useEffect, useMemo, useState } from 'react';
import type { LearnExerciseProps } from '../types';
import { HintSection } from '../../shared/HintSection';

interface TextEntryExerciseProps extends LearnExerciseProps {
  placeholder?: string;
  minLength?: number;
}

export function TextEntryExercise({
  payload,
  disabled,
  onDraftChange,
  placeholder = 'Type your answer',
  minLength = 1,
}: TextEntryExerciseProps) {
  const [value, setValue] = useState('');
  const expected = payload.expectedText ?? '';

  useEffect(() => {
    setValue('');
  }, [payload.promptText, payload.expectedText]);

  const ready = useMemo(() => value.trim().length >= minLength, [value, minLength]);

  useEffect(() => {
    onDraftChange({
      canonicalAnswer: value.trim(),
      structuredResponse: {
        answerText: value.trim(),
      },
      ready,
    });
  }, [onDraftChange, ready, value]);

  return (
    <div className="grid gap-3">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
        rows={3}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-black/20 p-4 text-mist placeholder:text-dim outline-none"
      />
      {expected ? <p className="text-[12px] text-dim">Expected pattern: {expected}</p> : null}
      <HintSection hints={payload.distractors} languageCode={payload.languageCode} />
    </div>
  );
}
