import { motion } from 'framer-motion';
import { Loader2, Mic, MicOff, Play, RotateCcw } from 'lucide-react';
import type { SpeakExerciseProps } from './types';

export function GuidedRepeatSpeakExercise({
  target,
  gloss,
  isRecording,
  audioLevel,
  isProcessing,
  transcription,
  error,
  feedback,
  audioRef,
  onToggleRecording,
  onListenNative,
  onTryAgain,
}: SpeakExerciseProps) {
  return (
    <>
      <div className="card" style={{ padding: 24, marginBottom: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'var(--color-dim)', marginBottom: 8 }}>Listen & Repeat</p>
        <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>"{target}"</h2>
        <p style={{ color: 'var(--color-dim)', fontSize: 13, marginBottom: 20 }}>{gloss}</p>

        <button
          type="button"
          onClick={onListenNative}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            margin: '0 auto 24px',
            padding: '8px 16px',
            borderRadius: 8,
            background: 'var(--color-slate)',
            color: 'var(--color-dim)',
            border: 'none',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <Play size={14} /> Listen to native
        </button>
        <audio ref={audioRef} hidden />

        <div
          style={{
            height: 80,
            borderRadius: 12,
            background: 'var(--color-slate)',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            overflow: 'hidden',
            padding: '0 20px',
          }}
        >
          {Array.from({ length: 40 }).map((_, index) => {
            const height = isRecording ? Math.random() * 50 * audioLevel + 10 : feedback ? Math.sin(index * 0.3) * 20 + 25 : 8;
            return (
              <motion.div
                key={index}
                animate={{ height }}
                transition={{ duration: isRecording ? 0.05 : 0.3 }}
                style={{
                  width: 3,
                  borderRadius: 99,
                  flexShrink: 0,
                  background: isRecording ? '#F87171' : feedback ? '#8B5CF6' : 'var(--color-dim-dark)',
                }}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={onToggleRecording}
          disabled={isProcessing}
          style={{
            width: 64,
            height: 64,
            borderRadius: 99,
            border: 'none',
            background: isRecording ? '#F87171' : '#8B5CF6',
            color: '#fff',
            cursor: isProcessing ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            boxShadow: isRecording ? '0 0 24px rgba(248, 113, 113, 0.4)' : '0 0 24px rgba(139, 92, 246, 0.3)',
            transition: 'all 0.2s ease',
            opacity: isProcessing ? 0.6 : 1,
          }}
        >
          {isProcessing ? <Loader2 className="animate-spin" size={24} /> : isRecording ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <p style={{ fontSize: 12, color: 'var(--color-dim)', marginTop: 10 }}>
          {isProcessing ? 'Processing speech...' : isRecording ? 'Recording... click to stop' : feedback ? 'Recorded! Click to re-record' : 'Click to start recording'}
        </p>

        {error ? <p style={{ fontSize: 12, color: '#F87171', marginTop: 8 }}>{error}</p> : null}
        {transcription ? (
          <div style={{ marginTop: 16, padding: '8px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
            <p style={{ fontSize: 11, color: 'var(--color-dim)', marginBottom: 2 }}>You said:</p>
            <p style={{ fontSize: 14, color: 'var(--color-mist)', fontStyle: 'italic' }}>"{transcription}"</p>
          </div>
        ) : null}
      </div>

      {feedback ? (
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
              <p style={{ fontSize: 13, color: 'var(--color-dim)', lineHeight: 1.4 }}>{feedback.tip}</p>
            </div>
            <button
              type="button"
              onClick={onTryAgain}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 8,
                border: '1px solid var(--color-slate)',
                background: 'transparent',
                color: 'var(--color-dim)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <RotateCcw size={13} /> Try Again
            </button>
          </div>
        </motion.div>
      ) : null}
    </>
  );
}

