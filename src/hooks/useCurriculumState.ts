import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProfileSession } from '../contexts/ProfileSessionContext';
import { useLanguageJourney } from '../contexts/LanguageJourneyContext';
import {
  aggregateProgress,
  buildRoadmap,
  createInitialProgression,
  currentStreak,
  getThemeByOrder,
  getThemeSkills,
  loadProgression,
  loadSkillMastery,
  longestStreak,
  minutesToday,
  nextAvailableStep,
  recordCheckpointCompletion,
  recordSkillOutcomes,
  recordStepCompletion,
  selectWeakSkills,
  setActiveThemeSelection,
  summarizeCategories,
  THEMES,
  unlockedEverdarkLevel,
  type ProgressionState,
  type Roadmap,
  type SkillMasteryMap,
  type SkillOutcome,
} from '../services/curriculum';

/**
 * Single source of truth for curriculum state in the UI.
 *
 * Home and Learn each used to invent their own numbers: the Learn page recomputed a
 * synthetic roadmap on every render with everything locked, while Home read an
 * in-memory `CurriculumContext` that was never populated outside a debug button.
 * Both now read the same persisted progression and mastery.
 */
export function useCurriculumState() {
  const { activeLanguage } = useLanguage();
  const { activeProfile } = useProfileSession();
  const { getSettings } = useLanguageJourney();

  const learnerId = activeProfile?.id ?? null;
  const languageCode = activeLanguage.code;

  const [progression, setProgression] = useState<ProgressionState>(createInitialProgression);
  const [mastery, setMastery] = useState<SkillMasteryMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!learnerId) {
      setProgression(createInitialProgression());
      setMastery({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const [nextProgression, nextMastery] = await Promise.all([
        loadProgression(learnerId, languageCode),
        loadSkillMastery(learnerId, languageCode),
      ]);
      if (cancelled) return;
      setProgression(nextProgression);
      setMastery(nextMastery);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [languageCode, learnerId]);

  const settings = getSettings(languageCode);

  const selectedTheme = useMemo(
    () => getThemeByOrder(progression.currentThemeOrder) ?? THEMES[0],
    [progression.currentThemeOrder],
  );

  const roadmap: Roadmap | null = useMemo(
    () =>
      buildRoadmap({
        themeOrder: progression.currentThemeOrder,
        everdarkLevel: progression.currentEverdarkLevel,
        languageCode,
        progression,
      }),
    [languageCode, progression],
  );

  /** Every skill from the current theme and all earlier ones. */
  const seenSkills = useMemo(
    () =>
      THEMES.filter((theme) => theme.order <= progression.currentThemeOrder).flatMap((theme) =>
        getThemeSkills(theme.id, languageCode),
      ),
    [languageCode, progression.currentThemeOrder],
  );

  const focusAreas = useMemo(() => summarizeCategories(mastery, seenSkills), [mastery, seenSkills]);
  const weakSkills = useMemo(() => selectWeakSkills(mastery, seenSkills, 5), [mastery, seenSkills]);
  const themeProgress = useMemo(
    () => aggregateProgress(mastery, getThemeSkills(selectedTheme.id, languageCode)),
    [languageCode, mastery, selectedTheme.id],
  );
  const overallProgress = useMemo(() => aggregateProgress(mastery, seenSkills), [mastery, seenSkills]);

  const selectTheme = useCallback(
    async (themeOrder: number) => {
      if (!learnerId) return;
      if (themeOrder > progression.unlockedThemeOrder) return;
      const theme = getThemeByOrder(themeOrder);
      if (!theme) return;
      const level = Math.min(progression.currentEverdarkLevel, unlockedEverdarkLevel(progression, theme.id));
      setProgression(await setActiveThemeSelection(learnerId, languageCode, { themeOrder, everdarkLevel: level }));
    },
    [languageCode, learnerId, progression],
  );

  const selectEverdarkLevel = useCallback(
    async (level: number) => {
      if (!learnerId) return;
      if (level > unlockedEverdarkLevel(progression, selectedTheme.id)) return;
      setProgression(
        await setActiveThemeSelection(learnerId, languageCode, {
          themeOrder: progression.currentThemeOrder,
          everdarkLevel: level,
        }),
      );
    },
    [languageCode, learnerId, progression, selectedTheme.id],
  );

  /** Records a finished step: skill outcomes, study time, and checkpoint rollup. */
  const completeStep = useCallback(
    async (input: { stepId: string; minutes: number; outcomes: SkillOutcome[] }) => {
      if (!learnerId) return;

      const nextMastery = await recordSkillOutcomes(learnerId, languageCode, input.outcomes);
      setMastery(nextMastery);

      let nextProgression = await recordStepCompletion(learnerId, languageCode, {
        stepId: input.stepId,
        minutes: input.minutes,
      });

      // If this completed the last step of its checkpoint, record the checkpoint too,
      // which is what unlocks the next one.
      const updatedRoadmap = buildRoadmap({
        themeOrder: nextProgression.currentThemeOrder,
        everdarkLevel: nextProgression.currentEverdarkLevel,
        languageCode,
        progression: nextProgression,
      });
      const checkpoint = updatedRoadmap?.checkpoints.find((candidate) =>
        candidate.steps.some((step) => step.id === input.stepId),
      );

      if (updatedRoadmap && checkpoint && checkpoint.steps.every((step) => step.status === 'completed')) {
        const scores = input.outcomes.map((outcome) => outcome.score);
        nextProgression = await recordCheckpointCompletion(learnerId, languageCode, {
          checkpointId: checkpoint.id,
          themeId: checkpoint.themeId,
          themeOrder: checkpoint.themeOrder,
          everdarkLevel: checkpoint.everdarkLevel,
          checkpointIndex: checkpoint.index,
          totalCheckpoints: updatedRoadmap.checkpoints.length,
          score: scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
          stepsCompleted: checkpoint.steps.length,
        });
      }

      setProgression(nextProgression);
    },
    [languageCode, learnerId],
  );

  return {
    loading,
    learnerId,
    languageCode,
    settings,
    progression,
    mastery,
    roadmap,
    selectedTheme,
    seenSkills,
    focusAreas,
    weakSkills,
    themeProgress,
    overallProgress,
    nextStep: roadmap ? nextAvailableStep(roadmap) : null,
    minutesToday: minutesToday(progression),
    currentStreak: currentStreak(progression),
    longestStreak: longestStreak(progression),
    selectTheme,
    selectEverdarkLevel,
    completeStep,
  };
}
