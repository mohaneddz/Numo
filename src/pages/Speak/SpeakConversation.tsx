import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Mic, Square, Volume2 } from 'lucide-react';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { synthesizeSpeech, transcribeSpeech } from '../../services/aiProvider';
import { speechPlaybackRate } from '../../config/audioPlaybackSettings';
import { applyPreferredOutput } from '../../services/audio/audioDevices';
import { integrationService } from '../../services/integrationService';
import { MOTION_REDUCED_EVENT, motionReducedBaseline } from '../../config/appearanceSettings';
import { VoiceOrb, type VoiceOrbState } from '../../components/speak/VoiceOrb';
import {
  openingLine,
  takeConversationTurn,
  type ConversationLine,
} from '../../services/speak/conversationService';

/** Right-to-left target languages need their subtitle flipped. */
const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur']);

export default function SpeakConversation() {
  const { activeLanguage } = useLanguage();
  const { isRecording, audioLevel, startRecording, stopRecording } = useAudioRecorder();

  const [lines, setLines] = useState<ConversationLine[]>(() => [openingLine(activeLanguage)]);
  const [status, setStatus] = useState<'idle' | 'thinking' | 'speaking'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showMeanings, setShowMeanings] = useState(true);
  const [showPronunciation, setShowPronunciation] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(motionReducedBaseline);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Restart the conversation when the learner switches target language, rather
  // than continuing a Spanish thread in Japanese.
  useEffect(() => {
    setLines([openingLine(activeLanguage)]);
    setError(null);
  }, [activeLanguage]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [lines]);

  // The orb animates continuously, so it has to react to the accessibility
  // setting being changed while the page is open, not only at mount.
  useEffect(() => {
    const onMotionChanged = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail;
      if (typeof detail === 'boolean') setReducedMotion(detail);
    };
    window.addEventListener(MOTION_REDUCED_EVENT, onMotionChanged);
    return () => window.removeEventListener(MOTION_REDUCED_EVENT, onMotionChanged);
  }, []);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      if (audioRef.current?.src) URL.revokeObjectURL(audioRef.current.src);
    },
    [],
  );

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Replaying a line while one is already playing would otherwise leave both
    // streams audible and leak the first line's object URL.
    const previous = audioRef.current;
    if (previous) {
      previous.pause();
      if (previous.src.startsWith('blob:')) URL.revokeObjectURL(previous.src);
      audioRef.current = null;
    }

    try {
      const audio = await synthesizeSpeech(text, { languageCode: activeLanguage.code });
      const url = URL.createObjectURL(audio);
      const element = new Audio(url);
      element.playbackRate = speechPlaybackRate();
      audioRef.current = element;

      setStatus('speaking');
      element.onended = () => {
        setStatus('idle');
        URL.revokeObjectURL(url);
        if (audioRef.current === element) audioRef.current = null;
      };
      await applyPreferredOutput(element);
      await element.play();
    } catch {
      // The reply is already on screen as a subtitle; losing the audio should
      // not read as the turn having failed.
      setStatus('idle');
    }
  }, [activeLanguage.code]);

  const handleRecording = async () => {
    if (isRecording) {
      const blob = await stopRecording();
      if (blob) void handleTurn(blob);
      return;
    }
    setError(null);
    await startRecording();
  };

  const handleTurn = async (blob: Blob) => {
    setStatus('thinking');

    let transcript: string;
    try {
      transcript = await transcribeSpeech(blob, activeLanguage.code);
    } catch (transcribeError) {
      setStatus('idle');
      setError(
        transcribeError instanceof Error && transcribeError.message
          ? `Couldn't hear that: ${transcribeError.message}`
          : "Couldn't transcribe your recording. Check your microphone, or set up a speech-to-text provider in Settings.",
      );
      return;
    }

    if (!transcript.trim()) {
      setStatus('idle');
      setError('That recording came back empty. Try again a little closer to the microphone.');
      return;
    }

    try {
      const turn = await takeConversationTurn({
        transcript,
        history: lines.filter((line) => line.targetText),
        language: activeLanguage,
      });
      setLines((previous) => [...previous, turn.learnerLine, turn.companionLine]);

      // Without this the mode is a closed loop: a long spoken conversation
      // would move no streak, goal or activity total.
      void integrationService.logChatTurn({
        languageCode: activeLanguage.code,
        learnerText: turn.learnerLine.targetText,
        replyText: turn.companionLine.targetText,
        spoken: true,
      });
      await speak(turn.companionLine.targetText);
    } catch (replyError) {
      setStatus('idle');
      setError(
        replyError instanceof Error && replyError.message
          ? `Your companion couldn't reply: ${replyError.message}`
          : "Your companion couldn't reply. Check your AI provider settings.",
      );
    }
  };

  const orbState: VoiceOrbState = isRecording
    ? 'listening'
    : status === 'thinking'
      ? 'thinking'
      : status === 'speaking'
        ? 'speaking'
        : 'idle';

  const orbCaption = isRecording
    ? 'Listening…'
    : status === 'thinking'
      ? 'Thinking…'
      : status === 'speaking'
        ? 'Speaking…'
        : 'Tap the microphone and say something';

  const busy = status === 'thinking';

  return (
    <>
      <PageActions hideSettingsButton>
        <Link to="/speak" className="no-underline">
          <button className="page-primary-action">
            <ArrowLeft size={16} /> Back to Speak
          </button>
        </Link>
      </PageActions>

      <PageContent width="narrow" className="pb-12">
        <header className="mb-4 text-center">
          <h1 className="font-heading text-3xl text-mist">Live Conversation</h1>
          <p className="mt-1 text-sm text-dim">
            Talk with a {activeLanguage.name} companion. Both sides are subtitled, with meanings.
          </p>
        </header>

        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-graphite py-6">
          <VoiceOrb
            state={orbState}
            level={audioLevel}
            reducedMotion={reducedMotion}
          />
          <p className="text-sm text-dim">{orbCaption}</p>

          <button
            type="button"
            onClick={handleRecording}
            disabled={busy}
            className={`flex h-14 w-14 items-center justify-center rounded-full border transition-colors ${
              isRecording
                ? 'border-coral/50 bg-coral-dim text-coral'
                : 'border-white/10 text-dim hover:border-cyan/40 hover:text-cyan'
            } disabled:cursor-not-allowed disabled:opacity-50`}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {busy ? (
              <Loader2 size={22} className="animate-spin" />
            ) : isRecording ? (
              <Square size={20} />
            ) : (
              <Mic size={22} />
            )}
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-coral/25 bg-coral-dim px-4 py-3 text-sm text-coral">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-end gap-2 text-xs">
          <SubtitleToggle active={showMeanings} onClick={() => setShowMeanings((on) => !on)}>
            Meanings
          </SubtitleToggle>
          <SubtitleToggle
            active={showPronunciation}
            onClick={() => setShowPronunciation((on) => !on)}
          >
            Pronunciation
          </SubtitleToggle>
        </div>

        <div
          ref={transcriptRef}
          className="mt-3 max-h-[420px] space-y-3 overflow-y-auto rounded-xl border border-white/5 bg-black/20 p-4"
        >
          {lines.map((line) => (
            <SubtitleBubble
              key={line.id}
              line={line}
              languageCode={activeLanguage.code}
              showMeaning={showMeanings}
              showPronunciation={showPronunciation}
              onReplay={() => void speak(line.targetText)}
            />
          ))}
        </div>
      </PageContent>
    </>
  );
}

function SubtitleToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 transition-colors ${
        active ? 'bg-violet-dim text-violet' : 'text-dim hover:text-mist'
      }`}
    >
      {children}
    </button>
  );
}

interface SubtitleBubbleProps {
  line: ConversationLine;
  languageCode: string;
  showMeaning: boolean;
  showPronunciation: boolean;
  onReplay: () => void;
}

function SubtitleBubble({
  line,
  languageCode,
  showMeaning,
  showPronunciation,
  onReplay,
}: SubtitleBubbleProps) {
  const isLearner = line.speaker === 'learner';
  const rtl = RTL_LANGUAGES.has(languageCode);

  return (
    <div className={`flex ${isLearner ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 ${
          isLearner
            ? 'border border-mint/20 bg-mint-dim'
            : 'border border-white/5 bg-white/[0.03]'
        }`}
      >
        <p className="mb-1 text-[11px] uppercase tracking-wider text-dim">
          {isLearner ? 'You' : 'Companion'}
        </p>

        {line.targetText && (
          <p dir={rtl ? 'rtl' : 'ltr'} className="text-base text-mist">
            {line.targetText}
          </p>
        )}

        {showPronunciation && line.words.length > 0 && (
          <p dir={rtl ? 'rtl' : 'ltr'} className="mt-1 text-[13px] italic text-cyan/80">
            {line.words
              .map((word) => word.pronunciation)
              .filter(Boolean)
              .join(' ')}
          </p>
        )}

        {showMeaning && line.englishMeaning && (
          <p className="mt-1 text-[13px] text-dim">{line.englishMeaning}</p>
        )}

        {line.targetText && (
          <button
            type="button"
            onClick={onReplay}
            className="mt-2 flex items-center gap-1.5 text-[12px] text-dim transition-colors hover:text-cyan"
          >
            <Volume2 size={13} /> Replay
          </button>
        )}
      </div>
    </div>
  );
}
