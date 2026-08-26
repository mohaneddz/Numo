import { useEffect, useRef, useState } from 'react';
import { Loader2, Volume2 } from 'lucide-react';
import { synthesizeSpeech } from '../../../services/aiProvider';
import { isAutoPlayAudioEnabled } from '../../../config/appearanceSettings';

interface AudioPromptProps {
  /** Text to speak. The component renders nothing without it. */
  text?: string;
  /** Forwarded to TTS so language-specific voices can be selected. */
  languageCode?: string;
  label?: string;
  disabled?: boolean;
  /** Plays once as soon as the task appears, as a listening exercise should. */
  autoPlay?: boolean;
  /** Reports replays so the learner model can see how much support was needed. */
  onPlay?: (playCount: number) => void;
}

/**
 * Audio playback for listening exercises.
 *
 * Listening exercises previously rendered as silent option lists: only one task
 * type ever had audio text attached, and the play button was a bare fire-and-forget
 * call with no loading state, no error state and no replay tracking. A listening
 * task with nothing to listen to is a guessing game.
 */
export function AudioPrompt({ text, languageCode, label = 'Play audio', disabled, autoPlay, onPlay }: AudioPromptProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const [playCount, setPlayCount] = useState(0);
  const objectUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayedRef = useRef(false);

  // Release the blob URL and stop playback when the task changes or unmounts.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [text]);

  useEffect(() => {
    setPlayCount(0);
    autoPlayedRef.current = false;
    setStatus('idle');
  }, [text]);

  const play = async () => {
    const value = text?.trim();
    if (!value) return;

    setStatus('loading');
    try {
      // Reuse the synthesized blob across replays rather than re-requesting it.
      if (!objectUrlRef.current) {
        const blob = await synthesizeSpeech(value, { languageCode });
        objectUrlRef.current = URL.createObjectURL(blob);
      }
      const audio = audioRef.current ?? new Audio(objectUrlRef.current);
      audioRef.current = audio;
      audio.currentTime = 0;
      audio.onended = () => setStatus('idle');
      await audio.play();

      setStatus('playing');
      setPlayCount((count) => {
        const next = count + 1;
        onPlay?.(next);
        return next;
      });
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    if (!autoPlay || autoPlayedRef.current || !text?.trim() || disabled) return;
    if (!isAutoPlayAudioEnabled()) return;
    autoPlayedRef.current = true;
    void play();
    // `play` is stable enough for this one-shot effect; re-running on every render
    // would replay the clip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, disabled, text]);

  if (!text?.trim()) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={disabled || status === 'loading'}
        onClick={() => void play()}
        className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-[13px] font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/20 disabled:opacity-50"
      >
        {status === 'loading' ? <Loader2 size={15} className="animate-spin" /> : <Volume2 size={15} />}
        {playCount === 0 ? label : 'Play again'}
      </button>

      {playCount > 0 && (
        <span className="text-[11px] text-dim">
          {playCount} {playCount === 1 ? 'play' : 'plays'}
        </span>
      )}
      {status === 'error' && (
        <span className="text-[11px] text-amber-300">Audio is unavailable right now.</span>
      )}
    </div>
  );
}
