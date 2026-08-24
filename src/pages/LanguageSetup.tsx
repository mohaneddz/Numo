import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SpotlightCard } from '../components/ui/SpotlightCard';
import { PageContent } from '../components/layout/PageLayout';
import {
  DifficultyPreference,
  JourneyFocus,
  JourneyGoal,
  JourneyIntensity,
  JourneyLevel,
  JourneyPace,
  JourneyTimeframe,
  ScriptStartTiming,
  useLanguageJourney,
} from '../contexts/LanguageJourneyContext';
import { useLanguage, languageCatalog } from '../contexts/LanguageContext';

const levelDetails: Record<JourneyLevel, { label: string; detail: string }> = {
  complete_beginner: {
    label: 'Complete beginner',
    detail: 'Start from zero with highly guided basics and frequent repetition.',
  },
  beginner: {
    label: 'Beginner',
    detail: 'You know some essentials and want structured confidence-building practice.',
  },
  lower_intermediate: {
    label: 'Lower intermediate',
    detail: 'Expand real-world communication with stronger comprehension and output.',
  },
  intermediate_plus: {
    label: 'Intermediate+',
    detail: 'Sharpen nuance, speed, and natural expression with denser material.',
  },
};

const focusDetails: Record<JourneyFocus, { label: string; detail: string }> = {
  speaking: {
    label: 'Speaking',
    detail: 'Prioritizes sentence building, pronunciation cues, and response speed.',
  },
  understanding: {
    label: 'Understanding',
    detail: 'Emphasizes listening clarity and context-based comprehension drills.',
  },
  reading: {
    label: 'Reading',
    detail: 'Builds recognition and flow with progressive texts and vocabulary.',
  },
  writing: {
    label: 'Writing',
    detail: 'Pushes grammar control, output quality, and written accuracy.',
  },
  balanced: {
    label: 'Balanced',
    detail: 'Distributes practice across speaking, understanding, reading, and writing.',
  },
};

const intensityDetails: Record<JourneyIntensity, { label: string; detail: string; weeklyMinutes: number }> = {
  very_light: {
    label: 'Very light',
    detail: 'Low pressure sessions for consistent habit formation.',
    weeklyMinutes: 70,
  },
  normal: {
    label: 'Normal',
    detail: 'Steady momentum with manageable daily workload.',
    weeklyMinutes: 140,
  },
  serious: {
    label: 'Serious',
    detail: 'Faster progression with higher volume and challenge.',
    weeklyMinutes: 280,
  },
};

const paceDetails: Record<JourneyPace, { label: string; detail: string }> = {
  gentler: {
    label: 'Gentler',
    detail: 'More scaffolding, slower progression, and easier difficulty curve.',
  },
  standard: {
    label: 'Standard',
    detail: 'Balanced progression for most learners.',
  },
  harder: {
    label: 'Harder',
    detail: 'Higher challenge and less support for faster adaptation.',
  },
};

const scriptTimingDetails: Record<ScriptStartTiming, { label: string; detail: string }> = {
  start_now: {
    label: 'Start script-writing now',
    detail: 'Introduce script practice from day one.',
  },
  start_later: {
    label: 'Start later',
    detail: 'Focus on core communication first, then add script practice.',
  },
  start_gradually: {
    label: 'Start gradually',
    detail: 'Blend script practice in small steps over time.',
  },
};

export default function LanguageSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeLanguage, setActiveLanguage, languages, addLanguages } = useLanguage();
  const { getSettings, completeOnboarding } = useLanguageJourney();

  const langFromQuery = (searchParams.get('lang') ?? '').trim().toLowerCase();
  const selectedLanguage = useMemo(() => {
    const catalogEntry = languageCatalog.find((l) => l.code === langFromQuery);
    if (catalogEntry) {
      return (
        languages.find((language) => language.code === langFromQuery) ?? {
          code: catalogEntry.code,
          name: catalogEntry.name,
          flag: catalogEntry.flag,
          progress: { dailyGoalMinutes: 30, currentStreak: 0, longestStreak: 0, todayMinutes: 0, totalXP: 0 },
        }
      );
    }
    return activeLanguage;
  }, [activeLanguage, langFromQuery, languages]);

  useEffect(() => {
    if (selectedLanguage.code !== activeLanguage.code) {
      setActiveLanguage(selectedLanguage.code);
    }
  }, [activeLanguage.code, selectedLanguage.code, setActiveLanguage]);

  const defaults = getSettings(selectedLanguage.code);
  const [level, setLevel] = useState<JourneyLevel>(defaults.level);
  const [focus, setFocus] = useState<JourneyFocus>(defaults.focus);
  const [intensity, setIntensity] = useState<JourneyIntensity>(defaults.intensity);
  const [pace, setPace] = useState<JourneyPace>(defaults.pace);
  const [scriptStartTiming, setScriptStartTiming] = useState<ScriptStartTiming>(defaults.scriptStartTiming);
  const [primaryGoal, setPrimaryGoal] = useState<JourneyGoal>(defaults.primaryGoal);
  const [timeframe, setTimeframe] = useState<JourneyTimeframe>(defaults.timeframe);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(defaults.sessionsPerWeek);
  const [sessionMinutes, setSessionMinutes] = useState(defaults.sessionMinutes);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  useEffect(() => {
    setLevel(defaults.level);
    setFocus(defaults.focus);
    setIntensity(defaults.intensity);
    setPace(defaults.pace);
    setScriptStartTiming(defaults.scriptStartTiming);
    setPrimaryGoal(defaults.primaryGoal);
    setTimeframe(defaults.timeframe);
    setSessionsPerWeek(defaults.sessionsPerWeek);
    setSessionMinutes(defaults.sessionMinutes);
  }, [
    defaults.focus,
    defaults.intensity,
    defaults.level,
    defaults.pace,
    defaults.primaryGoal,
    defaults.scriptStartTiming,
    defaults.sessionMinutes,
    defaults.sessionsPerWeek,
    defaults.timeframe,
    selectedLanguage.code,
  ]);

  const isScriptLanguage = ['zh', 'ja', 'ko', 'ru', 'ar'].includes(selectedLanguage.code);
  const currentLevel = levelDetails[level];
  const currentFocus = focusDetails[focus];
  const currentIntensity = intensityDetails[intensity];
  const currentPace = paceDetails[pace];
  const currentScriptTiming = scriptTimingDetails[scriptStartTiming];
  const estimatedWeeklyMinutes = sessionsPerWeek * sessionMinutes;

  if (languages.length === 0) {
    return (
      <PageContent width="narrow" className="flex min-h-[85vh] flex-col justify-center pb-10">
        <SpotlightCard className="p-7 md:p-8">
          <div className="mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-200">English-first setup</p>
            <h1 className="mt-2 text-[32px] font-bold leading-tight text-white">Which languages do you want to learn?</h1>
            <p className="mt-2 max-w-2xl text-[14px] text-dim">
              English is the app language and will not appear as a learning language. Choose at least one language to build your learning plan.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {languageCatalog.map((language) => {
              const selected = selectedCodes.includes(language.code);
              return (
                <button
                  key={language.code}
                  type="button"
                  onClick={() =>
                    setSelectedCodes((current) =>
                      selected
                        ? current.filter((code) => code !== language.code)
                        : [...current, language.code],
                    )
                  }
                  className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition-colors ${
                    selected
                      ? 'border-indigo-400/60 bg-indigo-500/20'
                      : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-3xl">{language.flag}</span>
                    <span>
                      <span className="block text-[15px] font-semibold text-white">{language.name}</span>
                      <span className="text-[11px] uppercase tracking-wider text-dim">{language.code}</span>
                    </span>
                  </span>
                  <span className={`h-5 w-5 rounded-full border ${selected ? 'border-indigo-300 bg-indigo-400' : 'border-white/25'}`} />
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-sm text-dim">
              {selectedCodes.length === 0 ? 'Select at least one language to continue.' : `${selectedCodes.length} selected`}
            </p>
            <button
              type="button"
              disabled={selectedCodes.length === 0}
              className="page-primary-action disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => {
                const added = addLanguages(selectedCodes);
                if (added.length > 0) {
                  navigate(`/language-setup?lang=${added[0]}`, { replace: true });
                }
              }}
            >
              Continue
            </button>
          </div>
        </SpotlightCard>
      </PageContent>
    );
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const difficulty: DifficultyPreference = pace === 'gentler' ? 'easier' : pace === 'harder' ? 'harder' : 'standard';

    completeOnboarding(selectedLanguage.code, {
      level,
      focus,
      intensity,
      pace,
      difficulty,
      scriptStartTiming,
      primaryGoal,
      timeframe,
      sessionsPerWeek,
      sessionMinutes,
    });

    const nextLanguage = languages.find(
      (language) =>
        language.code !== selectedLanguage.code
        && !getSettings(language.code).onboardingCompleted,
    );
    navigate(
      nextLanguage
        ? `/language-setup?lang=${nextLanguage.code}`
        : `/language-welcome?lang=${selectedLanguage.code}`,
    );
  };

  return (
    <PageContent width="narrow" className="flex min-h-[85vh] flex-col justify-center pb-10">
      <SpotlightCard className="relative px-7 py-7 md:px-8 md:py-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-10 -right-6 select-none text-[150px] leading-none opacity-[0.11] blur-[0.2px] md:text-[220px]"
        >
          {selectedLanguage.flag}
        </div>

        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-100">
              <span className="text-[14px] leading-none">{selectedLanguage.flag}</span>
              {selectedLanguage.name} learning profile
            </div>
            <h1 className="text-[32px] font-bold leading-tight text-white">Set up {selectedLanguage.name}</h1>
            <p className="max-w-[780px] text-[14px] text-dim">
              Configure how you want this journey to feel. These choices tune lesson difficulty, pacing, and daily workload from your first session.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.13em] text-dim">Estimated weekly time</p>
              <p className="mt-1 text-[18px] font-semibold text-white">{estimatedWeeklyMinutes} min</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.13em] text-dim">Session rhythm</p>
              <p className="mt-1 text-[18px] font-semibold text-white">{sessionsPerWeek} sessions/week</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.13em] text-dim">Current focus mode</p>
              <p className="mt-1 text-[18px] font-semibold text-white">{currentFocus.label}</p>
            </div>
          </div>

          <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <div className="rounded-2xl border border-white/10 bg-black/15 p-4 flex flex-col">
              <label className="flex-1 flex flex-col">
                <span className="mb-1 block text-[12px] font-semibold text-indigo-100">Rough level</span>
                <span className="mb-3 block text-[12px] text-dim flex-1">{currentLevel.detail}</span>
                <select value={level} onChange={(event) => setLevel(event.target.value as JourneyLevel)} className="select-custom w-full rounded-xl border border-white/10 bg-black/25 pl-3 py-2.5 text-sm text-white cursor-pointer hover:bg-black/40 transition-colors">
                  <option className="bg-slate-900" value="complete_beginner">Complete beginner</option>
                  <option className="bg-slate-900" value="beginner">Beginner</option>
                  <option className="bg-slate-900" value="lower_intermediate">Lower intermediate</option>
                  <option className="bg-slate-900" value="intermediate_plus">Intermediate+</option>
                </select>
              </label>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/15 p-4 flex flex-col">
              <label className="flex-1 flex flex-col">
                <span className="mb-1 block text-[12px] font-semibold text-indigo-100">Primary goal</span>
                <span className="mb-3 block text-[12px] text-dim flex-1">Used to prioritize curriculum topics and measure relevant progress.</span>
                <select value={primaryGoal} onChange={(event) => setPrimaryGoal(event.target.value as JourneyGoal)} className="select-custom w-full rounded-xl border border-white/10 bg-black/25 pl-3 py-2.5 text-sm text-white">
                  <option className="bg-slate-900" value="conversation">Everyday conversation</option>
                  <option className="bg-slate-900" value="travel">Travel</option>
                  <option className="bg-slate-900" value="career">Career and work</option>
                  <option className="bg-slate-900" value="study">School or study</option>
                  <option className="bg-slate-900" value="exam">Exam preparation</option>
                  <option className="bg-slate-900" value="culture">Media and culture</option>
                </select>
              </label>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/15 p-4 flex flex-col">
              <label className="flex-1 flex flex-col">
                <span className="mb-1 block text-[12px] font-semibold text-indigo-100">Target timeframe</span>
                <span className="mb-3 block text-[12px] text-dim flex-1">Helps set milestones without inventing unrealistic fluency promises.</span>
                <select value={timeframe} onChange={(event) => setTimeframe(event.target.value as JourneyTimeframe)} className="select-custom w-full rounded-xl border border-white/10 bg-black/25 pl-3 py-2.5 text-sm text-white">
                  <option className="bg-slate-900" value="relaxed">No deadline</option>
                  <option className="bg-slate-900" value="three_months">3 months</option>
                  <option className="bg-slate-900" value="six_months">6 months</option>
                  <option className="bg-slate-900" value="one_year">1 year</option>
                </select>
              </label>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/15 p-4 flex flex-col">
              <label className="flex-1 flex flex-col">
                <span className="mb-1 block text-[12px] font-semibold text-indigo-100">Study days per week</span>
                <span className="mb-3 block text-[12px] text-dim flex-1">Used for weekly goals, streak expectations, and workload planning.</span>
                <select value={sessionsPerWeek} onChange={(event) => setSessionsPerWeek(Number(event.target.value))} className="select-custom w-full rounded-xl border border-white/10 bg-black/25 pl-3 py-2.5 text-sm text-white">
                  {[2, 3, 4, 5, 6, 7].map((days) => <option className="bg-slate-900" key={days} value={days}>{days} days</option>)}
                </select>
              </label>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/15 p-4 flex flex-col">
              <label className="flex-1 flex flex-col">
                <span className="mb-1 block text-[12px] font-semibold text-indigo-100">Typical session length</span>
                <span className="mb-3 block text-[12px] text-dim flex-1">Tunes lesson size and daily-plan estimates.</span>
                <select value={sessionMinutes} onChange={(event) => setSessionMinutes(Number(event.target.value))} className="select-custom w-full rounded-xl border border-white/10 bg-black/25 pl-3 py-2.5 text-sm text-white">
                  {[10, 15, 20, 30, 45].map((minutes) => <option className="bg-slate-900" key={minutes} value={minutes}>{minutes} minutes</option>)}
                </select>
              </label>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/15 p-4 flex flex-col">
              <label className="flex-1 flex flex-col">
                <span className="mb-1 block text-[12px] font-semibold text-indigo-100">What matters most right now?</span>
                <span className="mb-3 block text-[12px] text-dim flex-1">{currentFocus.detail}</span>
                <select value={focus} onChange={(event) => setFocus(event.target.value as JourneyFocus)} className="select-custom w-full rounded-xl border border-white/10 bg-black/25 pl-3 py-2.5 text-sm text-white cursor-pointer hover:bg-black/40 transition-colors">
                  <option className="bg-slate-900" value="speaking">Speaking</option>
                  <option className="bg-slate-900" value="understanding">Understanding</option>
                  <option className="bg-slate-900" value="reading">Reading</option>
                  <option className="bg-slate-900" value="writing">Writing</option>
                  <option className="bg-slate-900" value="balanced">Balanced</option>
                </select>
              </label>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/15 p-4 flex flex-col">
              <label className="flex-1 flex flex-col">
                <span className="mb-1 block text-[12px] font-semibold text-indigo-100">Daily intensity</span>
                <span className="mb-3 block text-[12px] text-dim flex-1">{currentIntensity.detail}</span>
                <select value={intensity} onChange={(event) => setIntensity(event.target.value as JourneyIntensity)} className="select-custom w-full rounded-xl border border-white/10 bg-black/25 pl-3 py-2.5 text-sm text-white cursor-pointer hover:bg-black/40 transition-colors">
                  <option className="bg-slate-900" value="very_light">Very light</option>
                  <option className="bg-slate-900" value="normal">Normal</option>
                  <option className="bg-slate-900" value="serious">Serious</option>
                </select>
              </label>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/15 p-4 flex flex-col">
              <label className="flex-1 flex flex-col">
                <span className="mb-1 block text-[12px] font-semibold text-indigo-100">Pace</span>
                <span className="mb-3 block text-[12px] text-dim flex-1">{currentPace.detail}</span>
                <select value={pace} onChange={(event) => setPace(event.target.value as JourneyPace)} className="select-custom w-full rounded-xl border border-white/10 bg-black/25 pl-3 py-2.5 text-sm text-white cursor-pointer hover:bg-black/40 transition-colors">
                  <option className="bg-slate-900" value="gentler">Gentler</option>
                  <option className="bg-slate-900" value="standard">Standard</option>
                  <option className="bg-slate-900" value="harder">Harder</option>
                </select>
              </label>
            </div>

            {isScriptLanguage && (
              <div className="rounded-2xl border border-white/10 bg-black/15 p-4 flex flex-col sm:col-span-2">
                <label className="flex-1 flex flex-col">
                  <span className="mb-1 block text-[12px] font-semibold text-indigo-100">Script-writing timing</span>
                  <span className="mb-3 block text-[12px] text-dim flex-1">{currentScriptTiming.detail}</span>
                  <select value={scriptStartTiming} onChange={(event) => setScriptStartTiming(event.target.value as ScriptStartTiming)} className="select-custom w-full rounded-xl border border-white/10 bg-black/25 pl-3 py-2.5 text-sm text-white cursor-pointer hover:bg-black/40 transition-colors sm:w-1/2">
                    <option className="bg-slate-900" value="start_now">Start script-writing now</option>
                    <option className="bg-slate-900" value="start_later">Start later</option>
                    <option className="bg-slate-900" value="start_gradually">Start gradually</option>
                  </select>
                </label>
              </div>
            )}

            <div className="sm:col-span-2 mt-2">
              <button type="submit" className="page-primary-action cursor-pointer hover:opacity-90 transition-opacity">
                Continue
              </button>
            </div>
          </form>
        </div>
      </SpotlightCard>
    </PageContent>
  );
}
