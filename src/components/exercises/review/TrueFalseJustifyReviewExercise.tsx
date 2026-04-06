import type { ReviewExerciseProps } from './types';
import { InteractiveText } from '../shared/InteractiveText';

export function TrueFalseJustifyReviewExercise({
  question,
  tf,
  why = '',
  onSetTf,
  onSetWhy,
  onSubmitTfj,
  checking,
  done,
  onSkip,
}: ReviewExerciseProps) {
  return (
    <div className="grid gap-2">
      <div className="card" style={{ padding: 10 }}>
        <InteractiveText text={question.statement ?? ''} />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => onSetTf?.(true)} className="page-primary-action">
          True (T)
        </button>
        <button type="button" onClick={() => onSetTf?.(false)} className="page-primary-action">
          False (F)
        </button>
      </div>
      <textarea
        value={why}
        onChange={(event) => onSetWhy?.(event.target.value)}
        rows={3}
        placeholder="Why?"
        style={{
          width: '100%',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(2,6,23,0.5)',
          color: 'var(--color-mist)',
          padding: 12,
        }}
      />
      <div className="flex gap-2">
        <button type="button" onClick={onSubmitTfj} disabled={checking || done || tf === null} className="page-primary-action">
          {checking ? 'Validating...' : 'Validate (Ctrl/Cmd+Enter)'}
        </button>
        <button type="button" onClick={onSkip} className="page-primary-action">
          Skip (S)
        </button>
      </div>
    </div>
  );
}
