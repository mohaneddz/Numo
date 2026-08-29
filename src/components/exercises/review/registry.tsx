import { BuildReviewExercise } from './BuildReviewExercise';
import { MultipleReviewExercise } from './MultipleReviewExercise';
import { RevealReviewExercise } from './RevealReviewExercise';
import { TrueFalseJustifyReviewExercise } from './TrueFalseJustifyReviewExercise';
import { TrueFalseReviewExercise } from './TrueFalseReviewExercise';
import type { ReviewQuestion } from './types';
import type { ReviewExerciseRegistry } from './types';
import { WriteReviewExercise } from './WriteReviewExercise';

const hasOptions = (question: ReviewQuestion) => Array.isArray(question.options) && question.options.length >= 2 && typeof question.correctIndex === 'number';
const hasBank = (question: ReviewQuestion) => Array.isArray(question.bank) && question.bank.length > 0;
const hasStatement = (question: ReviewQuestion) => typeof question.statement === 'string' && question.statement.length > 0;

export const reviewExerciseRegistry = {
  reveal: { component: RevealReviewExercise, validate: () => true, grading: 'deterministic' },
  multiple: { component: MultipleReviewExercise, validate: hasOptions, grading: 'deterministic' },
  write: { component: WriteReviewExercise, validate: () => true, grading: 'hybrid' },
  build: { component: BuildReviewExercise, validate: hasBank, grading: 'deterministic' },
  tf: { component: TrueFalseReviewExercise, validate: hasStatement, grading: 'deterministic' },
  tfj: { component: TrueFalseJustifyReviewExercise, validate: hasStatement, grading: 'hybrid' },
  flash_recall: { component: RevealReviewExercise, validate: () => true, grading: 'deterministic' },
  delayed_recall: { component: RevealReviewExercise, validate: () => true, grading: 'deterministic' },
  seen_unseen: { component: TrueFalseReviewExercise, validate: hasStatement, grading: 'deterministic' },
  confusion_pair: { component: MultipleReviewExercise, validate: hasOptions, grading: 'deterministic' },
  radical_recall: { component: WriteReviewExercise, validate: () => true, grading: 'hybrid' },
  reading_recall: { component: WriteReviewExercise, validate: () => true, grading: 'hybrid' },
  produce_term: { component: WriteReviewExercise, validate: () => true, grading: 'hybrid' },
} satisfies ReviewExerciseRegistry;
