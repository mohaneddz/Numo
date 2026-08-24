import type { ReviewExerciseProps } from './types';

export function WriteReviewExercise({ text = '', onSetText, onSubmitWrite, checking, done, onSkip }: ReviewExerciseProps) {
  return (
    <div className="grid gap-2">
      <textarea
        value={text}
        onChange={(event) => onSetText?.(event.target.value)}
        rows={4}
        placeholder="Type your recall..."
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
        <button type="button" onClick={onSubmitWrite} disabled={checking || done} className="page-primary-action">
          {checking ? 'Validating...' : 'Validate (Enter)'}
        </button>
        <button type="button" onClick={onSkip} className="page-primary-action">
          Skip (S)
        </button>
      </div>
    </div>
  );
}
