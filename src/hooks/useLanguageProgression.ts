import { useMemo } from 'react';
import { useAppData } from '../contexts/AppDataContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useLanguageJourney } from '../contexts/LanguageJourneyContext';

type UnlockSurface = 'review' | 'speak' | 'write' | 'insights' | 'script_practice';

export interface SurfaceLockState {
  unlocked: boolean;
  title: string;
  whyLocked: string;
  unlocksWhen: string;
  nextAction: string;
}

export interface TodayPlanItem {
  id: string;
  label: string;
  modality: 'review' | 'input' | 'output' | 'reinforcement' | 'bonus';
  required: boolean;
  estimatedMinutes: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hasScriptLanguage(languageCode: string): boolean {
  return languageCode === 'zh' || languageCode === 'ja';
}

export function useLanguageProgression() {
  const { activeLanguage } = useLanguage();
  const { state, dueCount, flashCardCount } = useAppData();
  const { getSettings } = useLanguageJourney();

  return useMemo(() => {
    const settings = getSettings(activeLanguage.code);

    const speakingAttempts = state.speakingRuns.length;
    const writingAttempts = state.writingDrafts.length;
    const reviewItems = flashCardCount;
    const dueItems = dueCount;
    const firstEvidenceCount = speakingAttempts + writingAttempts + reviewItems;
    const hasFirstEvidence = firstEvidenceCount > 0;

    const reviewUnlocked = reviewItems > 0;
    const speakUnlocked = hasFirstEvidence && (reviewItems >= 3 || writingAttempts > 0 || speakingAttempts > 0);
    const writeUnlocked = hasFirstEvidence && (reviewItems >= 2 || speakingAttempts > 0 || writingAttempts > 0);
    const insightsUnlocked = firstEvidenceCount >= 3;

    const scriptSupported = hasScriptLanguage(activeLanguage.code);
    const scriptUnlocked = scriptSupported
      && (
        settings.scriptStartTiming === 'start_now'
        || (settings.scriptStartTiming === 'start_gradually' && reviewItems >= 6)
        || (settings.scriptStartTiming === 'start_later' && reviewItems >= 10)
      );

    const lockStates: Record<UnlockSurface, SurfaceLockState> = {
      review: {
        unlocked: reviewUnlocked,
        title: 'No review for this language yet',
        whyLocked: 'You have not built enough study evidence to generate a review queue.',
        unlocksWhen: 'Finish your first guided lesson and create your first review items.',
        nextAction: 'Go to Learn and finish one short guided session.',
      },
      speak: {
        unlocked: speakUnlocked,
        title: 'Speaking practice is not ready yet',
        whyLocked: 'You need a little more input and core phrases before speaking drills become useful.',
        unlocksWhen: 'Complete one guided lesson and build a small review base.',
        nextAction: 'Do one Learn session, then return to unlock light speaking drills.',
      },
      write: {
        unlocked: writeUnlocked,
        title: 'Writing practice is not ready yet',
        whyLocked: 'The app is waiting for a small input base before production writing.',
        unlocksWhen: 'Complete early guided learning and create first review evidence.',
        nextAction: 'Start with Learn, then write your first short response.',
      },
      insights: {
        unlocked: insightsUnlocked,
        title: 'No real progress data yet',
        whyLocked: 'There is not enough evidence to show stable insight patterns yet.',
        unlocksWhen: 'Complete a few activities across Learn/Review/Speak/Write.',
        nextAction: 'Complete 3+ short activities, then insights unlock automatically.',
      },
      script_practice: {
        unlocked: scriptUnlocked,
        title: 'Script writing is not unlocked yet',
        whyLocked: scriptSupported
          ? 'First build recognition and sound links, then writing practice opens.'
          : 'This language does not use script-practice mode.',
        unlocksWhen: scriptSupported
          ? 'Build early recognition evidence, or set script start to immediate in onboarding.'
          : 'Switch to Chinese or Japanese to access script practice.',
        nextAction: scriptSupported
          ? 'Continue guided early lessons to unlock trace and guided draw modes.'
          : 'Select Chinese or Japanese to use script-practice workflows.',
      },
    };

    const densityFactor = settings.difficulty === 'easier' ? 0.8 : settings.difficulty === 'harder' ? 1.2 : 1;
    const targetMinutes = clamp(Math.round(settings.sessionMinutes * densityFactor), 10, 45);

    const todayPlan: TodayPlanItem[] = [
      {
        id: 'warmup_review',
        label: reviewUnlocked && dueItems > 0 ? `Warm-up review (${Math.min(8, dueItems)} cards)` : 'Starter recall warm-up',
        modality: 'review',
        required: true,
        estimatedMinutes: reviewUnlocked ? 5 : 3,
      },
      {
        id: 'guided_input',
        label: hasFirstEvidence ? 'Guided reading/listening input' : 'Tiny guided first input',
        modality: 'input',
        required: true,
        estimatedMinutes: 6,
      },
      {
        id: 'guided_output',
        label: speakUnlocked || writeUnlocked ? 'One focused output drill' : 'One tiny production action',
        modality: 'output',
        required: true,
        estimatedMinutes: 5,
      },
      {
        id: 'reinforcement',
        label: 'Quick recap reinforcement',
        modality: 'reinforcement',
        required: true,
        estimatedMinutes: 4,
      },
      {
        id: 'bonus',
        label: 'Optional bonus practice',
        modality: 'bonus',
        required: false,
        estimatedMinutes: 6,
      },
    ];

    const requiredItems = todayPlan.filter((item) => item.required);
    const requiredMinutes = requiredItems.reduce((sum, item) => sum + item.estimatedMinutes, 0);
    const optionalMinutes = todayPlan.filter((item) => !item.required).reduce((sum, item) => sum + item.estimatedMinutes, 0);

    return {
      settings,
      onboardingCompleted: settings.onboardingCompleted,
      welcomeSeen: settings.welcomeSeen,
      hasFirstEvidence,
      firstEvidenceCount,
      dueItems,
      lockStates,
      todayPlan,
      requiredMinutes,
      optionalMinutes,
      targetMinutes,
      recommendedNextAction: !hasFirstEvidence
        ? { label: 'Start first guided lesson', to: '/learn' }
        : !reviewUnlocked
          ? { label: 'Create review evidence', to: '/learn' }
          : dueItems > 0
            ? { label: 'Complete due review', to: '/review' }
            : !speakUnlocked
              ? { label: 'Unlock speaking with one lesson', to: '/learn' }
              : { label: 'Continue daily plan', to: '/learn' },
    };
  }, [activeLanguage.code, dueCount, flashCardCount, getSettings, state.speakingRuns.length, state.writingDrafts.length]);
}
