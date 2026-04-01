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
import { useLanguage } from '../contexts/LanguageContext';

export default function LanguageSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeLanguage, setActiveLanguage, languages } = useLanguage();
  const { getSettings, completeOnboarding } = useLanguageJourney();

  const langFromQuery = (searchParams.get('lang') ?? '').trim().toLowerCase();
  const selectedLanguage = useMemo(() => {
    if (langFromQuery && languages.some((language) => language.code === langFromQuery)) {
      return languages.find((language) => language.code === langFromQuery) ?? activeLanguage;
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
      <SpotlightCard className="p-6">
        <h1 className="text-[28px] font-bold text-white">Set up {selectedLanguage.name}</h1>
        <p className="mt-2 text-[14px] text-dim">
          Quick setup so the app can generate a gentler, progress-based start for this language.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-[12px] text-dim">Rough level</span>
            <select value={level} onChange={(event) => setLevel(event.target.value as JourneyLevel)} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white">
              <option value="complete_beginner">Complete beginner</option>
              <option value="beginner">Beginner</option>
              <option value="lower_intermediate">Lower intermediate</option>
              <option value="intermediate_plus">Intermediate+</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[12px] text-dim">What matters most right now?</span>
            <select value={focus} onChange={(event) => setFocus(event.target.value as JourneyFocus)} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white">
              <option value="speaking">Speaking</option>
              <option value="understanding">Understanding</option>
              <option value="reading">Reading</option>
              <option value="writing">Writing</option>
              <option value="balanced">Balanced</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[12px] text-dim">Daily intensity</span>
            <select value={intensity} onChange={(event) => setIntensity(event.target.value as JourneyIntensity)} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white">
              <option value="very_light">Very light</option>
              <option value="normal">Normal</option>
              <option value="serious">Serious</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[12px] text-dim">Pace</span>
            <select value={pace} onChange={(event) => setPace(event.target.value as JourneyPace)} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white">
              <option value="gentler">Gentler</option>
              <option value="standard">Standard</option>
              <option value="harder">Harder</option>
            </select>
          </label>

          {isScriptLanguage && (
            <label className="block">
              <span className="mb-1 block text-[12px] text-dim">Script-writing timing</span>
              <select value={scriptStartTiming} onChange={(event) => setScriptStartTiming(event.target.value as ScriptStartTiming)} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white">
                <option value="start_now">Start script-writing now</option>
                <option value="start_later">Start later</option>
                <option value="start_gradually">Start gradually</option>
              </select>
            </label>
          )}

          <button type="submit" className="page-primary-action">Continue</button>
        </form>
      </SpotlightCard>
    </PageContent>
  );
}