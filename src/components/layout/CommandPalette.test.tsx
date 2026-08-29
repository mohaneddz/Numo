/**
 * @vitest-environment jsdom
 *
 * The palette is keyboard-driven, and its selection previously indexed the
 * ranked list while rows rendered grouped — so the highlighted row and the one
 * Enter opened could be different commands. Only a real DOM catches that.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const navigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('../../contexts/AppDataContext', () => ({
  useAppData: () => ({
    state: {
      notebookEntries: [
        { id: 'w1', term: 'ventana', translation: 'window' },
        { id: 'w2', term: 'puerta', translation: 'door' },
      ],
    },
  }),
}));

const { CommandPalette } = await import('./CommandPalette');

function setup(open = true) {
  const onClose = vi.fn();
  render(
    <MemoryRouter>
      <CommandPalette open={open} onClose={onClose} />
    </MemoryRouter>,
  );
  return { onClose, input: screen.queryByLabelText('Search commands') as HTMLInputElement };
}

/** The rows as rendered, top to bottom. */
function rowLabels(): string[] {
  return Array.from(document.querySelectorAll('button[data-active]')).map(
    (node) => node.querySelector('span span')?.textContent ?? '',
  );
}

function activeLabel(): string {
  const active = document.querySelector('button[data-active="true"]');
  return active?.querySelector('span span')?.textContent ?? '';
}

afterEach(() => {
  cleanup();
  navigate.mockClear();
});

describe('CommandPalette', () => {
  it('renders nothing while closed', () => {
    setup(false);
    expect(screen.queryByLabelText('Search commands')).toBeNull();
  });

  it('opens with practice actions rather than the learner\'s whole vocabulary', () => {
    setup();
    expect(rowLabels().length).toBeGreaterThan(0);
    expect(rowLabels()).not.toContain('ventana');
  });

  it('finds a saved word by its English meaning', () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'window' } });
    expect(rowLabels()).toContain('ventana');
  });

  it('navigates to the highlighted row on Enter', () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'settings' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(navigate).toHaveBeenCalledWith('/settings');
  });

  it('opens exactly the row the arrow keys highlighted', () => {
    // The bug this guards: selection walked the ranked order while rows
    // rendered grouped, so Enter could open a different command.
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'r' } });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const highlighted = activeLabel();
    const expectedRow = rowLabels()[2];
    expect(highlighted).toBe(expectedRow);

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('wraps around when arrowing past the last row', () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'typing' } });
    const rows = rowLabels().length;

    for (let step = 0; step < rows; step += 1) {
      fireEvent.keyDown(input, { key: 'ArrowDown' });
    }
    expect(activeLabel()).toBe(rowLabels()[0]);
  });

  it('closes on Escape without navigating', () => {
    const { input, onClose } = setup();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('says so plainly when nothing matches', () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'zzzqqq' } });
    expect(screen.getByText(/Nothing matches/)).toBeTruthy();
  });

  it('does nothing on Enter when there is nothing to open', () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'zzzqqq' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(navigate).not.toHaveBeenCalled();
  });
});
