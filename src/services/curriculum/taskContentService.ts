/**
 * Turns task blueprints into concrete, validated exercise content.
 *
 * The planner decides *what* to practise instantly and offline. Only the wording of
 * each task needs a model call, and that is what this service isolates so a session
 * can start without waiting on the network:
 *
 *  - content is cached per (language, skill, exercise type, difficulty) with several
 *    variants, so a repeat of the same drill is instant and not word-for-word identical;
 *  - a whole session's tasks are requested in one batched call rather than per task;
 *  - everything generated is validated, and anything that fails is dropped rather
 *    than shown;
 *  - upcoming steps are warmed in the background so the next session is already cached;
 *  - a lookup that misses the device's own cache falls back to a bundled seed pack
 *    (see `seedPack.ts`) before ever calling the network, for languages one was
 *    generated for offline via `scripts/generateCurriculumSeed.ts`.
 */

import { initializePersistence } from '../../persistence';
import { completeWithEcho } from '../aiProvider';
import { resolveExerciseImage } from '../exercises/exerciseMediaService';
import type { TaskType } from '../../types/learningPlan';
import { seededShuffle } from '../../utils/seededRandom';
import { validateTaskContent, type TaskContent, type ValidationIssue } from './contentValidation';
import { requiresAudio, requiresImage } from './exerciseLadder';
import { getLanguageProfile, scriptLabel } from './languageProfile';
import { seedVariantsFor } from './seedPack';
import type { TaskBlueprint } from './sessionPlanner';
import { getSkill, getTheme } from './skillGraph';

const CACHE_VERSION = 2;
/** Variants kept per cache key, so repeated drills are not word-for-word identical. */
const VARIANTS_PER_KEY = 4;

export interface ResolvedTask {
  blueprint: TaskBlueprint;
  content: TaskContent;
  /** Where the content came from, for diagnostics. */
  source: 'cache' | 'seed' | 'generated';
}

interface CacheEntry {
  variants: TaskContent[];
  updatedAt: string;
}

/**
 * Exported so `scripts/generateCurriculumSeed.ts` and `seedPack.ts` derive the
 * exact same key the live cache uses — a seed entry and a later live-generated
 * variant for the same (language, skill, exercise type, difficulty) combination
 * must land on one cache entry, not two.
 */
export function buildCacheKey(languageCode: string, blueprint: TaskBlueprint): string {
  return `task_content_v${CACHE_VERSION}:${languageCode}:${blueprint.skillId}:${blueprint.taskType}:d${blueprint.difficulty}`;
}

const memoryCache = new Map<string, CacheEntry>();

/**
 * Reads one cache entry, checking in order: in-memory, this device's own
 * persisted history, then the bundled seed pack.
 *
 * The device's own history is checked before the seed pack deliberately —
 * content this learner has already generated and validated locally is preferred
 * over the generic bundled version for the same key.
 */
async function readCache(key: string, languageCode: string): Promise<CacheEntry | null> {
  const cached = memoryCache.get(key);
  if (cached) return cached;

  try {
    const persistence = await initializePersistence();
    const stored = await persistence.repositories.settings.getJson<CacheEntry>(key);
    if (stored) {
      memoryCache.set(key, stored);
      return stored;
    }
  } catch {
    // No persistence available (e.g. outside the Tauri runtime). Fall through to
    // the seed pack rather than failing the lookup.
  }

  const seeded = await seedVariantsFor(languageCode, key);
  if (seeded) {
    const entry: CacheEntry = { variants: seeded, updatedAt: 'bundled' };
    memoryCache.set(key, entry);
    return entry;
  }

  return null;
}

async function writeCache(key: string, languageCode: string, content: TaskContent): Promise<void> {
  const existing = memoryCache.get(key) ?? (await readCache(key, languageCode)) ?? { variants: [], updatedAt: '' };
  // Keep the newest variants, capped, so the cache cannot grow without bound.
  const variants = [content, ...existing.variants].slice(0, VARIANTS_PER_KEY);
  const entry: CacheEntry = { variants, updatedAt: new Date().toISOString() };
  memoryCache.set(key, entry);
  try {
    const persistence = await initializePersistence();
    await persistence.repositories.settings.setJson(key, entry, 'task_content_cache');
  } catch {
    // A cache miss next time is acceptable; a thrown error during a session is not.
  }
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

/** Describes the payload shape each exercise type needs, for the generation prompt. */
const PAYLOAD_SPEC: Partial<Record<TaskType, string>> = {
  choose_response: '"options": [4 full responses in the target language], "correctOption": "<one of options>"',
  choose_verb_form: '"options": [4 verb forms], "correctOption": "<one of options>"',
  identify_context_meaning: '"options": [4 English meanings], "correctOption": "<one of options>"',
  identify_sounds: '"options": [4 target-language words that differ by one sound], "correctOption": "<one of options>", "audioText": "<the word to play>"',
  listen_choose_written: '"options": [4 written forms], "correctOption": "<one of options>", "audioText": "<the sentence to play>"',
  greeting_response_select: '"options": [4 replies], "correctOption": "<one of options>"',
  image_word_recognition: '"options": [4 concrete nouns], "correctOption": "<one of options>"',
  sound_word_recognition: '"options": [4 written words], "correctOption": "<one of options>", "audioText": "<the word to play>"',
  radical_component_identify: '"options": [4 components], "correctOption": "<one of options>"',
  missing_character_choice: '"options": [4 characters], "correctOption": "<one of options>"',
  tone_pair_identify: '"options": [4 tone patterns], "correctOption": "<one of options>", "audioText": "<the word to play>"',
  kana_confusion_select: '"options": [4 visually similar kana], "correctOption": "<one of options>"',
  particle_choice: '"options": [4 particles], "correctOption": "<one of options>"',
  classifier_choice: '"options": [4 classifiers], "correctOption": "<one of options>"',
  match_word_meaning: '"pairs": [4 objects {"left": "<target word>", "right": "<English meaning>"}]',
  match_sentence_translation: '"pairs": [3 objects {"left": "<target sentence>", "right": "<English translation>"}]',
  character_reading_match: '"pairs": [4 objects {"left": "<character>", "right": "<reading>"}]',
  reading_character_match: '"pairs": [4 objects {"left": "<reading>", "right": "<character>"}]',
  group_words_topic: '"groups": [2-3 objects {"name": "<meaningful category name in English>", "items": [3+ target words]}]',
  reorder_sentence: '"tokens": [the words of expectedAnswer, shuffled]',
  build_from_chunks: '"tokens": [the chunks of expectedAnswer, shuffled]',
  fill_missing_word: '"promptText": "<sentence with ___ where the answer goes>"',
  single_slot_fill: '"promptText": "<sentence with ___ where the answer goes>"',
  listen_repeat: '"audioText": "<the sentence to say aloud>"',
  listen_type_dictation: '"audioText": "<the sentence to play>", "expectedText": "<the same sentence, exactly as it should be written>". promptText must not contain the sentence.',
};

function payloadSpecFor(taskType: TaskType): string {
  return PAYLOAD_SPEC[taskType] ?? '"promptText": "<the prompt>", "expectedText": "<the answer>"';
}

const DIFFICULTY_GUIDANCE: Record<number, string> = {
  1: 'Use only the most frequent everyday words. Keep utterances under 5 words.',
  2: 'Use common everyday words. Keep utterances under 8 words.',
  3: 'Use ordinary conversational language. Keep utterances under 12 words.',
  4: 'Use natural connected language, including subordinate clauses. Under 18 words.',
  5: 'Use natural, idiomatic language at native pace. Under 25 words.',
};

function buildBatchPrompt(languageName: string, languageCode: string, blueprints: TaskBlueprint[]): string {
  const profile = getLanguageProfile(languageCode);
  // Naming the language alone was not enough: generation repeatedly came back with
  // expectedAnswer written as the romanization (Pinyin, Romaji) instead of the
  // actual script, even though a separate "romanization" field was requested for
  // exactly that. Naming the script explicitly, and showing one worked example of
  // the split, is what a model reliably keeps straight.
  const romanizationRule = profile.needsRomanization
    ? `- Include "romanization" (${profile.romanizationName ?? 'a romanized reading'}) for every target-language string in the answer. Romanization goes ONLY in the "romanization" field.
- "expectedAnswer" (and every target-language string in "payload") MUST be written in ${scriptLabel(languageCode)} — the actual script, never ${profile.romanizationName ?? 'the romanized form'}. Example for Chinese: expectedAnswer: "谢谢", romanization: "xièxiè" — never expectedAnswer: "xièxiè".`
    : '';

  const items = blueprints.map((blueprint) => {
    const skill = getSkill(blueprint.skillId);
    // "Politeness" or "Yes/No" alone gives the model nothing to hang a concrete
    // phrase on, and it tends to answer in English or produce something unusably
    // generic. The theme that introduces the skill (Starter Survival, Shopping &
    // Money, ...) gives it a situation to write toward.
    const introducingTheme = skill?.themeIds[0] ? getTheme(skill.themeIds[0]) : null;
    return {
      id: blueprint.id,
      skill: skill?.title ?? blueprint.skillId,
      skillDescription: skill ? `${skill.kind} skill in ${skill.category}` : '',
      situationalContext: introducingTheme
        ? `Set it in the context of: ${introducingTheme.title} — ${introducingTheme.shortDescription}`
        : undefined,
      exerciseType: blueprint.taskType,
      difficulty: blueprint.difficulty,
      difficultyGuidance: DIFFICULTY_GUIDANCE[blueprint.difficulty] ?? DIFFICULTY_GUIDANCE[3],
      requiredPayload: payloadSpecFor(blueprint.taskType),
    };
  });

  return `You are writing exercise content for a learner of ${languageName} (code: ${languageCode}). The interface language is English.

THE SINGLE MOST IMPORTANT FIELD IS "expectedAnswer". Never leave it, or any field
mirroring it inside "payload" (expectedText, correctOption), as an empty string.
If you are unsure of the exact correct answer, still write your single best answer
in ${scriptLabel(languageCode)} — an imperfect answer is useful, a blank one is not.

Return JSON only, no markdown:
{"tasks":[{"id":"<matching id>","instruction":"<English, one short sentence>","prompt":"<the question>","expectedAnswer":"<the correct answer, never empty>","distractors":["<wrong but plausible>"],"payload":{...},"translation":"<English meaning of the target text>","teachingNote":"<one short English sentence explaining the point>"}]}

Hard rules:
- "expectedAnswer" MUST be written in ${languageName}, never in English, unless the exercise asks for an English meaning.
- "expectedAnswer" MUST NOT be an empty string, under any circumstances.
- "instruction" and "teachingNote" MUST be in English.
- The answer MUST NOT appear anywhere in "prompt".
- Distractors must be plausible and wrong for a real reason (a near-synonym, a wrong form, a common learner error), never random words, and must be in the same language and script as the answer.
- Every option must be distinct. Never repeat an option.
- Do not number, letter, or index any option, pair side, or group item.
- Group names must describe a real category the learner can reason about, never "Group A" or "Category B".
${romanizationRule}

Tasks to write:
${JSON.stringify(items, null, 1)}

Each task's "payload" must contain exactly: ${blueprints
    .map((blueprint) => `${blueprint.id} -> {${payloadSpecFor(blueprint.taskType)}}`)
    .join('; ')}`;
}

function parseJsonObject(value: string): Record<string, unknown> {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse((fenced ? fenced[1] : value).trim()) as Record<string, unknown>;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
}

function toTaskContent(raw: unknown): TaskContent | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const instruction = typeof record.instruction === 'string' ? record.instruction.trim() : '';
  const prompt = typeof record.prompt === 'string' ? record.prompt.trim() : '';
  const expectedAnswer = typeof record.expectedAnswer === 'string' ? record.expectedAnswer.trim() : '';
  if (!instruction || !prompt || !expectedAnswer) return null;

  return {
    instruction,
    prompt,
    expectedAnswer,
    distractors: toStringArray(record.distractors),
    payload: record.payload && typeof record.payload === 'object' ? { ...(record.payload as Record<string, unknown>) } : {},
    translation: typeof record.translation === 'string' ? record.translation.trim() : undefined,
    romanization: typeof record.romanization === 'string' ? record.romanization.trim() : undefined,
    teachingNote: typeof record.teachingNote === 'string' ? record.teachingNote.trim() : undefined,
  };
}

/**
 * Shuffles the option list so the correct answer is not always in the same place,
 * seeded on the task so it does not move between renders.
 */
function shuffleOptions(content: TaskContent, seed: string): TaskContent {
  const options = toStringArray(content.payload.options);
  if (options.length < 2) return content;
  return {
    ...content,
    payload: { ...content.payload, options: seededShuffle(options, seed) },
  };
}

/** Attaches audio and image data the exercise type requires but the model does not supply. */
async function attachMedia(content: TaskContent, blueprint: TaskBlueprint, languageCode: string): Promise<TaskContent> {
  const payload = { ...content.payload };

  if (requiresAudio(blueprint.taskType) && typeof payload.audioText !== 'string') {
    // Listening exercises with nothing to listen to were previously shipped as
    // silent option lists. Fall back to the answer so there is always audio.
    payload.audioText = content.expectedAnswer;
  }

  if (requiresImage(blueprint.taskType) && typeof payload.imageUrl !== 'string') {
    try {
      const media = await resolveExerciseImage({
        languageCode,
        concept: content.translation || content.expectedAnswer,
        prompt: content.prompt,
        fallbackLabel: content.expectedAnswer,
      });
      payload.imageUrl = media.imageUrl;
      payload.imageAlt = content.translation || content.expectedAnswer;
    } catch {
      // An image-recognition task without an image is unusable; the caller drops it.
    }
  }

  return { ...content, payload };
}

export interface ResolveTasksInput {
  blueprints: TaskBlueprint[];
  languageCode: string;
  languageName: string;
  /** Skips the model call and serves only cached content. */
  cacheOnly?: boolean;
  /** Seed for variant selection, so a repeated session is not identical. */
  variantSeed?: string;
  onIssue?: (blueprintId: string, issues: ValidationIssue[]) => void;
  /**
   * Logs the raw model response behind a rejected or failed batch.
   *
   * An explicit flag rather than an environment read: this module ships to the
   * browser/Tauri bundle as well as CLI tooling, and `process.env` does not exist
   * in that runtime.
   */
  debug?: boolean;
}

/**
 * Resolves content for a whole session.
 *
 * Cached blueprints are returned immediately; the rest are generated in one call.
 * Anything that fails validation is dropped, so the caller receives a shorter but
 * correct session rather than a full one containing broken tasks.
 */
export async function resolveTasks(input: ResolveTasksInput): Promise<ResolvedTask[]> {
  const resolved = new Map<string, ResolvedTask>();
  const needsGeneration: TaskBlueprint[] = [];
  const seedBase = input.variantSeed ?? String(Date.now());

  for (const blueprint of input.blueprints) {
    const entry = await readCache(buildCacheKey(input.languageCode, blueprint), input.languageCode);
    const variants = entry?.variants ?? [];
    if (variants.length === 0) {
      needsGeneration.push(blueprint);
      continue;
    }
    // Rotate through cached variants so the same drill is not repeated verbatim.
    const index = Math.abs(hash(`${seedBase}:${blueprint.id}`)) % variants.length;
    resolved.set(blueprint.id, {
      blueprint,
      content: shuffleOptions(variants[index], `${seedBase}:${blueprint.id}`),
      source: entry?.updatedAt === 'bundled' ? 'seed' : 'cache',
    });
  }

  if (needsGeneration.length > 0 && !input.cacheOnly) {
    const generated = await generateBatch(needsGeneration, input);
    for (const [blueprintId, content] of generated) {
      const blueprint = needsGeneration.find((candidate) => candidate.id === blueprintId);
      if (!blueprint) continue;
      resolved.set(blueprintId, {
        blueprint,
        content: shuffleOptions(content, `${seedBase}:${blueprintId}`),
        source: 'generated',
      });
    }
  }

  // Attach media and drop anything that could not be made usable.
  const output: ResolvedTask[] = [];
  for (const blueprint of input.blueprints) {
    const candidate = resolved.get(blueprint.id);
    if (!candidate) continue;
    const withMedia = await attachMedia(candidate.content, blueprint, input.languageCode);
    if (requiresImage(blueprint.taskType) && typeof withMedia.payload.imageUrl !== 'string') continue;
    output.push({ ...candidate, content: withMedia });
  }

  return output;
}

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) | 0;
  }
  return result;
}

async function generateBatch(
  blueprints: TaskBlueprint[],
  input: ResolveTasksInput,
): Promise<Map<string, TaskContent>> {
  const output = new Map<string, TaskContent>();

  let parsed: Record<string, unknown>;
  let rawResponse = '';
  try {
    rawResponse = await completeWithEcho(
      [
        {
          id: `task-content-${Date.now()}`,
          role: 'user',
          content: buildBatchPrompt(input.languageName, input.languageCode, blueprints),
          createdAt: Date.now(),
        },
      ],
      'analyst',
      { maxTokens: 3200, responseFormat: { type: 'json_object' } },
    );
    parsed = parseJsonObject(rawResponse);
  } catch (error) {
    console.error('taskContentService: generation failed', error);
    // DEBUG_CONTENT_GEN=1 prints the raw model text behind an unparseable/failed
    // batch, since "unparseable" alone does not say whether the JSON was
    // truncated, malformed, or just missing fields for a few items.
    if (input.debug && rawResponse) {
      console.error('  raw response (first 1500 chars):', rawResponse.slice(0, 1500));
    }
    return output;
  }

  const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
  if (input.debug) {
    console.error(`  [debug] batch of ${blueprints.length} -> parsed ${tasks.length} task objects`);
  }
  for (const raw of tasks) {
    const record = raw as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id : '';
    const blueprint = blueprints.find((candidate) => candidate.id === id);
    if (!blueprint) {
      if (input.debug) {
        console.error(`  [debug] response item id "${id}" does not match any requested blueprint`);
      }
      continue;
    }

    const content = toTaskContent(record);
    if (!content) {
      input.onIssue?.(id, [{ rule: 'unparseable', detail: 'Generated task was missing required fields.' }]);
      if (input.debug) {
        console.error(`  [debug] ${id} raw item:`, JSON.stringify(record).slice(0, 400));
      }
      continue;
    }

    // Options are frequently returned without the correct answer marked; fill it in
    // before validating so a recoverable omission is not treated as a failure.
    if (Array.isArray(content.payload.options) && typeof content.payload.correctOption !== 'string') {
      content.payload.correctOption = content.expectedAnswer;
    }

    const validation = validateTaskContent(content, {
      taskType: blueprint.taskType,
      languageCode: input.languageCode,
    });
    if (!validation.valid) {
      input.onIssue?.(id, validation.issues);
      continue;
    }

    output.set(id, content);
    void writeCache(buildCacheKey(input.languageCode, blueprint), input.languageCode, content);
  }

  return output;
}

/**
 * Warms the cache for blueprints the learner is likely to hit next.
 *
 * Called for the upcoming step while the current one is being worked through, so
 * the next session opens from cache with no network wait.
 */
export async function prefetchTasks(input: Omit<ResolveTasksInput, 'cacheOnly'>): Promise<void> {
  const uncached: TaskBlueprint[] = [];
  for (const blueprint of input.blueprints) {
    const entry = await readCache(buildCacheKey(input.languageCode, blueprint), input.languageCode);
    if ((entry?.variants.length ?? 0) === 0) uncached.push(blueprint);
  }
  if (uncached.length === 0) return;
  await generateBatch(uncached, input);
}

/** True when every blueprint can be served without a network call. */
export async function isSessionCached(languageCode: string, blueprints: TaskBlueprint[]): Promise<boolean> {
  for (const blueprint of blueprints) {
    const entry = await readCache(buildCacheKey(languageCode, blueprint), languageCode);
    if ((entry?.variants.length ?? 0) === 0) return false;
  }
  return true;
}

/** Test/reset hook. */
export function clearTaskContentCache(): void {
  memoryCache.clear();
}
