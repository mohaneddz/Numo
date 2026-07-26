import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppData } from '../../contexts/AppDataContext';
import { useCurriculumState } from '../../hooks/useCurriculumState';
import { resolveLearnExercise } from '../../components/exercises/learn/registry';
import type { LearnTaskPayload } from '../../components/exercises/learn/types';
import { EMPTY_DRAFT, type ExerciseDraft } from '../../components/exercises/shared/types';
import { UnsupportedExerciseCard } from '../../components/exercises/shared/UnsupportedExerciseCard';
import { ExerciseStateBanner } from '../../components/exercises/shared/ExerciseStateBanner';
import { ExerciseShell } from '../../components/exercises/shared/ExerciseShell';
import { ExerciseFeedbackCard } from '../../components/exercises/shared/ExerciseFeedbackCard';
import { buildExerciseFeedback, type ExerciseFeedbackModel } from '../../services/exercises/feedbackService';
import { hintPenalty } from '../../services/exercises/hintService';
import { updateExerciseSignals } from '../../services/exercises/exerciseSignalsService';
import { resolveExerciseByInternal } from '../../services/exercises/exerciseCatalog';
import { useProfileSession } from '../../contexts/ProfileSessionContext';
import {
  findStep,
  nextAvailableStep,
  planSession,
  prefetchTasks,
  resolveTasks,
  type ResolvedTask,
  type SkillOutcome,
} from '../../services/curriculum';

/** Per-task interaction state that feeds the learner model. */
interface TaskSupport {
  hintLevels: number;
  audioReplays: number;
}

const EMPTY_SUPPORT: TaskSupport = { hintLevels: 0, audioReplays: 0 };

export default function LearnSessionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeLanguage } = useLanguage();
  const { activeProfile } = useProfileSession();
  const { submitLearnTaskAttempt } = useAppData();
  const curriculum = useCurriculumState();

  const stepId = searchParams.get('stepId') ?? undefined;

  const [tasks, setTasks] = useState<ResolvedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [draft, setDraft] = useState<ExerciseDraft>(EMPTY_DRAFT);
  const [feedback, setFeedback] = useState<ExerciseFeedbackModel | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startedAtMs, setStartedAtMs] = useState(Date.now());
  const [support, setSupport] = useState<TaskSupport>(EMPTY_SUPPORT);
  const [outcomes, setOutcomes] = useState<SkillOutcome[]>([]);
  const [sessionStartedAt] = useState(Date.now());
  const [saved, setSaved] = useState(false);

  // The step is resolved from the roadmap, so a session always knows which
  // checkpoint step it belongs to. Previously the route carried no identity at all
  // and every session loaded the same first seeded lesson.
  const located = useMemo(() => {
    if (!curriculum.roadmap) return null;
    if (stepId) return findStep(curriculum.roadmap, stepId);
    return nextAvailableStep(curriculum.roadmap);
  }, [curriculum.roadmap, stepId]);

  const plan = useMemo(() => {
    if (!located || !curriculum.roadmap) return null;
    return planSession({
      step: located.step,
      themeId: curriculum.roadmap.theme.id,
      languageCode: activeLanguage.code,
      mastery: curriculum.mastery,
      policy: {
        languageCode: activeLanguage.code,
        level: curriculum.settings.level,
        difficulty: curriculum.settings.difficulty,
      },
    });
  }, [
    activeLanguage.code,
    curriculum.mastery,
    curriculum.roadmap,
    curriculum.settings.difficulty,
    curriculum.settings.level,
    located,
  ]);

  const prefetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (curriculum.loading) return;
    if (!plan) {
      setIsLoading(false);
      setLoadError(
        located
          ? 'This step has no practisable skills yet.'
          : 'That step is not available. Pick a checkpoint from the learning path.',
      );
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setCurrentIndex(0);
    setDraft(EMPTY_DRAFT);
    setFeedback(null);
    setOutcomes([]);
    setSaved(false);
    setStartedAtMs(Date.now());

    void (async () => {
      try {
        const resolved = await resolveTasks({
          blueprints: plan.blueprints,
          languageCode: activeLanguage.code,
          languageName: activeLanguage.name,
          variantSeed: `${plan.stepId}:${new Date().toDateString()}`,
        });
        if (cancelled) return;

        if (resolved.length === 0) {
          setLoadError('Could not build usable tasks for this step. Check your connection and try again.');
          return;
        }
        setTasks(resolved);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Failed to build this session.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeLanguage.code, activeLanguage.name, curriculum.loading, located, plan]);

  // Warm the next step's content while this one is being worked through, so the
  // following session opens from cache with no network wait.
  useEffect(() => {
    if (!curriculum.roadmap || !located) return;
    const upcoming = nextAvailableStep(curriculum.roadmap);
    if (!upcoming || upcoming.step.id === located.step.id) return;
    if (prefetchedRef.current === upcoming.step.id) return;
    prefetchedRef.current = upcoming.step.id;

    const upcomingPlan = planSession({
      step: upcoming.step,
      themeId: curriculum.roadmap.theme.id,
      languageCode: activeLanguage.code,
      mastery: curriculum.mastery,
      policy: {
        languageCode: activeLanguage.code,
        level: curriculum.settings.level,
        difficulty: curriculum.settings.difficulty,
      },
    });

    void prefetchTasks({
      blueprints: upcomingPlan.blueprints,
      languageCode: activeLanguage.code,
      languageName: activeLanguage.name,
    });
  }, [
    activeLanguage.code,
    activeLanguage.name,
    curriculum.mastery,
    curriculum.roadmap,
    curriculum.settings.difficulty,
    curriculum.settings.level,
    located,
  ]);

  const activeTask = tasks[currentIndex];
  const done = tasks.length > 0 && currentIndex >= tasks.length;
  const activeCatalog = activeTask ? resolveExerciseByInternal('learn', activeTask.blueprint.taskType) : null;

  const averageScore = useMemo(
    () =>
      outcomes.length > 0
        ? Math.round(outcomes.reduce((total, outcome) => total + outcome.score, 0) / outcomes.length)
        : 0,
    [outcomes],
  );

  const fallbackPayload = useMemo<LearnTaskPayload | null>(() => {
    if (!activeTask) return null;
    const { content, blueprint } = activeTask;
    return {
      languageCode: activeLanguage.code,
      promptText: content.prompt,
      expectedText: content.expectedAnswer,
      distractors: content.distractors,
      translation: content.translation,
      romanization: content.romanization,
      teachingNote: content.teachingNote,
      taskSeed: blueprint.id,
      options:
        Array.isArray(content.payload.options) && content.payload.options.length > 0
          ? undefined
          : content.distractors.length > 0
            ? [content.expectedAnswer, ...content.distractors].slice(0, 4)
            : undefined,
    };
  }, [activeLanguage.code, activeTask]);

  const activeExercise = useMemo(() => {
    if (!activeTask || !fallbackPayload) return null;
    return resolveLearnExercise(activeTask.blueprint.taskType, activeTask.content.payload, fallbackPayload);
  }, [activeTask, fallbackPayload]);

  useEffect(() => {
    setDraft(EMPTY_DRAFT);
    setFeedback(null);
    setSupport(EMPTY_SUPPORT);
    setStartedAtMs(Date.now());
  }, [activeTask?.blueprint.id]);

  const handleHintLevel = useCallback((level: number) => {
    setSupport((current) => ({ ...current, hintLevels: Math.max(current.hintLevels, level) }));
  }, []);

  const handleAudioReplay = useCallback((playCount: number) => {
    setSupport((current) => ({ ...current, audioReplays: playCount }));
  }, []);

  const recordOutcome = async (
    result: { correct: boolean; score: number },
    latencyMs: number,
    skipped: boolean,
  ) => {
    if (!activeTask) return;
    const { blueprint } = activeTask;

    setOutcomes((previous) => [
      ...previous,
      {
        skillId: blueprint.skillId,
        correct: result.correct,
        score: result.score,
        modality: blueprint.modality,
        latencyMs,
        hintUsed: support.hintLevels > 0,
        skipped,
      },
    ]);

    if (!activeProfile?.id) return;
    await updateExerciseSignals(activeProfile.id, activeLanguage.code, {
      wasCorrect: result.correct,
      latencyMs,
      hintUsed: support.hintLevels > 0,
      hoverUsed: 0,
      audioReplays: support.audioReplays,
      exerciseType: activeCatalog?.userKey ?? blueprint.taskType,
      recognitionDelta:
        blueprint.modality === 'recognition' || blueprint.modality === 'listening'
          ? result.correct
            ? 3
            : -3
          : 0,
      productionDelta:
        blueprint.modality === 'production' || blueprint.modality === 'writing'
          ? result.correct
            ? 3
            : -3
          : 0,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeTask || submitting || !activeExercise || !draft.ready) return;
    setSubmitting(true);
    const durationMs = Math.max(500, Date.now() - startedAtMs);

    try {
      const graded = await submitLearnTaskAttempt({
        lessonId: activeTask.blueprint.skillId,
        unitId: curriculum.roadmap?.theme.id ?? 'unknown-theme',
        objectiveId: located?.checkpoint.id ?? 'unknown-checkpoint',
        taskTemplateId: activeTask.blueprint.id,
        taskType: activeTask.blueprint.taskType,
        prompt: activeTask.content.prompt,
        expectedAnswer: activeTask.content.expectedAnswer,
        learnerAnswer: draft.canonicalAnswer,
        structuredResponse: draft.structuredResponse,
        payload: activeExercise.payload as Record<string, unknown>,
        gradingMode: activeExercise.grading,
        durationMs,
        languageCode: activeLanguage.code,
        skillId: activeTask.blueprint.skillId,
      });

      // Leaning on hints is allowed, but it should not read as unaided mastery.
      const penalty = hintPenalty(support.hintLevels);
      const score = Math.max(0, graded.score - penalty);
      const result = { correct: graded.correct, score };

      setFeedback(
        buildExerciseFeedback({
          correct: graded.correct,
          score,
          learnerAnswer: draft.canonicalAnswer,
          expectedAnswer: activeTask.content.expectedAnswer,
          why: penalty > 0 ? `${graded.feedback} (−${penalty}% for hints used)` : graded.feedback,
          teachingPoint: activeTask.content.teachingNote,
        }),
      );

      await recordOutcome(result, durationMs, false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (!activeTask || feedback) return;
    const durationMs = Math.max(500, Date.now() - startedAtMs);
    const skipped = buildExerciseFeedback({
      correct: false,
      score: 0,
      expectedAnswer: activeTask.content.expectedAnswer,
      why: 'Skipped. This will come back soon.',
      teachingPoint: activeTask.content.teachingNote,
    });
    setFeedback(skipped);
    await recordOutcome({ correct: false, score: 0 }, durationMs, true);
  };

  const handleNext = () => setCurrentIndex((index) => index + 1);

  // Progress is written once, when the step is finished. Exiting early records
  // nothing, which is intentional: a half-done step should not unlock the next one.
  useEffect(() => {
    if (!done || saved || !located || outcomes.length === 0) return;
    setSaved(true);
    void curriculum.completeStep({
      stepId: located.step.id,
      minutes: Math.max(1, Math.round((Date.now() - sessionStartedAt) / 60000)),
      outcomes,
    });
  }, [curriculum, done, located, outcomes, saved, sessionStartedAt]);

  return (
    <PageContent width="narrow" className="pb-12">
      <PageActions>
        <button className="page-primary-action" onClick={() => navigate('/learn')}>
          <ArrowLeft size={16} /> Exit session
        </button>
      </PageActions>

      {located && (
        <div className="mb-4">
          <h1 className="mb-1 text-[24px] font-bold text-white">{located.step.title}</h1>
          <p className="text-[13px] text-dim">
            Checkpoint {located.checkpoint.number} · {located.step.description}
          </p>
        </div>
      )}

      {isLoading && (
        <ExerciseStateBanner
          tone="loading"
          message="Building your session…"
          detail={
            plan
              ? `${plan.blueprints.length} tasks · ${plan.newSkillIds.length} new, ${plan.reviewSkillIds.length} brought back for review`
              : `Language: ${activeLanguage.name}`
          }
        />
      )}

      {loadError && !isLoading && (
        <>
          <ExerciseStateBanner tone="error" message="Could not start this session" detail={loadError} />
          <button className="page-primary-action mt-3 w-full justify-center py-3" onClick={() => navigate('/learn')}>
            Back to the learning path
          </button>
        </>
      )}

      {!isLoading && done && (
        <ExerciseShell
          title="Step complete"
          subtitle={located ? `${located.step.title} · checkpoint ${located.checkpoint.number}` : undefined}
          progressLabel={`${outcomes.length} tasks`}
          prompt={`Average score: ${averageScore}%`}
        >
          <ExerciseStateBanner
            tone="success"
            message="Saved to your progress."
            detail={`${outcomes.filter((outcome) => outcome.correct).length} of ${outcomes.length} correct. Weak skills will return in your next sessions.`}
          />
          <button className="page-primary-action w-full justify-center py-3" onClick={() => navigate('/learn')}>
            Back to the learning path
          </button>
        </ExerciseShell>
      )}

      {!isLoading && !done && activeTask && (
        <ExerciseShell
          title={activeTask.content.instruction}
          subtitle={activeCatalog?.displayName ?? activeTask.blueprint.taskType.replace(/_/g, ' ')}
          progressLabel={`${currentIndex + 1}/${tasks.length}`}
          prompt={activeTask.content.prompt}
          languageCode={activeLanguage.code}
          footer={
            feedback ? (
              <button className="page-primary-action w-full justify-center py-3" onClick={handleNext}>
                {currentIndex + 1 >= tasks.length ? 'Finish step' : 'Next task'} <ArrowRight size={16} />
              </button>
            ) : null
          }
        >
          {/* The planner's reasoning is shown rather than hidden, so the learner can
              see why a task is in front of them. */}
          <p className="flex items-center gap-1.5 text-[11px] text-dim">
            <Sparkles size={11} className="text-[#A78BFA]" />
            {activeTask.blueprint.rationale}
          </p>

          <form onSubmit={handleSubmit} className="grid gap-3">
            {activeExercise ? (
              <activeExercise.component
                payload={{
                  ...activeExercise.payload,
                  languageCode: activeLanguage.code,
                  taskSeed: activeTask.blueprint.id,
                }}
                disabled={Boolean(feedback) || submitting}
                onDraftChange={setDraft}
                onHintLevelOpened={handleHintLevel}
                onAudioReplay={handleAudioReplay}
              />
            ) : (
              <UnsupportedExerciseCard
                reason={`This "${activeTask.blueprint.taskType.replace(/_/g, ' ')}" task did not pass content checks and was skipped rather than shown incorrectly.`}
              />
            )}

            {!feedback && (
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!activeExercise || !draft.ready || submitting}
                  className="page-primary-action flex-1 justify-center py-3"
                >
                  {submitting ? 'Checking…' : 'Check answer'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSkip()}
                  className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-[13px] font-semibold text-dim transition-colors hover:text-white"
                >
                  Skip
                </button>
              </div>
            )}
          </form>

          {/* No retry button: the attempt has already been recorded against the
              skill. The old flow let a wrong answer be retried while the first
              attempt stayed in the score list, so one task counted twice. A missed
              skill comes back through the planner instead. */}
          {feedback && <ExerciseFeedbackCard feedback={feedback} languageCode={activeLanguage.code} />}
        </ExerciseShell>
      )}
    </PageContent>
  );
}
