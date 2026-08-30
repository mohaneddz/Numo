import { InteractiveText } from '../shared/InteractiveText';
import type { ReviewExerciseProps } from './types';

/**
 * Written-recall card.
 *
 * The word being asked about was never rendered: the shell shows the prompt
 * ("Write the exact meaning.") and this component showed only a textarea, so
 * every write, radical-recall, reading-recall and produce-it card asked the
 * learner to type an answer without ever telling them what for.
 */
export function WriteReviewExercise({
  question,
  text = '',
  onSetText,
  onSubmitWrite,
  checking,
  done,
  onSkip,
}: ReviewExerciseProps) {
  return (
    <div className="grid gap-3">
      <h2 className="text-center" style={{ fontSize: 30 }}>
        <InteractiveText text={question.term} className="text-[30px]" />
      </h2>

      <textarea
        value={text}
        onChange={(event) => onSetText?.(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSubmitWrite?.();
          }
        }}
        rows={4}
        placeholder="Type your recall..."
        aria-label="Your answer"
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
