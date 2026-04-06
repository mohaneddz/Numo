import { Loader2, Send } from 'lucide-react';
import type { DraftCompositionProps } from './types';

export function DraftCompositionExercise({
  text,
  onTextChange,
  onToggleCorrections,
  onAnalyze,
  showCorrections,
  isAnalyzing,
  wordCount,
  error,
}: DraftCompositionProps) {
  return (
    <div className="card" style={{ padding: 20, marginBottom: 12 }}>
      <textarea
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        style={{
          width: '100%',
          minHeight: 300,
          padding: 16,
          background: 'var(--color-slate)',
          borderRadius: 10,
          border: '1px solid var(--color-slate-light)',
          color: 'var(--color-mist)',
          fontSize: 14,
          lineHeight: 1.7,
          resize: 'vertical',
          outline: 'none',
          fontFamily: 'var(--font-sans)',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--color-dim)' }}>{wordCount} words</span>
        {error ? <span style={{ fontSize: 12, color: '#F87171', marginLeft: 12 }}>{error}</span> : null}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onToggleCorrections}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              background: showCorrections ? 'rgba(139, 92, 246, 0.15)' : 'var(--color-slate)',
              color: showCorrections ? '#8B5CF6' : 'var(--color-dim)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {showCorrections ? 'Hide' : 'Show'} Corrections
          </button>
          <button
            type="button"
            onClick={onAnalyze}
            disabled={isAnalyzing}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              background: '#8B5CF6',
              color: '#fff',
              border: 'none',
              cursor: isAnalyzing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: isAnalyzing ? 0.7 : 1,
            }}
          >
            {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            Analyze & Review
          </button>
        </div>
      </div>
    </div>
  );
}

