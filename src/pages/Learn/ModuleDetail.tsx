import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Lock, Play, Sparkles } from 'lucide-react';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCurriculumState } from '../../hooks/useCurriculumState';
import {
  buildRoadmap,
  getTheme,
  getThemeSkills,
  masteryOf,
  STRONG_THRESHOLD,
  WEAK_THRESHOLD,
} from '../../services/curriculum';

/** Colour ramp shared with the Home focus card. */
function masteryTone(mastery: number, exposures: number) {
  if (exposures === 0) return { label: 'Not met yet', color: '#64748B' };
  if (mastery < WEAK_THRESHOLD) return { label: 'Needs work', color: '#F87171' };
  if (mastery < STRONG_THRESHOLD) return { label: 'Getting there', color: '#FBBF24' };
  return { label: 'Solid', color: '#34D399' };
}

/**
 * Detail view for one theme.
 *
 * This route rendered a stub reading "Module View Unavailable — Synthetic
 * module/lesson demo data was removed from the core Learn route." That was the
 * honest thing to show while there was no real curriculum behind it; now there is,
 * so the page shows the theme's skills with the learner's actual mastery of each,
 * and its checkpoints with their real unlock state.
 */
export default function ModuleDetail() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { activeLanguage } = useLanguage();
  const { progression, mastery, loading } = useCurriculumState();

  const theme = moduleId ? getTheme(moduleId) : null;

  const roadmap = useMemo(() => {
    if (!theme) return null;
    return buildRoadmap({
      themeOrder: theme.order,
      everdarkLevel: progression.unlockedEverdarkByTheme[theme.id] ?? 1,
      languageCode: activeLanguage.code,
      progression,
    });
  }, [activeLanguage.code, progression, theme]);

  const skills = useMemo(
    () => (theme ? getThemeSkills(theme.id, activeLanguage.code) : []),
    [activeLanguage.code, theme],
  );

  if (!theme) {
    return (
      <PageContent width="narrow" className="pb-12">
        <PageActions>
          <Link to="/learn" className="no-underline">
            <button className="page-primary-action">
              <ArrowLeft size={16} /> Back to Learn
            </button>
          </Link>
        </PageActions>
        <div className="rounded-2xl border border-white/10 bg-[#0B1020]/70 p-6">
          <h2 className="text-[17px] font-black text-white">Theme not found</h2>
          <p className="mt-2 text-[13px] text-dim">
            No theme matches “{moduleId}”. Pick one from the learning path.
          </p>
        </div>
      </PageContent>
    );
  }

  const locked = theme.order > progression.unlockedThemeOrder;

  return (
    <PageContent width="default" className="pb-12">
      <PageActions>
        <Link to="/learn" className="no-underline">
          <button className="page-primary-action">
            <ArrowLeft size={16} /> Back to Learn
          </button>
        </Link>
      </PageActions>

      <header className="rounded-[24px] border border-white/10 bg-[#0B1020]/75 p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#A78BFA]">
          Theme {String(theme.order).padStart(2, '0')} · {theme.phase.replace(/_/g, ' ')}
        </p>
        <h1 className="mt-1.5 text-[26px] font-black tracking-tight text-white">{theme.title}</h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-dim">{theme.shortDescription}</p>

        {locked && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-[12px] text-amber-100">
            <Lock size={13} /> Finish theme {progression.unlockedThemeOrder} to unlock this one.
          </p>
        )}
      </header>

      <section className="mt-6">
        <h2 className="mb-3 text-[15px] font-bold text-white">What this theme teaches</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {skills.map((skill) => {
            const record = masteryOf(mastery, skill.id);
            const tone = masteryTone(record.mastery, record.exposures);
            return (
              <div key={skill.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-mist">{skill.title}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-dim">{skill.kind}</p>
                  </div>
                  <span className="shrink-0 text-[11px] font-black" style={{ color: tone.color }}>
                    {record.exposures === 0 ? '—' : `${Math.round(record.mastery)}%`}
                  </span>
                </div>

                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-black/30">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(2, record.mastery)}%`, background: tone.color }}
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-dim">
                  {tone.label}
                  {record.exposures > 0 && ` · ${record.exposures} ${record.exposures === 1 ? 'attempt' : 'attempts'}`}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {roadmap && !locked && (
        <section className="mt-6">
          <h2 className="mb-3 text-[15px] font-bold text-white">
            Checkpoints ({roadmap.completedCheckpoints}/{roadmap.checkpoints.length})
          </h2>
          <div className="space-y-2">
            {roadmap.checkpoints.map((checkpoint) => {
              const openStep = checkpoint.steps.find((step) => step.status === 'available');
              const isLocked = checkpoint.status === 'locked';
              return (
                <div
                  key={checkpoint.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                    checkpoint.status === 'completed'
                      ? 'border-emerald-400/25 bg-emerald-400/[0.06]'
                      : isLocked
                        ? 'border-white/8 bg-white/[0.02] opacity-60'
                        : 'border-[#8B5CF6]/35 bg-[#8B5CF6]/10'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/25 text-[11px] font-black text-mist">
                      {checkpoint.status === 'completed' ? (
                        <Check size={14} className="text-emerald-300" strokeWidth={3} />
                      ) : isLocked ? (
                        <Lock size={12} className="text-dim" />
                      ) : (
                        checkpoint.number
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-mist">{checkpoint.title}</p>
                      <p className="text-[10px] text-dim">
                        {checkpoint.steps.filter((step) => step.status === 'completed').length}/
                        {checkpoint.steps.length} steps
                        {checkpoint.score !== null && ` · scored ${checkpoint.score}%`}
                      </p>
                    </div>
                  </div>

                  {openStep && (
                    <button
                      type="button"
                      onClick={() => navigate(`/learn/session?stepId=${encodeURIComponent(openStep.id)}`)}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[linear-gradient(135deg,#7C3AED,#4F46E5)] px-3 py-2 text-[11px] font-black text-white"
                    >
                      <Play size={11} fill="currentColor" /> Start
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {loading && <p className="mt-6 text-[13px] text-dim">Loading your progress…</p>}

      {!loading && !locked && skills.every((skill) => masteryOf(mastery, skill.id).exposures === 0) && (
        <p className="mt-6 flex items-center gap-2 text-[12px] text-dim">
          <Sparkles size={12} className="text-[#A78BFA]" />
          You have not practised anything in this theme yet — start checkpoint 1 to begin tracking it.
        </p>
      )}
    </PageContent>
  );
}
