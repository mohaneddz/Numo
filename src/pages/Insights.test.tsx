import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import InsightsPage from './Insights';

vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    activeLanguage: { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  }),
}));
vi.mock('../contexts/ProfileSessionContext', () => ({
  useProfileSession: () => ({ activeProfile: { id: 'profile-1', name: 'Learner' } }),
}));
vi.mock('../hooks/useLanguageProgression', () => ({
  useLanguageProgression: () => ({
    lockStates: {
      insights: {
        unlocked: true,
      },
    },
  }),
}));

describe('InsightsPage', () => {
  it('renders real-monitoring sections and no synthetic placeholder tags', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <InsightsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Monitoring Snapshot');
    expect(html).toContain('Weekly Activity (Real Minutes)');
    expect(html).toContain('Sessions by Mode');
    expect(html).not.toContain('siempre');
    expect(html).not.toContain('tambien');
  });

  it('uses honest low-data copy instead of fabricated analytics', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <InsightsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Not enough data yet for weekly activity trends.');
    expect(html).toContain('Not enough data yet for mode balance.');
  });
});
