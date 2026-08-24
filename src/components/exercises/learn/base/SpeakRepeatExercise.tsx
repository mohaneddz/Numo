import { useEffect, useState } from 'react';
import { Loader2, Mic, Square } from 'lucide-react';
import { useAudioRecorder } from '../../../../hooks/useAudioRecorder';
import { transcribeSpeech } from '../../../../services/aiProvider';
import { matchAnswer } from '../../../../utils/textNormalize';
import { hintPropsFor, seedFor, type LearnExerciseProps } from '../types';
import { HintSection } from '../../shared/HintSection';
import { InteractiveText } from '../../shared/InteractiveText';
import { AudioPrompt } from '../../shared/AudioPrompt';

/**
 * Listen to a model utterance, then say it back.
 *
 * `listen_repeat` was previously wired to the plain text-entry component: no audio
 * to listen to, no microphone, and the learner typed what they had supposedly
 * "repeated" into a textarea. It was a spelling test labelled as pronunciation
 * practice, in a codebase that already had a working audio recorder hook.
 *
 * This records the attempt, transcribes it, and compares it to the target so the
 * learner gets real feedback. Typing remains available as a fallback when the
 * microphone is unavailable, but it is the fallback rather than the exercise.
 */
export function SpeakRepeatExercise({
  payload,
  disabled,
  onDraftChange,
  onHintLevelOpened,
  onAudioReplay,
}: LearnExerciseProps) {
  const recorder = useAudioRecorder();
  const seed = seedFor(payload);
  const target = payload.expectedText ?? payload.audioText ?? '';

  const [transcript, setTranscript] = useState('');
  const [typed, setTyped] = useState('');
  const [status, setStatus] = useState<'idle' | 'transcribing' | 'done' | 'error'>('idle');
  const [useTyping, setUseTyping] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    setTranscript('');
    setTyped('');
    setStatus('idle');
    setAttempts(0);
  }, [seed]);

  const answer = (useTyping ? typed : transcript).trim();

  useEffect(() => {
    onDraftChange({
      canonicalAnswer: answer,
      structuredResponse: {
        answerText: answer,
        spokenTranscript: transcript,
        attempts,
        inputMode: useTyping ? 'typed' : 'spoken',
      },
      ready: answer.length > 0,
    });
  }, [answer, attempts, onDraftChange, transcript, useTyping]);

  const startRecording = async () => {
    try {
      setStatus('idle');
      await recorder.startRecording();
    } catch {
      // Without a microphone the exercise falls back to typing rather than blocking.
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
    setAttempts((count) => count + 1);
    try {
      const text = await transcribeSpeech(blob, payload.languageCode);
      setTranscript(text);
      setStatus('done');
    } catch {
      setStatus('error');
      setUseTyping(true);
    }
  };

  // Live comparison so the learner can hear the difference and try again before
  // committing, rather than only finding out after submitting.
  const comparison = transcript && target ? matchAnswer(target, transcript, payload.languageCode) : null;

  return (
    <div className="grid gap-3">
      <AudioPrompt
        text={payload.audioText ?? target}
        languageCode={payload.languageCode}
        label="Hear the model"
        disabled={disabled}
        autoPlay
        onPlay={onAudioReplay}
      />

      {!useTyping ? (
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
                    : attempts === 0
                      ? 'Tap to record your attempt'
                      : 'Tap to try again'}
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
              <p className="mt-1 text-[14px] text-mist">
                <InteractiveText text={transcript} languageCode={payload.languageCode} />
              </p>
              {comparison && (
                <p
                  className={`mt-2 text-[12px] ${
                    comparison.correct ? 'text-emerald-200' : 'text-amber-200'
                  }`}
                >
                  {comparison.correct
                    ? comparison.note ?? 'That matches the model.'
                    : 'Not quite the model yet — listen again and have another go.'}
                </p>
              )}
            </div>
          )}

          {status === 'error' && (
            <p className="mt-3 text-[12px] text-amber-300">
              The microphone is not available. You can type your answer instead.
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
      ) : (
        <div className="grid gap-2">
          <textarea
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            disabled={disabled}
            rows={2}
            placeholder="Type what you heard"
            className="w-full rounded-xl border border-white/10 bg-black/20 p-4 text-[15px] text-mist outline-none transition-colors placeholder:text-dim focus:border-cyan-400/40 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => setUseTyping(false)}
            className="w-fit text-[12px] text-dim underline-offset-2 hover:text-mist hover:underline"
          >
            Use the microphone instead
          </button>
        </div>
      )}

      <HintSection {...hintPropsFor(payload)} disabled={disabled} onHintLevelOpened={onHintLevelOpened} />
    </div>
  );
}
