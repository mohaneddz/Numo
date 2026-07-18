import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLanguageJourney } from '../../contexts/LanguageJourneyContext';
import { useProfileSession } from '../../contexts/ProfileSessionContext';
import { useAppData } from '../../contexts/AppDataContext';
import { createLessonSessionRuntime, type LessonSessionRuntime } from '../../services/learningPlanService';
import { resolveLearnExercise } from '../../components/exercises/learn/registry';
import type { LearnTaskPayload } from '../../components/exercises/learn/types';
import { EMPTY_DRAFT, type ExerciseDraft } from '../../components/exercises/shared/types';
import { UnsupportedExerciseCard } from '../../components/exercises/shared/UnsupportedExerciseCard';
import { ExerciseStateBanner } from '../../components/exercises/shared/ExerciseStateBanner';
import { ExerciseShell } from '../../components/exercises/shared/ExerciseShell';
import { ExerciseActionBar } from '../../components/exercises/shared/ExerciseActionBar';
import { ExerciseFeedbackCard } from '../../components/exercises/shared/ExerciseFeedbackCard';
import { buildExerciseFeedback, type ExerciseFeedbackModel } from '../../services/exercises/feedbackService';
import { updateExerciseSignals } from '../../services/exercises/exerciseSignalsService';
import { resolveExerciseByInternal } from '../../services/exercises/exerciseCatalog';

const PRODUCTION_LEARN_TASKS = new Set<string>([
  'replace_synonym',
  'finish_sentence_starter',
  'complete_dialogue',
  'read_answer_questions',
  'transform_statement_question',
  'correct_grammar',
  'compare_structures',
  'listen_repeat',
  'explain_pronunciation_rule',
  'replace_wrong_character',
  'okurigana_fill',
]);

export default function LearnSessionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeLanguage } = useLanguage();
  const { getSettings } = useLanguageJourney();
  const { activeProfile } = useProfileSession();
  const { submitLearnTaskAttempt } = useAppData();

  const lessonId = searchParams.get('lessonId') || undefined;
  const journeySettings = getSettings(activeLanguage.code);

  const [runtime, setRuntime] = useState<LessonSessionRuntime | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [draft, setDraft] = useState<ExerciseDraft>(EMPTY_DRAFT);
  const [feedback, setFeedback] = useState<ExerciseFeedbackModel | null>(null);
  const [feedbackResult, setFeedbackResult] = useState<{ correct: boolean; score: number; feedback: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startedAtMs, setStartedAtMs] = useState<number>(Date.now());
  const [completed, setCompleted] = useState<Array<{ score: number; correct: boolean }>>([]);
  const [hintUsed, setHintUsed] = useState(false);
  const [confusedUsed, setConfusedUsed] = useState(false);
  const [showHintText, setShowHintText] = useState(false);
  const [hoverUsage, setHoverUsage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setRuntime(null);
    setCurrentIndex(0);
    setDraft(EMPTY_DRAFT);
    setFeedback(null);
    setFeedbackResult(null);
    setCompleted([]);
    setStartedAtMs(Date.now());

    void (async () => {
      try {
        const session = await createLessonSessionRuntime({
          languageCode: activeLanguage.code,
          lessonId,
          policyContext: {
            languageCode: activeLanguage.code,
            level: journeySettings.level,
            difficulty: journeySettings.difficulty,
          },
        });
        if (cancelled) return;
        if (!session) {
          setLoadError('No structured lesson is available for this language yet.');
          return;
        }
        setRuntime(session);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load session');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeLanguage.code, journeySettings.difficulty, journeySettings.level, lessonId]);

  const tasks = runtime?.tasks ?? [];
  const activeTask = tasks[currentIndex];
  const activeCatalog = activeTask ? resolveExerciseByInternal('learn', activeTask.taskType) : null;
  const done = currentIndex >= tasks.length && tasks.length > 0;
  const averageScore = useMemo(
    () => (completed.length > 0 ? Math.round(completed.reduce((acc, item) => acc + item.score, 0) / completed.length) : 0),
    [completed],
  );

  const fallbackPayload = useMemo<LearnTaskPayload | null>(() => {
    if (!activeTask) return null;
    return {
      languageCode: activeLanguage.code,
      promptText: activeTask.prompt,
      expectedText: activeTask.expectedAnswer,
      distractors: activeTask.distractors,
      options: activeTask.distractors.length > 0 ? [activeTask.expectedAnswer, ...activeTask.distractors].slice(0, 4) : undefined,
    };
  }, [activeLanguage.code, activeTask]);

  const activeExercise = useMemo(() => {
    if (!activeTask || !fallbackPayload) return null;
    return resolveLearnExercise(activeTask.taskType, activeTask.payload, fallbackPayload);
  }, [activeTask, fallbackPayload]);

  useEffect(() => {
    setDraft(EMPTY_DRAFT);
    setFeedback(null);
    setFeedbackResult(null);
    setStartedAtMs(Date.now());
    setHintUsed(false);
    setConfusedUsed(false);
    setShowHintText(false);
    setHoverUsage(0);
  }, [activeTask?.templateId, activeTask?.taskType]);

  const persistSignals = async (
    result: { correct: boolean; score: number },
    latencyMs: number,
    confusionPair?: { a: string; b: string },
  ) => {
    if (!activeProfile?.id || !activeTask) return;
    const isProduction = PRODUCTION_LEARN_TASKS.has(activeTask.taskType);
    await updateExerciseSignals(activeProfile.id, activeLanguage.code, {
      wasCorrect: result.correct,
      latencyMs,
      hintUsed,
      confusedUsed,
      hoverUsed: hoverUsage,
      exerciseType: activeCatalog?.userKey ?? activeTask.taskType,
      confusionPair,
      recognitionDelta: isProduction ? (result.correct ? 0 : -2) : result.correct ? 3 : -3,
      productionDelta: isProduction ? (result.correct ? 3 : -3) : result.correct ? 1 : -1,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!runtime || !activeTask || submitting || !activeExercise || !draft.ready) return;
    setSubmitting(true);
    const durationMs = Math.max(1000, Date.now() - startedAtMs);

    try {
      const result = await submitLearnTaskAttempt({
        lessonId: runtime.lesson.id,
        unitId: runtime.unit.id,
        objectiveId: activeTask.objectiveId,
        taskTemplateId: activeTask.templateId,
        taskType: activeTask.taskType,
        prompt: activeTask.prompt,
        expectedAnswer: activeTask.expectedAnswer,
        learnerAnswer: draft.canonicalAnswer,
        structuredResponse: draft.structuredResponse,
        payload: activeExercise.payload as Record<string, unknown>,
        gradingMode: activeExercise.grading,
        durationMs,
      });

      setFeedbackResult(result);
      setFeedback(
        buildExerciseFeedback({
          correct: result.correct,
          score: result.score,
          learnerAnswer: draft.canonicalAnswer,
          expectedAnswer: activeTask.expectedAnswer,
          why: result.feedback,
        }),
      );
      setCompleted((previous) => [...previous, { score: result.score, correct: result.correct }]);

      const selectedOption = typeof draft.structuredResponse.selectedOption === 'string' ? draft.structuredResponse.selectedOption : undefined;
      const expectedOption = typeof activeExercise.payload.correctOption === 'string' ? activeExercise.payload.correctOption : activeTask.expectedAnswer;
      const confusionPair = !result.correct && selectedOption && expectedOption && selectedOption !== expectedOption
        ? { a: selectedOption, b: expectedOption }
        : undefined;
      await persistSignals(result, durationMs, confusionPair);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    setCurrentIndex((index) => index + 1);
  };

  const handleSkip = async () => {
    if (!activeTask) return;
    const skipped = buildExerciseFeedback({
      correct: false,
      score: 0,
      expectedAnswer: activeTask.expectedAnswer,
      why: 'Skipped. Review the target form before moving on.',
      teachingPoint: 'Use one clue first: meaning, then form.',
    });
    setFeedback(skipped);
    setFeedbackResult({ correct: false, score: 0, feedback: skipped.explanation });
    setCompleted((previous) => [...previous, { score: 0, correct: false }]);
    await persistSignals({ correct: false, score: 0 }, Math.max(1000, Date.now() - startedAtMs));
  };

  const hintPreview = activeTask?.distractors?.slice(0, 3).join(' | ');

  return (
    <PageContent width="narrow" className="pb-12">
      <PageActions>
        <button className="page-primary-action" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Exit Lesson
        </button>
      </PageActions>

      {runtime ? (
        <div className="mb-4">
          <h1 className="text-[24px] font-bold text-white mb-1">{runtime.lesson.title}</h1>
          <p className="text-[13px] text-dim">Focused progression for {activeLanguage.name}.</p>
        </div>
      ) : null}

      {isLoading ? (
        <ExerciseStateBanner tone="loading" message="Generating structured tasks..." detail={`Language: ${activeLanguage.name}`} />
      ) : null}

      {loadError && !isLoading ? <ExerciseStateBanner tone="error" message="Failed to load lesson" detail={loadError} /> : null}

      {!isLoading && runtime && done ? (
        <ExerciseShell
          title="Lesson complete"
          subtitle="You finished this guided session."
          progressLabel={`${completed.length} tasks`}
          prompt={`Average score: ${averageScore}%`}
        >
          <ExerciseStateBanner tone="success" message="Great work." detail="Continue with review to lock memory." />
          <button className="page-primary-action w-full justify-center py-3" onClick={() => navigate('/learn')}>
            Back to Learn
          </button>
        </ExerciseShell>
      ) : null}

      {!isLoading && runtime && !done && activeTask ? (
        <ExerciseShell
          title={activeTask.instruction}
          subtitle={`Task type: ${activeCatalog?.displayName ?? activeTask.taskType.replace(/_/g, ' ')}`}
          progressLabel={`${currentIndex + 1}/${tasks.length}`}
          prompt={activeTask.prompt}
          languageCode={activeLanguage.code}
          onGlossaryUsage={(count) => setHoverUsage((value) => value + count)}
          actions={(
            <ExerciseActionBar
              onHint={() => {
                setHintUsed(true);
                setShowHintText(true);
              }}
              onSkip={() => {
                void handleSkip();
              }}
              onConfused={() => {
                setConfusedUsed(true);
              }}
            />
          )}
          footer={(
            feedback ? (
              <button className="page-primary-action w-full justify-center py-3" onClick={handleNext}>
                Next Task <ArrowRight size={16} />
              </button>
            ) : null
          )}
        >
          {showHintText && hintPreview ? <ExerciseStateBanner tone="info" message="Hint" detail={hintPreview} /> : null}
          {confusedUsed && !feedback ? (
            <ExerciseStateBanner
              tone="info"
              message="Confusion flagged"
              detail="Try identifying meaning first, then exact form."
            />
          ) : null}

          <form onSubmit={handleSubmit} className="grid gap-3">
            {activeExercise ? (
              <activeExercise.component
                payload={{ ...activeExercise.payload, distractors: activeTask.distractors, languageCode: activeLanguage.code }}
                disabled={Boolean(feedback) || submitting}
                onDraftChange={setDraft}
              />
            ) : (
              <UnsupportedExerciseCard reason={`Task "${activeTask.taskType}" is missing valid payload and was blocked for safety.`} />
            )}

            {!feedback ? (
              <button
                type="submit"
                disabled={!activeExercise || !draft.ready || submitting}
                className="page-primary-action justify-center py-3"
              >
                {submitting ? 'Checking...' : 'Submit Task'}
              </button>
            ) : null}
          </form>

          {feedback ? (
            <ExerciseFeedbackCard
              feedback={feedback}
              languageCode={activeLanguage.code}
              onRetry={
                feedbackResult?.correct
                  ? undefined
                  : () => {
                      setFeedback(null);
                      setFeedbackResult(null);
                      setDraft(EMPTY_DRAFT);
                      setStartedAtMs(Date.now());
                    }
              }
            />
          ) : null}
        </ExerciseShell>
      ) : null}
    </PageContent>
  );
}
