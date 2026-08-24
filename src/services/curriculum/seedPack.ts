/**
 * Bundled, pre-generated task content shipped with the app.
 *
 * `taskContentService` caches generated content per learner device via the
 * settings repository, which requires the Tauri SQLite runtime and starts empty
 * for every new install — the first time any learner touches a given
 * (skill, exercise type, difficulty) combination, they wait on a live model call.
 *
 * A seed pack is that same cache, pre-populated offline by `scripts/
 * generateCurriculumSeed.ts` and checked into `src/data/curriculumSeeds/`. It is
 * bundled into the app, so a fresh install already has validated content for
 * every core (non-Everdark) skill in a covered language, with no network wait and
 * no dependency on Tauri persistence. Everdark content is deliberately excluded —
 * it is procedurally infinite, so there is nothing finite to bundle for it.
 *
 * Entries use the exact same cache key format as the live cache
 * (`taskContentService.buildCacheKey`), so a seed entry and a later live-generated
 * variant for the same key merge naturally once persistence is available.
 */

import type { TaskContent } from './contentValidation';

interface SeedPackFile {
  languageCode: string;
  version: number;
  generatedAt: string;
  /** Cache key -> validated content variants. */
  entries: Record<string, TaskContent[]>;
}

// Lazy: only the language actually being studied should ever be parsed. Vite
// keeps each matched file as a separate chunk, so this does not pull every
// language's seed pack into one bundle.
const seedModules = import.meta.glob('../../data/curriculumSeeds/*.json') as Record<
  string,
  () => Promise<{ default: SeedPackFile }>
>;

const loadedPacks = new Map<string, Promise<SeedPackFile | null>>();

function moduleKeyFor(languageCode: string): string | null {
  const suffix = `/${languageCode}.json`;
  return Object.keys(seedModules).find((path) => path.endsWith(suffix)) ?? null;
}

async function load(languageCode: string): Promise<SeedPackFile | null> {
  const path = moduleKeyFor(languageCode);
  if (!path) return null;
  try {
    const loaded = await seedModules[path]();
    return loaded.default ?? null;
  } catch (error) {
    console.error(`seedPack: failed to load bundled content for "${languageCode}"`, error);
    return null;
  }
}

/** Loads (and caches in memory) the seed pack for a language, if one is bundled. */
export function loadSeedPack(languageCode: string): Promise<SeedPackFile | null> {
  const cached = loadedPacks.get(languageCode);
  if (cached) return cached;
  const promise = load(languageCode);
  loadedPacks.set(languageCode, promise);
  return promise;
}

/** Looks up bundled variants for one cache key. Returns null when nothing is bundled. */
export async function seedVariantsFor(languageCode: string, key: string): Promise<TaskContent[] | null> {
  const pack = await loadSeedPack(languageCode);
  const variants = pack?.entries[key];
  return variants && variants.length > 0 ? variants : null;
}

/** True when a language has a bundled seed pack at all, without loading it. */
export function hasSeedPack(languageCode: string): boolean {
  return moduleKeyFor(languageCode) !== null;
}

/** Every language a seed pack is bundled for. */
export function seededLanguages(): string[] {
  return Object.keys(seedModules)
    .map((path) => path.match(/([a-z0-9-]+)\.json$/i)?.[1])
    .filter((code): code is string => Boolean(code));
}
