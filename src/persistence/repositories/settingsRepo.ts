import { RepositoryError } from '../errors';
import { nowIso, stringifyJson } from '../utils';
import type { SettingRecord, SettingsRepository, SqlDatabase } from '../types';

interface SettingRow {
  key: string;
  value_json: string;
  source: string;
  updated_at: string;
}

function mapRow(row: SettingRow): SettingRecord {
  return {
    key: row.key,
    value: JSON.parse(row.value_json),
    source: row.source,
    updatedAt: row.updated_at,
  };
}

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly db: SqlDatabase) {}

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const rows = await this.db.select<SettingRow>(
        'SELECT key, value_json, source, updated_at FROM settings WHERE key = ? LIMIT 1;',
        [key],
      );
      if (rows.length === 0) {
        return null;
      }
      return mapRow(rows[0]).value as T;
    } catch (error) {
      throw new RepositoryError('settings', 'getJson', error);
    }
  }

  async setJson<T>(key: string, value: T, source = 'system'): Promise<SettingRecord> {
    try {
      const updatedAt = nowIso();
      await this.db.execute(
        `
        INSERT INTO settings (key, value_json, source, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value_json = excluded.value_json,
          source = excluded.source,
          updated_at = excluded.updated_at;
        `,
        [key, stringifyJson(value), source, updatedAt],
      );
      const rows = await this.db.select<SettingRow>(
        'SELECT key, value_json, source, updated_at FROM settings WHERE key = ? LIMIT 1;',
        [key],
      );
      return mapRow(rows[0]);
    } catch (error) {
      throw new RepositoryError('settings', 'setJson', error);
    }
  }
}
