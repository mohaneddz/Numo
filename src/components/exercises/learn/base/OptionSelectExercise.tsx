import { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { synthesizeSpeech } from '../../../../services/aiProvider';
import type { LearnExerciseProps } from '../types';
import { HintSection } from '../../shared/HintSection';
import { InteractiveText } from '../../shared/InteractiveText';
import CachedMediaImage from '../../../ui/CachedMediaImage';

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

export function OptionSelectExercise({ payload, disabled, onDraftChange }: LearnExerciseProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = payload.options ?? [];

  useEffect(() => {
    setSelected(null);
  }, [payload.promptText, payload.expectedText]);

  useEffect(() => {
    onDraftChange({
      canonicalAnswer: selected ?? '',
      structuredResponse: {
        selectedOption: selected ?? '',
      },
      ready: Boolean(selected),
    });
  }, [onDraftChange, selected]);

  return (
    <div className="grid gap-2">
      {payload.imageUrl ? (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
          <CachedMediaImage src={payload.imageUrl} alt={payload.imageAlt ?? 'Exercise visual'} className="h-44 w-full object-cover" />
        </div>
      ) : null}

      {payload.audioText ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            void playAudio(payload.audioText ?? '');
          }}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-[12px] text-mist"
        >
          <Volume2 size={14} /> Hear prompt
        </button>
      ) : null}

      {options.map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => setSelected(option)}
          className="w-full rounded-lg border px-4 py-3 text-left transition-colors"
          style={{
            borderColor: selected === option ? 'rgba(34, 211, 238, 0.55)' : 'rgba(255,255,255,0.12)',
            background: selected === option ? 'rgba(34, 211, 238, 0.18)' : 'rgba(255,255,255,0.04)',
            color: 'var(--color-mist)',
          }}
        >
          <InteractiveText text={option} languageCode={payload.languageCode} className="text-[14px]" />
        </button>
      ))}
      <HintSection hints={payload.distractors} languageCode={payload.languageCode} />
    </div>
  );
}
