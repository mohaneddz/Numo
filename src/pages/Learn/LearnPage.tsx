import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BookMarked,
  BookOpen,
  Briefcase,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  CloudSun,
  Coffee,
  Dumbbell,
  FileText,
  Gamepad2,
  Globe2,
  GraduationCap,
  Hand,
  Headphones,
  Heart,
  HeartPulse,
  HelpCircle,
  History,
  Home,
  Landmark,
  Laptop,
  Lock,
  MapPinned,
  MessageCircle,
  MessagesSquare,
  Mic,
  Plane,
  Play,
  Repeat2,
  Rocket,
  Scale,
  ScanSearch,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  Star,
  Trophy,
  UserRound,
  Users,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { useCurriculumState } from '../../hooks/useCurriculumState';
import { THEMES, type RoadmapCheckpoint, type StepKind } from '../../services/curriculum';

const stepMeta: Record<StepKind, { label: string; icon: LucideIcon }> = {
  rule: { label: 'Pattern', icon: BookOpen },
  vocabulary: { label: 'Words', icon: MessageCircle },
  exercise: { label: 'Practice', icon: Dumbbell },
  listening: { label: 'Listening', icon: Headphones },
  speaking: { label: 'Speaking', icon: Mic },
  review: { label: 'Review', icon: Trophy },
};

const themeIcons: Record<string, LucideIcon> = {
  starter_survival: Sprout,
  greetings_introductions: Hand,
  people_identity: UserRound,
  questions_requests: HelpCircle,
  daily_actions_objects: Repeat2,
  home_daily_routine: Home,
  family_relationships: Users,
  food_drink: Utensils,
  shopping_money: ShoppingBag,
  time_dates_planning: CalendarDays,
  places_directions: MapPinned,
  travel_transport: Plane,
  health_body: HeartPulse,
  weather_nature: CloudSun,
  technology_digital_life: Laptop,
  school_learning: GraduationCap,
  work_career: Briefcase,
  social_life_small_talk: Coffee,
  hobbies_entertainment: Gamepad2,
  emotions_preferences_opinions: Heart,
  describing_people_things_situations: ScanSearch,
  past_events_experiences: History,
  future_plans_intentions: Rocket,
  problems_emergencies: AlertTriangle,
  services_administration: FileText,
  culture_traditions: Landmark,
  storytelling_narration: BookMarked,
  explaining_comparing_reasoning: Scale,
  discussion_persuasion_nuance: MessagesSquare,
  real_world_fluency: Globe2,
};

/** Alternating horizontal offsets so the path reads as a winding route. */
const nodeOffsets = ['-translate-x-20', 'translate-x-8', 'translate-x-24', 'translate-x-4', '-translate-x-12'];

export default function LearnPage() {
  const navigate = useNavigate();
  const {
    loading,
    roadmap,
    selectedTheme,
    progression,
    themeProgress,
    weakSkills,
    nextStep,
    selectTheme,
    selectEverdarkLevel,
  } = useCurriculumState();

  const ThemeIcon = themeIcons[selectedTheme.id] ?? Globe2;

  // The checkpoint shown in the sidebar is the one the learner is actually on,
  // rather than a separate selection that could point at locked content.
  const activeCheckpoint: RoadmapCheckpoint | null = useMemo(() => {
    if (!roadmap) return null;
    return (
      roadmap.checkpoints.find((checkpoint) => checkpoint.status === 'available') ??
      roadmap.checkpoints[roadmap.checkpoints.length - 1] ??
      null
    );
  }, [roadmap]);

  const openStep = (stepId: string) => {
    navigate(`/learn/session?stepId=${encodeURIComponent(stepId)}`);
  };

  const resume = () => {
    if (nextStep) openStep(nextStep.step.id);
  };

  if (loading || !roadmap) {
    return (
      <PageContent width="wide" className="pb-16">
        <div className="rounded-[24px] border border-white/10 bg-[#0B1020]/70 p-8 text-center text-[13px] text-dim">
          Loading your learning path…
        </div>
      </PageContent>
    );
  }

  const themeCompletionPercent = roadmap.totalSteps > 0
    ? Math.round((roadmap.completedSteps / roadmap.totalSteps) * 100)
    : 0;
  const unlockedEverdark = roadmap.unlockedEverdarkLevel;

  return (
    <PageContent width="wide" className="pb-16">
      <PageActions>
        <button className="page-primary-action" onClick={resume} disabled={!nextStep}>
          <Play size={15} fill="currentColor" /> {roadmap.completedSteps > 0 ? 'Resume path' : 'Start path'}
        </button>
      </PageActions>

      <div className="grid min-h-[calc(100vh-190px)] grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
        <main className="min-w-0">
          <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0B1020]/72 px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl md:px-7">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(139,92,246,0.22),transparent_48%)]" />
            <div className="relative flex items-center gap-3">
              <button
                type="button"
                aria-label="Previous theme"
                disabled={selectedTheme.order <= 1}
                onClick={() => void selectTheme(selectedTheme.order - 1)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-dim transition-all hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="min-w-0 flex-1 text-center">
                <div className="mb-1 flex items-center justify-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 text-[#A78BFA]">
                    <ThemeIcon size={14} strokeWidth={2.2} />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A78BFA]">
                    Theme {String(selectedTheme.order).padStart(2, '0')} / {THEMES.length}
                  </span>
                </div>

                <div className="relative mx-auto flex w-fit items-center justify-center">
                  <select
                    aria-label="Select learning theme"
                    value={selectedTheme.id}
                    onChange={(event) => {
                      const theme = THEMES.find((candidate) => candidate.id === event.target.value);
                      if (theme) void selectTheme(theme.order);
                    }}
                    style={{ textAlignLast: 'center' }}
                    className="max-w-full cursor-pointer appearance-none bg-transparent text-center text-[22px] font-black tracking-tight text-white outline-none md:text-[26px]"
                  >
                    {THEMES.map((theme) => {
                      const locked = theme.order > progression.unlockedThemeOrder;
                      return (
                        <option
                          key={theme.id}
                          value={theme.id}
                          disabled={locked}
                          className="bg-[#0B1020] text-left text-sm"
                        >
                          {locked ? `${theme.title} — locked` : theme.title}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <p className="mx-auto mt-1 max-w-2xl truncate text-[12px] text-dim md:text-[13px]">
                  {selectedTheme.shortDescription}
                </p>

                <div className="mt-4 flex items-center justify-center gap-2" aria-label="Everdark levels">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const unlocked = level <= unlockedEverdark;
                    const active = roadmap.everdarkLevel === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        disabled={!unlocked}
                        title={unlocked ? `Everdark ${level}` : `Finish this theme to unlock Everdark ${level}`}
                        aria-label={`Everdark ${level}${unlocked ? '' : ' locked'}`}
                        onClick={() => void selectEverdarkLevel(level)}
                        className={`group relative flex h-4 w-4 items-center justify-center rounded-full transition-all ${
                          active
                            ? 'bg-[#8B5CF6] shadow-[0_0_14px_rgba(139,92,246,0.8)]'
                            : unlocked
                              ? 'bg-white/35 hover:bg-white/60'
                              : 'cursor-not-allowed bg-white/10'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-white' : 'bg-white/30'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                aria-label="Next theme"
                disabled={selectedTheme.order >= progression.unlockedThemeOrder}
                title={
                  selectedTheme.order >= progression.unlockedThemeOrder
                    ? 'Finish this theme to unlock the next one'
                    : 'Next theme'
                }
                onClick={() => void selectTheme(selectedTheme.order + 1)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-dim transition-all hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </section>

          <section className="relative mx-auto mt-8 max-w-[760px] pb-20">
            <div className="pointer-events-none absolute left-1/2 top-20 bottom-20 w-px -translate-x-1/2 bg-[linear-gradient(to_bottom,rgba(139,92,246,0.55),rgba(255,255,255,0.08)_35%,rgba(255,255,255,0.04))]" />

            <div className="relative z-10 flex flex-col items-center gap-8">
              {roadmap.checkpoints.map((checkpoint, checkpointIndex) => {
                const isLocked = checkpoint.status === 'locked';
                const isCompleted = checkpoint.status === 'completed';
                const isActive = activeCheckpoint?.id === checkpoint.id;
                const firstOpenStep = checkpoint.steps.find((step) => step.status === 'available');

                return (
                  <motion.button
                    key={checkpoint.id}
                    type="button"
                    whileHover={isLocked ? undefined : { scale: 1.04, y: -2 }}
                    whileTap={isLocked ? undefined : { scale: 0.97 }}
                    disabled={isLocked || !firstOpenStep}
                    onClick={() => firstOpenStep && openStep(firstOpenStep.id)}
                    className={`group relative flex w-[280px] items-center gap-4 text-left transition-opacity md:w-[340px] ${nodeOffsets[checkpointIndex % nodeOffsets.length]} ${isLocked ? 'cursor-not-allowed opacity-45' : ''}`}
                  >
                    <div
                      className={`relative flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full border-[6px] ${
                        isLocked
                          ? 'border-[#252B39] bg-[#151A24] text-[#555E70]'
                          : isCompleted
                            ? 'border-white/15 bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-[0_10px_38px_rgba(16,185,129,0.35)]'
                            : 'border-white/15 bg-gradient-to-br from-[#8B5CF6] to-[#4F46E5] text-white shadow-[0_10px_38px_rgba(139,92,246,0.38)]'
                      } ${isActive ? 'ring-4 ring-[#A78BFA]/25 ring-offset-4 ring-offset-[#080C19]' : ''}`}
                    >
                      {isLocked ? <Lock size={22} /> : isCompleted ? <Check size={28} strokeWidth={3} /> : <Trophy size={27} strokeWidth={2.5} />}
                      <span
                        className={`absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-[#080C19] px-1 text-[9px] font-black ${
                          isLocked ? 'bg-[#252B39] text-dim' : 'bg-white text-[#111827]'
                        }`}
                      >
                        {checkpoint.number}
                      </span>
                    </div>

                    <div
                      className={`min-w-0 rounded-2xl border px-4 py-3 backdrop-blur-sm ${
                        isActive ? 'border-[#8B5CF6]/45 bg-[#8B5CF6]/12' : 'border-white/8 bg-white/[0.035]'
                      }`}
                    >
                      <p className="mb-0.5 text-[10px] font-black uppercase tracking-[0.13em] text-dim">
                        Checkpoint {checkpoint.number} · {checkpoint.steps.length} steps
                        {checkpoint.score !== null && ` · ${checkpoint.score}%`}
                      </p>
                      <p className={`truncate text-[13px] font-bold ${isLocked ? 'text-dim' : 'text-white'}`}>
                        {checkpoint.title}
                      </p>
                      {!isLocked && !isCompleted && (
                        <p className="mt-0.5 truncate text-[11px] text-dim">
                          {checkpoint.steps.filter((step) => step.status === 'completed').length}/
                          {checkpoint.steps.length} steps done
                        </p>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="relative z-10 mx-auto flex max-w-[430px] flex-col items-center rounded-[24px] border border-dashed border-[#8B5CF6]/35 bg-[#8B5CF6]/8 px-6 py-7 text-center">
              <ShieldCheck size={28} className="text-[#A78BFA]" />
              <h3 className="mt-3 text-[16px] font-black text-white">
                {roadmap.completedCheckpoints >= roadmap.checkpoints.length
                  ? 'Everdark level complete'
                  : `${roadmap.checkpoints.length - roadmap.completedCheckpoints} checkpoints to go`}
              </h3>
              <p className="mt-1 text-[12px] leading-relaxed text-dim">
                Finish the roadmap to unlock the next Everdark level and a harder pass over this theme.
              </p>
            </div>
          </section>
        </main>

        <aside className="xl:sticky xl:top-0 xl:self-start">
          <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[#0B1020]/82 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl xl:max-h-[calc(100vh-190px)] xl:overflow-y-auto">
            <div className="relative overflow-hidden border-b border-white/8 px-5 py-5">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.25),transparent_58%)]" />
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#A78BFA]">Theme progress</p>
                    <h2 className="mt-1 text-[19px] font-black text-white">{selectedTheme.title}</h2>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 text-[#A78BFA]">
                    <ThemeIcon size={21} strokeWidth={2.2} />
                  </span>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${themeCompletionPercent}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="h-full rounded-full bg-[linear-gradient(90deg,#8B5CF6,#22D3EE)]"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-dim">
                  <span>
                    {roadmap.completedCheckpoints} of {roadmap.checkpoints.length} checkpoints
                  </span>
                  <span>Everdark {roadmap.everdarkLevel}</span>
                </div>

                {themeProgress.skillsStarted > 0 && (
                  <p className="mt-2 text-[10px] text-dim">
                    {themeProgress.skillsMastered} of {themeProgress.totalSkills} skills solid · average{' '}
                    {themeProgress.averageMastery}%
                  </p>
                )}
              </div>
            </div>

            <div className="p-5">
              {activeCheckpoint && (
                <>
                  <div className="mb-4 flex items-center gap-2">
                    <CircleDot size={14} className="text-[#A78BFA]" />
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-dim">Current checkpoint</p>
                  </div>

                  <div className="rounded-2xl border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#4F46E5] text-white">
                        <Trophy size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#C4B5FD]">
                          Checkpoint {activeCheckpoint.number}
                        </p>
                        <h3 className="mt-0.5 text-[14px] font-bold leading-snug text-white">
                          {activeCheckpoint.title}
                        </h3>
                      </div>
                    </div>
                    <p className="mt-3 text-[12px] leading-relaxed text-dim">{activeCheckpoint.subtitle}</p>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-white/8 bg-black/15 px-3 py-2.5">
                        <Clock3 size={13} className="mb-1 text-dim" />
                        <p className="text-[13px] font-black text-white">
                          {activeCheckpoint.steps.reduce((total, step) => total + step.estimatedMinutes, 0)} min
                        </p>
                        <p className="text-[9px] uppercase tracking-wider text-dim">Estimate</p>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-black/15 px-3 py-2.5">
                        <Star size={13} className="mb-1 text-amber-300" />
                        <p className="text-[13px] font-black text-white">
                          +{activeCheckpoint.steps.reduce((total, step) => total + step.xp, 0)} XP
                        </p>
                        <p className="text-[9px] uppercase tracking-wider text-dim">Reward</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-dim">Checkpoint steps</p>
                    <div className="space-y-2">
                      {activeCheckpoint.steps.map((step, stepIndex) => {
                        const meta = stepMeta[step.kind];
                        const Icon = meta.icon;
                        const isOpen = step.status === 'available';
                        const isDone = step.status === 'completed';

                        return (
                          <button
                            key={step.id}
                            type="button"
                            disabled={!isOpen && !isDone}
                            onClick={() => openStep(step.id)}
                            className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                              isOpen
                                ? 'border-[#8B5CF6]/40 bg-[#8B5CF6]/12 hover:bg-[#8B5CF6]/18'
                                : isDone
                                  ? 'border-emerald-400/25 bg-emerald-400/8 hover:bg-emerald-400/12'
                                  : 'cursor-not-allowed border-white/8 bg-white/[0.02] opacity-50'
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-2 text-[11px] font-semibold text-mist">
                              {isDone ? (
                                <Check size={13} className="shrink-0 text-emerald-300" strokeWidth={3} />
                              ) : isOpen ? (
                                <Icon size={13} className="shrink-0 text-[#A78BFA]" />
                              ) : (
                                <Lock size={12} className="shrink-0 text-dim" />
                              )}
                              <span className="truncate">
                                {stepIndex + 1}. {step.title}
                              </span>
                            </span>
                            <span className="shrink-0 text-[10px] font-black text-dim">{step.estimatedMinutes}m</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {weakSkills.length > 0 && (
                <div className="mt-6">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-dim">
                    Woven into your next sessions
                  </p>
                  <div className="space-y-2">
                    {weakSkills.map(({ skill, record }) => (
                      <div
                        key={skill.id}
                        className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[12px] font-semibold text-mist">{skill.title}</span>
                          <span className="shrink-0 text-[11px] font-black text-amber-200">
                            {Math.round(record.mastery)}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/30">
                          <div
                            className="h-full rounded-full bg-amber-400/70"
                            style={{ width: `${Math.max(4, Math.round(record.mastery))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-dim">
                    These are pulled into upcoming sessions automatically until they hold.
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </PageContent>
  );
}
