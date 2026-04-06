import { CheckCircle2, XCircle } from 'lucide-react';
import type { ExerciseFeedbackModel } from '../../../services/exercises/feedbackService';
import { InteractiveText } from './InteractiveText';

interface ExerciseFeedbackCardProps {
  feedback: ExerciseFeedbackModel;
  languageCode?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ExerciseFeedbackCard({ feedback, languageCode, onRetry, retryLabel = 'Try scaffolded retry' }: ExerciseFeedbackCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${feedback.correct ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
      <div className="flex items-center gap-2 text-[14px] font-semibold text-white">
        {feedback.correct ? <CheckCircle2 size={16} className="text-emerald-300" /> : <XCircle size={16} className="text-amber-300" />}
        {feedback.headline} • {feedback.score}%
      </div>
      <p className="mt-2 text-[13px] text-mist">{feedback.explanation}</p>
      {feedback.correctAnswer ? (
        <p className="mt-2 text-[13px] text-cyan-100">
          Correct answer:{' '}
          <InteractiveText text={feedback.correctAnswer} languageCode={languageCode} className="font-semibold" />
        </p>
      ) : null}
      <p className="mt-2 text-[12px] text-dim">Tip: {feedback.teachingPoint}</p>
      {!feedback.correct && feedback.retryHint && onRetry ? (
        <button type="button" className="mt-3 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-[12px] text-mist" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
