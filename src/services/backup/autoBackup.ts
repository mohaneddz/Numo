/**
 * Weekly snapshot of the learner's own content.
 *
 * Settings has carried an "Auto Backup — automatically back up learning data
 * weekly" toggle, defaulted on, with nothing behind it. That is worse than an
 * inert switch: it tells someone their work is being protected when it is not.
 * The manual export next to it covers settings and an action log, not learning
 * data.
 *
 * This writes what would actually hurt to lose — saved words, the review queue,
 * and the language/profile setup — as JSON under the app data directory.
 */
import { BaseDirectory, appLocalDataDir, join } from '@tauri-apps/api/path';
import { mkdir, readDir, remove, writeTextFile } from '@tauri-apps/plugin-fs';
import { initializePersistence } from '../../persistence';

const BACKUP_DIR = 'backups';
const LAST_RUN_KEY = 'numo.backup.lastRunAt';
const ENABLED_KEY = 'numo.backup.enabled';

/** How long between automatic snapshots. */
export const BACKUP_INTERVAL_DAYS = 7;
/** Snapshots kept before the oldest is dropped. */
export const MAX_BACKUPS = 8;

export interface BackupSnapshot {
  version: 1;
  createdAt: string;
  profiles: unknown[];
  languages: unknown[];
  notebook: unknown[];
  reviewItems: unknown[];
}

/**
 * Whether a snapshot is due.
 *
 * Kept pure so the scheduling rule is testable without a filesystem: a missing
 * or unparseable timestamp counts as never backed up, which errs toward taking
 * one rather than skipping it.
 */
export function isBackupDue(
  lastRunIso: string | null,
  enabled: boolean,
  now: Date = new Date(),
): boolean {
  if (!enabled) return false;
  if (!lastRunIso) return true;

  const last = new Date(lastRunIso);
  if (Number.isNaN(last.getTime())) return true;

  const elapsedDays = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
  return elapsedDays >= BACKUP_INTERVAL_DAYS;
}

/** Oldest-first list of snapshots to delete once the cap is exceeded. */
export function backupsToPrune(fileNames: readonly string[], keep = MAX_BACKUPS): string[] {
  const snapshots = fileNames.filter((name) => /^numo-backup-.*\.json$/.test(name)).sort();
  return snapshots.slice(0, Math.max(0, snapshots.length - keep));
}

function backupFileName(now: Date): string {
  // Sorts chronologically as a plain string, which is what the pruning relies on.
  return `numo-backup-${now.toISOString().replace(/[:.]/g, '-')}.json`;
}

async function readFlag(key: string): Promise<string | null> {
  try {
    const persistence = await initializePersistence();
    return await persistence.repositories.settings.getJson<string>(key);
  } catch {
    return null;
  }
}

async function writeFlag(key: string, value: string): Promise<void> {
  try {
    const persistence = await initializePersistence();
    await persistence.repositories.settings.setJson(key, value, 'auto_backup');
  } catch {
    // A snapshot that cannot record its timestamp would repeat every launch;
    // failing quietly here is better than blocking startup.
  }
}

export async function backupIsEnabled(): Promise<boolean> {
  const stored = await readFlag(ENABLED_KEY);
  // On by default, matching what the Settings toggle has always shown.
  return stored === null ? true : stored === 'true';
}

export async function setBackupEnabled(enabled: boolean): Promise<void> {
  await writeFlag(ENABLED_KEY, String(enabled));
}

export async function lastBackupAt(): Promise<string | null> {
  return readFlag(LAST_RUN_KEY);
}

async function collectSnapshot(now: Date): Promise<BackupSnapshot> {
  const persistence = await initializePersistence();
  const { learner, languages, notebook, review } = persistence.repositories;

  const profiles = await learner.listProfiles();
  const languageRows = await languages.listLanguages();

  const notebookItems: unknown[] = [];
  const reviewItems: unknown[] = [];

  for (const profile of profiles) {
    for (const language of languageRows) {
      notebookItems.push(...(await notebook.listItems(profile.id, language.id)));
      reviewItems.push(...(await review.listItemsByLanguage(profile.id, language.id)));
    }
  }

  return {
    version: 1,
    createdAt: now.toISOString(),
    profiles,
    languages: languageRows,
    notebook: notebookItems,
    reviewItems,
  };
}

export interface BackupResult {
  status: 'written' | 'skipped' | 'failed';
  path?: string;
  reason?: string;
}

export interface RunBackupOptions {
  /** Ignore the interval and the enabled flag, for an on-demand snapshot. */
  force?: boolean;
  now?: Date;
}

/**
 * Takes a snapshot if one is due. Safe to call on every launch.
 */
export async function runBackupIfDue(options: RunBackupOptions = {}): Promise<BackupResult> {
  const now = options.now ?? new Date();
  try {
    if (!options.force) {
      const enabled = await backupIsEnabled();
      const last = await lastBackupAt();
      if (!isBackupDue(last, enabled, now)) {
        return { status: 'skipped', reason: enabled ? 'not due yet' : 'disabled' };
      }
    }

    const snapshot = await collectSnapshot(now);
    const fileName = backupFileName(now);
    const relativePath = `${BACKUP_DIR}/${fileName}`;

    await mkdir(BACKUP_DIR, { recursive: true, baseDir: BaseDirectory.AppLocalData });
    await writeTextFile(relativePath, JSON.stringify(snapshot), {
      baseDir: BaseDirectory.AppLocalData,
    });

    // Written only after the file lands, so a failed write retries next launch.
    await writeFlag(LAST_RUN_KEY, now.toISOString());

    const entries = await readDir(BACKUP_DIR, { baseDir: BaseDirectory.AppLocalData });
    for (const stale of backupsToPrune(entries.map((entry) => entry.name))) {
      await remove(`${BACKUP_DIR}/${stale}`, { baseDir: BaseDirectory.AppLocalData });
    }

    return { status: 'written', path: await join(await appLocalDataDir(), relativePath) };
  } catch (error) {
    return {
      status: 'failed',
      reason: error instanceof Error ? error.message : 'Backup failed.',
    };
  }
}
