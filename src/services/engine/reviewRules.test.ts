import { describe, expect, it } from 'vitest';
import { nextReviewPatch } from './reviewRules';
import type { ReviewItemRecord } from '../../persistence';

const item: ReviewItemRecord = {
  id: 'review-1',
  learnerId: 'learner-1',
  languageId: 'lang-1',
  nodeId: 'node-1',
  contentItemId: null,
  state: 'due',
  dueAt: '2026-03-25T00:00:00.000Z',
  intervalDays: 2,
  easeFactor: 2.3,
  lastReviewedAt: null,
  lastResult: null,
  strength: 'needs work',
  attemptsCount: 1,
  metadata: {},
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-20T00:00:00.000Z',
};

describe('nextReviewPatch', () => {
  it('expands interval on correct result', () => {
    const patch = nextReviewPatch(item, 'correct');
    expect(patch.intervalDays).toBeGreaterThan(item.intervalDays);
    expect(patch.easeFactor).toBeGreaterThan(item.easeFactor);
  });

  it('collapses interval on incorrect result', () => {
    const patch = nextReviewPatch(item, 'incorrect');
    expect(patch.intervalDays).toBeLessThanOrEqual(item.intervalDays);
    expect(patch.easeFactor).toBeLessThan(item.easeFactor);
  });
});
