import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetLegacyAppDataOnce } from './appDataReset';
import type { SqlDatabase } from './types';

const MARKER = 'numo.app_data_reset.english_base_v1';

/**
 * A database stub that tracks which tables were wiped and whether the marker
 * was written, which is all this behaviour turns on.
 */
function createDatabase(options: { markerSet?: boolean } = {}) {
  const state = {
    markerSet: options.markerSet ?? false,
    deletedTables: [] as string[],
    executed: [] as string[],
  };

  const db: SqlDatabase = {
    async execute(query: string) {
      state.executed.push(query);
      const deleted = query.match(/DELETE FROM "([^"]+)"/);
      if (deleted) state.deletedTables.push(deleted[1]);
      if (query.includes('INSERT INTO settings')) state.markerSet = true;
      return undefined;
    },
    async select<T>(query: string): Promise<T[]> {
      if (query.includes('FROM settings WHERE key')) {
        return (state.markerSet ? [{ key: MARKER }] : []) as T[];
      }
      if (query.includes('sqlite_master')) {
        return [{ name: 'evidence' }, { name: 'review_items' }, { name: 'settings' }] as T[];
      }
      return [] as T[];
    },
  };

  return { db, state };
}

const storage = {
  value: null as string | null,
  install() {
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (key: string) => (key === MARKER ? storage.value : null),
        clear: () => {
          storage.value = null;
        },
      },
      sessionStorage: { clear: () => {} },
    };
  },
};

beforeEach(() => {
  storage.value = null;
  storage.install();
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe('resetLegacyAppDataOnce', () => {
  it('wipes the database on a first run and records the marker', async () => {
    const { db, state } = createDatabase();
    await resetLegacyAppDataOnce(db);

    expect(state.deletedTables).toContain('evidence');
    expect(state.markerSet).toBe(true);
  });

  it('does nothing once the marker is recorded in the database', async () => {
    const { db, state } = createDatabase({ markerSet: true });
    await resetLegacyAppDataOnce(db);

    expect(state.deletedTables).toEqual([]);
  });

  it('does not wipe again when local storage is cleared after a reset', async () => {
    // The marker used to live in localStorage while guarding SQLite, so
    // clearing app data looked like a fresh install and destroyed every bit of
    // the learner's progress.
    const first = createDatabase();
    await resetLegacyAppDataOnce(first.db);
    expect(first.state.deletedTables.length).toBeGreaterThan(0);

    storage.value = null;
    const second = createDatabase({ markerSet: first.state.markerSet });
    await resetLegacyAppDataOnce(second.db);

    expect(second.state.deletedTables).toEqual([]);
  });

  it('adopts the old local-storage marker instead of wiping an existing install', async () => {
    storage.value = 'done';
    const { db, state } = createDatabase();
    await resetLegacyAppDataOnce(db);

    expect(state.deletedTables).toEqual([]);
    expect(state.markerSet).toBe(true);
  });

  it('records the marker even when storage cannot be cleared', async () => {
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: () => null,
        clear: () => {
          throw new Error('storage disabled');
        },
      },
      sessionStorage: { clear: () => {} },
    };

    const { db, state } = createDatabase();
    await resetLegacyAppDataOnce(db);

    expect(state.markerSet).toBe(true);
  });

  it('re-enables foreign keys after wiping', async () => {
    const { db, state } = createDatabase();
    await resetLegacyAppDataOnce(db);

    expect(state.executed).toContain('PRAGMA foreign_keys = ON;');
  });
});
