import { describe, expect, it } from 'vitest';
import { MAX_CRASH_ENTRIES, appendEntry, normalizeEntry, type CrashEntry } from './crashLog';

const entry = (overrides: Partial<CrashEntry> = {}): CrashEntry => ({
  at: '2026-03-15T12:00:00.000Z',
  message: 'payload was malformed',
  scope: '/review',
  ...overrides,
});

describe('normalizeEntry', () => {
  it('keeps a usable error', () => {
    const result = normalizeEntry({ message: 'boom', scope: '/learn', stack: 'at x' });
    expect(result?.message).toBe('boom');
    expect(result?.scope).toBe('/learn');
    expect(result?.stack).toBe('at x');
  });

  it('drops an error with no message to show', () => {
    expect(normalizeEntry({ message: '   ' })).toBeNull();
    expect(normalizeEntry({ message: '' })).toBeNull();
  });

  it('labels an unattributed error rather than leaving it blank', () => {
    expect(normalizeEntry({ message: 'boom' })?.scope).toBe('unknown');
  });

  it('caps a long message', () => {
    const result = normalizeEntry({ message: 'x'.repeat(2000) });
    expect(result!.message.length).toBe(500);
  });

  it('caps a deep stack, since the top frames identify the fault', () => {
    const result = normalizeEntry({ message: 'boom', stack: 'y'.repeat(9000) });
    expect(result!.stack!.length).toBe(4000);
  });

  it('stores no stack rather than an empty one', () => {
    expect(normalizeEntry({ message: 'boom', stack: '   ' })?.stack).toBeUndefined();
  });

  it('stamps the time when none is given', () => {
    expect(normalizeEntry({ message: 'boom' })?.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('appendEntry', () => {
  it('adds to the end', () => {
    const result = appendEntry([entry({ message: 'first' })], entry({ message: 'second' }));
    expect(result).toHaveLength(2);
    expect(result[1].message).toBe('second');
  });

  it('drops the oldest once the cap is reached', () => {
    const existing = Array.from({ length: MAX_CRASH_ENTRIES }, (_, index) =>
      entry({ message: `error ${index}` }),
    );
    const result = appendEntry(existing, entry({ message: 'newest' }));

    expect(result).toHaveLength(MAX_CRASH_ENTRIES);
    expect(result[result.length - 1].message).toBe('newest');
    expect(result.some((item) => item.message === 'error 0')).toBe(false);
  });

  it('honours a smaller cap', () => {
    const result = appendEntry([entry(), entry()], entry({ message: 'newest' }), 1);
    expect(result).toEqual([expect.objectContaining({ message: 'newest' })]);
  });

  it('does not mutate the existing log', () => {
    const existing = [entry()];
    appendEntry(existing, entry({ message: 'another' }));
    expect(existing).toHaveLength(1);
  });
});
