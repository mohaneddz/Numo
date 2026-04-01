import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import ProfilePage from './Profile';

vi.mock('../contexts/ProfileSessionContext', () => ({
  useProfileSession: () => ({
    clearActiveProfile: async () => undefined,
  }),
}));
vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    languages: [],
    isBaseLanguage: () => false,
    getLanguageScore: () => 5,
    setLanguageScore: () => undefined,
    moveLanguage: () => undefined,
    removeLanguage: () => undefined,
  }),
  languageCatalog: [],
}));
vi.mock('../contexts/LanguageJourneyContext', () => ({
  useLanguageJourney: () => ({
    getSettings: () => ({ difficulty: 'standard' }),
    setDifficulty: () => undefined,
  }),
}));

describe('ProfilePage', () => {
  it('renders all core monitoring sections', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(html).toContain('Languages');
    expect(html).toContain('Goals');
    expect(html).toContain('Profile Status');
  });

  it('shows honest empty-state messaging when no profile data is loaded yet', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(html).toContain('No active language monitoring yet.');
    expect(html).toContain('No goals saved yet.');
    expect(html).toContain('Suggested focus: Not enough data yet');
  });
});
