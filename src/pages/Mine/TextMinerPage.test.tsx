/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ activeLanguage: { code: 'es', name: 'Spanish', flag: '🇪🇸' } }),
}));

const createNotebookEntry = vi.fn();

vi.mock('../../contexts/AppDataContext', () => ({
  useAppData: () => ({
    state: {
      notebookEntries: [{ id: 'w1', term: 'casa', translation: 'house' }],
      reviewItems: [{ id: 'r1', term: 'la', translation: 'the' }],
    },
    createNotebookEntry,
  }),
}));

const resolveEntry = vi.fn().mockResolvedValue({ translation: 'table' });

vi.mock('../../hooks/useGlossary', () => ({
  useGlossary: () => ({
    resolveEntry,
    tokenized: (text: string) => text.split(/(\s+)/).filter(Boolean),
    saveWord: vi.fn(),
    trackHover: vi.fn(),
    loadingToken: null,
    hoverCount: 0,
    mainLanguageCode: 'en',
    targetLanguage: 'es',
  }),
}));

const TextMinerPage = (await import('./TextMinerPage')).default;

function setup() {
  render(
    <MemoryRouter>
      <TextMinerPage />
    </MemoryRouter>,
  );
  return screen.getByLabelText('Text to analyse') as HTMLTextAreaElement;
}

function analyse(input: HTMLTextAreaElement, text: string) {
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(screen.getByText('Analyse'));
}

afterEach(() => {
  cleanup();
  createNotebookEntry.mockClear();
  resolveEntry.mockClear();
});

describe('TextMinerPage', () => {
  it('shows nothing but the input before a passage is analysed', () => {
    setup();
    expect(screen.queryByText('coverage')).toBeNull();
  });

  it('cannot analyse an empty passage', () => {
    setup();
    expect((screen.getByText('Analyse').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('reports coverage against the learner\'s own saved words', () => {
    const input = setup();
    // "la" and "casa" are both saved; "es" and "grande" are not.
    analyse(input, 'la casa es grande');
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('lists only the words the learner does not already have', () => {
    const input = setup();
    analyse(input, 'la casa es grande');

    expect(screen.getByText('es')).toBeTruthy();
    expect(screen.getByText('grande')).toBeTruthy();
    expect(screen.queryByLabelText('Save casa to your notebook')).toBeNull();
  });

  it('saves a mined word with the meaning it looked up', async () => {
    const input = setup();
    analyse(input, 'la casa es grande');

    fireEvent.click(screen.getByLabelText('Save grande to your notebook'));
    await vi.waitFor(() => expect(createNotebookEntry).toHaveBeenCalled());

    expect(createNotebookEntry).toHaveBeenCalledWith(
      expect.objectContaining({ term: 'grande', translation: 'table', type: 'word' }),
    );
  });

  it('says so when the learner knows everything in the passage', () => {
    const input = setup();
    analyse(input, 'la casa');
    expect(screen.getByText(/already know every word/)).toBeTruthy();
  });

  it('clears the analysis on request', () => {
    const input = setup();
    analyse(input, 'la casa es grande');
    fireEvent.click(screen.getByText('Clear'));
    expect(screen.queryByText('coverage')).toBeNull();
  });
});
