import { useEffect, useMemo, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { synthesizeSpeech } from '../../../services/aiProvider';
import { InteractiveText } from '../shared/InteractiveText';
import type { QuickExerciseProps } from './types';

function parseExpectedAnswers(answer: string): string[] {
  return answer
    .split('||')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

async function playAudio(text: string): Promise<void> {
  if (!text.trim()) return;
  try {
    const blob = await synthesizeSpeech(text);
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    void audio.play();
  } catch {
    // optional audio
  }
}

export function McqQuickExercise({ item, disabled, onAnswer, rapidMode, selectionFeedback }: QuickExerciseProps) {
  const options = item.options ?? [];
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  useEffect(() => {
    setSelectedOptions([]);
  }, [item.id]);

  const localSelectedSet = useMemo(() => new Set(selectedOptions), [selectedOptions]);

  const selectedOption = selectionFeedback?.selectedOption;
  const selectedFromFeedback = selectionFeedback?.selectedOptions ?? (selectedOption ? [selectedOption] : []);
  const selectedFeedbackSet = useMemo(() => new Set(selectedFromFeedback), [selectedFromFeedback]);
  const isCorrect = selectionFeedback?.isCorrect;
  const correctAnswers = selectionFeedback?.correctAnswers && selectionFeedback.correctAnswers.length > 0
    ? selectionFeedback.correctAnswers
    : [selectionFeedback?.correctAnswer ?? item.answer];
  const correctSet = useMemo(() => new Set(correctAnswers), [correctAnswers]);
  const expectedSet = useMemo(() => new Set(parseExpectedAnswers(item.answer)), [item.answer]);

  function optionClass(option: string): string {
    const base = 'w-full rounded-lg border px-4 py-3 text-left text-mist transition-colors disabled:opacity-65';
    if (typeof isCorrect === 'boolean') {
      if (isCorrect && selectedFeedbackSet.has(option)) {
        return `${base} border-emerald-400/70 bg-emerald-500/20 text-emerald-100`;
      }
      if (isCorrect === false && correctSet.has(option)) {
        return `${base} border-rose-400/70 bg-rose-500/20 text-rose-100`;
      }
      if (selectedFeedbackSet.has(option)) {
        return `${base} border-white/20 bg-white/10`;
      }
      return `${base} border-white/10 bg-white/5`;
    }

    if (localSelectedSet.has(option)) {
      return `${base} border-cyan-300/60 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/20`;
    }

    return `${base} border-white/10 bg-white/5 hover:bg-white/10`;
  }

  function toggleOption(option: string): void {
    if (disabled) return;
    if (rapidMode) {
      if (selectedOptions.includes(option)) return;
      const normalized = option.trim().toLowerCase();
      const next = [...selectedOptions, option];
      if (!expectedSet.has(normalized)) {
        onAnswer(next.join(' || '), {
          selectedOption: option,
          selectedOptions: next,
        });
        return;
      }
      setSelectedOptions(next);
      const selectedNormalized = new Set(next.map((entry) => entry.trim().toLowerCase()));
      const solved = expectedSet.size > 0
        && selectedNormalized.size === expectedSet.size
        && Array.from(expectedSet).every((entry) => selectedNormalized.has(entry));
      if (solved) {
        onAnswer(next.join(' || '), {
          selectedOption: next[0],
          selectedOptions: next,
        });
      }
      return;
    }

    setSelectedOptions((previous) => (
      previous.includes(option)
        ? previous.filter((entry) => entry !== option)
        : [...previous, option]
    ));
  }

  function confirmSelection(): void {
    if (selectedOptions.length === 0) return;
    onAnswer(selectedOptions.join(' || '), {
      selectedOption: selectedOptions[0],
      selectedOptions,
    });
  }

  return (
    <div className="grid gap-3">
      {item.imageUrl ? (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
          <img src={item.imageUrl} alt={item.imageAlt ?? item.answer} className="h-44 w-full object-cover" loading="lazy" />
        </div>
      ) : null}

      {item.audioText ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            void playAudio(item.audioText ?? '');
          }}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-[12px] text-mist"
        >
          <Volume2 size={14} /> Hear audio
        </button>
      ) : null}

      {options.map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => toggleOption(option)}
          className={optionClass(option)}
        >
          <InteractiveText text={option} languageCode={item.languageCode} className="text-[14px]" />
        </button>
      ))}

      {typeof isCorrect !== 'boolean' && !rapidMode ? (
        <button
          type="button"
          disabled={disabled || selectedOptions.length === 0}
          onClick={confirmSelection}
          className="mt-2 rounded-lg border border-cyan-400/35 bg-cyan-500/15 px-4 py-2 text-[13px] font-medium text-cyan-100 transition-colors hover:bg-cyan-500/20 disabled:opacity-55"
        >
          Confirm
        </button>
      ) : null}
    </div>
  );
}
