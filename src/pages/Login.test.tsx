import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import LoginPage from './Login';
import type { ProfileSessionStatus } from '../contexts/ProfileSessionContext';

const sessionMock = vi.hoisted(() => ({
  status: 'needs_profile' as ProfileSessionStatus,
  profiles: [] as Array<{ id: string; displayName: string }>,
  error: null as string | null,
  createProfileAndActivate: vi.fn(async () => null),
  activateProfile: vi.fn(async () => undefined),
}));

vi.mock('../contexts/ProfileSessionContext', () => ({
  useProfileSession: () => sessionMock,
}));

describe('LoginPage local profile flow', () => {
  it('shows create-profile flow on first launch', () => {
    sessionMock.status = 'needs_profile';
    sessionMock.profiles = [];

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Create Local Profile');
    expect(html).toContain('Display Name');
  });

  it('shows profile selection when profiles exist', () => {
    sessionMock.status = 'needs_selection';
    sessionMock.profiles = [{ id: 'learner-1', displayName: 'Real Learner' }];

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Select Local Profile');
    expect(html).toContain('Choose Profile');
    expect(html).toContain('Real Learner');
  });

  it('shows tauri runtime blocker and hides profile actions when runtime is unsupported', () => {
    sessionMock.status = 'unsupported_runtime';
    sessionMock.profiles = [{ id: 'learner-1', displayName: 'Real Learner' }];
    sessionMock.error = 'This app requires Tauri runtime for local SQLite persistence.';

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Tauri Runtime Required');
    expect(html).toContain('This app requires Tauri runtime for local SQLite persistence.');
    expect(html).toContain('Detected runtime:');
    expect(html).toContain('browser');
    expect(html).toContain('pnpm tauri dev');
    expect(html).not.toContain('Create and Enter');
    expect(html).not.toContain('Enter with Profile');
  });
});
