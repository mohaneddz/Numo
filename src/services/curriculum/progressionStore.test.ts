import { describe, expect, it } from 'vitest';
import { currentStreak, longestStreak, minutesToday, type ProgressionState } from './progressionStore';

const NOW = new Date('2026-03-15T12:00:00.000Z');
const dayKey = (offset: number) =>
  new Date(NOW.getTime() - offset * 86_400_000).toISOString().slice(0, 10);

function state(minutesByDate: Record<string, number>): ProgressionState {
  return {
    currentThemeOrder: 1,
    unlockedThemeOrder: 1,
    currentEverdarkLevel: 0,
    unlockedEverdarkByTheme: {},
    completedStepIds: [],
    checkpointResults: {},
    totalMinutes: Object.values(minutesByDate).reduce((sum, value) => sum + value, 0),
    minutesByDate,
    updatedAt: NOW.toISOString(),
  };
}

describe('minutesToday', () => {
  it('rounds the fractional total banked during the day', () => {
    // Time is stored fractionally so short activities accumulate at all — a
    // review card takes seconds, and rounding each one would bank nothing.
    const today = new Date().toISOString().slice(0, 10);
    expect(minutesToday(state({ [today]: 12.4 }))).toBe(12);
    expect(minutesToday(state({ [today]: 12.6 }))).toBe(13);
  });

  it('reports zero for a day with nothing recorded', () => {
    expect(minutesToday(state({}))).toBe(0);
  });
});

describe('currentStreak', () => {
  it('counts consecutive days back from today', () => {
    const streak = currentStreak(
      state({ [dayKey(0)]: 10, [dayKey(1)]: 5, [dayKey(2)]: 8 }),
      NOW,
    );
    expect(streak).toBe(3);
  });

  it('does not break the streak just because today is still empty', () => {
    const streak = currentStreak(state({ [dayKey(1)]: 5, [dayKey(2)]: 8 }), NOW);
    expect(streak).toBe(2);
  });

  it('stops at the first missed day', () => {
    const streak = currentStreak(
      state({ [dayKey(0)]: 10, [dayKey(1)]: 5, [dayKey(3)]: 8 }),
      NOW,
    );
    expect(streak).toBe(2);
  });

  it('counts a day with a fraction of a minute as studied', () => {
    // Otherwise a session made entirely of quick review cards would not hold
    // the streak.
    expect(currentStreak(state({ [dayKey(0)]: 0.4 }), NOW)).toBe(1);
  });

  it('is zero for a learner who has never studied', () => {
    expect(currentStreak(state({}), NOW)).toBe(0);
  });
});

describe('longestStreak', () => {
  it('finds the longest run of consecutive days', () => {
    const best = longestStreak(
      state({
        [dayKey(10)]: 5,
        [dayKey(9)]: 5,
        [dayKey(8)]: 5,
        [dayKey(6)]: 5,
        [dayKey(5)]: 5,
      }),
    );
    expect(best).toBe(3);
  });

  it('ignores days with no time recorded', () => {
    expect(longestStreak(state({ [dayKey(3)]: 0, [dayKey(2)]: 5 }))).toBe(1);
  });

  it('is zero with no history', () => {
    expect(longestStreak(state({}))).toBe(0);
  });
});
