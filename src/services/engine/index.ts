import { initializePersistence, PersistenceUnavailableError, type PersistenceContext } from '../../persistence';
import { runtimeKernel } from '../../runtime';
import { createRuntimePersistenceAdapter } from './runtimePersistenceAdapter';
import { EvidenceService } from './evidenceService';
import { LearnerStateService } from './learnerStateService';
import { ProgressQueryService } from './progressQueryService';
import { ReviewService } from './reviewService';
import type { EngineContext } from './types';

export interface EngineServices {
  context: EngineContext;
  evidenceService: EvidenceService;
  learnerStateService: LearnerStateService;
  reviewService: ReviewService;
  progressQueryService: ProgressQueryService;
}

const enginePromiseByProfile = new Map<string, Promise<EngineServices | null>>();

async function resolveEngineContext(
  persistence: PersistenceContext,
  explicitLearnerId?: string,
  explicitLanguageCode?: string,
): Promise<EngineContext> {
  const learner = explicitLearnerId
    ? await persistence.repositories.learner.getProfileById(explicitLearnerId)
    : await persistence.repositories.learner.getActiveProfile();
  if (!learner) {
    throw new Error('No active learner profile set.');
  }

  let activeLanguage;
  if (explicitLanguageCode) {
    const list = await persistence.repositories.languages.listLanguages();
    activeLanguage = list.find((l) => l.code === explicitLanguageCode);
  }
  if (!activeLanguage) {
    activeLanguage =
      (await persistence.repositories.languages.getActiveLanguage()) ??
      (await persistence.repositories.languages.listLanguages())[0];
  }

  if (!activeLanguage) {
    throw new Error('No active language available for engine context.');
  }

  const curriculum =
    await persistence.repositories.curriculum.getCurriculumByLanguageCode(activeLanguage.code);
  if (!curriculum) {
    throw new Error(`No curriculum found for language ${activeLanguage.code}.`);
  }

  return {
    persistence,
    learnerId: learner.id,
    languageId: activeLanguage.id,
    languageCode: activeLanguage.code,
    curriculumNodes: curriculum.nodes,
  };
}

async function createEngineServices(
  learnerId?: string,
  languageCode?: string,
): Promise<EngineServices | null> {
  try {
    const persistence = await initializePersistence();
    const context = await resolveEngineContext(persistence, learnerId, languageCode);
    runtimeKernel.attachPersistenceAdapter(createRuntimePersistenceAdapter(persistence));

    return {
      context,
      evidenceService: new EvidenceService(context),
      learnerStateService: new LearnerStateService(context),
      reviewService: new ReviewService(context),
      progressQueryService: new ProgressQueryService(context),
    };
  } catch (error) {
    if (error instanceof PersistenceUnavailableError) {
      return null;
    }
    console.error('Engine initialization failed', error);
    return null;
  }
}

export async function initializeEngineServices(options?: {
  learnerId?: string;
  languageCode?: string;
  forceReload?: boolean;
}): Promise<EngineServices | null> {
  const learnerId = options?.learnerId ?? '__active__';
  const languageCode = options?.languageCode ?? '';
  const key = `${learnerId}::${languageCode}`;

  if (options?.forceReload) {
    enginePromiseByProfile.delete(key);
  }

  if (!enginePromiseByProfile.has(key)) {
    enginePromiseByProfile.set(key, createEngineServices(options?.learnerId, options?.languageCode));
  }
  return enginePromiseByProfile.get(key) ?? null;
}
