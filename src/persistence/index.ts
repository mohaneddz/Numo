import { getDatabase } from './db';
import { runLegacyMigrationIfNeeded } from './legacyMigration';
import { runMigrations } from './migrations';
import { SqliteContentRepository } from './repositories/contentRepo';
import { SqliteCurriculumRepository } from './repositories/curriculumRepo';
import { SqliteEvidenceRepository } from './repositories/evidenceRepo';
import { SqliteLanguagesRepository } from './repositories/languagesRepo';
import { SqliteLearnerRepository } from './repositories/learnerRepo';
import { SqliteReviewRepository } from './repositories/reviewRepo';
import { SqliteSettingsRepository } from './repositories/settingsRepo';
import { seedMinimalCurricula } from './seeds';
import type { PersistenceContext } from './types';

let persistencePromise: Promise<PersistenceContext> | null = null;

export async function initializePersistence(): Promise<PersistenceContext> {
  if (!persistencePromise) {
    persistencePromise = createPersistenceContext().catch((error) => {
      // Do not pin a failed initialization; allow recovery/retry.
      persistencePromise = null;
      throw error;
    });
  }
  return persistencePromise;
}

async function createPersistenceContext(): Promise<PersistenceContext> {
  const db = await getDatabase();
  await runMigrations(db);

  const context: PersistenceContext = {
    db,
    repositories: {
      languages: new SqliteLanguagesRepository(db),
      curriculum: new SqliteCurriculumRepository(db),
      learner: new SqliteLearnerRepository(db),
      evidence: new SqliteEvidenceRepository(db),
      review: new SqliteReviewRepository(db),
      content: new SqliteContentRepository(db),
      settings: new SqliteSettingsRepository(db),
    },
  };

  await seedMinimalCurricula(context);
  await runLegacyMigrationIfNeeded(context);

  return context;
}

export * from './errors';
export * from './types';
export * from './smoke';
