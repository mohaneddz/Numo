import { RepositoryError } from '../errors';
import { fromSqlBool, makeId, nowIso } from '../utils';
import type { LanguageRecord, LanguagesRepository, SqlDatabase } from '../types';

interface LanguageRow {
  id: string;
  code: string;
  name: string;
  flag: string | null;
  base_language_code: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function mapLanguageRow(row: LanguageRow): LanguageRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    flag: row.flag,
    baseLanguageCode: row.base_language_code,
    isActive: fromSqlBool(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteLanguagesRepository implements LanguagesRepository {
  constructor(private readonly db: SqlDatabase) {}

  async upsertLanguage(input: {
    code: string;
    name: string;
    flag?: string | null;
    baseLanguageCode?: string;
  }): Promise<LanguageRecord> {
    try {
      const timestamp = nowIso();
      await this.db.execute(
        `
        INSERT INTO languages (id, code, name, flag, base_language_code, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
        ON CONFLICT(code) DO UPDATE SET
          name = excluded.name,
          flag = excluded.flag,
          base_language_code = excluded.base_language_code,
          updated_at = excluded.updated_at;
        `,
        [
          makeId('lang'),
          input.code,
          input.name,
          input.flag ?? null,
          input.baseLanguageCode ?? 'en',
          timestamp,
          timestamp,
        ],
      );
      const rows = await this.db.select<LanguageRow>(
        `
        SELECT id, code, name, flag, base_language_code, is_active, created_at, updated_at
        FROM languages
        WHERE code = ?
        LIMIT 1;
        `,
        [input.code],
      );
      return mapLanguageRow(rows[0]);
    } catch (error) {
      throw new RepositoryError('languages', 'upsertLanguage', error);
    }
  }

  async listLanguages(): Promise<LanguageRecord[]> {
    try {
      const rows = await this.db.select<LanguageRow>(
        `
        SELECT id, code, name, flag, base_language_code, is_active, created_at, updated_at
        FROM languages
        ORDER BY code ASC;
        `,
      );
      return rows.map(mapLanguageRow);
    } catch (error) {
      throw new RepositoryError('languages', 'listLanguages', error);
    }
  }

  async getLanguageByCode(code: string): Promise<LanguageRecord | null> {
    try {
      const rows = await this.db.select<LanguageRow>(
        `
        SELECT id, code, name, flag, base_language_code, is_active, created_at, updated_at
        FROM languages
        WHERE code = ?
        LIMIT 1;
        `,
        [code],
      );
      return rows.length > 0 ? mapLanguageRow(rows[0]) : null;
    } catch (error) {
      throw new RepositoryError('languages', 'getLanguageByCode', error);
    }
  }

  async getActiveLanguage(): Promise<LanguageRecord | null> {
    try {
      const rows = await this.db.select<LanguageRow>(
        `
        SELECT id, code, name, flag, base_language_code, is_active, created_at, updated_at
        FROM languages
        WHERE is_active = 1
        ORDER BY updated_at DESC
        LIMIT 1;
        `,
      );
      return rows.length > 0 ? mapLanguageRow(rows[0]) : null;
    } catch (error) {
      throw new RepositoryError('languages', 'getActiveLanguage', error);
    }
  }

  async setActiveLanguage(code: string): Promise<void> {
    try {
      await this.db.execute('UPDATE languages SET is_active = 0, updated_at = ?;', [nowIso()]);
      await this.db.execute(
        'UPDATE languages SET is_active = 1, updated_at = ? WHERE code = ?;',
        [nowIso(), code],
      );
    } catch (error) {
      throw new RepositoryError('languages', 'setActiveLanguage', error);
    }
  }
}
