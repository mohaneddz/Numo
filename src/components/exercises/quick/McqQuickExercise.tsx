import { Volume2 } from 'lucide-react';
import { synthesizeSpeech } from '../../../services/aiProvider';
import { InteractiveText } from '../shared/InteractiveText';
import type { QuickExerciseProps } from './types';

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

export function McqQuickExercise({ item, disabled, onAnswer }: QuickExerciseProps) {
  const options = item.options ?? [];

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
          onClick={() => onAnswer(option, { selectedOption: option })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left text-mist transition-colors hover:bg-white/10 disabled:opacity-65"
        >
          <InteractiveText text={option} languageCode={item.languageCode} className="text-[14px]" />
        </button>
      ))}
    </div>
  );
}
