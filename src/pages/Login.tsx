import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, UserRound } from 'lucide-react';
import { isTauri } from '@tauri-apps/api/core';
import { SpotlightCard } from '../components/ui/SpotlightCard';
import { CosmicShader } from '../assets/cosmic';
import { useProfileSession } from '../contexts/ProfileSessionContext';
import Titlebar from '../components/layout/Titlebar';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const { status, profiles, error: bootstrapError, createProfileAndActivate, activateProfile } = useProfileSession();
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const shader = new CosmicShader(canvasRef.current, { maxDpr: 1 });
    shader.start();
    return () => {
      shader.destroy();
    };
  }, []);

  useEffect(() => {
    if (!selectedProfileId && profiles.length > 0) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [profiles, selectedProfileId]);

  const canSelectExisting = profiles.length > 0;
  const needsCreationOnly = status === 'needs_profile';
  const isUnsupportedRuntime = status === 'unsupported_runtime';
  const runtimeLabel = isTauri() ? 'tauri' : 'browser';
  const title = useMemo(() => {
    if (isUnsupportedRuntime) return 'Tauri Runtime Required';
    if (status === 'needs_profile') return 'Create Local Profile';
    return 'Select Local Profile';
  }, [isUnsupportedRuntime, status]);

  if (status === 'ready') {
    return <Navigate to={redirect} replace />;
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = displayName.trim();
    if (!name) {
      setError('Display name is required.');
      return;
    }

    setBusy(true);
    setError(null);
    const created = await createProfileAndActivate({
      displayName: name,
      nativeLanguageCode: 'en',
      baseLanguageCode: 'en',
    });
    setBusy(false);
    if (!created) {
      setError('Failed to create profile.');
      return;
    }
    navigate(redirect, { replace: true });
  };

  const handleSelect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProfileId) {
      setError('Select a profile first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await activateProfile(selectedProfileId);
      navigate(redirect, { replace: true });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to activate profile.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col overflow-hidden bg-obsidian text-white">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
      </div>

      <div className="relative z-10">
        <Titlebar />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-5 py-8 md:px-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto w-full max-w-sm"
        >
          <SpotlightCard className="overflow-hidden bg-black/40 backdrop-blur-xl border-white/10 p-8" spotlightColor="rgba(103,124,255,0.15)">
            <div className="mb-6 text-center">
              <h1 className="text-[28px] font-bold tracking-tight text-white mb-2">{title}</h1>
              <p className="text-[14px] text-dim">A local profile is required before entering the app.</p>
            </div>

            {isUnsupportedRuntime && (
              <div className="mb-5 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                <p className="font-semibold">This app requires Tauri runtime for local SQLite persistence.</p>
                <p className="mt-1 text-xs text-amber-100/90">
                  Detected runtime: <code>{runtimeLabel}</code>. If you started browser dev mode, stop it and run <code>pnpm tauri dev</code>.
                </p>
              </div>
            )}

            {!isUnsupportedRuntime && canSelectExisting && (
              <form className="space-y-4 mb-5" onSubmit={handleSelect}>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold text-mist">Choose Profile</span>
                  <select
                    value={selectedProfileId}
                    onChange={(event) => setSelectedProfileId(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/60"
                  >
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--color-violet),var(--color-cyan))] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  Enter with Profile <ArrowRight size={16} />
                </button>
              </form>
            )}

            {!isUnsupportedRuntime && (
              <form className="space-y-4" onSubmit={handleCreate}>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold text-mist">
                    {needsCreationOnly ? 'Display Name' : 'Create New Profile'}
                  </span>
                  <div className="relative">
                    <UserRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/25 pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/60"
                      placeholder="Local Learner"
                    />
                  </div>
                </label>

                {(error || bootstrapError) && (
                  <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    {error ?? bootstrapError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  Create and Enter <ArrowRight size={16} />
                </button>
              </form>
            )}
          </SpotlightCard>
        </motion.div>
      </div>
    </div>
  );
}
