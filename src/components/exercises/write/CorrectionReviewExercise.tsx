import { AlertTriangle, Check, Lightbulb } from 'lucide-react';
import type { CorrectionReviewProps } from './types';

export function CorrectionReviewExercise({ corrections }: CorrectionReviewProps) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Corrections</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {corrections.map((correction, index) => (
          <div
            key={`${correction.original}-${index}`}
            style={{
              padding: 12,
              borderRadius: 8,
              background: correction.type === 'correct' ? 'rgba(52, 211, 153, 0.06)' : 'rgba(248, 113, 113, 0.06)',
              border: `1px solid ${correction.type === 'correct' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)'}`,
            }}
          >
            {correction.type === 'correct' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={14} style={{ color: '#34D399' }} />
                <span style={{ fontSize: 13, color: '#34D399', fontWeight: 500 }}>Correct</span>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <AlertTriangle size={13} style={{ color: '#F87171' }} />
                  <span style={{ fontSize: 12, color: '#F87171', fontWeight: 500 }}>{correction.type}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-dim)', textDecoration: 'line-through', marginBottom: 4 }}>{correction.original}</p>
                <p style={{ fontSize: 13, color: '#34D399', fontWeight: 500, marginBottom: 6 }}>{correction.corrected}</p>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <Lightbulb size={12} style={{ color: '#F59E0B', marginTop: 2, flexShrink: 0 }} />
                  <p style={{ fontSize: 12, color: 'var(--color-dim)', lineHeight: 1.4 }}>{correction.explanation}</p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

