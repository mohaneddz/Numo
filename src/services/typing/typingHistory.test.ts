import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TypingResult } from './typingService';

/** Stands in for the settings table the history is stored in. */
const store = new Map<string, unknown>();
let persistenceAvailable = true;

vi.mock('../../persistence', () => ({
  initializePersistence: async () => {
    if (!persistenceAvailable) throw new Error('Persistence is only available inside Tauri runtime.');
    return {
      repositories: {
        settings: {
          getJson: async (key: string) => store.get(key) ?? null,
          setJson: async (key: string, value: unknown) => {
            store.set(key, value);
          },
        },
      },
    };
  },
}));

const { bestKey, loadTypingHistory, recordTypingRun, summarizeHistory } = await import(
  './typingHistory'
);

function result(overrides: Partial<TypingResult> = {}): TypingResult {
  return {
    wpm: 60,
    rawWpm: 65,
    accuracy: 97,
    consistency: 88,
    elapsedSeconds: 30,
    correctCharacters: 150,
    incorrectCharacters: 5,
    extraCharacters: 0,
    missedCharacters: 0,
    totalKeystrokes: 155,
    charsPerWord: 5,
    samples: [],
    languageCode: 'es',
    mode: 'time',
    amount: 30,
    completedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  store.clear();
  persistenceAvailable = true;
});

describe('loadTypingHistory', () => {
  it('starts empty for a learner who has never run a test', async () => {
    expect(await loadTypingHistory('p1', 'es')).toEqual({ entries: [], bests: {} });
  });

  it('keeps history separate per profile and language', async () => {
    await recordTypingRun('p1', 'es', result());
    expect((await loadTypingHistory('p1', 'zh')).entries).toHaveLength(0);
    expect((await loadTypingHistory('p2', 'es')).entries).toHaveLength(0);
  });

  it('returns an empty history rather than failing without a database', async () => {
    // The trainer still runs outside the Tauri runtime; it just cannot persist.
    persistenceAvailable = false;
    expect(await loadTypingHistory('p1', 'es')).toEqual({ entries: [], bests: {} });
  });
});

describe('recordTypingRun', () => {
  it('appends the run to the history', async () => {
    const outcome = await recordTypingRun('p1', 'es', result());
    expect(outcome.history.entries).toHaveLength(1);
    expect(outcome.history.entries[0].wpm).toBe(60);
  });

  it('treats a first qualifying run as a personal best', async () => {
    const outcome = await recordTypingRun('p1', 'es', result());
    expect(outcome.isPersonalBest).toBe(true);
    expect(outcome.previousBest).toBeNull();
  });

  it('reports the previous best when one is beaten', async () => {
    await recordTypingRun('p1', 'es', result({ wpm: 60 }));
    const outcome = await recordTypingRun('p1', 'es', result({ wpm: 72 }));

    expect(outcome.isPersonalBest).toBe(true);
    expect(outcome.previousBest?.wpm).toBe(60);
  });

  it('does not call a slower run a best', async () => {
    await recordTypingRun('p1', 'es', result({ wpm: 80 }));
    const outcome = await recordTypingRun('p1', 'es', result({ wpm: 50 }));

    expect(outcome.isPersonalBest).toBe(false);
    expect(outcome.history.bests[bestKey('time', 30)].wpm).toBe(80);
  });

  it('refuses a best set by mashing keys', async () => {
    // Without the accuracy gate, hammering the keyboard sets a record nothing
    // can beat and the number stops meaning anything.
    const outcome = await recordTypingRun('p1', 'es', result({ wpm: 200, accuracy: 12 }));
    expect(outcome.isPersonalBest).toBe(false);
    expect(outcome.history.bests[bestKey('time', 30)]).toBeUndefined();
  });

  it('still records a sloppy run in the history', async () => {
    const outcome = await recordTypingRun('p1', 'es', result({ accuracy: 12 }));
    expect(outcome.history.entries).toHaveLength(1);
  });

  it('tracks bests separately per test length', async () => {
    await recordTypingRun('p1', 'es', result({ amount: 15, wpm: 90 }));
    const outcome = await recordTypingRun('p1', 'es', result({ amount: 120, wpm: 55 }));

    // A 15-second sprint is not comparable to a two-minute run.
    expect(outcome.isPersonalBest).toBe(true);
    expect(outcome.history.bests[bestKey('time', 15)].wpm).toBe(90);
    expect(outcome.history.bests[bestKey('time', 120)].wpm).toBe(55);
  });

  it('caps stored runs so the history cannot grow without bound', async () => {
    for (let run = 0; run < 105; run += 1) {
      await recordTypingRun('p1', 'es', result({ wpm: run }));
    }
    const history = await loadTypingHistory('p1', 'es');
    expect(history.entries).toHaveLength(100);
    // The oldest are dropped, not the newest.
    expect(history.entries[history.entries.length - 1].wpm).toBe(104);
  });

  it('returns a usable outcome even when the write fails', async () => {
    persistenceAvailable = false;
    const outcome = await recordTypingRun('p1', 'es', result());
    expect(outcome.history.entries).toHaveLength(1);
  });
});

describe('summarizeHistory', () => {
  it('reports zeroes for an empty history rather than dividing by nothing', () => {
    expect(summarizeHistory({ entries: [], bests: {} })).toEqual({
      runCount: 0,
      averageWpm: 0,
      averageAccuracy: 0,
      bestWpm: 0,
      recent: [],
    });
  });

  it('averages speed and accuracy across runs', async () => {
    await recordTypingRun('p1', 'es', result({ wpm: 40, accuracy: 90 }));
    await recordTypingRun('p1', 'es', result({ wpm: 60, accuracy: 100 }));

    const summary = summarizeHistory(await loadTypingHistory('p1', 'es'));
    expect(summary.averageWpm).toBe(50);
    expect(summary.averageAccuracy).toBe(95);
    expect(summary.bestWpm).toBe(60);
  });

  it('returns only the most recent runs for the chart', async () => {
    for (let run = 0; run < 20; run += 1) {
      await recordTypingRun('p1', 'es', result({ wpm: run }));
    }
    const summary = summarizeHistory(await loadTypingHistory('p1', 'es'), 5);
    expect(summary.recent).toHaveLength(5);
    expect(summary.recent[4].wpm).toBe(19);
  });
});
