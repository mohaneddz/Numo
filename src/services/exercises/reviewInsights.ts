/**
 * Read-only analysis of the review queue.
 *
 * The Review page could say how many items were due and nothing else, so the
 * two things a learner most needs to act on were invisible: what is about to
 * pile up, and which items keep failing no matter how often they come round.
 * Everything here is derived from persisted review items — nothing is
 * simulated or projected beyond the due dates already stored.
 */
import type { ReviewItem } from '../../data/types';

/** Attempts before a repeatedly-failed item is called a leech. */
const LEECH_ATTEMPT_THRESHOLD = 5;

const WEAK_STRENGTHS: ReadonlySet<ReviewItem['strength']> = new Set(['weak', 'critical']);

export interface ForecastDay {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  count: number;
  /** True for items already past due, which are shown as one leading bucket. */
  overdue: boolean;
}

function dueDateOf(item: ReviewItem): Date {
  const raw = item.nextDueAt ?? `${item.dueDate}T00:00:00.000Z`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * How many items fall due on each of the next `days` days.
 *
 * Anything already overdue collapses into a single leading bucket rather than
 * being spread backwards, since it is all equally "waiting now".
 */
export function forecastReviews(
  items: readonly ReviewItem[],
  days = 14,
  now: Date = new Date(),
): ForecastDay[] {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const buckets = new Map<string, number>();

  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() + offset);
    buckets.set(toDayKey(date), 0);
  }

  let overdue = 0;
  for (const item of items) {
    const due = dueDateOf(item);
    const key = toDayKey(due);

    if (due < today) {
      overdue += 1;
      continue;
    }
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  const forecast: ForecastDay[] = [{ date: toDayKey(today), count: overdue, overdue: true }];
  for (const [date, count] of buckets) {
    forecast.push({ date, count, overdue: false });
  }
  return forecast;
}

export interface Leech {
  item: ReviewItem;
  /** How many times it has come round. */
  attempts: number;
}

/**
 * Items the learner keeps getting wrong.
 *
 * Repeated failure on the same handful of items is the standard failure mode of
 * spaced repetition: they come back forever, eat the session, and never stick.
 * Surfacing them lets the learner do something about it — rewrite the hint,
 * study it properly, or drop it — instead of grinding it every day.
 */
export function detectLeeches(items: readonly ReviewItem[], limit = 8): Leech[] {
  return items
    .filter(
      (item) => item.attempts >= LEECH_ATTEMPT_THRESHOLD && WEAK_STRENGTHS.has(item.strength),
    )
    .sort((a, b) => b.attempts - a.attempts || a.term.localeCompare(b.term))
    .slice(0, limit)
    .map((item) => ({ item, attempts: item.attempts }));
}

export interface QueueHealth {
  total: number;
  overdue: number;
  dueToday: number;
  /** Item counts per strength band, strongest first. */
  byStrength: Array<{ strength: ReviewItem['strength']; count: number }>;
  leechCount: number;
  /** Share of the queue that is solid or better, 0-100. */
  stablePercent: number;
}

const STRENGTH_ORDER: ReviewItem['strength'][] = [
  'very solid',
  'solid',
  'needs work',
  'weak',
  'critical',
];

export function summarizeQueueHealth(
  items: readonly ReviewItem[],
  now: Date = new Date(),
): QueueHealth {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayKey = toDayKey(today);

  let overdue = 0;
  let dueToday = 0;
  const counts = new Map<ReviewItem['strength'], number>();

  for (const item of items) {
    const due = dueDateOf(item);
    if (due < today) overdue += 1;
    else if (toDayKey(due) === todayKey) dueToday += 1;
    counts.set(item.strength, (counts.get(item.strength) ?? 0) + 1);
  }

  const stable = (counts.get('very solid') ?? 0) + (counts.get('solid') ?? 0);

  return {
    total: items.length,
    overdue,
    dueToday,
    byStrength: STRENGTH_ORDER.map((strength) => ({
      strength,
      count: counts.get(strength) ?? 0,
    })),
    leechCount: detectLeeches(items, Number.MAX_SAFE_INTEGER).length,
    stablePercent: items.length === 0 ? 0 : Math.round((stable / items.length) * 100),
  };
}
