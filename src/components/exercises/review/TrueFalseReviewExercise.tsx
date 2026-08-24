import type { ReviewExerciseProps } from './types';
import { InteractiveText } from '../shared/InteractiveText';

export function TrueFalseReviewExercise({ question, onGrade, onSkip }: ReviewExerciseProps) {
  const isTrue = Boolean(question.correctBool);
  return (
    <div className="grid gap-2">
      <div className="card" style={{ padding: 10 }}>
        <InteractiveText text={question.statement ?? ''} />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => onGrade(isTrue ? 'correct' : 'incorrect', isTrue ? 'Correct.' : 'Statement is false.')} className="page-primary-action">
          True (T)
        </button>
        <button type="button" onClick={() => onGrade(!isTrue ? 'correct' : 'incorrect', !isTrue ? 'Correct.' : 'Statement is true.')} className="page-primary-action">
          False (F)
        </button>
        <button type="button" onClick={onSkip} className="page-primary-action">
          Skip (S)
        </button>
      </div>
    </div>
  );
}
