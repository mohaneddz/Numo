import { describe, expect, it } from 'vitest';
import { detectLeeches, forecastReviews, summarizeQueueHealth } from './reviewInsights';
import type { ReviewItem } from '../../data/types';

const NOW = new Date('2026-03-15T12:00:00.000Z');

function item(overrides: Partial<ReviewItem> = {}): ReviewItem {
  return {
    id: Math.random().toString(36).slice(2),
    term: 'casa',
    translation: 'house',
    type: 'word',
    attempts: 1,
    strength: 'solid',
    dueDate: '2026-03-15',
    ...overrides,
  };
}

describe('forecastReviews', () => {
  it('collapses everything overdue into one leading bucket', () => {
    const forecast = forecastReviews(
      [
        item({ nextDueAt: '2026-03-01T00:00:00.000Z' }),
        item({ nextDueAt: '2026-03-10T00:00:00.000Z' }),
      ],
      7,
      NOW,
    );

    expect(forecast[0].overdue).toBe(true);
    expect(forecast[0].count).toBe(2);
  });

  it('places items on the day they come due', () => {
    const forecast = forecastReviews([item({ nextDueAt: '2026-03-17T09:00:00.000Z' })], 7, NOW);
    expect(forecast.find((day) => day.date === '2026-03-17')?.count).toBe(1);
  });

  it('returns one bucket per day plus the overdue bucket', () => {
    expect(forecastReviews([], 14, NOW)).toHaveLength(15);
  });

  it('ignores items falling beyond the window', () => {
    const forecast = forecastReviews([item({ nextDueAt: '2026-09-01T00:00:00.000Z' })], 7, NOW);
    expect(forecast.reduce((sum, day) => sum + day.count, 0)).toBe(0);
  });

  it('falls back to dueDate when no precise timestamp is stored', () => {
    const forecast = forecastReviews([item({ dueDate: '2026-03-16' })], 7, NOW);
    expect(forecast.find((day) => day.date === '2026-03-16')?.count).toBe(1);
  });

  it('treats an unparseable date as overdue rather than crashing', () => {
    const forecast = forecastReviews([item({ nextDueAt: 'not-a-date' })], 7, NOW);
    expect(forecast[0].count).toBe(1);
  });
});

describe('detectLeeches', () => {
  it('flags items failed repeatedly and still weak', () => {
    const leeches = detectLeeches([
      item({ term: 'aunque', attempts: 9, strength: 'critical' }),
      item({ term: 'casa', attempts: 2, strength: 'solid' }),
    ]);

    expect(leeches).toHaveLength(1);
    expect(leeches[0].item.term).toBe('aunque');
  });

  it('does not flag a well-known item just because it is old', () => {
    const leeches = detectLeeches([item({ attempts: 40, strength: 'very solid' })]);
    expect(leeches).toEqual([]);
  });

  it('does not flag a weak item the learner has barely met', () => {
    const leeches = detectLeeches([item({ attempts: 2, strength: 'critical' })]);
    expect(leeches).toEqual([]);
  });

  it('ranks the worst offenders first', () => {
    const leeches = detectLeeches([
      item({ term: 'b', attempts: 6, strength: 'weak' }),
      item({ term: 'a', attempts: 12, strength: 'weak' }),
    ]);
    expect(leeches.map((leech) => leech.item.term)).toEqual(['a', 'b']);
  });

  it('caps the list at the requested limit', () => {
    const many = Array.from({ length: 20 }, (_, index) =>
      item({ term: `w${index}`, attempts: 8, strength: 'weak' }),
    );
    expect(detectLeeches(many, 5)).toHaveLength(5);
  });
});

describe('summarizeQueueHealth', () => {
  it('separates overdue items from those due today', () => {
    const health = summarizeQueueHealth(
      [
        item({ nextDueAt: '2026-03-01T00:00:00.000Z' }),
        item({ nextDueAt: '2026-03-15T08:00:00.000Z' }),
        item({ nextDueAt: '2026-03-20T00:00:00.000Z' }),
      ],
      NOW,
    );

    expect(health.overdue).toBe(1);
    expect(health.dueToday).toBe(1);
    expect(health.total).toBe(3);
  });

  it('reports the share of the queue that is stable', () => {
    const health = summarizeQueueHealth(
      [
        item({ strength: 'very solid' }),
        item({ strength: 'solid' }),
        item({ strength: 'weak' }),
        item({ strength: 'critical' }),
      ],
      NOW,
    );
    expect(health.stablePercent).toBe(50);
  });

  it('reports every strength band, including empty ones', () => {
    const health = summarizeQueueHealth([item({ strength: 'solid' })], NOW);
    expect(health.byStrength).toHaveLength(5);
    expect(health.byStrength.find((band) => band.strength === 'critical')?.count).toBe(0);
  });

  it('reports zero rather than dividing by an empty queue', () => {
    const health = summarizeQueueHealth([], NOW);
    expect(health.stablePercent).toBe(0);
    expect(health.total).toBe(0);
  });

  it('counts every leech, not just the ones a list would show', () => {
    const many = Array.from({ length: 20 }, (_, index) =>
      item({ term: `w${index}`, attempts: 8, strength: 'weak' }),
    );
    expect(summarizeQueueHealth(many, NOW).leechCount).toBe(20);
  });
});

describe('review card rotations', () => {
  it('leads production practice with the produce-it card', async () => {
    const { chooseAdaptiveReviewCardType } = await import('./adaptiveReviewService');
    const signals = {
      seenCount: 40,
      recognitionScore: 90,
      productionScore: 40,
      hoverTranslationUsage: 0,
      confusionPairs: {},
    } as never;

    const chosen = chooseAdaptiveReviewCardType({
      index: 0,
      item: item({ term: 'aunque' }),
      languageCode: 'es',
      signals,
    });

    expect(chosen).toBe('produce_term');
  });
});
