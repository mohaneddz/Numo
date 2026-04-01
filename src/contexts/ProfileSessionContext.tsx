import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { PersistenceUnavailableError, initializePersistence, type LearnerProfileRecord } from '../persistence';

export type ProfileSessionStatus =
  | 'loading'
  | 'unsupported_runtime'
  | 'needs_profile'
  | 'needs_selection'
  | 'ready'
  | 'error';

const UNSUPPORTED_RUNTIME_MESSAGE =
  'This app requires Tauri runtime for local SQLite persistence. If browser dev mode is running, stop it and launch with pnpm tauri dev.';

export function mapProfileSessionBootstrapError(
  nextError: unknown,
  runtimeIsTauri = isTauri(),
): {
  status: Extract<ProfileSessionStatus, 'unsupported_runtime' | 'error'>;
  message: string;
} {
  if (nextError instanceof PersistenceUnavailableError) {
    if (runtimeIsTauri) {
      return {
        status: 'error',
        message:
          'Persistence failed inside Tauri runtime. Verify SQL plugin permissions and restart with pnpm tauri dev.',
      };
    }

    return {
      status: 'unsupported_runtime',
      message: UNSUPPORTED_RUNTIME_MESSAGE,
    };
  }

  const unknownMessage =
    typeof nextError === 'string'
      ? nextError
      : nextError && typeof nextError === 'object'
        ? String(nextError)
        : null;

  return {
    status: 'error',
    message: nextError instanceof Error
      ? nextError.message
      : unknownMessage ?? 'Failed to bootstrap local profile session.',
  };
}

interface CreateProfileInput {
  displayName: string;
  nativeLanguageCode: string;
  baseLanguageCode?: string;
}

interface ProfileSessionContextValue {
  status: ProfileSessionStatus;
  profiles: LearnerProfileRecord[];
  activeProfile: LearnerProfileRecord | null;
  error: string | null;
  refresh: () => Promise<void>;
  createProfileAndActivate: (input: CreateProfileInput) => Promise<LearnerProfileRecord | null>;
  activateProfile: (profileId: string) => Promise<void>;
  clearActiveProfile: () => Promise<void>;
}

const ProfileSessionContext = createContext<ProfileSessionContextValue | undefined>(undefined);

export const ProfileSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<ProfileSessionStatus>('loading');
  const [profiles, setProfiles] = useState<LearnerProfileRecord[]>([]);
  const [activeProfile, setActiveProfile] = useState<LearnerProfileRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const persistence = await initializePersistence();
      const [nextProfiles, nextActiveProfile] = await Promise.all([
        persistence.repositories.learner.listProfiles(),
        persistence.repositories.learner.getActiveProfile(),
      ]);

      setProfiles(nextProfiles);
      setActiveProfile(nextActiveProfile);

      if (nextProfiles.length === 0) {
        setStatus('needs_profile');
        return;
      }

      if (!nextActiveProfile) {
        setStatus('needs_selection');
        return;
      }

      setStatus('ready');
    } catch (nextError) {
      console.error('Profile session bootstrap failed:', nextError);
      const mapped = mapProfileSessionBootstrapError(nextError);
      setStatus(mapped.status);
      setError(mapped.message);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createProfileAndActivate = useCallback(async (input: CreateProfileInput): Promise<LearnerProfileRecord | null> => {
    try {
      const persistence = await initializePersistence();
      const profile = await persistence.repositories.learner.createProfile({
        displayName: input.displayName,
        nativeLanguageCode: input.nativeLanguageCode,
        baseLanguageCode: input.baseLanguageCode ?? 'en',
      });
      await persistence.repositories.learner.setActiveProfile(profile.id);
      await refresh();
      return profile;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to create local profile.');
      return null;
    }
  }, [refresh]);

  const activateProfile = useCallback(async (profileId: string) => {
    const persistence = await initializePersistence();
    await persistence.repositories.learner.setActiveProfile(profileId);
    await refresh();
  }, [refresh]);

  const clearActiveProfile = useCallback(async () => {
    const persistence = await initializePersistence();
    await persistence.repositories.learner.clearActiveProfile();
    await refresh();
  }, [refresh]);

  const value = useMemo<ProfileSessionContextValue>(() => ({
    status,
    profiles,
    activeProfile,
    error,
    refresh,
    createProfileAndActivate,
    activateProfile,
    clearActiveProfile,
  }), [status, profiles, activeProfile, error, refresh, createProfileAndActivate, activateProfile, clearActiveProfile]);

  return <ProfileSessionContext.Provider value={value}>{children}</ProfileSessionContext.Provider>;
};

export function useProfileSession(): ProfileSessionContextValue {
  const context = useContext(ProfileSessionContext);
  if (!context) {
    throw new Error('useProfileSession must be used within a ProfileSessionProvider');
  }
  return context;
}
