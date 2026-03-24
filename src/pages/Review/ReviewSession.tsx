import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Eye, XCircle } from 'lucide-react';
import { useAppData, type ReviewMode } from '../../contexts/AppDataContext';

const validModes: ReviewMode[] = ['due-now', 'weak', 'mistakes', 'cram'];

export default function ReviewSession() {
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get('mode') as ReviewMode | null;
  const mode: ReviewMode = validModes.includes(modeParam as ReviewMode) ? (modeParam as ReviewMode) : 'due-now';

  const { startReviewSession, gradeReviewItem } = useAppData();
  const queue = useMemo(() => startReviewSession(mode).queue, [mode, startReviewSession]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [answered, setAnswered] = useState<Record<string, 'correct' | 'incorrect'>>({});

  const currentItem = queue[currentIndex];

  if (!currentItem) {
    return (
      <div className="card" style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
        <h2>No items in this queue.</h2>
        <Link to="/review">Back to Review</Link>
      </div>
    );
  }

  const total = queue.length;
  const correctCount = Object.values(answered).filter((v) => v === 'correct').length;
  const isComplete = currentIndex === total - 1 && Boolean(answered[currentItem.id]);

  const handleAnswer = (result: 'correct' | 'incorrect') => {
    gradeReviewItem(currentItem.id, result);
    setAnswered((prev) => ({ ...prev, [currentItem.id]: result }));
    setShowAnswer(false);
    if (currentIndex < total - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <Link to="/review" style={{ color: 'var(--color-dim)', textDecoration: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
        <ArrowLeft size={14} /> End Session
      </Link>

      <div style={{ marginBottom: 16 }}>
        <p style={{ color: 'var(--color-dim)', margin: 0 }}>Mode: {mode}</p>
        <div style={{ height: 6, borderRadius: 99, background: 'var(--color-slate)', overflow: 'hidden', marginTop: 8 }}>
          <div style={{ width: `${(currentIndex / total) * 100}%`, height: '100%', background: '#8B5CF6' }} />
        </div>
      </div>

      {isComplete ? (
        <div className="card" style={{ padding: 30, textAlign: 'center' }}>
          <CheckCircle size={42} style={{ color: '#34D399' }} />
          <h2>Session Complete</h2>
          <p style={{ color: 'var(--color-dim)' }}>{correctCount}/{total} correct</p>
          <Link to="/review">Back to Review</Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 30, textAlign: 'center' }}>
          <p className="pill">{currentItem.type}</p>
          <h2 style={{ fontSize: 34 }}>{currentItem.term}</h2>
          {!showAnswer ? (
            <button onClick={() => setShowAnswer(true)} style={{
              border: 'none',
              borderRadius: 10,
              padding: '10px 18px',
              background: 'var(--color-slate)',
              color: 'var(--color-mist)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
            }}>
              <Eye size={14} /> Show Answer
            </button>
          ) : (
            <>
              <p style={{ color: '#22D3EE', fontSize: 21, marginBottom: 18 }}>{currentItem.translation}</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                <button onClick={() => handleAnswer('incorrect')} style={{
                  border: '1px solid rgba(248,113,113,0.3)',
                  borderRadius: 10,
                  padding: '10px 16px',
                  background: 'rgba(248,113,113,0.12)',
                  color: '#F87171',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <XCircle size={14} /> Incorrect
                </button>
                <button onClick={() => handleAnswer('correct')} style={{
                  border: '1px solid rgba(52,211,153,0.3)',
                  borderRadius: 10,
                  padding: '10px 16px',
                  background: 'rgba(52,211,153,0.12)',
                  color: '#34D399',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <CheckCircle size={14} /> Correct
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
