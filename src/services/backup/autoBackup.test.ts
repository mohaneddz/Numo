import { describe, expect, it } from 'vitest';
import { BACKUP_INTERVAL_DAYS, MAX_BACKUPS, backupsToPrune, isBackupDue } from './autoBackup';

const NOW = new Date('2026-03-15T12:00:00.000Z');
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

describe('isBackupDue', () => {
  it('takes a first snapshot when none has ever run', () => {
    expect(isBackupDue(null, true, NOW)).toBe(true);
  });

  it('waits until the interval has passed', () => {
    expect(isBackupDue(daysAgo(BACKUP_INTERVAL_DAYS - 1), true, NOW)).toBe(false);
    expect(isBackupDue(daysAgo(BACKUP_INTERVAL_DAYS), true, NOW)).toBe(true);
  });

  it('takes one when long overdue', () => {
    expect(isBackupDue(daysAgo(90), true, NOW)).toBe(true);
  });

  it('does nothing when the learner has turned it off', () => {
    expect(isBackupDue(null, false, NOW)).toBe(false);
    expect(isBackupDue(daysAgo(90), false, NOW)).toBe(false);
  });

  it('treats an unreadable timestamp as never backed up', () => {
    // Erring toward taking a snapshot is the safe direction for a backup.
    expect(isBackupDue('not-a-date', true, NOW)).toBe(true);
  });

  it('does not take one for a timestamp in the future', () => {
    expect(isBackupDue(new Date(NOW.getTime() + 86_400_000).toISOString(), true, NOW)).toBe(false);
  });
});

describe('backupsToPrune', () => {
  const snapshot = (index: number) =>
    `numo-backup-2026-03-${String(index).padStart(2, '0')}T00-00-00-000Z.json`;

  it('keeps everything below the cap', () => {
    expect(backupsToPrune([snapshot(1), snapshot(2)])).toEqual([]);
  });

  it('drops the oldest once the cap is exceeded', () => {
    const files = Array.from({ length: MAX_BACKUPS + 2 }, (_, index) => snapshot(index + 1));
    const pruned = backupsToPrune(files);

    expect(pruned).toHaveLength(2);
    expect(pruned).toEqual([snapshot(1), snapshot(2)]);
  });

  it('ignores unrelated files in the directory', () => {
    const files = [...Array.from({ length: MAX_BACKUPS }, (_, i) => snapshot(i + 1)), 'notes.txt'];
    expect(backupsToPrune(files)).toEqual([]);
  });

  it('never proposes deleting a file it does not recognise', () => {
    const files = Array.from({ length: MAX_BACKUPS + 3 }, (_, i) => snapshot(i + 1));
    for (const name of backupsToPrune(files)) {
      expect(name.startsWith('numo-backup-')).toBe(true);
    }
  });

  it('honours a smaller keep count', () => {
    const files = [snapshot(1), snapshot(2), snapshot(3)];
    expect(backupsToPrune(files, 1)).toEqual([snapshot(1), snapshot(2)]);
  });

  it('handles an empty directory', () => {
    expect(backupsToPrune([])).toEqual([]);
  });
});
