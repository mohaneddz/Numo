import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  BookMarked,
  Briefcase,
  CalendarDays,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  CloudSun,
  Coffee,
  Clock3,
  Dumbbell,
  FileText,
  Gamepad2,
  Globe2,
  GraduationCap,
  Hand,
  Headphones,
  Heart,
  HeartPulse,
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
  AlertTriangle,
  UserRound,
  Users,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import defaultThemes from '../../data/main/defaultThemes.json';

type StepKind = 'rule' | 'vocabulary' | 'exercise' | 'listening' | 'speaking' | 'review';

interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  kind: StepKind;
  duration: number;
  xp: number;
  status: 'completed' | 'available' | 'locked';
}

interface RoadmapCheckpoint {
  id: string;
  title: string;
  subtitle: string;
  number: number;
  status: 'completed' | 'available' | 'locked';
  steps: RoadmapStep[];
}

const checkpointStepKinds: StepKind[] = [
  'rule',
  'vocabulary',
  'exercise',
  'listening',
  'speaking',
  'exercise',
  'review',
];

const stepMeta: Record<StepKind, { label: string; icon: LucideIcon; color: string; glow: string }> = {
  rule: {
    label: 'Rule',
    icon: BookOpen,
    color: 'from-[#6B7BFF] to-[#8B5CF6]',
    glow: 'shadow-[0_10px_32px_rgba(107,123,255,0.32)]',
  },
  vocabulary: {
    label: 'Words',
    icon: MessageCircle,
    color: 'from-[#15B8A6] to-[#22D3EE]',
    glow: 'shadow-[0_10px_32px_rgba(34,211,238,0.25)]',
  },
  exercise: {
    label: 'Practice',
    icon: Dumbbell,
    color: 'from-[#F9738A] to-[#FB7185]',
    glow: 'shadow-[0_10px_32px_rgba(251,113,133,0.27)]',
  },
  listening: {
    label: 'Listening',
    icon: Headphones,
    color: 'from-[#F59E0B] to-[#FBBF24]',
    glow: 'shadow-[0_10px_32px_rgba(245,158,11,0.25)]',
  },
  speaking: {
    label: 'Speaking',
    icon: Mic,
    color: 'from-[#EC4899] to-[#A855F7]',
    glow: 'shadow-[0_10px_32px_rgba(236,72,153,0.25)]',
  },
  review: {
    label: 'Review',
    icon: Trophy,
    color: 'from-[#8B5CF6] to-[#4F46E5]',
    glow: 'shadow-[0_10px_38px_rgba(139,92,246,0.38)]',
  },
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

const nodeOffsets = ['-translate-x-20', 'translate-x-8', 'translate-x-24', 'translate-x-4', '-translate-x-12'];

function humanize(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function createRoadmap(theme: (typeof defaultThemes.units)[number], level: number): RoadmapCheckpoint[] {
  const concepts = theme.embeddedConceptFocus;
  return Array.from({ length: 20 }, (_, checkpointIndex) => {
    const checkpointNumber = checkpointIndex + 1;
    const checkpointStatus = checkpointIndex === 0 ? 'available' : 'locked';
    return {
      id: `${theme.id}-level-${level}-checkpoint-${checkpointNumber}`,
      number: checkpointNumber,
      title: `${theme.title} checkpoint ${checkpointNumber}`,
      subtitle: `Seven guided steps toward Everdark level ${level + 1}.`,
      status: checkpointStatus,
      steps: checkpointStepKinds.map((kind, stepIndex) => {
      const concept = concepts[(checkpointIndex + stepIndex) % concepts.length];
      return {
        id: `${theme.id}-${level}-${checkpointNumber}-${stepIndex + 1}`,
        title:
          kind === 'review'
            ? `Checkpoint ${checkpointNumber} review`
            : `${stepMeta[kind].label}: ${humanize(concept)}`,
        description:
          kind === 'rule'
            ? `Discover a useful pattern for ${theme.title.toLowerCase()} and see it in short examples.`
            : kind === 'review'
              ? `Combine all six skills before completing checkpoint ${checkpointNumber}.`
              : `Practice ${humanize(concept).toLowerCase()} through a guided ${stepMeta[kind].label.toLowerCase()} activity.`,
        kind,
        duration: kind === 'review' ? 8 : 4 + ((checkpointIndex + stepIndex) % 3),
        xp: kind === 'review' ? 30 : 10 + stepIndex * 5,
        status: checkpointIndex === 0 && stepIndex === 0 ? 'available' : 'locked',
      };
    }),
    };
  });
}

export default function LearnPage() {
  const navigate = useNavigate();
  const [themeIndex, setThemeIndex] = useState(0);
  const [everdarkLevel, setEverdarkLevel] = useState(1);
  const unlockedEverdarkLevel = 1;

  const theme = defaultThemes.units[themeIndex];
  const ThemeIcon = themeIcons[theme.id] ?? Globe2;
  const roadmap = useMemo(() => createRoadmap(theme, everdarkLevel), [everdarkLevel, theme]);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState(roadmap[0].id);
  const selectedCheckpoint =
    roadmap.find((checkpoint) => checkpoint.id === selectedCheckpointId) ?? roadmap[0];
  const totalSteps = roadmap.reduce((total, checkpoint) => total + checkpoint.steps.length, 0);
  const totalMinutes = roadmap
    .flatMap((checkpoint) => checkpoint.steps)
    .reduce((total, step) => total + step.duration, 0);

  const selectTheme = (nextIndex: number) => {
    const normalized = (nextIndex + defaultThemes.units.length) % defaultThemes.units.length;
    const nextTheme = defaultThemes.units[normalized];
    const nextRoadmap = createRoadmap(nextTheme, 1);
    setThemeIndex(normalized);
    setEverdarkLevel(1);
    setSelectedCheckpointId(nextRoadmap[0].id);
  };

  const selectLevel = (level: number) => {
    if (level > unlockedEverdarkLevel) return;
    const nextRoadmap = createRoadmap(theme, level);
    setEverdarkLevel(level);
    setSelectedCheckpointId(nextRoadmap[0].id);
  };

  const startSelectedCheckpoint = () => {
    if (selectedCheckpoint.status === 'locked') return;
    navigate('/learn/session');
  };

  return (
    <PageContent width="wide" className="pb-16">
      <PageActions>
        <button className="page-primary-action" onClick={startSelectedCheckpoint}>
          <Play size={15} fill="currentColor" /> Resume path
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
                onClick={() => selectTheme(themeIndex - 1)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-dim transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="min-w-0 flex-1 text-center">
                <div className="mb-1 flex items-center justify-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 text-[#A78BFA]">
                    <ThemeIcon size={14} strokeWidth={2.2} />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A78BFA]">
                    Theme {String(themeIndex + 1).padStart(2, '0')} / {defaultThemes.units.length}
                  </span>
                </div>
                <div className="relative mx-auto flex w-fit items-center justify-center">
                  <select
                    aria-label="Select learning theme"
                    value={theme.id}
                    onChange={(event) =>
                      selectTheme(defaultThemes.units.findIndex((unit) => unit.id === event.target.value))
                    }
                    style={{ textAlignLast: 'center' }}
                    className="max-w-full cursor-pointer appearance-none bg-transparent text-center text-[22px] font-black tracking-tight text-white outline-none md:text-[26px]"
                  >
                    {defaultThemes.units.map((unit) => (
                      <option key={unit.id} value={unit.id} className="bg-[#0B1020] text-left text-sm">
                        {unit.title}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mx-auto mt-1 max-w-2xl truncate text-[12px] text-dim md:text-[13px]">
                  {theme.shortDescription}
                </p>

                <div className="mt-4 flex items-center justify-center gap-2" aria-label="Everdark levels">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const unlocked = level <= unlockedEverdarkLevel;
                    const active = everdarkLevel === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        disabled={!unlocked}
                        title={unlocked ? `Everdark ${level}` : `Finish this theme to unlock Everdark ${level}`}
                        aria-label={`Everdark ${level}${unlocked ? '' : ' locked'}`}
                        onClick={() => selectLevel(level)}
                        className={`group relative flex h-4 w-4 items-center justify-center rounded-full transition-all ${active
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
                onClick={() => selectTheme(themeIndex + 1)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-dim transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </section>

          <section className="relative mx-auto mt-8 max-w-[760px] pb-20">
            <div className="pointer-events-none absolute left-1/2 top-20 bottom-20 w-px -translate-x-1/2 bg-[linear-gradient(to_bottom,rgba(139,92,246,0.55),rgba(255,255,255,0.08)_35%,rgba(255,255,255,0.04))]" />

            <div className="relative z-10 flex flex-col items-center gap-8">
              {roadmap.map((checkpoint, checkpointIndex) => {
                const isLocked = checkpoint.status === 'locked';
                const isSelected = selectedCheckpoint.id === checkpoint.id;
                return (
                  <motion.button
                    key={checkpoint.id}
                    type="button"
                    whileHover={isLocked ? undefined : { scale: 1.05, y: -2 }}
                    whileTap={isLocked ? undefined : { scale: 0.97 }}
                    onClick={() => !isLocked && setSelectedCheckpointId(checkpoint.id)}
                    className={`group relative flex w-[280px] items-center gap-4 text-left transition-opacity md:w-[340px] ${nodeOffsets[checkpointIndex % nodeOffsets.length]} ${isLocked ? 'cursor-not-allowed opacity-48' : ''}`}
                  >
                    <div
                      className={`relative flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full border-[6px] ${
                        isLocked
                          ? 'border-[#252B39] bg-[#151A24] text-[#555E70]'
                          : 'border-white/15 bg-gradient-to-br from-[#8B5CF6] to-[#4F46E5] text-white shadow-[0_10px_38px_rgba(139,92,246,0.38)]'
                      } ${isSelected ? 'ring-4 ring-[#A78BFA]/25 ring-offset-4 ring-offset-[#080C19]' : ''}`}
                    >
                      {isLocked ? <Lock size={22} /> : <Trophy size={27} strokeWidth={2.5} />}
                      <span className={`absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-[#080C19] px-1 text-[9px] font-black ${isLocked ? 'bg-[#252B39] text-dim' : 'bg-white text-[#111827]'}`}>
                        {checkpoint.number}
                      </span>
                    </div>

                    <div className={`min-w-0 rounded-2xl border px-4 py-3 backdrop-blur-sm ${isSelected ? 'border-[#8B5CF6]/45 bg-[#8B5CF6]/12' : 'border-white/8 bg-white/[0.035]'}`}>
                      <p className="mb-0.5 text-[10px] font-black uppercase tracking-[0.13em] text-dim">
                        Checkpoint {checkpoint.number} · 7 steps
                      </p>
                      <p className={`truncate text-[13px] font-bold ${isLocked ? 'text-dim' : 'text-white'}`}>
                        {checkpoint.title}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="relative z-10 mx-auto flex max-w-[430px] flex-col items-center rounded-[24px] border border-dashed border-[#8B5CF6]/35 bg-[#8B5CF6]/8 px-6 py-7 text-center">
              <ShieldCheck size={28} className="text-[#A78BFA]" />
              <h3 className="mt-3 text-[16px] font-black text-white">Everdark level complete</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-dim">
                Finish the roadmap to unlock the next Everdark level and an endlessly harder version of this theme.
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
                    <h2 className="mt-1 text-[19px] font-black text-white">{theme.title}</h2>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 text-[#A78BFA]">
                    <ThemeIcon size={21} strokeWidth={2.2} />
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full w-[4%] rounded-full bg-[linear-gradient(90deg,#8B5CF6,#22D3EE)]" />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-dim">
                  <span>0 of {roadmap.length} checkpoints</span>
                  <span>Level {everdarkLevel}</span>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <CircleDot size={14} className="text-[#A78BFA]" />
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-dim">Selected checkpoint</p>
              </div>

              <div className="rounded-2xl border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#4F46E5] text-white">
                    <Trophy size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#C4B5FD]">
                      Checkpoint {selectedCheckpoint.number}
                    </p>
                    <h3 className="mt-0.5 text-[14px] font-bold leading-snug text-white">{selectedCheckpoint.title}</h3>
                  </div>
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-dim">{selectedCheckpoint.subtitle}</p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/8 bg-black/15 px-3 py-2.5">
                    <Clock3 size={13} className="mb-1 text-dim" />
                    <p className="text-[13px] font-black text-white">
                      {selectedCheckpoint.steps.reduce((total, step) => total + step.duration, 0)} min
                    </p>
                    <p className="text-[9px] uppercase tracking-wider text-dim">Estimate</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/15 px-3 py-2.5">
                    <Star size={13} className="mb-1 text-amber-300" />
                    <p className="text-[13px] font-black text-white">
                      +{selectedCheckpoint.steps.reduce((total, step) => total + step.xp, 0)} XP
                    </p>
                    <p className="text-[9px] uppercase tracking-wider text-dim">Reward</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={selectedCheckpoint.status === 'locked'}
                  onClick={startSelectedCheckpoint}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#7C3AED,#4F46E5)] px-4 py-3 text-[12px] font-black text-white shadow-[0_10px_30px_rgba(124,58,237,0.3)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {selectedCheckpoint.status === 'locked' ? <Lock size={14} /> : <Play size={14} fill="currentColor" />}
                  {selectedCheckpoint.status === 'locked' ? 'Complete previous checkpoint' : 'Start checkpoint'}
                </button>
              </div>

              <div className="mt-5">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-dim">Level plan</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-3">
                    <p className="text-[16px] font-black text-white">{roadmap.length}</p>
                    <p className="text-[9px] uppercase tracking-wider text-dim">Checkpoints</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-3">
                    <p className="text-[16px] font-black text-white">{totalMinutes}m</p>
                    <p className="text-[9px] uppercase tracking-wider text-dim">Estimated</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-3">
                    <p className="text-[16px] font-black text-white">{totalSteps}</p>
                    <p className="text-[9px] uppercase tracking-wider text-dim">Total steps</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-3">
                    <p className="text-[16px] font-black text-white">7</p>
                    <p className="text-[9px] uppercase tracking-wider text-dim">Steps each</p>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-dim">Checkpoint steps</p>
                <div className="space-y-2">
                  {selectedCheckpoint.steps.map((step, stepIndex) => {
                    const meta = stepMeta[step.kind];
                    const Icon = meta.icon;
                    return (
                      <div key={step.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2">
                        <span className="flex items-center gap-2 text-[11px] font-semibold text-mist">
                          <Icon size={13} className="text-[#A78BFA]" /> {stepIndex + 1}. {step.title}
                        </span>
                        <span className="text-[10px] font-black text-dim">{step.duration}m</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </aside>
      </div>
    </PageContent>
  );
}
