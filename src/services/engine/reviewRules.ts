import type { ReviewItemRecord } from '../../persistence';
import type { SubmitReviewResult } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function intervalMultiplier(result: SubmitReviewResult): number {
  if (result === 'correct') return 1.8;
  if (result === 'partial') return 1.2;
  if (result === 'skipped') return 0.9;
  return 0.4;
}

function easeDelta(result: SubmitReviewResult): number {
  if (result === 'correct') return 0.12;
  if (result === 'partial') return 0.02;
  if (result === 'skipped') return -0.08;
  return -0.22;
}

export function nextReviewPatch(
  reviewItem: ReviewItemRecord,
  result: SubmitReviewResult,
): {
  dueAt: string;
  intervalDays: number;
  easeFactor: number;
  attemptsCount: number;
  strength: string;
} {
  const currentInterval = Math.max(1, reviewItem.intervalDays || 1);
  const currentEase = clamp(reviewItem.easeFactor || 2.3, 1.3, 3.0);
  const intervalDays = Math.max(1, Math.round(currentInterval * intervalMultiplier(result) * currentEase));
  const easeFactor = clamp(Number((currentEase + easeDelta(result)).toFixed(2)), 1.3, 3.0);
  const dueAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString();

  const strength =
    result === 'correct'
      ? 'solid'
      : result === 'partial'
        ? 'needs work'
        : 'weak';

  return {
    dueAt,
    intervalDays,
    easeFactor,
    attemptsCount: (reviewItem.attemptsCount ?? 0) + 1,
    strength,
  };
}
