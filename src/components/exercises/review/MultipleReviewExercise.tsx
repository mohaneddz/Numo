import type { ReviewExerciseProps } from './types';
import { InteractiveText } from '../shared/InteractiveText';

/**
 * Meaning-choice card.
 *
 * The term was never rendered: the learner saw four meanings and the prompt
 * "Pick the closest meaning", with no word on screen to pick a meaning for.
 */
export function MultipleReviewExercise({ question, done, pick, onSetPick, onGrade, onSkip }: ReviewExerciseProps) {
  return (
    <div className="grid gap-2">
      <h2 className="text-center" style={{ fontSize: 30, marginBottom: 4 }}>
        <InteractiveText text={question.term} className="text-[30px]" />
      </h2>
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
