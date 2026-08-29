import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import TypingPage from './TypingPage';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    activeLanguage: { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  }),
}));

vi.mock('../../contexts/ProfileSessionContext', () => ({
  useProfileSession: () => ({ activeProfile: { id: 'profile-1', name: 'Learner' } }),
}));

vi.mock('../../contexts/AppDataContext', () => ({
  useAppData: () => ({
    state: {
      notebookEntries: [{ term: 'ventana' }, { term: 'puerta' }],
      reviewItems: [{ term: 'silla' }],
    },
  }),
}));

function render() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <TypingPage />
    </MemoryRouter>,
  );
}

describe('TypingPage', () => {
  it('renders the trainer with its mode controls', () => {
    const html = render();
    expect(html).toContain('Typing Trainer');
    expect(html).toContain('punctuation');
    expect(html).toContain('numbers');
    expect(html).toContain('my words');
  });

  it('names the active language rather than a hardcoded one', () => {
    expect(render()).toContain('Spanish');
  });

  it('renders test words to type', () => {
    // Each character sits in its own span so it can be coloured individually,
    // so the words only reappear once the markup is stripped.
    const text = render().replace(/<[^>]*>/g, '');
    expect(/(de|la|que|el|en)/.test(text)).toBe(true);
  });

  it('draws words from the active language, not another script', () => {
    const text = render().replace(/<[^>]*>/g, '');
    expect(/[一-鿿Ѐ-ӿ]/.test(text)).toBe(false);
  });

  it('offers a typing input the learner can focus', () => {
    expect(render()).toContain('Typing test input');
  });

  it('shows no results panel before a run has happened', () => {
    const html = render();
    expect(html).not.toContain('consistency');
    expect(html).not.toContain('Trouble characters');
  });
});
