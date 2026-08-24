import type { ReviewExerciseProps } from './types';
import { InteractiveText } from '../shared/InteractiveText';

export function MultipleReviewExercise({ question, done, pick, onSetPick, onGrade, onSkip }: ReviewExerciseProps) {
  return (
    <div className="grid gap-2">
      {(question.options ?? []).map((option, index) => (
        <button
          key={option}
          type="button"
          onClick={() => {
            onSetPick?.(index);
            onGrade(index === question.correctIndex ? 'correct' : 'incorrect', index === question.correctIndex ? 'Correct choice.' : `Correct: ${question.answer}`);
          }}
          className="page-primary-action"
          style={{
            justifyContent: 'flex-start',
            background: done && index === question.correctIndex ? 'rgba(52,211,153,0.2)' : done && pick === index ? 'rgba(248,113,113,0.2)' : undefined,
          }}
        >
          <strong>{index + 1}.</strong> <InteractiveText text={option} />
        </button>
      ))}
      <button type="button" onClick={onSkip} className="page-primary-action">
        Skip (S)
      </button>
    </div>
  );
}
