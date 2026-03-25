import { initializePersistence } from './index';

export interface PersistenceSmokeResult {
  languageCount: number;
  curriculumCount: number;
  tableCount: number;
}

export async function runPersistenceSmokeCheck(): Promise<PersistenceSmokeResult> {
  const first = await initializePersistence();
  const second = await initializePersistence();

  if (first !== second) {
    throw new Error('Persistence singleton initialization is not stable.');
  }

  const languages = await first.repositories.languages.listLanguages();
  const curriculumEs = await first.repositories.curriculum.getCurriculumByLanguageCode('es');
  const tables = await first.db.select<{ count: number }>(
    `SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table';`,
  );

  return {
    languageCount: languages.length,
    curriculumCount: curriculumEs ? 1 : 0,
    tableCount: tables[0]?.count ?? 0,
  };
}
