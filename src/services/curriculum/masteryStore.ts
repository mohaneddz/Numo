/**
 * Per-skill mastery: the learner model the curriculum planner reads from.
 *
 * The app already stored `exercise_signals_v2`, but only as a single global
 * aggregate per language (one success streak, one latency average, one hint
 * count for everything the learner has ever done). That cannot answer "which
 * topics is this learner weak at", so no planner could use it.
 *
 * This store keeps one record per skill, splits recognition from production, and
 * schedules each skill independently. Reads are served from an in-memory cache and
 * writes are coalesced, so recording an answer never blocks the exercise loop.
 */

import { initializePersistence } from '../../persistence';
import type { Skill, SkillCategory } from './skillGraph';
import { CATEGORY_TITLES, getSkill } from './skillGraph';

/** How the learner demonstrated the skill. Recognition is cheaper than production. */
export type PracticeModality = 'recognition' | 'production' | 'listening' | 'writing';

export interface SkillMastery {
  skillId: string;
  /** 0-100 overall strength. */
  mastery: number;
  /** 0-100 strength when choosing/matching. */
  recognition: number;
  /** 0-100 strength when producing the form unaided. */
  production: number;
  exposures: number;
  correct: number;
  incorrect: number;
  /** Consecutive correct answers. Resets to 0 on a miss. */
  streak: number;
  /** Times the skill was forgotten after being learned. Drives interval reset. */
  lapses: number;
  avgLatencyMs: number;
  /** Share of attempts where a hint was opened, 0-1. */
  hintRate: number;
  lastSeenAt: string | null;
  /** ISO timestamp when this skill should be revisited. */
  dueAt: string | null;
  intervalDays: number;
  /** SM-2 style ease factor. */
  ease: number;
}

export type SkillMasteryMap = Record<string, SkillMastery>;

export interface SkillOutcome {
  skillId: string;
  correct: boolean;
  /** 0-100 grading score. */
  score: number;
  modality: PracticeModality;
  latencyMs?: number;
  hintUsed?: boolean;
  /** Set when the learner skipped rather than answered; counts as a lapse but not a miss. */
  skipped?: boolean;
}

const STORE_VERSION = 1;
const MIN_EASE = 1.3;
const MAX_EASE = 2.8;
const DEFAULT_EASE = 2.4;

/** Below this a skill is treated as a weakness worth scheduling. */
export const WEAK_THRESHOLD = 60;
/** At or above this a skill is considered solid enough to space out. */
export const STRONG_THRESHOLD = 82;

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function createEmptyMastery(skillId: string): SkillMastery {
  return {
    skillId,
    mastery: 0,
    recognition: 0,
    production: 0,
    exposures: 0,
    correct: 0,
    incorrect: 0,
    streak: 0,
    lapses: 0,
    avgLatencyMs: 0,
    hintRate: 0,
    lastSeenAt: null,
    dueAt: null,
    intervalDays: 0,
    ease: DEFAULT_EASE,
  };
}

function storeKey(learnerId: string, languageCode: string): string {
  return `skill_mastery_v${STORE_VERSION}:${learnerId}:${languageCode}`;
}

/**
 * Exponential moving average weight. Early attempts move the estimate a lot; once
 * a skill has plenty of evidence, a single answer barely shifts it. This keeps a
 * fresh skill responsive without letting one unlucky answer erase real mastery.
 */
function learningRate(exposures: number): number {
  return Math.max(0.12, 0.55 / (1 + exposures * 0.35));
}

/**
 * Schedules the next review with an SM-2 variant.
 * A miss resets the interval and lowers ease; a fast, unaided success extends it.
 */
function schedule(previous: SkillMastery, quality: number, hintUsed: boolean): Pick<SkillMastery, 'dueAt' | 'intervalDays' | 'ease'> {
  // quality is 0-5 in SM-2 terms.
  const easeDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  const ease = Math.min(MAX_EASE, Math.max(MIN_EASE, previous.ease + easeDelta));

  let intervalDays: number;
  if (quality < 3) {
    intervalDays = 0; // relearn in the same or next session
  } else if (previous.intervalDays <= 0) {
    intervalDays = hintUsed ? 0.5 : 1;
  } else if (previous.intervalDays < 2) {
    intervalDays = hintUsed ? 1 : 3;
  } else {
    intervalDays = Math.round(previous.intervalDays * ease * (hintUsed ? 0.6 : 1));
  }

  const dueAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString();
  return { dueAt, intervalDays, ease };
}

/** Converts a 0-100 grading score into an SM-2 quality band. */
function qualityFromScore(score: number, correct: boolean, hintUsed: boolean, latencyMs: number): number {
  if (!correct) return score >= 50 ? 2 : 1;
  let quality = score >= 95 ? 5 : score >= 80 ? 4 : 3;
  if (hintUsed) quality -= 1;
  // A very slow correct answer indicates recall rather than fluency.
  if (latencyMs > 25_000) quality -= 1;
  return Math.max(1, Math.min(5, quality));
}

export function applyOutcome(previous: SkillMastery, outcome: SkillOutcome): SkillMastery {
  const latency = Math.max(0, outcome.latencyMs ?? 0);
  const hintUsed = Boolean(outcome.hintUsed);
  const rate = learningRate(previous.exposures);

  // A skip is evidence of not knowing, but weaker evidence than a wrong answer.
  const observed = outcome.skipped ? 25 : clamp(outcome.score);
  const nextMastery = clamp(previous.mastery + (observed - previous.mastery) * rate);

  const isProduction = outcome.modality === 'production' || outcome.modality === 'writing';
  const nextRecognition = isProduction
    ? previous.recognition
    : clamp(previous.recognition + (observed - previous.recognition) * rate);
  const nextProduction = isProduction
    ? clamp(previous.production + (observed - previous.production) * rate)
    : previous.production;

  const exposures = previous.exposures + 1;
  const avgLatencyMs = latency > 0
    ? Math.round((previous.avgLatencyMs * previous.exposures + latency) / exposures)
    : previous.avgLatencyMs;
  const hintRate = (previous.hintRate * previous.exposures + (hintUsed ? 1 : 0)) / exposures;

  const wasLearned = previous.mastery >= WEAK_THRESHOLD;
  const missed = !outcome.correct || Boolean(outcome.skipped);

  const quality = qualityFromScore(observed, outcome.correct && !outcome.skipped, hintUsed, latency);
  const scheduling = schedule(previous, quality, hintUsed);

  return {
    ...previous,
    mastery: nextMastery,
    recognition: nextRecognition,
    production: nextProduction,
    exposures,
    correct: previous.correct + (missed ? 0 : 1),
    incorrect: previous.incorrect + (missed ? 1 : 0),
    streak: missed ? 0 : previous.streak + 1,
    lapses: previous.lapses + (missed && wasLearned ? 1 : 0),
    avgLatencyMs,
    hintRate,
    lastSeenAt: new Date().toISOString(),
    ...scheduling,
  };
}

// ---------------------------------------------------------------------------
// Persistence with an in-memory cache and coalesced writes.
// ---------------------------------------------------------------------------

const cache = new Map<string, SkillMasteryMap>();
const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>();
const WRITE_DEBOUNCE_MS = 400;

async function flush(key: string): Promise<void> {
  const snapshot = cache.get(key);
  if (!snapshot) return;
  try {
    const persistence = await initializePersistence();
    await persistence.repositories.settings.setJson(key, snapshot, 'skill_mastery');
  } catch (error) {
    // Persistence is best-effort: a failed write must not break the session loop.
    console.error('masteryStore: failed to persist skill mastery', error);
  }
}

function scheduleFlush(key: string): void {
  const existing = pendingWrites.get(key);
  if (existing) clearTimeout(existing);
  pendingWrites.set(
    key,
    setTimeout(() => {
      pendingWrites.delete(key);
      void flush(key);
    }, WRITE_DEBOUNCE_MS),
  );
}

export async function loadSkillMastery(learnerId: string, languageCode: string): Promise<SkillMasteryMap> {
  const key = storeKey(learnerId, languageCode);
  const cached = cache.get(key);
  if (cached) return cached;

  let stored: SkillMasteryMap = {};
  try {
    const persistence = await initializePersistence();
    stored = (await persistence.repositories.settings.getJson<SkillMasteryMap>(key)) ?? {};
  } catch (error) {
    console.error('masteryStore: failed to load skill mastery', error);
  }
  cache.set(key, stored);
  return stored;
}

/** Synchronous read of already-loaded mastery. Returns `{}` before the first load. */
export function peekSkillMastery(learnerId: string, languageCode: string): SkillMasteryMap {
  return cache.get(storeKey(learnerId, languageCode)) ?? {};
}

export async function recordSkillOutcomes(
  learnerId: string,
  languageCode: string,
  outcomes: SkillOutcome[],
): Promise<SkillMasteryMap> {
  if (outcomes.length === 0) return loadSkillMastery(learnerId, languageCode);

  const key = storeKey(learnerId, languageCode);
  const current = await loadSkillMastery(learnerId, languageCode);
  const next: SkillMasteryMap = { ...current };

  for (const outcome of outcomes) {
    const previous = next[outcome.skillId] ?? createEmptyMastery(outcome.skillId);
    next[outcome.skillId] = applyOutcome(previous, outcome);
  }

  cache.set(key, next);
  scheduleFlush(key);
  return next;
}

/** Writes any pending changes immediately. Call when a session ends. */
export async function flushSkillMastery(learnerId: string, languageCode: string): Promise<void> {
  const key = storeKey(learnerId, languageCode);
  const pending = pendingWrites.get(key);
  if (pending) {
    clearTimeout(pending);
    pendingWrites.delete(key);
  }
  await flush(key);
}

/** Test/reset hook. */
export function clearMasteryCache(): void {
  cache.clear();
  pendingWrites.forEach((timer) => clearTimeout(timer));
  pendingWrites.clear();
}

// ---------------------------------------------------------------------------
// Queries the planner and the UI run against the learner model.
// ---------------------------------------------------------------------------

export function masteryOf(map: SkillMasteryMap, skillId: string): SkillMastery {
  return map[skillId] ?? createEmptyMastery(skillId);
}

export function isDue(record: SkillMastery, now = Date.now()): boolean {
  if (record.exposures === 0) return false;
  if (!record.dueAt) return true;
  return new Date(record.dueAt).getTime() <= now;
}

/**
 * Skills the learner has met but is not holding, ordered by how much they need
 * attention. Overdue, low-mastery, high-lapse skills sort first.
 */
export function selectWeakSkills(
  map: SkillMasteryMap,
  candidates: Skill[],
  limit = 8,
  now = Date.now(),
): Array<{ skill: Skill; record: SkillMastery; urgency: number }> {
  return candidates
    .map((skill) => {
      const record = masteryOf(map, skill.id);
      if (record.exposures === 0) return null;

      const masteryGap = Math.max(0, WEAK_THRESHOLD - record.mastery) / WEAK_THRESHOLD;
      const overdueDays = record.dueAt
        ? Math.max(0, (now - new Date(record.dueAt).getTime()) / (24 * 60 * 60 * 1000))
        : 1;
      const overduePressure = Math.min(1, overdueDays / 7);
      const lapsePressure = Math.min(1, record.lapses / 4);
      const hintPressure = Math.min(1, record.hintRate);

      const urgency =
        masteryGap * 0.45 + overduePressure * 0.3 + lapsePressure * 0.15 + hintPressure * 0.1;

      if (urgency <= 0.02) return null;
      return { skill, record, urgency };
    })
    .filter((entry): entry is { skill: Skill; record: SkillMastery; urgency: number } => entry !== null)
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, limit);
}

/** Skills whose scheduled review time has arrived. */
export function selectDueSkills(
  map: SkillMasteryMap,
  candidates: Skill[],
  limit = 8,
  now = Date.now(),
): Array<{ skill: Skill; record: SkillMastery }> {
  return candidates
    .map((skill) => ({ skill, record: masteryOf(map, skill.id) }))
    .filter((entry) => isDue(entry.record, now))
    .sort((a, b) => {
      const aDue = a.record.dueAt ? new Date(a.record.dueAt).getTime() : 0;
      const bDue = b.record.dueAt ? new Date(b.record.dueAt).getTime() : 0;
      return aDue - bDue;
    })
    .slice(0, limit);
}

/** Skills the learner has never attempted. */
export function selectUnseenSkills(map: SkillMasteryMap, candidates: Skill[]): Skill[] {
  return candidates.filter((skill) => masteryOf(map, skill.id).exposures === 0);
}

export interface CategoryStrength {
  category: SkillCategory;
  title: string;
  /** 0-100 average mastery across attempted skills in this category. */
  strength: number;
  skillsTracked: number;
  skillsWeak: number;
}

/**
 * Category rollup used by the Home "Focus Areas" card. Only categories the
 * learner has actually practised are reported, so the card never shows invented
 * percentages for material that was never taught.
 */
export function summarizeCategories(map: SkillMasteryMap, candidates: Skill[]): CategoryStrength[] {
  const buckets = new Map<SkillCategory, { total: number; count: number; weak: number }>();

  for (const skill of candidates) {
    const record = map[skill.id];
    if (!record || record.exposures === 0) continue;
    const bucket = buckets.get(skill.category) ?? { total: 0, count: 0, weak: 0 };
    bucket.total += record.mastery;
    bucket.count += 1;
    if (record.mastery < WEAK_THRESHOLD) bucket.weak += 1;
    buckets.set(skill.category, bucket);
  }

  return [...buckets.entries()]
    .map(([category, bucket]) => ({
      category,
      title: CATEGORY_TITLES[category] ?? category,
      strength: Math.round(bucket.total / bucket.count),
      skillsTracked: bucket.count,
      skillsWeak: bucket.weak,
    }))
    .sort((a, b) => a.strength - b.strength);
}

/**
 * Positive gap means the learner recognizes material they cannot yet produce —
 * the planner responds by promoting production exercises.
 */
export function recognitionProductionGap(map: SkillMasteryMap, skillIds: string[]): number {
  const tracked = skillIds
    .map((id) => map[id])
    .filter((record): record is SkillMastery => Boolean(record) && record.exposures > 0);
  if (tracked.length === 0) return 0;

  const recognition = tracked.reduce((sum, record) => sum + record.recognition, 0) / tracked.length;
  const production = tracked.reduce((sum, record) => sum + record.production, 0) / tracked.length;
  return Math.round(recognition - production);
}

/** Overall progress across a skill set, for path/theme progress bars. */
export function aggregateProgress(map: SkillMasteryMap, skills: Skill[]): {
  averageMastery: number;
  skillsStarted: number;
  skillsMastered: number;
  totalSkills: number;
} {
  let total = 0;
  let started = 0;
  let mastered = 0;

  for (const skill of skills) {
    const record = map[skill.id];
    if (!record || record.exposures === 0) continue;
    total += record.mastery;
    started += 1;
    if (record.mastery >= STRONG_THRESHOLD) mastered += 1;
  }

  return {
    averageMastery: started > 0 ? Math.round(total / started) : 0,
    skillsStarted: started,
    skillsMastered: mastered,
    totalSkills: skills.length,
  };
}

/** Convenience for UI that has a skill id and wants a display label. */
export function skillTitle(skillId: string): string {
  return getSkill(skillId)?.title ?? skillId;
}
