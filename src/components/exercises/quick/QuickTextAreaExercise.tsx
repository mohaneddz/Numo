import { useEffect, useState } from 'react';
import { InteractiveText } from '../shared/InteractiveText';
import type { QuickExerciseProps } from './types';

interface QuickTextAreaExerciseProps extends QuickExerciseProps {
  placeholder: string;
}

export function QuickTextAreaExercise({ item, disabled, onAnswer, placeholder }: QuickTextAreaExerciseProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue('');
  }, [item.id]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!value.trim()) return;
        onAnswer(value.trim(), { answerText: value.trim() });
      }}
      className="flex flex-col gap-4"
    >
      {item.context ? (
        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[13px] text-dim">
          <InteractiveText text={item.context} languageCode={item.languageCode} />
        </div>
      ) : null}
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full bg-black/20 rounded-lg border border-white/10 p-4 text-mist placeholder:text-dim outline-none resize-none min-h-[100px]"
      />
      <button type="submit" disabled={!value.trim() || disabled} className="page-primary-action justify-center">
        Check Answer
      </button>
    </form>
  );
}
