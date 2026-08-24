import { useMemo } from 'react';
import { useAppData } from '../contexts/AppDataContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useLanguageJourney } from '../contexts/LanguageJourneyContext';
import { useCurriculumState } from './useCurriculumState';

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
  /** Route that actually runs this item. */
  to: string;
  done: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hasScriptLanguage(languageCode: string): boolean {
  return languageCode === 'zh' || languageCode === 'ja';
}

/** Maps a checkpoint step kind onto the plan's modality vocabulary. */
const STEP_MODALITY: Record<string, TodayPlanItem['modality']> = {
  rule: 'input',
  vocabulary: 'input',
  listening: 'input',
  exercise: 'reinforcement',
  speaking: 'output',
  review: 'review',
};

/**
 * Cross-app progression: what is unlocked, and what today's plan actually is.
 *
 * `todayPlan` used to be a hardcoded five-item list — "Warm-up review", "Guided
 * reading/listening input", "One focused output drill", "Quick recap
 * reinforcement", "Optional bonus practice" — with fixed minute costs, identical
 * for every learner in every language, and no route attached to any of it. None of
 * those items corresponded to anything the app could run.
 *
 * The plan is now the remaining steps of the checkpoint the learner is on, each
 * with its real duration and a link that starts it.
 */
export function useLanguageProgression() {
  const { activeLanguage } = useLanguage();
  const { state, dueCount, flashCardCount } = useAppData();
  const { getSettings } = useLanguageJourney();
  const curriculum = useCurriculumState();

  const roadmap = curriculum.roadmap;
  const nextStep = curriculum.nextStep;
  const minutesToday = curriculum.minutesToday;
  const totalMinutes = curriculum.progression.totalMinutes;
  const completedStepCount = curriculum.progression.completedStepIds.length;

  return useMemo(() => {
    const settings = getSettings(activeLanguage.code);

    const speakingAttempts = state.speakingRuns.length;
    const writingAttempts = state.writingDrafts.length;
    const reviewItems = flashCardCount;
    const dueItems = dueCount;

    // Finishing guided steps is real evidence too; previously only review items,
    // speaking runs and writing drafts counted, so a learner who had completed
    // several lessons could still be told they had no evidence at all.
    const firstEvidenceCount = speakingAttempts + writingAttempts + reviewItems + completedStepCount;
    const hasFirstEvidence = firstEvidenceCount > 0;

    const reviewUnlocked = reviewItems > 0;
    const speakUnlocked = hasFirstEvidence && (reviewItems >= 3 || writingAttempts > 0 || speakingAttempts > 0 || completedStepCount >= 2);
    const writeUnlocked = hasFirstEvidence && (reviewItems >= 2 || speakingAttempts > 0 || writingAttempts > 0 || completedStepCount >= 2);
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

    // The plan is the current checkpoint's steps, so every row is something the
    // learner can actually click and finish.
    const currentCheckpoint = roadmap?.checkpoints.find((checkpoint) => checkpoint.status === 'available') ?? null;
    const todayPlan: TodayPlanItem[] = (currentCheckpoint?.steps ?? []).map((step) => ({
      id: step.id,
      label: step.title,
      modality: STEP_MODALITY[step.kind] ?? 'reinforcement',
      required: step.kind !== 'speaking' || speakUnlocked,
      estimatedMinutes: step.estimatedMinutes,
      to: `/learn/session?stepId=${encodeURIComponent(step.id)}`,
      done: step.status === 'completed',
    }));

    if (dueItems > 0) {
      todayPlan.unshift({
        id: 'due-review',
        label: `Clear ${dueItems} due ${dueItems === 1 ? 'card' : 'cards'}`,
        modality: 'review',
        required: true,
        estimatedMinutes: Math.max(2, Math.round(dueItems * 0.4)),
        to: '/review/session?mode=due-now',
        done: false,
      });
    }

    const requiredItems = todayPlan.filter((item) => item.required);
    const requiredMinutes = requiredItems.reduce((sum, item) => sum + item.estimatedMinutes, 0);
    const optionalMinutes = todayPlan.filter((item) => !item.required).reduce((sum, item) => sum + item.estimatedMinutes, 0);
    const completedPlanItems = todayPlan.filter((item) => item.done).length;

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
      /** Minutes studied today, from recorded sessions. */
      minutesToday,
      totalMinutes,
      completedPlanItems,
      /**
       * Progress against today's goal. The sidebar previously showed lifetime
       * evidence count over a fixed four "required blocks", so it pinned at 100%
       * after four activities and never moved again.
       */
      todayProgressPercent: targetMinutes > 0 ? Math.min(100, Math.round((minutesToday / targetMinutes) * 100)) : 0,
      recommendedNextAction: dueItems > 0
        ? { label: 'Clear due review', to: '/review/session?mode=due-now' }
        : nextStep
          ? { label: nextStep.step.title, to: `/learn/session?stepId=${encodeURIComponent(nextStep.step.id)}` }
          : { label: 'Open the learning path', to: '/learn' },
    };
  }, [
    activeLanguage.code,
    completedStepCount,
    dueCount,
    flashCardCount,
    getSettings,
    minutesToday,
    nextStep,
    roadmap,
    state.speakingRuns.length,
    state.writingDrafts.length,
    totalMinutes,
  ]);
}
