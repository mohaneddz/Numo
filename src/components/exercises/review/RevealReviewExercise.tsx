import { CheckCircle, Eye, XCircle } from 'lucide-react';
import { InteractiveText } from '../shared/InteractiveText';
import type { ReviewExerciseProps } from './types';

export function RevealReviewExercise({
  question,
  onGrade,
  onSetReveal,
  revealed = false,
  onSkip,
}: ReviewExerciseProps) {
  return (
    <div className="space-y-3 text-center">
      <h2 style={{ fontSize: 34 }}>
        <InteractiveText text={question.term} className="text-[34px]" />
      </h2>
      {!revealed ? (
        <div className="flex justify-center gap-2">
          <button type="button" onClick={() => onSetReveal?.(true)} className="page-primary-action">
            <Eye size={14} /> Show Answer
          </button>
          <button type="button" onClick={onSkip} className="page-primary-action">
            Skip (S)
          </button>
        </div>
      ) : (
        <>
          <p style={{ color: '#22D3EE', fontSize: 21 }}>
            <InteractiveText text={question.answer} />
          </p>
          <div className="flex gap-2 justify-center">
            <button type="button" onClick={() => onGrade('incorrect', `Answer: ${question.answer}`)} className="page-primary-action">
              <XCircle size={14} /> Incorrect (X)
            </button>
            <button type="button" onClick={() => onGrade('correct', 'Correct recall.')} className="page-primary-action">
              <CheckCircle size={14} /> Correct (C)
            </button>
            <button type="button" onClick={onSkip} className="page-primary-action">
              Skip (S)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
