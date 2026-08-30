/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PersonalNotesPanel } from './PersonalNotesPanel';
import type { NotebookEntry } from '../../data/types';

function entry(overrides: Partial<NotebookEntry> = {}): NotebookEntry {
  return {
    id: 'n1',
    term: 'aunque',
    translation: 'although',
    type: 'word',
    tags: [],
    createdAt: '2026-01-01',
    mastery: 40,
    ...overrides,
  };
}

function setup(overrides: Partial<NotebookEntry> = {}) {
  const onSave = vi.fn();
  const { rerender } = render(<PersonalNotesPanel entry={entry(overrides)} onSave={onSave} />);
  return { onSave, rerender };
}

afterEach(cleanup);

describe('PersonalNotesPanel', () => {
  it('starts empty for a word with no personal notes', () => {
    setup();
    expect((screen.getByPlaceholderText(/mnemonic/i) as HTMLInputElement).value).toBe('');
  });

  it('loads notes the learner saved earlier', () => {
    setup({ personalHint: 'sounds like "on key"', personalExample: 'Aunque llueve, voy.' });
    expect((screen.getByPlaceholderText(/mnemonic/i) as HTMLInputElement).value).toBe(
      'sounds like "on key"',
    );
    expect((screen.getByPlaceholderText(/sentence that means/i) as HTMLTextAreaElement).value).toBe(
      'Aunque llueve, voy.',
    );
  });

  it('cannot save until something changes', () => {
    setup();
    const save = screen.getByText('Save').closest('button') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it('saves the hint and example together', () => {
    const { onSave } = setup();
    fireEvent.change(screen.getByPlaceholderText(/mnemonic/i), { target: { value: 'on key' } });
    fireEvent.click(screen.getByText('Save'));

    expect(onSave).toHaveBeenCalledWith({ personalHint: 'on key', personalExample: '' });
  });

  it('trims whitespace rather than saving blank padding', () => {
    const { onSave } = setup();
    fireEvent.change(screen.getByPlaceholderText(/mnemonic/i), { target: { value: '  hook  ' } });
    fireEvent.click(screen.getByText('Save'));

    expect(onSave).toHaveBeenCalledWith({ personalHint: 'hook', personalExample: '' });
  });

  it('toggles the difficulty flag on its own', () => {
    const { onSave } = setup();
    fireEvent.click(screen.getByText('Mark difficult'));
    expect(onSave).toHaveBeenCalledWith({ isDifficult: true });
  });

  it('shows a word already marked difficult as marked', () => {
    setup({ isDifficult: true });
    const button = screen.getByText('Marked difficult').closest('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('does not carry one word\'s draft over to another', () => {
    const onSave = vi.fn();
    const { rerender } = render(
      <PersonalNotesPanel entry={entry({ personalHint: 'first' })} onSave={onSave} />,
    );
    rerender(
      <PersonalNotesPanel
        entry={entry({ id: 'n2', term: 'pero', personalHint: 'second' })}
        onSave={onSave}
      />,
    );
    expect((screen.getByPlaceholderText(/mnemonic/i) as HTMLInputElement).value).toBe('second');
  });
});
