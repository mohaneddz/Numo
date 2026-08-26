import { useEffect, useState } from 'react';
import { Loader2, Mic, Square } from 'lucide-react';
import { useAudioRecorder } from '../../../hooks/useAudioRecorder';
import { transcribeSpeech } from '../../../services/aiProvider';
import type { QuickExerciseProps } from './types';

export function SpeakQuickExercise({ item, disabled, onAnswer }: QuickExerciseProps) {
  const recorder = useAudioRecorder();
  const [transcript, setTranscript] = useState('');
  const [typed, setTyped] = useState('');
  const [status, setStatus] = useState<'idle' | 'transcribing' | 'done' | 'error'>('idle');
  const [useTyping, setUseTyping] = useState(false);

  useEffect(() => {
    setTranscript('');
    setTyped('');
    setStatus('idle');
    setUseTyping(false);
  }, [item.id]);

  const startRecording = async () => {
    try {
      setStatus('idle');
      await recorder.startRecording();
    } catch {
      setUseTyping(true);
      setStatus('error');
    }
  };

  const stopRecording = async () => {
    const blob = await recorder.stopRecording();
    if (!blob) {
      setStatus('error');
      return;
    }
    setStatus('transcribing');
    try {
      const text = await transcribeSpeech(blob, item.languageCode);
      setTranscript(text);
      setStatus('done');
    } catch {
      setStatus('error');
      setUseTyping(true);
    }
  };

  const answer = (useTyping ? typed : transcript).trim();

  const submit = () => {
    if (!answer) return;
    onAnswer(answer, { answerText: answer, spokenTranscript: transcript, inputMode: useTyping ? 'typed' : 'spoken' });
  };

  if (useTyping) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
      >
        <textarea
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          disabled={disabled}
          placeholder="Type what you said"
          className="w-full bg-black/20 rounded-lg border border-white/10 p-4 text-mist placeholder:text-dim outline-none resize-none min-h-[100px]"
        />
        <button type="submit" disabled={!typed.trim() || disabled} className="page-primary-action justify-center">
          Check Answer
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-white/10 bg-black/25 p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={disabled || status === 'transcribing'}
            onClick={() => void (recorder.isRecording ? stopRecording() : startRecording())}
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border transition-colors ${
              recorder.isRecording
                ? 'border-rose-400/60 bg-rose-500/25 text-rose-100'
                : 'border-cyan-400/40 bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/25'
            } disabled:cursor-not-allowed disabled:opacity-50`}
            aria-label={recorder.isRecording ? 'Stop recording' : 'Start recording'}
          >
            {status === 'transcribing' ? (
              <Loader2 size={20} className="animate-spin" />
            ) : recorder.isRecording ? (
              <Square size={18} fill="currentColor" />
            ) : (
              <Mic size={20} />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-mist">
              {recorder.isRecording
                ? 'Listening — say it now'
                : status === 'transcribing'
                  ? 'Checking what you said…'
                  : transcript
                    ? 'Tap to try again'
                    : 'Tap to record your answer'}
            </p>
            {recorder.isRecording && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-[width] duration-100"
                  style={{ width: `${Math.round(recorder.audioLevel * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {transcript && (
          <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-dim">We heard</p>
            <p className="mt-1 text-[14px] text-mist">{transcript}</p>
          </div>
        )}

        {status === 'error' && (
          <p className="mt-3 text-[12px] text-amber-300">
            The microphone isn't available. You can type your answer instead.
          </p>
        )}

        <button
          type="button"
          onClick={() => setUseTyping(true)}
          className="mt-3 text-[12px] text-dim underline-offset-2 hover:text-mist hover:underline"
        >
          Type it instead
        </button>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!answer || disabled}
        className="page-primary-action justify-center disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Check Answer
      </button>
    </div>
  );
}
