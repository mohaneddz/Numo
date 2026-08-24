import type { SqlDatabase } from './types';

const RESET_MARKER = 'numo.app_data_reset.english_base_v1';

interface TableRow {
  name: string;
}

export async function resetLegacyAppDataOnce(db: SqlDatabase): Promise<void> {
  if (typeof window === 'undefined' || window.localStorage.getItem(RESET_MARKER) === 'done') {
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

  window.localStorage.clear();
  window.sessionStorage.clear();
  window.localStorage.setItem(RESET_MARKER, 'done');
}
