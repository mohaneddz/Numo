import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageContent } from '../components/layout/PageLayout';
import { SpotlightCard } from '../components/ui/SpotlightCard';
import { useLanguage } from '../contexts/LanguageContext';
import { useLanguageJourney } from '../contexts/LanguageJourneyContext';

function welcomeText(languageCode: string): { focus: string; guidance: string; firstWin: string } {
  if (languageCode === 'de') {
    return {
      focus: 'You will start with survival basics, useful patterns, and soft grammar layering.',
      guidance: 'Speaking starts early but gently. Grammar depth comes in layers, not in one heavy block.',
      firstWin: 'Your first session is under 10 minutes and designed to be winnable.',
    };
  }
  if (languageCode === 'zh') {
    return {
      focus: 'You will start with useful words, recognition, pronunciation, and tones in small steps.',
      guidance: 'Script writing opens gradually based on your setup preference and early evidence.',
      firstWin: 'You will complete one tiny production action in your first session.',
    };
  }
  if (languageCode === 'ja') {
    return {
      focus: 'You will start with high-frequency language patterns and practical beginner recognition.',
      guidance: 'Script-writing is tracked separately and unlocks progressively from observe to recall.',
      firstWin: 'Your first session aims for confidence, not volume.',
    };
  }
  if (languageCode === 'fr') {
    return {
      focus: 'You will stabilize core patterns and repair weak points without fake beginner repetition.',
      guidance: 'The daily plan focuses on real usage and practical reinforcement.',
      firstWin: 'Your first session closes with a clear success and next step.',
    };
  }
  return {
    focus: 'You will start with practical high-frequency language and a gentle difficulty ramp.',
    guidance: 'The app unlocks features by progress evidence, not by elapsed days.',
    firstWin: 'Your first session is short, guided, and designed for an early win.',
  };
}

export default function LanguageWelcomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeLanguage, languages, setActiveLanguage } = useLanguage();
  const { markWelcomeSeen } = useLanguageJourney();

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

  const copy = welcomeText(selectedLanguage.code);

  return (
    <PageContent width="narrow" className="flex min-h-[85vh] flex-col justify-center pb-10">
      <SpotlightCard className="p-6">
        <h1 className="text-[28px] font-bold text-white">Welcome to {selectedLanguage.name}</h1>
        <p className="mt-3 text-[14px] text-dim">{copy.focus}</p>
        <p className="mt-2 text-[14px] text-dim">{copy.guidance}</p>
        <p className="mt-2 text-[14px] text-dim">{copy.firstWin}</p>

        <div className="mt-6 grid gap-2">
          <p className="text-[13px] text-mist">First stage success looks like:</p>
          <p className="text-[13px] text-dim">1. Complete one tiny guided session.</p>
          <p className="text-[13px] text-dim">2. Create first real evidence.</p>
          <p className="text-[13px] text-dim">3. Unlock next study surfaces by progress.</p>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            className="page-primary-action"
            onClick={() => {
              markWelcomeSeen(selectedLanguage.code);
              navigate('/learn');
            }}
          >
            Start First Session
          </button>
          <button
            className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => {
              markWelcomeSeen(selectedLanguage.code);
              navigate('/');
            }}
          >
            Go Home
          </button>
        </div>
      </SpotlightCard>
    </PageContent>
  );
}