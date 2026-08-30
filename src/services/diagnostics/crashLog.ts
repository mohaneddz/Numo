/**
 * A local record of errors that broke a page.
 *
 * Settings carried a "Crash Reports — send crash reports to help fix bugs"
 * toggle, defaulted on, in the Privacy section. Nothing in the app sends
 * anything anywhere: there is no analytics or crash-reporting SDK in
 * package.json or Cargo.toml. Telling someone their crash data is being sent
 * when it is not is the worst kind of wrong thing to have in a privacy panel.
 *
 * This keeps the useful half — a record you can actually read after something
 * breaks — entirely on the device. Nothing here performs network I/O.
 */
import { initializePersistence } from '../../persistence';

const LOG_KEY = 'numo.diagnostics.crashLog';
const ENABLED_KEY = 'numo.diagnostics.crashLogEnabled';

/** Entries kept before the oldest is dropped. */
export const MAX_CRASH_ENTRIES = 25;

export interface CrashEntry {
  at: string;
  message: string;
  /** Where in the app it happened, when known. */
  scope: string;
  stack?: string;
}

/**
 * Trims an entry to something worth storing.
 *
 * Stacks are capped because a deep React stack can run to thousands of
 * characters and the top frames are the ones that identify the fault.
 */
export function normalizeEntry(input: {
  message: string;
  scope?: string;
  stack?: string;
  at?: string;
}): CrashEntry | null {
  const message = input.message?.trim();
  if (!message) return null;

  return {
    at: input.at ?? new Date().toISOString(),
    message: message.slice(0, 500),
    scope: input.scope?.trim() || 'unknown',
    stack: input.stack?.trim().slice(0, 4000) || undefined,
  };
}

/** Keeps the newest entries, dropping the oldest past the cap. */
export function appendEntry(
  existing: readonly CrashEntry[],
  entry: CrashEntry,
  max = MAX_CRASH_ENTRIES,
): CrashEntry[] {
  return [...existing, entry].slice(-max);
}

async function read<T>(key: string): Promise<T | null> {
  try {
    const persistence = await initializePersistence();
    return await persistence.repositories.settings.getJson<T>(key);
  } catch {
    return null;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  try {
    const persistence = await initializePersistence();
    await persistence.repositories.settings.setJson(key, value, 'diagnostics');
  } catch {
    // Failing to record a crash must never itself break the app.
  }
}

export async function crashLogIsEnabled(): Promise<boolean> {
  const stored = await read<string>(ENABLED_KEY);
  return stored === null ? true : stored === 'true';
}

export async function setCrashLogEnabled(enabled: boolean): Promise<void> {
  await write(ENABLED_KEY, String(enabled));
}

export async function readCrashLog(): Promise<CrashEntry[]> {
  return (await read<CrashEntry[]>(LOG_KEY)) ?? [];
}

export async function clearCrashLog(): Promise<void> {
  await write(LOG_KEY, []);
}

/** Records one error, if the learner has left the log switched on. */
export async function recordCrash(input: {
  message: string;
  scope?: string;
  stack?: string;
}): Promise<void> {
  const entry = normalizeEntry(input);
  if (!entry) return;
  if (!(await crashLogIsEnabled())) return;

  const existing = await readCrashLog();
  await write(LOG_KEY, appendEntry(existing, entry));
}
