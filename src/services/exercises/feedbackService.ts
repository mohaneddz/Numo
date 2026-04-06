export interface ExerciseFeedbackModel {
  correct: boolean;
  score: number;
  headline: string;
  explanation: string;
  teachingPoint: string;
  correctAnswer?: string;
  retryHint?: string;
}

interface BuildFeedbackInput {
  correct: boolean;
  score?: number;
  learnerAnswer?: string;
  expectedAnswer?: string;
  why?: string;
  teachingPoint?: string;
}

export function buildExerciseFeedback(input: BuildFeedbackInput): ExerciseFeedbackModel {
  const score = Math.max(0, Math.min(100, Math.round(input.score ?? (input.correct ? 100 : 0))));
  const expected = input.expectedAnswer?.trim();
  const why = input.why?.trim();

  if (input.correct) {
    return {
      correct: true,
      score,
      headline: 'Correct',
      explanation: why || 'Your answer matches the target well.',
      teachingPoint: input.teachingPoint?.trim() || 'Keep the same pattern and speed on the next item.',
    };
  }

  const answerMismatch = expected && input.learnerAnswer && expected.toLowerCase() !== input.learnerAnswer.trim().toLowerCase();
  return {
    correct: false,
    score,
    headline: 'Not quite yet',
    explanation: why || (answerMismatch ? 'Your answer did not match the target form.' : 'The answer needs adjustment.'),
    teachingPoint: input.teachingPoint?.trim() || 'Focus on one cue: meaning first, then exact form.',
    correctAnswer: expected,
    retryHint: expected ? 'Try once more with the target pattern visible.' : 'Try again using the strongest clue in the prompt.',
  };
}
