/**
 * Bulk-generates and validates core curriculum content for one language, offline,
 * and writes it to `src/data/curriculumSeeds/<language>.json` where `taskContentService`
 * picks it up as a bundled fallback (see `src/services/curriculum/seedPack.ts`).
 *
 * Only the core (Everdark level 1) skill set is covered — Everdark itself is
 * procedurally infinite, so there is nothing finite to pre-generate for it; those
 * sessions keep generating live exactly as they do today.
 *
 * This walks every distinct skill touched by the language's 30 core themes and,
 * for each one, every exercise type its kind's ladder can produce (not a simulated
 * session — a session-shaped walk would only ever warm the rung matching one
 * assumed mastery level and leave the rest of the ladder cold). That is exactly
 * the granularity `taskContentService`'s cache key uses, so this fills the cache
 * completely rather than partially.
 *
 * Idempotent and resumable: existing entries in the output file are loaded first,
 * and any (skill, exercise type) pair that already has enough variants is skipped,
 * so interrupting and re-running (or running again later to add variants) only
 * does the remaining work.
 *
 * A single attempt at a script-heavy answer (Chinese Hanzi, in practice) succeeds
 * only some of the time: the model reliably gets the exercise structure right, but
 * on a real fraction of calls leaves the answer blank or substitutes its
 * romanization, and validation correctly rejects both. This is not a prompt bug to
 * chase further — repeated sampling of the same request measurably recovers most
 * of those cases — so rejected items are re-queued into further rounds rather than
 * treated as terminal on the first miss.
 *
 * Run with: npx vite-node scripts/generateCurriculumSeed.ts --lang=zh
 * Flags: --lang=<code> --variants=<n, default 1> --batch=<n, default 8>
 *        --concurrency=<n, default 1> --pace=<ms between requests, default 4000>
 *        --rounds=<retry rounds for rejected items, default 3>
 *        --themes=<start-end, default 1-30> --debug
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { languageNameForCode } from '../src/data/languageCatalog';
import {
  THEMES,
  getThemeSkills,
  listLadderExerciseTypes,
  resolveTasks,
  buildCacheKey,
  type TaskBlueprint,
} from '../src/services/curriculum';
import type { TaskContent } from '../src/services/curriculum/contentValidation';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

interface Args {
  lang: string;
  variantsPerKey: number;
  batchSize: number;
  concurrency: number;
  paceMs: number;
  themeStart: number;
  themeEnd: number;
  debug: boolean;
  /** How many times a rejected item gets re-attempted before being left missing. */
  maxRounds: number;
}

function parseArgs(argv: string[]): Args {
  const flags = new Map<string, string>();
  for (const arg of argv) {
    const withValue = arg.match(/^--([a-z-]+)=(.*)$/i);
    if (withValue) {
      flags.set(withValue[1], withValue[2]);
      continue;
    }
    const boolFlag = arg.match(/^--([a-z-]+)$/i);
    if (boolFlag) flags.set(boolFlag[1], 'true');
  }

  const themeRange = flags.get('themes') ?? '1-30';
  const [themeStart, themeEnd] = themeRange.split('-').map((value) => Number.parseInt(value, 10));

  return {
    lang: flags.get('lang') ?? 'zh',
    variantsPerKey: Number.parseInt(flags.get('variants') ?? '1', 10),
    // 8, not 12: some exercise types (dialogue, read_answer_questions) generate
    // several sentences of content, and a large batch risks the JSON response
    // being cut off at the shared token ceiling before every item is written.
    batchSize: Number.parseInt(flags.get('batch') ?? '8', 10),
    // Sequential by default: this account's key is capped at 12,000 tokens/minute,
    // and a batch call can use several thousand: concurrent requests just collide
    // with each other on the same budget and spend the run retrying instead of
    // making progress. --pace paces requests to stay under that budget proactively.
    concurrency: Number.parseInt(flags.get('concurrency') ?? '1', 10),
    paceMs: Number.parseInt(flags.get('pace') ?? '4000', 10),
    debug: flags.has('debug'),
    maxRounds: Number.parseInt(flags.get('rounds') ?? '3', 10),
    themeStart: Number.isFinite(themeStart) ? themeStart : 1,
    themeEnd: Number.isFinite(themeEnd) ? themeEnd : 30,
  };
}

// ---------------------------------------------------------------------------
// Seed file I/O
// ---------------------------------------------------------------------------

interface SeedPackFile {
  languageCode: string;
  version: number;
  generatedAt: string;
  entries: Record<string, TaskContent[]>;
}

function seedFilePath(languageCode: string): string {
  return resolve(REPO_ROOT, 'src/data/curriculumSeeds', `${languageCode}.json`);
}

async function loadExisting(languageCode: string): Promise<SeedPackFile> {
  try {
    const raw = await readFile(seedFilePath(languageCode), 'utf8');
    const parsed = JSON.parse(raw) as SeedPackFile;
    if (parsed.entries) return parsed;
  } catch {
    // No existing file, or it is unreadable — start fresh.
  }
  return { languageCode, version: 1, generatedAt: new Date().toISOString(), entries: {} };
}

async function persist(pack: SeedPackFile): Promise<void> {
  const path = seedFilePath(pack.languageCode);
  await mkdir(dirname(path), { recursive: true });
  pack.generatedAt = new Date().toISOString();
  // Sorted keys: a deterministic diff when re-running, not a new-order rewrite.
  const sorted: SeedPackFile = { ...pack, entries: {} };
  for (const key of Object.keys(pack.entries).sort()) {
    sorted.entries[key] = pack.entries[key];
  }
  await writeFile(path, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
}

// ---------------------------------------------------------------------------
// Work list: every (skill, exercise type) pair the ladder can produce
// ---------------------------------------------------------------------------

interface WorkItem {
  blueprint: TaskBlueprint;
  cacheKey: string;
}

function buildWorkList(languageCode: string, themeStart: number, themeEnd: number): WorkItem[] {
  const skillsById = new Map<string, ReturnType<typeof getThemeSkills>[number]>();
  for (const theme of THEMES) {
    if (theme.order < themeStart || theme.order > themeEnd) continue;
    for (const skill of getThemeSkills(theme.id, languageCode)) {
      if (!skillsById.has(skill.id)) skillsById.set(skill.id, skill);
    }
  }

  // Stable order: by introduction order, then id. Reruns diff cleanly and logs
  // read in teaching order rather than hash order.
  const skills = [...skillsById.values()].sort(
    (a, b) => a.introducedAtTheme - b.introducedAtTheme || a.id.localeCompare(b.id),
  );

  const work: WorkItem[] = [];
  for (const skill of skills) {
    for (const { taskType, modality, rung } of listLadderExerciseTypes(skill.kind, languageCode)) {
      const blueprint: TaskBlueprint = {
        id: `${skill.id}::${taskType}`,
        skillId: skill.id,
        skillTitle: skill.title,
        role: 'introduce',
        taskType,
        modality,
        rung,
        difficulty: skill.difficulty,
        rationale: '',
      };
      work.push({ blueprint, cacheKey: buildCacheKey(languageCode, blueprint) });
    }
  }
  return work;
}

// ---------------------------------------------------------------------------
// Batched generation with bounded concurrency and retry
// ---------------------------------------------------------------------------

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * The provider's own 429 body names an exact wait ("Please try again in 12.42s"),
 * which is far more reliable than a fixed schedule against a hard per-minute token
 * budget: guessing too short just re-triggers the same limit, and this account's
 * limit (12,000 TPM) is small enough that guessing wrong burns a meaningful chunk
 * of the whole run's budget on one retry.
 */
function retryDelayFromError(error: unknown): number | null {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/try again in ([\d.]+)s/i);
  if (!match) return null;
  return Math.ceil(Number.parseFloat(match[1]) * 1000) + 500; // small buffer over the stated wait
}

async function withRetry<T>(operation: () => Promise<T>, attempts = 4): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        const delayMs = retryDelayFromError(error) ?? [2000, 6000, 15000][attempt] ?? 15000;
        await sleep(delayMs);
      }
    }
  }
  throw lastError;
}

/**
 * Runs `tasks` with at most `limit` in flight, pacing the start of each request by
 * `paceMs` so the run stays under the account's tokens-per-minute budget instead of
 * bursting and reactively backing off. At concurrency 1 this makes the run's rate
 * deliberate rather than a guess.
 */
async function runPool<T>(tasks: Array<() => Promise<T>>, limit: number, paceMs: number): Promise<void> {
  let cursor = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= tasks.length) return;
      if (index > 0) await sleep(paceMs);
      await tasks[index]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Runs one pass over `pending`, writing anything that validates into `pack` and
 * returning the items that still need another attempt.
 *
 * A single attempt at a script-heavy answer (Chinese Hanzi, in practice) succeeds
 * only some of the time — this model reliably gets the surrounding exercise
 * structure right but, on a real fraction of calls, leaves `expectedAnswer` blank
 * or substitutes the romanization for it, and validation correctly rejects both.
 * Retrying is not a workaround for a prompt bug: repeated sampling of the same
 * request measurably recovers most of those cases, so a rejected item goes back
 * into the next round's queue rather than being treated as terminal here.
 */
async function runRound(
  pack: SeedPackFile,
  pending: WorkItem[],
  args: Args,
  languageName: string,
  roundLabel: string,
): Promise<WorkItem[]> {
  const batches = chunk(pending, args.batchSize);
  const stillMissing: WorkItem[] = [];
  let completedBatches = 0;
  let generatedKeys = 0;
  let issueCount = 0;

  const tasks = batches.map((batch, batchIndex) => async () => {
    const batchKeys = new Set(batch.map((item) => item.cacheKey));
    try {
      await withRetry(async () => {
        const resolved = await resolveTasks({
          blueprints: batch.map((item) => item.blueprint),
          languageCode: args.lang,
          languageName,
          variantSeed: `seed-${roundLabel}-${Date.now()}-${batchIndex}`,
          debug: args.debug,
          onIssue: (blueprintId, issues) => {
            issueCount += 1;
            console.warn(`  [rejected] ${blueprintId}: ${issues.map((issue) => issue.rule).join(', ')}`);
          },
        });

        for (const item of resolved) {
          const key = buildCacheKey(args.lang, item.blueprint);
          const existing = pack.entries[key] ?? [];
          if (existing.length >= args.variantsPerKey) continue;
          pack.entries[key] = [...existing, item.content].slice(0, args.variantsPerKey);
          generatedKeys += 1;
          batchKeys.delete(key);
        }
      });
    } catch (error) {
      console.error(`  [batch ${batchIndex} failed after retries]`, error instanceof Error ? error.message : error);
    } finally {
      // Whatever in this batch is not now covered — rejected by validation, or
      // the whole call failed — goes back into the next round's work list.
      for (const item of batch) {
        if (batchKeys.has(item.cacheKey)) stillMissing.push(item);
      }
      completedBatches += 1;
      // Incremental write: a crash mid-run loses at most one batch's work.
      await persist(pack);
      console.log(
        `[${roundLabel}] batch ${completedBatches}/${batches.length} done — ${generatedKeys} keys generated this round, ${issueCount} rejected`,
      );
    }
  });

  await runPool(tasks, args.concurrency, args.paceMs);
  return stillMissing;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const languageName = languageNameForCode(args.lang);

  console.log(`Seeding "${args.lang}" (${languageName}), themes ${args.themeStart}-${args.themeEnd}`);
  console.log(`batch=${args.batchSize} concurrency=${args.concurrency} pace=${args.paceMs}ms variantsPerKey=${args.variantsPerKey} rounds=${args.maxRounds}`);

  const pack = await loadExisting(args.lang);
  const allWork = buildWorkList(args.lang, args.themeStart, args.themeEnd);

  let pending = allWork.filter((item) => (pack.entries[item.cacheKey]?.length ?? 0) < args.variantsPerKey);
  console.log(`${allWork.length} total (skill, exercise type) pairs, ${pending.length} need work`);

  for (let round = 1; round <= args.maxRounds && pending.length > 0; round += 1) {
    console.log(`--- round ${round}/${args.maxRounds}: ${pending.length} pairs pending ---`);
    pending = await runRound(pack, pending, args, languageName, `r${round}`);
  }

  const coveredKeys = Object.keys(pack.entries).length;
  console.log('---');
  console.log(`Done. ${coveredKeys}/${allWork.length} distinct keys covered in ${seedFilePath(args.lang)}`);
  if (pending.length > 0) {
    console.log(`${pending.length} pair(s) still missing after ${args.maxRounds} rounds. Re-run to keep retrying only what's missing.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
