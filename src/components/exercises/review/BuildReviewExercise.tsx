import type { ReviewExerciseProps } from './types';
import { InteractiveText } from '../shared/InteractiveText';

export function BuildReviewExercise({ question, build = [], onSetBuild, onGrade, onSkip }: ReviewExerciseProps) {
  const current = build.join(' ');
  const normalizedCurrent = current.trim().toLowerCase();
  const normalizedAnswer = question.answer.trim().toLowerCase();
  const isCorrect = normalizedCurrent === normalizedAnswer;

  return (
    <div className="grid gap-2">
      {/* The term was never shown, so the learner had a word bank and nothing
          to translate. */}
      <h2 className="text-center" style={{ fontSize: 30, marginBottom: 4 }}>
        <InteractiveText text={question.term} className="text-[30px]" />
      </h2>
      <div className="card" style={{ padding: 10, minHeight: 44 }}>
        {build.length ? <InteractiveText text={build.join(' ')} /> : 'Build answer...'}
      </div>
      <div className="flex gap-2 flex-wrap">
        {(question.bank ?? []).map((word, index) => (
          <button key={`${word}-${index}`} type="button" onClick={() => onSetBuild?.([...(build ?? []), word])} className="page-primary-action">
            {index + 1}. <InteractiveText text={word} />
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onGrade(isCorrect ? 'correct' : 'incorrect', isCorrect ? 'Perfect build.' : `Expected: ${question.answer}`)}
          className="page-primary-action"
        >
          Check (Enter)
        </button>
        <button type="button" onClick={onSkip} className="page-primary-action">
          Skip (S)
        </button>
        <button type="button" onClick={() => onSetBuild?.([])} className="page-primary-action">
          Clear (C)
        </button>
      </div>
    </div>
  );
}
