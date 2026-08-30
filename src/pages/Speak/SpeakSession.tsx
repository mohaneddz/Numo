import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { transcribeSpeech, completeWithEcho, synthesizeSpeech } from '../../services/aiProvider';
import { speechPlaybackRate } from '../../config/audioPlaybackSettings';
import { applyPreferredOutput } from '../../services/audio/audioDevices';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { useAppData } from '../../contexts/AppDataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { integrationService } from '../../services/integrationService';
import { parseSpeakingFeedback } from '../../services/exercises/speakingFeedback';
import { speakExerciseRegistry } from '../../components/exercises/speak/registry';
import { UnsupportedExerciseCard } from '../../components/exercises/shared/UnsupportedExerciseCard';

/**
 * Prompts for the guided pronunciation drill.
 *
 * Written in each language's own script. The Chinese set used to be in
 * romanised pinyin, so the learner practised reading Latin letters aloud
 * rather than the writing system they are actually studying.
 */
const SPEAKING_PROMPTS: Record<string, Array<{ target: string; gloss: string }>> = {
  es: [
    { target: 'Buenos días, mucho gusto.', gloss: 'Good morning, nice to meet you.' },
    { target: 'Me gustaría una mesa para dos.', gloss: 'I would like a table for two.' },
    { target: '¿Podría repetirlo más despacio?', gloss: 'Could you repeat that more slowly?' },
  ],
  fr: [
    { target: 'Bonjour, ravi de vous rencontrer.', gloss: 'Hello, pleased to meet you.' },
    { target: 'Je voudrais une table pour deux.', gloss: 'I would like a table for two.' },
    { target: 'Pouvez-vous parler plus lentement ?', gloss: 'Can you speak more slowly?' },
  ],
  de: [
    { target: 'Guten Tag, freut mich sehr.', gloss: 'Good day, pleased to meet you.' },
    { target: 'Ich möchte einen Tisch für zwei.', gloss: 'I would like a table for two.' },
    { target: 'Können Sie das bitte wiederholen?', gloss: 'Can you repeat that please?' },
  ],
  it: [
    { target: 'Buongiorno, piacere di conoscerla.', gloss: 'Good morning, pleased to meet you.' },
    { target: 'Vorrei un tavolo per due.', gloss: 'I would like a table for two.' },
    { target: 'Può ripetere più lentamente?', gloss: 'Could you repeat that more slowly?' },
  ],
  pt: [
    { target: 'Bom dia, muito prazer.', gloss: 'Good morning, nice to meet you.' },
    { target: 'Queria uma mesa para dois.', gloss: 'I would like a table for two.' },
    { target: 'Pode repetir mais devagar?', gloss: 'Could you repeat that more slowly?' },
  ],
  zh: [
    { target: '你好，很高兴认识你。', gloss: 'Hello, very pleased to meet you.' },
    { target: '我要一张两个人的桌子。', gloss: 'I would like a table for two.' },
    { target: '请再说一遍，慢一点。', gloss: 'Please say it again, a little more slowly.' },
  ],
  ja: [
    { target: 'はじめまして、よろしくお願いします。', gloss: 'Nice to meet you, I look forward to it.' },
    { target: '二人分の席をお願いします。', gloss: 'A table for two, please.' },
    { target: 'もう一度ゆっくり言ってください。', gloss: 'Please say that once more, slowly.' },
  ],
  ko: [
    { target: '안녕하세요, 만나서 반갑습니다.', gloss: 'Hello, pleased to meet you.' },
    { target: '두 사람 자리 주세요.', gloss: 'A table for two, please.' },
    { target: '다시 천천히 말해 주세요.', gloss: 'Please say that again slowly.' },
  ],
  ru: [
    { target: 'Здравствуйте, очень приятно.', gloss: 'Hello, very pleased to meet you.' },
    { target: 'Я хотел бы столик на двоих.', gloss: 'I would like a table for two.' },
    { target: 'Повторите, пожалуйста, помедленнее.', gloss: 'Please repeat that more slowly.' },
  ],
  ar: [
    { target: 'مرحبا، تشرفت بمعرفتك.', gloss: 'Hello, pleased to meet you.' },
    { target: 'أريد طاولة لشخصين.', gloss: 'I would like a table for two.' },
    { target: 'من فضلك أعد ذلك ببطء.', gloss: 'Please repeat that slowly.' },
  ],
};

export default function SpeakSession() {
  const { sessionId } = useParams();
  const { activeLanguage } = useLanguage();
  const promptSet = SPEAKING_PROMPTS[activeLanguage.code] ?? SPEAKING_PROMPTS.es;
  const promptIndex = Math.abs(
    (sessionId ?? 'live').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0),
  ) % promptSet.length;
  const selectedPrompt = promptSet[promptIndex];
  const session = sessionId
    ? {
        id: sessionId,
        title: `${activeLanguage.name} Guided Speaking`,
        type: 'pronunciation' as const,
        description: 'Record one speaking attempt and receive pronunciation and fluency feedback.',
        duration: '5 min',
        difficulty: promptIndex === 0 ? 'Beginner' : promptIndex === 1 ? 'Intermediate' : 'Advanced',
      }
    : null;
  
  const { isRecording, audioLevel, startRecording, stopRecording } = useAudioRecorder();
  const { saveSpeakingResult } = useAppData();
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [feedback, setFeedback] = useState<{ accuracy: number; fluency: number; tip: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // From starting the recording to receiving feedback, so the attempt's real
  // length is recorded rather than the flat default.
  const attemptStartedAtRef = useRef(Date.now());
  const activeExercise = speakExerciseRegistry.guided_repeat;

  if (!session) {
    return (
      <PageContent width="narrow">
        <PageActions>
          <Link to="/speak" className="no-underline">
            <button className="page-primary-action">
              <ArrowLeft size={16} /> Back to Speak
            </button>
          </Link>
        </PageActions>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--color-dim)' }}>Session not found.</p>
        </div>
      </PageContent>
    );
  }

  const handleToggleRecording = async () => {
    if (isRecording) {
      const audioBlob = await stopRecording();
      if (audioBlob) {
        processSpeech(audioBlob);
      }
    } else {
      setError(null);
      setFeedback(null);
      setTranscription('');
      attemptStartedAtRef.current = Date.now();
      await startRecording();
    }
  };

  const processSpeech = async (blob: Blob) => {
    setIsProcessing(true);
    setError(null);

    let text: string;
    try {
      text = await transcribeSpeech(blob, activeLanguage.code);
    } catch (transcribeError) {
      setIsProcessing(false);
      setError(
        transcribeError instanceof Error && transcribeError.message
          ? `Couldn't transcribe your recording: ${transcribeError.message}`
          : "Couldn't transcribe your recording. Check your microphone, or configure a speech-to-text provider in Settings.",
      );
      return;
    }
    setTranscription(text);

    try {
      const prompt = `
        The learner language is: "${activeLanguage.name}" (${activeLanguage.code})
        Target phrase: "${selectedPrompt.target}"
        The user actually said: "${text}"
        Evaluate their pronunciation accuracy and fluency (0-100%).
        Provide a short helpful tip in English and one corrective cue.
        Format your response as JSON: {"accuracy": number, "fluency": number, "tip": "string"}
      `;
      
      const response = await completeWithEcho([
        { id: '1', role: 'user', content: prompt, createdAt: Date.now() }
      ], 'analyst');
      const feedbackData = parseSpeakingFeedback(response);
      if (!feedbackData) {
        // This path used to invent accuracy 80 / fluency 75 and "Great job!"
        // whenever the reply could not be read, then save it as a real result.
        console.error('Could not read the grading response', response);
        setError(
          "Recorded and transcribed, but the grader's response could not be read. Nothing was saved for this attempt — try again.",
        );
        return;
      }

      setFeedback(feedbackData);
      saveSpeakingResult(session.id, {
        transcript: text,
        accuracy: feedbackData.accuracy,
        fluency: feedbackData.fluency,
        tip: feedbackData.tip,
        feedbackSource: 'ai',
      });
      // Distinct from saveSpeakingResult: this one applies the pronunciation
      // mastery delta and weakness cluster.
      void integrationService.logSpeakAttempt({
        languageCode: activeLanguage.code,
        transcript: text,
        accuracy: feedbackData.accuracy,
        fluency: feedbackData.fluency,
        tip: feedbackData.tip,
        durationMs: Math.max(1000, Date.now() - attemptStartedAtRef.current),
      });

    } catch (gradingError) {
      // We have a real transcript but couldn't grade it — say so rather than
      // inventing a passing score, so a real outage doesn't read as success.
      setError(
        gradingError instanceof Error && gradingError.message
          ? `Recorded and transcribed, but couldn't grade the attempt: ${gradingError.message}`
          : "Recorded and transcribed, but couldn't grade the attempt. Configure an AI provider in Settings to get feedback.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleListenNative = async () => {
    try {
      const blob = await synthesizeSpeech(selectedPrompt.target, { languageCode: activeLanguage.code });
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        // Each replay used to create a blob URL and never release it, leaking
        // one clip's worth of memory per press for the whole session.
        const previous = audioRef.current.src;
        audioRef.current.src = url;
        audioRef.current.playbackRate = speechPlaybackRate();
        void applyPreferredOutput(audioRef.current).then(() => audioRef.current?.play());
        if (previous.startsWith('blob:')) URL.revokeObjectURL(previous);
      } else {
        URL.revokeObjectURL(url);
      }
    } catch {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(selectedPrompt.target);
        utterance.lang = activeLanguage.code === 'fr' ? 'fr-FR' : activeLanguage.code === 'de' ? 'de-DE' : activeLanguage.code === 'zh' ? 'zh-CN' : 'es-ES';
        utterance.rate = speechPlaybackRate();
        window.speechSynthesis.speak(utterance);
      } else {
        setError('Audio playback is not available on this device.');
      }
    }
  };

  return (
    <PageContent width="narrow" className="pb-12">
      <PageActions>
        <Link to="/speak" className="no-underline">
          <button className="page-primary-action">
            <ArrowLeft size={16} /> Back to Speak
          </button>
        </Link>
      </PageActions>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{session.title}</h1>
          <p style={{ color: 'var(--color-dim)', fontSize: 14, marginBottom: 16 }}>{session.description}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="pill pill-violet">{session.type}</span>
            <span className="pill" style={{ background: 'var(--color-slate)', color: 'var(--color-dim)' }}>{session.difficulty}</span>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        {activeExercise.validate({ target: selectedPrompt.target, gloss: selectedPrompt.gloss }) ? (
          <activeExercise.component
            target={selectedPrompt.target}
            gloss={selectedPrompt.gloss}
            isRecording={isRecording}
            audioLevel={audioLevel}
            isProcessing={isProcessing}
            transcription={transcription}
            error={error}
            feedback={feedback}
            audioRef={audioRef}
            onToggleRecording={() => {
              void handleToggleRecording();
            }}
            onListenNative={() => {
              void handleListenNative();
            }}
            onTryAgain={() => {
              setFeedback(null);
              setTranscription('');
            }}
          />
        ) : (
          <UnsupportedExerciseCard reason="Invalid guided speaking payload." />
        )}
      </motion.div>

      {feedback && (
        <div className="mt-3">
          <button
            onClick={() => window.location.assign('/speak')}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 8,
              border: 'none',
              background: '#8B5CF6',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      )}
    </PageContent>
  );
}
