import { isTauri } from '@tauri-apps/api/core';
import Database from '@tauri-apps/plugin-sql';
import { PersistenceUnavailableError } from './errors';
import type { SqlDatabase } from './types';

const DB_URL = 'sqlite:numo.db';

let dbPromise: Promise<SqlDatabase> | null = null;

export async function getDatabase(): Promise<SqlDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabase().catch((error) => {
      // Do not cache a failed bootstrap forever; allow subsequent retries.
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

async function openDatabase(): Promise<SqlDatabase> {
  if (!isTauri()) {
    throw new PersistenceUnavailableError();
  }

  try {
    const db = await Database.load(DB_URL);
    await db.execute('PRAGMA foreign_keys = ON;');
    await db.execute('PRAGMA journal_mode = WAL;');
    return db as SqlDatabase;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes('missing origin header')) {
      throw new PersistenceUnavailableError('Persistence is unavailable outside Tauri runtime.');
    }
    throw error;
  }
}

export async function runInTransaction<T>(
  db: SqlDatabase,
  action: () => Promise<T>,
): Promise<T> {
  await db.execute('BEGIN IMMEDIATE;');
  try {
    const result = await action();
    await db.execute('COMMIT;');
    return result;
  } catch (error) {
    try {
      await db.execute('ROLLBACK;');
    } catch {
      // Do not shadow original error.
    }
    throw error;
  }
}
