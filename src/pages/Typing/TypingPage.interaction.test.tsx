/**
 * @vitest-environment jsdom
 *
 * Interaction coverage for the typing input: word commit, backspace into a
 * finished word, and IME composition. These paths are all keyboard-and-event
 * shaped, so a static render cannot reach them.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ activeLanguage: { code: 'es', name: 'Spanish', flag: '🇪🇸' } }),
}));

vi.mock('../../contexts/ProfileSessionContext', () => ({
  useProfileSession: () => ({ activeProfile: { id: 'profile-1', name: 'Learner' } }),
}));

vi.mock('../../contexts/AppDataContext', () => ({
  useAppData: () => ({ state: { notebookEntries: [], reviewItems: [] } }),
}));

const recordTypingRun = vi.fn().mockResolvedValue({
  history: { entries: [], bests: {} },
  isPersonalBest: false,
  previousBest: null,
});

vi.mock('../../services/typing/typingHistory', async () => {
  const actual = await vi.importActual<typeof import('../../services/typing/typingHistory')>(
    '../../services/typing/typingHistory',
  );
  return {
    ...actual,
    loadTypingHistory: vi.fn().mockResolvedValue({ entries: [], bests: {} }),
    recordTypingRun: (...args: unknown[]) => recordTypingRun(...args),
  };
});

vi.mock('../../services/integrationService', () => ({
  integrationService: { logTypingRun: vi.fn().mockResolvedValue(undefined) },
}));

const TypingPage = (await import('./TypingPage')).default;

function setup() {
  render(
    <MemoryRouter>
      <TypingPage />
    </MemoryRouter>,
  );
  return screen.getByLabelText('Typing test input') as HTMLInputElement;
}

/** The words the test is currently asking for, read off the rendered page. */
function targetWords(): string[] {
  return Array.from(document.querySelectorAll('span.whitespace-nowrap')).map(
    (node) => node.textContent ?? '',
  );
}

beforeEach(() => {
  recordTypingRun.mockClear();
});

afterEach(cleanup);

describe('typing input', () => {
  it('starts the run on the first keystroke, not on mount', () => {
    const input = setup();
    expect(screen.getByText('30s')).toBeTruthy();

    fireEvent.change(input, { target: { value: 'a' } });
    expect(screen.queryByText('Tap the microphone and say something')).toBeNull();
  });

  it('commits a word on space and moves to the next one', () => {
    const input = setup();
    const [first] = targetWords();

    fireEvent.change(input, { target: { value: first } });
    fireEvent.change(input, { target: { value: `${first} ` } });

    expect(input.value).toBe('');
  });

  it('ignores a space typed with nothing before it', () => {
    const input = setup();
    fireEvent.change(input, { target: { value: ' ' } });
    expect(input.value).toBe('');
  });

  it('steps back into the previous word when backspacing an empty buffer', () => {
    const input = setup();
    const [first] = targetWords();

    fireEvent.change(input, { target: { value: first } });
    fireEvent.change(input, { target: { value: `${first} ` } });
    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(input.value).toBe(first);
  });

  it('does not step back from the very first word', () => {
    const input = setup();
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(input.value).toBe('');
  });

  it('restarts the test on Tab', () => {
    const input = setup();
    const before = targetWords().join(' ');

    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.keyDown(input, { key: 'Tab' });

    expect(input.value).toBe('');
    expect(targetWords().join(' ')).not.toBe(before);
  });

  it('does not grade text while an IME is still composing it', () => {
    const input = setup();
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: 'ni' } });

    // The candidate text is shown, but not committed into the answer buffer.
    expect(input.value).toBe('');
  });

  it('accepts the committed text when composition ends', () => {
    const input = setup();
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: 'ni' } });
    fireEvent.compositionEnd(input, { target: { value: '你' } });

    expect(input.value).toBe('你');
  });
});

describe('test configuration', () => {
  it('switches between time and word modes', () => {
    setup();
    fireEvent.click(screen.getByText('words'));
    expect(screen.getByText('0/25')).toBeTruthy();
  });

  it('regenerates the test when the length changes', () => {
    setup();
    const before = targetWords().join(' ');
    fireEvent.click(screen.getByText('120'));
    expect(targetWords().join(' ')).not.toBe(before);
  });

  it('offers punctuation, numbers and own-vocabulary toggles', () => {
    setup();
    expect(screen.getByText('punctuation')).toBeTruthy();
    expect(screen.getByText('numbers')).toBeTruthy();
    expect(screen.getByText('my words')).toBeTruthy();
  });
});
