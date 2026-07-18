import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SpotlightCard } from '../components/ui/SpotlightCard';
import { PageContent } from '../components/layout/PageLayout';
import {
  DifficultyPreference,
  JourneyFocus,
  JourneyIntensity,
  JourneyLevel,
  JourneyPace,
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
  const { activeLanguage, setActiveLanguage, languages } = useLanguage();
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

  useEffect(() => {
    setLevel(defaults.level);
    setFocus(defaults.focus);
    setIntensity(defaults.intensity);
    setPace(defaults.pace);
    setScriptStartTiming(defaults.scriptStartTiming);
  }, [defaults.focus, defaults.intensity, defaults.level, defaults.pace, defaults.scriptStartTiming, selectedLanguage.code]);

  const isScriptLanguage = selectedLanguage.code === 'zh' || selectedLanguage.code === 'ja';
  const currentLevel = levelDetails[level];
  const currentFocus = focusDetails[focus];
  const currentIntensity = intensityDetails[intensity];
  const currentPace = paceDetails[pace];
  const currentScriptTiming = scriptTimingDetails[scriptStartTiming];
  const estimatedSessionsPerWeek = Math.max(3, Math.round(currentIntensity.weeklyMinutes / 25));

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
    });

    navigate(`/language-welcome?lang=${selectedLanguage.code}`);
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
              <p className="mt-1 text-[18px] font-semibold text-white">{currentIntensity.weeklyMinutes} min</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.13em] text-dim">Session rhythm</p>
              <p className="mt-1 text-[18px] font-semibold text-white">{estimatedSessionsPerWeek} sessions/week</p>
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
