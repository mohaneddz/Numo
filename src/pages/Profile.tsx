import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, LogOut, ShieldCheck, UserCircle2, X } from 'lucide-react';
import {
  PageActions,
  PageContent,
  PageMainColumn,
  PageMainSidebarLayout,
  PageSidebar,
} from '../components/layout/PageLayout';
import { SpotlightCard } from '../components/ui/SpotlightCard';
import { integrationService, type ProfileDashboardSnapshot } from '../services/integrationService';
import { useProfileSession } from '../contexts/ProfileSessionContext';
import { languageCatalog, useLanguage } from '../contexts/LanguageContext';
import { useLanguageJourney } from '../contexts/LanguageJourneyContext';

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { clearActiveProfile } = useProfileSession();
  const {
    languages,
    isBaseLanguage,
    getLanguageScore,
    setLanguageScore,
    moveLanguage,
    removeLanguage,
  } = useLanguage();
  const { getSettings, setDifficulty } = useLanguageJourney();
  const [snapshot, setSnapshot] = useState<ProfileDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLanguageManager, setShowLanguageManager] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await integrationService.queryProfileDashboard({ rangeDays: 30, includeAllLanguages: true });
        if (!cancelled) {
          setSnapshot(next);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Failed to load profile.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSwitchProfile = () => {
    void (async () => {
      await clearActiveProfile();
      navigate('/login?redirect=/profile', { replace: true });
    })();
  };

  const overview = snapshot?.profileOverview;
  const strongestModes = snapshot?.strengthsWeaknesses.strongestModes ?? [];
  const weakestModes = snapshot?.strengthsWeaknesses.weakestModes ?? [];
  const hasLearningActivity =
    (overview?.totalStudySessions ?? 0) > 0
    || (overview?.recentActivityMinutes ?? 0) > 0
    || (overview?.currentStreak ?? 0) > 0;

  const meaningfulCapabilities = (snapshot?.capabilities ?? []).filter(
    (capability) => capability.coverage > 0 || capability.status === 'partial' || capability.status === 'unlocked',
  );
  const meaningfulScriptWriting = (snapshot?.scriptWriting ?? []).filter(
    (item) => item.traceSuccessRate > 0 || item.freeDrawSuccessRate > 0,
  );

  const catalogFlagByCode = useMemo(
    () => new Map(languageCatalog.map((language) => [language.code, language.flag])),
    [],
  );

  const resolveFlag = (code: string): string => catalogFlagByCode.get(code.toLowerCase()) ?? '🌐';

  return (
    <PageContent width="wide" className="pb-10">
      <PageActions>
        <button className="page-primary-action" onClick={handleSwitchProfile}>
          <LogOut size={15} /> Switch Profile
        </button>
      </PageActions>

      <PageMainSidebarLayout className="gap-6">
        <PageMainColumn className="gap-5">
          <motion.div {...fadeUp} transition={{ duration: 0.35 }}>
            <SpotlightCard className="p-6 md:p-7" spotlightColor="rgba(96, 130, 255, 0.18)">
              <div className="relative z-10">
                <div className="flex items-center gap-4">
                  <div className="h-18 w-18 rounded-2xl border border-white/12 bg-white/[0.06] flex items-center justify-center">
                    <UserCircle2 size={36} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-[30px] leading-tight font-bold text-white tracking-tight">
                      {overview?.displayName ?? 'Local Learner'}
                    </h2>
                    <p className="mt-1 text-sm text-dim">
                      Native {overview?.nativeLanguageCode ?? '-'} • Base {overview?.baseLanguageCode ?? '-'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                    <p className="text-[12px] uppercase tracking-wider text-dim font-bold">Sessions</p>
                    <p className="mt-2 text-[16px] text-mist font-semibold">{overview?.totalStudySessions ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                    <p className="text-[12px] uppercase tracking-wider text-dim font-bold">Recent Minutes</p>
                    <p className="mt-2 text-[16px] text-mist font-semibold">{overview?.recentActivityMinutes ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                    <p className="text-[12px] uppercase tracking-wider text-dim font-bold">Current Streak</p>
                    <p className="mt-2 text-[16px] text-mist font-semibold">{overview?.currentStreak ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                    <p className="text-[12px] uppercase tracking-wider text-dim font-bold">Longest Streak</p>
                    <p className="mt-2 text-[16px] text-mist font-semibold">{overview?.longestStreak ?? 0}</p>
                  </div>
                </div>

                <p className="mt-4 text-[13px] text-[#C9D4FF]">
                  Suggested focus: {overview?.suggestedFocus ?? 'Not enough data yet'}
                </p>
                {loading && <p className="mt-2 text-[12px] text-dim">Loading profile metrics...</p>}
                {error && <p className="mt-2 text-[12px] text-rose-300">{error}</p>}
              </div>
            </SpotlightCard>
          </motion.div>

          <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.06 }}>
            <SpotlightCard className="p-5 md:p-6" spotlightColor="rgba(124, 92, 255, 0.18)">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-[12px] uppercase tracking-wider text-dim font-bold">Languages</p>
                <button
                  type="button"
                  onClick={() => setShowLanguageManager((prev) => !prev)}
                  className="rounded-lg border border-white/15 bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold text-[#C9D4FF] transition-colors hover:bg-white/[0.07]"
                >
                  {showLanguageManager ? 'Close Manage' : 'Manage'}
                </button>
              </div>

              {showLanguageManager && (
                <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#9FB1FF]">
                    Manage Language Levels
                  </p>
                  <div className="space-y-2">
                    {languages.map((language, index) => {
                      const isBase = isBaseLanguage(language.code);
                      const canMoveUp = index > 0;
                      const canMoveDown = index < languages.length - 1;
                      return (
                        <div
                          key={`manage-${language.code}`}
                          className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg leading-none">{resolveFlag(language.code)}</span>
                              <span className="truncate text-[13px] font-semibold text-white">{language.name}</span>
                              <span
                                className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                  isBase
                                    ? 'border-[#5ad1ff]/35 bg-[#42bdf0]/15 text-[#9be7ff]'
                                    : 'border-[#c4d0ff]/30 bg-[#4f5ea5]/20 text-[#c7d2ff]'
                                }`}
                              >
                                {isBase ? 'Base' : 'New'}
                              </span>
                            </div>
                            {!isBase && (
                              <div className="mt-1.5 flex items-center gap-2">
                                <span className="text-[10px] text-dim">Level</span>
                                <input
                                  type="range"
                                  min={1}
                                  max={10}
                                  value={getLanguageScore(language.code)}
                                  onChange={(event) => setLanguageScore(language.code, Number(event.target.value))}
                                  className="h-1.5 w-[110px] accent-[#91A0FF]"
                                />
                                <span className="w-4 text-[10px] font-semibold text-[#cbd5ff]">
                                  {getLanguageScore(language.code)}
                                </span>
                                <select
                                  value={getSettings(language.code).difficulty}
                                  onChange={(event) => setDifficulty(language.code, event.target.value as 'easier' | 'standard' | 'harder')}
                                  className="ml-2 rounded-md border border-white/15 bg-black/30 px-1.5 py-1 text-[10px] text-mist"
                                >
                                  <option value="easier">Easier</option>
                                  <option value="standard">Standard</option>
                                  <option value="harder">Harder</option>
                                </select>
                              </div>
                            )}
                          </div>
                          <div className="ml-2 flex items-center gap-0.5">
                            <button
                              onClick={() => moveLanguage(language.code, 'up')}
                              disabled={!canMoveUp}
                              className="rounded-lg p-1.5 text-dim transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                              title="Move up"
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              onClick={() => moveLanguage(language.code, 'down')}
                              disabled={!canMoveDown}
                              className="rounded-lg p-1.5 text-dim transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                              title="Move down"
                            >
                              <ArrowDown size={13} />
                            </button>
                            <button
                              onClick={() => removeLanguage(language.code)}
                              className="rounded-lg p-1.5 text-dim transition-colors hover:bg-red-500/15 hover:text-red-300"
                              title="Remove language"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {(snapshot?.languageSummaries ?? []).map((language) => (
                  <div key={language.languageCode} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[14px] text-mist font-semibold">
                        <span className="mr-2 text-base leading-none">{resolveFlag(language.languageCode)}</span>
                        {language.languageName} ({language.languageCode.toUpperCase()}) {language.isActive ? '• Active' : ''}
                      </p>
                      <p className="text-[12px] text-dim">{language.stageLabel}</p>
                    </div>
                    <p className="mt-2 text-[12px] text-dim">
                      Due {language.dueNowCount} • Overdue {language.overdueCount} • Recent evidence {language.recentEvidenceCount}
                    </p>
                    <p className="mt-1 text-[12px] text-dim">
                      Weak areas: {language.weakAreas.join(', ') || 'Not enough data yet'}
                    </p>
                  </div>
                ))}
                {(snapshot?.languageSummaries.length ?? 0) === 0 && (
                  <p className="text-[13px] text-dim">No active language monitoring yet.</p>
                )}
              </div>
            </SpotlightCard>
          </motion.div>

          <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
            <SpotlightCard className="p-5 md:p-6" spotlightColor="rgba(73, 132, 255, 0.18)">
              <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-3">Goals</p>
              <div className="space-y-2">
                {(snapshot?.goals ?? []).map((goal) => (
                  <div key={goal.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-mist">
                    {goal.title} • {goal.status} {goal.languageCode ? `• ${goal.languageCode.toUpperCase()}` : ''}
                  </div>
                ))}
                {(snapshot?.goals.length ?? 0) === 0 && (
                  <p className="text-[13px] text-dim">No goals saved yet.</p>
                )}
              </div>
            </SpotlightCard>
          </motion.div>
        </PageMainColumn>

        <PageSidebar className="gap-5">
          {hasLearningActivity && (
            <SpotlightCard className="p-5">
              <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-3">Strengths & Weaknesses</p>
              <p className="text-[13px] text-mist">Strongest: {strongestModes.join(', ') || 'Not enough data yet'}</p>
              <p className="mt-1 text-[13px] text-mist">Weakest: {weakestModes.join(', ') || 'Not enough data yet'}</p>
              <p className="mt-2 text-[12px] text-dim">
                Pronunciation: {snapshot?.strengthsWeaknesses.pronunciationFlag ?? 'not_enough_data'}
              </p>
              <p className="mt-2 text-[12px] text-dim">
                Script summary: {snapshot?.strengthsWeaknesses.scriptWeaknessSummary ?? 'Not enough data yet'}
              </p>
            </SpotlightCard>
          )}

          {hasLearningActivity && meaningfulCapabilities.length > 0 && (
            <SpotlightCard className="p-5">
              <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-3">Capabilities</p>
              <div className="space-y-2">
                {meaningfulCapabilities.slice(0, 6).map((capability) => (
                  <div key={`${capability.languageCode}-${capability.capabilitySlug}`} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-mist">
                    {capability.title} ({capability.languageCode.toUpperCase()}) • {capability.status} • {Math.round(capability.coverage)}%
                  </div>
                ))}
              </div>
            </SpotlightCard>
          )}

          {hasLearningActivity && meaningfulScriptWriting.length > 0 && (
            <SpotlightCard className="p-5">
              <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-3">Script-Writing</p>
              <div className="space-y-2">
                {meaningfulScriptWriting.map((item) => (
                  <div key={item.languageCode} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-mist">
                    {item.languageCode.toUpperCase()} • Trace {Math.round(item.traceSuccessRate)}% • Free {Math.round(item.freeDrawSuccessRate)}%
                  </div>
                ))}
              </div>
            </SpotlightCard>
          )}

          <SpotlightCard className="p-5">
            <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-3">Profile Status</p>
            <p className="text-[12px] text-dim flex items-center gap-2">
              <ShieldCheck size={14} />
              Profile identity and route gating are local DB-backed in this phase.
            </p>
          </SpotlightCard>
        </PageSidebar>
      </PageMainSidebarLayout>
    </PageContent>
  );
}
