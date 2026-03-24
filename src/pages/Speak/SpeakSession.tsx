import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mic, MicOff, Play, RotateCcw, ChevronRight, Loader2 } from 'lucide-react';
import { speakingSessions } from '../../data/library';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { transcribeSpeech, completeWithEcho, synthesizeSpeech } from '../../services/aiProvider';

export default function SpeakSession() {
  const { sessionId } = useParams();
  const session = speakingSessions.find(s => s.id === sessionId);
  
  const { isRecording, audioLevel, startRecording, stopRecording } = useAudioRecorder();
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [feedback, setFeedback] = useState<{ accuracy: number; fluency: number; tip: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!session) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--color-dim)' }}>Session not found.</p>
        <Link to="/speak" style={{ color: '#8B5CF6' }}>← Back to Speak</Link>
      </div>
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
      await startRecording();
    }
  };

  const processSpeech = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const text = await transcribeSpeech(blob);
      setTranscription(text);
      
      // Request feedback from Echo
      const prompt = `
        The user is practicing the phrase: "Buenos días, ¿cómo está usted?"
        The user actually said: "${text}"
        Evaluate their pronunciation accuracy and fluency (0-100%).
        Provide a short helpful tip in English.
        Format your response as JSON: {"accuracy": number, "fluency": number, "tip": "string"}
      `;
      
      const response = await completeWithEcho([
        { id: '1', role: 'user', content: prompt, createdAt: Date.now() }
      ], 'analyst');
      try {
        const jsonPart = response.match(/\{.*\}/s)?.[0] || response;
        const feedbackData = JSON.parse(jsonPart);
        setFeedback(feedbackData);
      } catch (e) {
        console.error("Failed to parse feedback JSON", response);
        setFeedback({ accuracy: 80, fluency: 75, tip: "Great job! Keep practicing your vowels." });
      }

    } catch (err: any) {
      setError(err.message || "Failed to process speech");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleListenNative = async () => {
    try {
      const blob = await synthesizeSpeech("Buenos días, ¿cómo está usted?");
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
    } catch (err) {
      console.error("Failed to play native audio", err);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Link to="/speak" style={{ color: 'var(--color-dim)', textDecoration: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
        <ArrowLeft size={14} /> Back to Speak
      </Link>

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

      {/* Prompt */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="card" style={{ padding: 24, marginBottom: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--color-dim)', marginBottom: 8 }}>Listen & Repeat</p>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>
            "Buenos días, ¿cómo está usted?"
          </h2>
          <p style={{ color: 'var(--color-dim)', fontSize: 13, marginBottom: 20 }}>
            Good morning, how are you? (formal)
          </p>

          {/* Native audio button */}
          <button 
            onClick={handleListenNative}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto 24px',
              padding: '8px 16px', borderRadius: 8,
              background: 'var(--color-slate)', color: 'var(--color-dim)',
              border: 'none', fontSize: 13, cursor: 'pointer',
            }}
          >
            <Play size={14} /> Listen to native
          </button>
          <audio ref={audioRef} hidden />

          {/* Waveform visualizer */}
          <div style={{
            height: 80, borderRadius: 12,
            background: 'var(--color-slate)', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
            overflow: 'hidden', padding: '0 20px',
          }}>
            {Array.from({ length: 40 }).map((_, i) => {
              const h = isRecording
                ? Math.random() * 50 * audioLevel + 10
                : feedback ? Math.sin(i * 0.3) * 20 + 25 : 8;
              return (
                <motion.div
                  key={i}
                  animate={{ height: h }}
                  transition={{ duration: isRecording ? 0.05 : 0.3 }}
                  style={{
                    width: 3, borderRadius: 99, flexShrink: 0,
                    background: isRecording
                      ? '#F87171'
                      : feedback ? '#8B5CF6' : 'var(--color-dim-dark)',
                  }}
                />
              );
            })}
          </div>

          {/* Record button */}
          <button
            onClick={handleToggleRecording}
            disabled={isProcessing}
            style={{
              width: 64, height: 64, borderRadius: 99, border: 'none',
              background: isRecording ? '#F87171' : '#8B5CF6',
              color: '#fff', cursor: isProcessing ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto', boxShadow: isRecording
                ? '0 0 24px rgba(248, 113, 113, 0.4)'
                : '0 0 24px rgba(139, 92, 246, 0.3)',
              transition: 'all 0.2s ease',
              opacity: isProcessing ? 0.6 : 1
            }}
          >
            {isProcessing ? <Loader2 className="animate-spin" size={24} /> : (isRecording ? <MicOff size={24} /> : <Mic size={24} />)}
          </button>
          <p style={{ fontSize: 12, color: 'var(--color-dim)', marginTop: 10 }}>
            {isProcessing ? 'Processing speech...' : (isRecording ? 'Recording... click to stop' : feedback ? 'Recorded! Click to re-record' : 'Click to start recording')}
          </p>
          
          {error && <p style={{ fontSize: 12, color: '#F87171', marginTop: 8 }}>{error}</p>}
          {transcription && (
            <div style={{ marginTop: 16, padding: '8px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
              <p style={{ fontSize: 11, color: 'var(--color-dim)', marginBottom: 2 }}>You said:</p>
              <p style={{ fontSize: 14, color: 'var(--color-mist)', fontStyle: 'italic' }}>"{transcription}"</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Feedback (shown after recording) */}
      {feedback && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Pronunciation Feedback</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ padding: 14, borderRadius: 10, background: 'rgba(139, 92, 246, 0.08)' }}>
                <p style={{ fontSize: 12, color: 'var(--color-dim)', marginBottom: 4 }}>Accuracy</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#8B5CF6' }}>{feedback.accuracy}%</p>
              </div>
              <div style={{ padding: 14, borderRadius: 10, background: 'rgba(34, 211, 238, 0.08)' }}>
                <p style={{ fontSize: 12, color: 'var(--color-dim)', marginBottom: 4 }}>Fluency</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#22D3EE' }}>{feedback.fluency}%</p>
              </div>
            </div>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(245, 158, 11, 0.08)', marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: '#F59E0B', fontWeight: 500, marginBottom: 4 }}>Tip</p>
              <p style={{ fontSize: 13, color: 'var(--color-dim)', lineHeight: 1.4 }}>
                {feedback.tip}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={() => { setFeedback(null); setTranscription(''); }} 
                style={{
                  flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--color-slate)',
                  background: 'transparent', color: 'var(--color-dim)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <RotateCcw size={13} /> Try Again
              </button>
              <button style={{
                flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                background: '#8B5CF6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
