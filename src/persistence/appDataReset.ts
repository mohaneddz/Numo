import { nowIso } from './utils';
import type { SqlDatabase } from './types';

/**
 * One-time wipe of pre-"English base" data.
 *
 * The marker used to live in `localStorage` while the thing it protected was
 * the SQLite database. Those are cleared independently — an app-data clear, a
 * new webview profile, or anything else that emptied local storage would make
 * this look like a fresh install and wipe every bit of the learner's
 * progress again. The marker now lives in the database it guards, so the reset
 * can only ever happen once.
 */
const RESET_MARKER_KEY = 'numo.app_data_reset.english_base_v1';
const LEGACY_LOCAL_STORAGE_MARKER = RESET_MARKER_KEY;

interface TableRow {
  name: string;
}

interface MarkerRow {
  key: string;
}

async function markerIsSet(db: SqlDatabase): Promise<boolean> {
  const rows = await db.select<MarkerRow>('SELECT key FROM settings WHERE key = ?;', [
    RESET_MARKER_KEY,
  ]);
  return rows.length > 0;
}

async function setMarker(db: SqlDatabase): Promise<void> {
  await db.execute(
    `
    INSERT INTO settings (key, value_json, source, updated_at)
    VALUES (?, ?, 'system', ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at;
    `,
    [RESET_MARKER_KEY, JSON.stringify(true), nowIso()],
  );
}

function legacyMarkerIsSet(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(LEGACY_LOCAL_STORAGE_MARKER) === 'done';
  } catch {
    return false;
  }
}

export async function resetLegacyAppDataOnce(db: SqlDatabase): Promise<void> {
  if (await markerIsSet(db)) return;

  // Installs that already ran the reset under the old scheme must not run it a
  // second time; adopt their marker instead of wiping them.
  if (legacyMarkerIsSet()) {
    await setMarker(db);
    return;
  }

  const tables = await db.select<TableRow>(
    `
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
      AND name <> 'schema_migrations';
    `,
  );

  await db.execute('PRAGMA foreign_keys = OFF;');
  try {
    for (const table of tables) {
      const safeTableName = table.name.replace(/"/g, '""');
      await db.execute(`DELETE FROM "${safeTableName}";`);
    }
  } finally {
    await db.execute('PRAGMA foreign_keys = ON;');
  }

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {
      // Storage being unavailable is not a reason to leave the marker unset and
      // wipe the database again on the next launch.
    }
  }

  await setMarker(db);
}
