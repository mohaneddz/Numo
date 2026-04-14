import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { generateSession, regenerateExercise, type PracticeItem, type SessionState } from '../../lib/sessionEngine';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLanguageJourney } from '../../contexts/LanguageJourneyContext';
import { useProfileSession } from '../../contexts/ProfileSessionContext';
import { resolveQuickExercise } from '../../components/exercises/quick/registry';
import { UnsupportedExerciseCard } from '../../components/exercises/shared/UnsupportedExerciseCard';
import { ExerciseShell } from '../../components/exercises/shared/ExerciseShell';
import { ExerciseStateBanner } from '../../components/exercises/shared/ExerciseStateBanner';
import { ExerciseActionBar } from '../../components/exercises/shared/ExerciseActionBar';
import { ExerciseFeedbackCard } from '../../components/exercises/shared/ExerciseFeedbackCard';
import { buildExerciseFeedback, type ExerciseFeedbackModel } from '../../services/exercises/feedbackService';
import { updateExerciseSignals } from '../../services/exercises/exerciseSignalsService';

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseExpectedAnswers(answer: string): string[] {
  return answer
    .split('||')
    .map((part) => normalize(part))
    .filter(Boolean);
}

function evaluateItem(item: PracticeItem, answer: string, structuredResponse?: Record<string, unknown>) {
  if (item.type === 'match' && item.pairs && structuredResponse?.mapping && typeof structuredResponse.mapping === 'object') {
    const mapping = structuredResponse.mapping as Record<string, unknown>;
    const correctCount = item.pairs.filter((pair) => mapping[pair.left] === pair.right).length;
    const score = Math.round((correctCount / item.pairs.length) * 100);
    return { correct: score === 100, score };
  }

  if (item.type === 'phrase_assembly' && Array.isArray(structuredResponse?.orderedTokens)) {
    const ordered = (structuredResponse.orderedTokens as unknown[]).map((token) => String(token)).join(' ');
    const correct = normalize(ordered) === normalize(item.answer);
    return { correct, score: correct ? 100 : 35 };
  }

  if (Array.isArray(structuredResponse?.selectedOptions)) {
    const selected = (structuredResponse.selectedOptions as unknown[])
      .map((entry) => normalize(String(entry)))
      .filter(Boolean);
    const expected = parseExpectedAnswers(item.answer);
    const selectedSet = new Set(selected);
    const expectedSet = new Set(expected);
    const exact = selectedSet.size === expectedSet.size && Array.from(expectedSet).every((entry) => selectedSet.has(entry));
    if (exact) return { correct: true, score: 100 };
    const overlap = expected.filter((entry) => selectedSet.has(entry)).length;
    const partialScore = expected.length > 0 ? Math.round((overlap / expected.length) * 100) : 20;
    return { correct: false, score: Math.max(20, Math.min(72, partialScore)) };
  }

  const correct = normalize(answer) === normalize(item.answer);
  if (correct) return { correct: true, score: 100 };
  const partial = normalize(answer).length > 0 && (normalize(item.answer).includes(normalize(answer)) || normalize(answer).includes(normalize(item.answer)));
  return { correct: partial, score: partial ? 72 : 20 };
}

export default function PracticeQuickPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeLanguage } = useLanguage();
  const { getSettings } = useLanguageJourney();
  const { activeProfile } = useProfileSession();

  const mode = searchParams.get('mode') || undefined;
  const source = searchParams.get('source') || undefined;
  const lang = searchParams.get('lang') || activeLanguage.code;
  const languageCode = lang.trim().toLowerCase();
  const journeySettings = getSettings(languageCode);
  const languageName = languageCode === activeLanguage.code ? activeLanguage.name : languageCode.toUpperCase();

  const [session, setSession] = useState<SessionState>({
    items: [],
    currentIndex: 0,
    correctAnswers: 0,
    completed: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ExerciseFeedbackModel | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startedAtMs, setStartedAtMs] = useState(Date.now());
  const [hintUsed, setHintUsed] = useState(false);
  const [confusedUsed, setConfusedUsed] = useState(false);
  const [showHintText, setShowHintText] = useState(false);
  const [hoverUsage, setHoverUsage] = useState(0);

  const currentItem = session.items[session.currentIndex];
  const activeExercise = currentItem ? resolveQuickExercise(currentItem) : null;
  const done = session.completed || (session.items.length > 0 && session.currentIndex >= session.items.length);

  const progress = session.items.length > 0 ? (session.currentIndex / session.items.length) * 100 : 0;

  const loadSession = async () => {
    setIsLoading(true);
    setLoadError(null);
    setRefreshError(null);
    setFeedback(null);
    setSelectedOptions([]);

    try {
      const generated = await generateSession({
        mode,
        source,
        languageCode,
        languageName,
        journeyLevel: journeySettings.level,
        difficultyPreference: journeySettings.difficulty,
      });
      setSession(generated);
      setStartedAtMs(Date.now());
      setHintUsed(false);
      setConfusedUsed(false);
      setShowHintText(false);
      setHoverUsage(0);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load session');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languageCode, languageName, mode, source, journeySettings.level, journeySettings.difficulty]);

  const persistSignals = async (result: { correct: boolean; score: number }, confusionPair?: { a: string; b: string }) => {
    if (!activeProfile?.id || !currentItem) return;
    const isProduction = currentItem.type === 'translate' || currentItem.type === 'speak' || currentItem.type === 'single_cloze';
    await updateExerciseSignals(activeProfile.id, languageCode, {
      wasCorrect: result.correct,
      latencyMs: Math.max(1000, Date.now() - startedAtMs),
      hintUsed,
      confusedUsed,
      hoverUsed: hoverUsage,
      exerciseType: currentItem.type,
      confusionPair,
      recognitionDelta: isProduction ? (result.correct ? 1 : -1) : result.correct ? 3 : -3,
      productionDelta: isProduction ? (result.correct ? 3 : -3) : result.correct ? 1 : -1,
    });
  };

  const handleAnswer = (answer: string, structuredResponse?: Record<string, unknown>) => {
    if (!currentItem || feedback !== null) return;
    const picked = Array.isArray(structuredResponse?.selectedOptions)
      ? (structuredResponse.selectedOptions as unknown[]).map((entry) => String(entry).trim()).filter(Boolean)
      : [typeof structuredResponse?.selectedOption === 'string' ? structuredResponse.selectedOption : answer].filter(Boolean);
    setSelectedOptions(picked);
    const result = evaluateItem(currentItem, answer, structuredResponse);

    if (result.correct) {
      setSession((previous) => ({ ...previous, correctAnswers: previous.correctAnswers + 1 }));
    }

    const expected = currentItem.answer;
    const selectedOption = typeof structuredResponse?.selectedOption === 'string' ? structuredResponse.selectedOption : undefined;
    const confusionPair = !result.correct && selectedOption ? { a: selectedOption, b: expected } : undefined;
    void persistSignals(result, confusionPair);

    setFeedback(
      buildExerciseFeedback({
        correct: result.correct,
        score: result.score,
        learnerAnswer: answer,
        expectedAnswer: expected,
      }),
    );
  };

  const handleNext = () => {
    setFeedback(null);
    setSelectedOptions([]);
    setStartedAtMs(Date.now());
    setHintUsed(false);
    setConfusedUsed(false);
    setShowHintText(false);
    setHoverUsage(0);

    if (session.currentIndex + 1 >= session.items.length) {
      setSession((previous) => ({ ...previous, completed: true, currentIndex: previous.items.length }));
      return;
    }

    setSession((previous) => ({ ...previous, currentIndex: previous.currentIndex + 1 }));
  };

  const handleRefreshExercise = async () => {
    if (!currentItem || isRefreshing || feedback !== null) return;
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const regenerated = await regenerateExercise({
        mode,
        source,
        languageCode,
        languageName,
        journeyLevel: journeySettings.level,
        difficultyPreference: journeySettings.difficulty,
        currentItem,
      });
      setSession((previous) => {
        const nextItems = [...previous.items];
        nextItems[previous.currentIndex] = regenerated;
        return { ...previous, items: nextItems };
      });
      setFeedback(null);
      setSelectedOptions([]);
      setStartedAtMs(Date.now());
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : 'Failed to refresh exercise');
    } finally {
      setIsRefreshing(false);
    }
  };

  const hintDetail = currentItem?.options?.slice(0, 2).join(' | ') ?? currentItem?.context ?? 'Look at key meaning cues first.';

  return (
    <PageContent width="narrow" className="pb-12">
      <PageActions>
        <button className="page-primary-action" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Exit Session
        </button>
      </PageActions>

      <div className="mb-3">
        <h1 className="text-[24px] font-bold text-white">Quick Practice</h1>
        <p className="text-[13px] text-dim">Progress: {Math.round(progress)}%</p>
      </div>

      {isLoading ? (
        <ExerciseStateBanner tone="loading" message="Generating practice session" detail={`Language: ${languageName}`} />
      ) : null}

      {loadError ? <ExerciseStateBanner tone="error" message="Session failed to load" detail={loadError} /> : null}

      {!isLoading && !loadError && !currentItem && !done ? (
        <ExerciseStateBanner tone="empty" message="No practice items generated." detail="Try refreshing this session." />
      ) : null}

      {!isLoading && !loadError && done ? (
        <ExerciseShell
          title="Quick session complete"
          subtitle="Nice work on today’s focused drills."
          progressLabel={`${session.correctAnswers}/${session.items.length}`}
          prompt={`Accuracy: ${session.items.length > 0 ? Math.round((session.correctAnswers / session.items.length) * 100) : 0}%`}
        >
          <ExerciseStateBanner tone="success" message="Session finished" detail="Continue with review for spaced reinforcement." />
          <button className="page-primary-action w-full justify-center" onClick={() => navigate('/review')}>
            Start Review
          </button>
        </ExerciseShell>
      ) : null}

      {!isLoading && !loadError && currentItem && !done ? (
        <ExerciseShell
          title={currentItem.type.replace(/_/g, ' ')}
          subtitle={`Item ${session.currentIndex + 1} of ${session.items.length}`}
          progressLabel={`${session.correctAnswers} correct`}
          prompt={currentItem.prompt}
          languageCode={languageCode}
          onGlossaryUsage={(count) => setHoverUsage((value) => value + count)}
          actions={(
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <ExerciseActionBar
                onHint={() => {
                  setHintUsed(true);
                  setShowHintText(true);
                }}
                onSkip={() => {
                  setFeedback(
                    buildExerciseFeedback({
                      correct: false,
                      score: 0,
                      expectedAnswer: currentItem.answer,
                      why: 'Skipped. Review the target and continue.',
                    }),
                  );
                  void persistSignals({ correct: false, score: 0 });
                }}
                onConfused={() => setConfusedUsed(true)}
              />
              <button
                type="button"
                onClick={() => {
                  void handleRefreshExercise();
                }}
                disabled={isRefreshing || feedback !== null}
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-[12px] text-mist"
              >
                {isRefreshing ? 'Refreshing...' : 'Regenerate'}
              </button>
            </div>
          )}
          footer={feedback ? (
            <button className="page-primary-action w-full justify-center py-3" onClick={handleNext}>
              Next Item <ArrowRight size={16} />
            </button>
          ) : null}
        >
          {refreshError ? <ExerciseStateBanner tone="error" message="Could not regenerate" detail={refreshError} /> : null}
          {showHintText ? <ExerciseStateBanner tone="info" message="Hint" detail={hintDetail} /> : null}
          {confusedUsed && !feedback ? (
            <ExerciseStateBanner tone="info" message="Confusion flagged" detail="Try meaning first, then exact form." />
          ) : null}

          {activeExercise ? (
            <activeExercise.component
              item={currentItem}
              disabled={feedback !== null}
              onAnswer={handleAnswer}
              selectionFeedback={feedback ? {
                selectedOption: selectedOptions[0],
                selectedOptions,
                isCorrect: feedback.correct,
                correctAnswer: currentItem.answer,
                correctAnswers: parseExpectedAnswers(currentItem.answer),
              } : undefined}
            />
          ) : (
            <UnsupportedExerciseCard reason={`Unsupported quick exercise payload for "${currentItem.type}".`} />
          )}

          {feedback ? <ExerciseFeedbackCard feedback={feedback} languageCode={languageCode} /> : null}
        </ExerciseShell>
      ) : null}
    </PageContent>
  );
}

