import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { completeWithEcho } from '../../services/aiProvider';
import { useAppData, type ReviewMode } from '../../contexts/AppDataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProfileSession } from '../../contexts/ProfileSessionContext';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { reviewExerciseRegistry } from '../../components/exercises/review/registry';
import type { ReviewCardType, ReviewQuestion as Q } from '../../components/exercises/review/types';
import { UnsupportedExerciseCard } from '../../components/exercises/shared/UnsupportedExerciseCard';
import { ExerciseShell } from '../../components/exercises/shared/ExerciseShell';
import { ExerciseActionBar } from '../../components/exercises/shared/ExerciseActionBar';
import { ExerciseStateBanner } from '../../components/exercises/shared/ExerciseStateBanner';
import { recordSkillOutcomes } from '../../services/curriculum';
import { ExerciseFeedbackCard } from '../../components/exercises/shared/ExerciseFeedbackCard';
import { buildExerciseFeedback, type ExerciseFeedbackModel } from '../../services/exercises/feedbackService';
import {
  loadExerciseSignals,
  updateExerciseSignals,
  type ExerciseSignalSnapshot,
} from '../../services/exercises/exerciseSignalsService';
import {
  chooseAdaptiveReviewCardType,
  prioritizeReviewQueueBySignals,
} from '../../services/exercises/adaptiveReviewService';
import type { ReviewItem } from '../../data/types';
import { resolveExerciseByInternal } from '../../services/exercises/exerciseCatalog';
import { buildTruthStatement } from '../../services/exercises/truthStatementService';
import { matchAnswer, normalizeAnswer } from '../../utils/textNormalize';
import { seededShuffle } from '../../utils/seededRandom';

type Result = 'correct' | 'incorrect';

const validModes: ReviewMode[] = ['due-now', 'weak', 'mistakes', 'cram'];

const labels: Record<ReviewCardType, string> = {
  reveal: 'Reveal Recall',
  multiple: 'Meaning Selection',
  write: 'Write Recall',
  build: 'Build Phrase',
  tf: 'True/False',
  tfj: 'True/False + Why',
  flash_recall: 'Flash Recall',
  delayed_recall: 'Delayed Recall',
  seen_unseen: 'Seen/Unseen',
  confusion_pair: 'Contrast Pair',
  radical_recall: 'Radical Recall',
  reading_recall: 'Reading Recall',
  produce_term: 'Produce It',
};


/**
 * Comparison form for option de-duplication and deterministic answer checks.
 *
 * This used to strip everything outside `a-z0-9`, so a Chinese, Japanese,
 * Russian or Arabic answer normalised to an empty string and could never
 * match — every deterministic grade in this file silently failed for those
 * languages whenever the AI check was unavailable.
 */
const norm = (value: string) => normalizeAnswer(value);

/**
 * Builds the options for a multiple-choice review card.
 *
 * Distractors used to be manufactured from the correct answer itself —
 * "house (formal)", "house now", and the answer with a leading "to"/"the"
 * removed. They gave the answer away, and on a non-English translation the
 * word-removal rules matched nothing, so a card could be left with barely any
 * alternatives at all.
 *
 * They now come from other translations in the learner's own queue, which is a
 * real discrimination test. The order is seeded from the item so grading one
 * card does not reshuffle the rest of the session.
 */
function buildConfusionOptions(item: ReviewItem, pool: readonly ReviewItem[]): string[] {
  const seen = new Set([norm(item.translation)]);
  const distractors: string[] = [];

  for (const candidate of pool) {
    if (distractors.length >= 3) break;
    const translation = candidate.translation?.trim();
    if (!translation || candidate.id === item.id) continue;
    const key = norm(translation);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    distractors.push(translation);
  }

  const options = [item.translation, ...distractors];
  // With too small a queue there is nothing honest to offer as a fourth option,
  // so the card simply runs with fewer rather than inventing one.
  return seededShuffle(options, `options-${item.id}`);
}

function fromItem(it: ReviewItem, type: ReviewCardType, pool: readonly ReviewItem[] = []): Q {
  const base = {
    id: `live-${it.id}-${type}`,
    term: it.term,
    answer: it.translation,
    sourceId: it.id,
    skillId: it.skillId,
  } as Q;

  if (type === 'flash_recall') {
    return {
      ...base,
      type,
      prompt: 'Recall quickly, then reveal.',
      hint: `Type: ${it.type}`,
    };
  }

  if (type === 'reveal') {
    return {
      ...base,
      type,
      prompt: 'Reveal the answer and self-grade.',
      hint: `Type: ${it.type}`,
    };
  }

  if (type === 'write') {
    return {
      ...base,
      type,
      prompt: 'Write the exact meaning.',
      hint: 'Short answer expected.',
    };
  }

  if (type === 'tf') {
    const truth = buildTruthStatement(it, pool, `tf-${it.id}`);
    return {
      ...base,
      type,
      prompt: 'Is this statement true or false?',
      statement: truth.statement,
      correctBool: truth.correctBool,
    };
  }

  if (type === 'multiple' || type === 'confusion_pair') {
    const options = buildConfusionOptions(it, pool);
    // A queue too small to supply a real alternative cannot make a choice
    // card. Falling back to recall beats rendering an unsupported-exercise
    // placeholder, and beats inventing an option to pad it out.
    if (options.length < 2) {
      return {
        ...base,
        type: 'reveal',
        prompt: 'Reveal the answer and self-grade.',
        hint: `Type: ${it.type}`,
      };
    }
    return {
      ...base,
      type,
      prompt: type === 'confusion_pair' ? 'Choose the exact meaning (contrast drill).' : 'Pick the closest meaning.',
      options,
      correctIndex: options.findIndex((o) => norm(o) === norm(it.translation)),
      hint: type === 'confusion_pair' ? 'Focus on subtle meaning difference.' : undefined,
    };
  }

  if (type === 'produce_term') {
    // The only card that runs the other way: every other written card shows the
    // target word and asks for its meaning, which tests recognition. Producing
    // the target from the meaning is the harder direction and the one that
    // actually shows whether the word is available for use.
    return {
      ...base,
      type,
      term: it.translation,
      answer: it.term,
      prompt: 'Write this in the language you are learning.',
      hint: `${it.term.length} character${it.term.length === 1 ? '' : 's'}`,
    };
  }

  if (type === 'reading_recall') {
    return {
      ...base,
      type,
      prompt: 'Write the reading or translation for this term.',
      hint: 'Short answer expected.',
    };
  }

  if (type === 'build') {
    return {
      ...base,
      type,
      prompt: 'Build the exact translation.',
      bank: seededShuffle(it.translation.split(/\s+/).filter(Boolean), `bank-${it.id}`),
    };
  }

  if (type === 'seen_unseen') {
    const truth = buildTruthStatement(it, pool, `seen-${it.id}`);
    return {
      ...base,
      type,
      prompt: 'Seen/unseen memory check. Is this mapping true?',
      statement: truth.statement,
      correctBool: truth.correctBool,
    };
  }

  if (type === 'delayed_recall') {
    return {
      ...base,
      type,
      prompt: 'Delayed recall. Reveal then self-grade.',
      hint: 'Pause and retrieve before tapping reveal.',
    };
  }

  if (type === 'radical_recall') {
    return {
      ...base,
      type,
      prompt: 'Name the key component or meaning cue for this term.',
      hint: 'Use one component or semantic cue.',
    };
  }

  if (type === 'tfj') {
    const truth = buildTruthStatement(it, pool, `tfj-${it.id}`);
    return {
      ...base,
      type: 'tfj',
      prompt: 'True/False + short reason.',
      statement: truth.statement,
      correctBool: truth.correctBool,
      expectedReason: truth.correctBool
        ? `It matches ${truth.actualMeaning}.`
        : `The statement is wrong: "${it.term}" actually means ${truth.actualMeaning}.`,
    };
  }

  return {
    ...base,
    type: 'flash_recall',
    prompt: 'Recall quickly, then reveal.',
  };
}

async function aiCheck(expected: string, user: string) {
  const raw = await completeWithEcho(
    [{ id: `v-${Date.now()}`, role: 'user', content: `Expected: ${expected}\nAnswer: ${user}\nReturn JSON: {"correct": boolean, "reason": string}`, createdAt: Date.now() }],
    'analyst',
  );
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no json');
  const p = JSON.parse(m[0]) as { correct?: boolean; reason?: string };
  if (typeof p.correct !== 'boolean') throw new Error('bad json');
  return { correct: p.correct, reason: p.reason?.trim() || '' };
}

async function aiCheckTfj(expectedBool: boolean, userBool: boolean, reason: string, expectedReason: string) {
  const raw = await completeWithEcho(
    [{ id: `j-${Date.now()}`, role: 'user', content: `Expected bool: ${expectedBool}\nUser bool: ${userBool}\nUser reason: ${reason}\nReference: ${expectedReason}\nReturn JSON: {"correct": boolean, "reason": string}`, createdAt: Date.now() }],
    'analyst',
  );
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no json');
  const p = JSON.parse(m[0]) as { correct?: boolean; reason?: string };
  if (typeof p.correct !== 'boolean') throw new Error('bad json');
  return { correct: p.correct, reason: p.reason?.trim() || '' };
}

export default function ReviewSession() {
  const [sp] = useSearchParams();
  const modeParam = sp.get('mode') as ReviewMode | null;
  const mode: ReviewMode = validModes.includes(modeParam as ReviewMode) ? (modeParam as ReviewMode) : 'due-now';
  const { activeLanguage } = useLanguage();
  const { activeProfile } = useProfileSession();
  const { startReviewSession, gradeReviewItem } = useAppData();

  const [signals, setSignals] = useState<ExerciseSignalSnapshot | null>(null);
  const [hoverUsage, setHoverUsage] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [confusedUsed, setConfusedUsed] = useState(false);
  const [feedbackCard, setFeedbackCard] = useState<ExerciseFeedbackModel | null>(null);

  useEffect(() => {
    if (!activeProfile?.id) return;
    void (async () => {
      const snapshot = await loadExerciseSignals(activeProfile.id, activeLanguage.code);
      setSignals(snapshot);
    })();
  }, [activeLanguage.code, activeProfile?.id]);

  const queue = useMemo(() => {
    const raw = startReviewSession(mode).queue;
    return prioritizeReviewQueueBySignals(raw, signals);
  }, [mode, signals, startReviewSession]);

  const cards = useMemo(
    () =>
      queue.map((item, index) =>
        fromItem(
          item,
          chooseAdaptiveReviewCardType({
            index,
            item,
            languageCode: activeLanguage.code,
            signals,
          }),
          queue,
        ),
      ),
    [activeLanguage.code, queue, signals],
  );

  const [i, setI] = useState(0);
  const [ans, setAns] = useState<Record<string, Result>>({});
  const [fb, setFb] = useState<Record<string, string>>({});
  const [rev, setRev] = useState(false);
  const [hint, setHint] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const [txt, setTxt] = useState('');
  const [build, setBuild] = useState<string[]>([]);
  const [tf, setTf] = useState<boolean | null>(null);
  const [why, setWhy] = useState('');
  const [checking, setChecking] = useState(false);
  const graded = useRef(new Set<string>());
  const cur = cards[i];

  useEffect(() => {
    setRev(false);
    setHint(false);
    setPick(null);
    setTxt('');
    setBuild([]);
    setTf(null);
    setWhy('');
    setHintUsed(false);
    setConfusedUsed(false);
    setHoverUsage(0);
    setFeedbackCard(null);
  }, [i]);

  const done = cur ? ans[cur.id] : undefined;
  const total = cards.length;
  const complete = i === total;
  const correct = Object.values(ans).filter((x) => x === 'correct').length;
  const activeExercise = cur ? reviewExerciseRegistry[cur.type] : null;
  const currentCatalog = cur ? resolveExerciseByInternal('review', cur.type) : null;
  const validExercise = cur && activeExercise ? activeExercise.validate(cur) : false;

  const persistSignals = async (result: Result, confusionPair?: { a: string; b: string }) => {
    if (!activeProfile?.id || !cur) return;
    const isProduction = cur.type === 'write' || cur.type === 'reading_recall' || cur.type === 'radical_recall';
    await updateExerciseSignals(activeProfile.id, activeLanguage.code, {
      wasCorrect: result === 'correct',
      hintUsed,
      confusedUsed,
      hoverUsed: hoverUsage,
      exerciseType: currentCatalog?.userKey ?? cur.type,
      confusionPair,
      recognitionDelta: isProduction ? (result === 'correct' ? 1 : -2) : result === 'correct' ? 3 : -3,
      productionDelta: isProduction ? (result === 'correct' ? 3 : -3) : result === 'correct' ? 1 : -1,
    });
  };

  const grade = (r: Result, message?: string) => {
    if (!cur || ans[cur.id]) return;
    setAns((p) => ({ ...p, [cur.id]: r }));
    if (message) setFb((p) => ({ ...p, [cur.id]: message }));
    if (cur.sourceId && !graded.current.has(cur.sourceId)) {
      gradeReviewItem(cur.sourceId, r);
      graded.current.add(cur.sourceId);
    }

    const confusionPair = r === 'incorrect' && pick !== null && cur.options?.[pick]
      ? { a: cur.options[pick], b: cur.answer }
      : undefined;
    void persistSignals(r, confusionPair);

    // Review and Learn share one learner model. Only items that carry a skill are
    // credited: an item mined from immersion has no skill behind it, and guessing
    // one would push invented evidence into the model.
    if (cur.skillId && activeProfile?.id) {
      const isProductionCard = cur.type === 'write' || cur.type === 'reading_recall' || cur.type === 'radical_recall';
      void recordSkillOutcomes(activeProfile.id, activeLanguage.code, [
        {
          skillId: cur.skillId,
          correct: r === 'correct',
          score: r === 'correct' ? 100 : 0,
          modality: isProductionCard ? 'production' : 'recognition',
          hintUsed,
        },
      ]);
    }

    setFeedbackCard(
      buildExerciseFeedback({
        correct: r === 'correct',
        score: r === 'correct' ? 100 : 25,
        learnerAnswer: txt || (pick !== null ? cur.options?.[pick] : undefined) || build.join(' ') || String(tf),
        expectedAnswer: cur.answer,
        why: message,
      }),
    );
  };

  const next = () => setI((x) => (x < total ? x + 1 : x));
  const prev = () => setI((x) => (x > 0 ? x - 1 : x));
  const skipCard = () => {
    if (!cur) return;
    if (!done) {
      setConfusedUsed(true);
      grade('incorrect', `Skipped. Expected: ${cur.answer}`);
    }
    next();
  };

  const submitWrite = async () => {
    if (!cur || (cur.type !== 'write' && cur.type !== 'reading_recall' && cur.type !== 'radical_recall') || done || checking) return;
    setChecking(true);
    try {
      const r = await aiCheck(cur.answer, txt);
      grade(r.correct ? 'correct' : 'incorrect', r.reason || (r.correct ? 'Accepted by AI.' : `Expected: ${cur.answer}`));
    } catch {
      const match = matchAnswer(cur.answer, txt, activeLanguage.code);
      grade(
        match.correct ? 'correct' : 'incorrect',
        match.note ?? (match.correct ? 'Accepted in fallback.' : `Expected: ${cur.answer}`),
      );
    } finally {
      setChecking(false);
    }
  };

  const submitTfj = async () => {
    if (!cur || cur.type !== 'tfj' || done || checking || tf === null) return;
    setChecking(true);
    try {
      const r = await aiCheckTfj(Boolean(cur.correctBool), tf, why, cur.expectedReason || '');
      grade(r.correct ? 'correct' : 'incorrect', r.reason || (r.correct ? 'Accepted by AI.' : 'Rejected by AI.'));
    } catch {
      const ok = tf === cur.correctBool && norm(why).length > 12;
      grade(ok ? 'correct' : 'incorrect', ok ? 'Accepted in fallback.' : `Expected ${cur.correctBool ? 'True' : 'False'} + better reason.`);
    } finally {
      setChecking(false);
    }
  };

  if (total === 0) {
    return (
      <PageContent width="narrow">
        <PageActions>
          <Link to="/review" className="no-underline">
            <button className="page-primary-action"><ArrowLeft size={16} /> Back to Review</button>
          </Link>
        </PageActions>
        <ExerciseStateBanner
          tone="empty"
          message="No review items due right now"
          detail="Queue is persistence-backed only; no synthetic cards are generated when empty."
        />
      </PageContent>
    );
  }

  if (complete) {
    return (
      <PageContent width="narrow" className="pb-12">
        <PageActions>
          <Link to="/review" className="no-underline">
            <button className="page-primary-action"><ArrowLeft size={16} /> Review Overview</button>
          </Link>
        </PageActions>
        <ExerciseShell
          title="Session complete"
          subtitle="Adaptive review saved for future scheduling."
          progressLabel={`${correct}/${total}`}
          prompt={`Mode: ${mode}`}
        >
          <ExerciseStateBanner tone="success" message="Review done" detail={`${correct} correct out of ${total}.`} />
          <button onClick={prev} className="page-primary-action">Previous Card</button>
        </ExerciseShell>
      </PageContent>
    );
  }

  return (
    <PageContent width="narrow" className="pb-12">
      <PageActions>
        <Link to="/review" className="no-underline">
          <button className="page-primary-action"><ArrowLeft size={16} /> End Session</button>
        </Link>
      </PageActions>

      {cur ? (
        <ExerciseShell
          title={currentCatalog?.displayName ?? labels[cur.type]}
          subtitle={`Mode: ${mode}`}
          progressLabel={`Card ${i + 1}/${total}`}
          prompt={cur.prompt}
          languageCode={activeLanguage.code}
          onGlossaryUsage={(count) => setHoverUsage((value) => value + count)}
          actions={(
            <ExerciseActionBar
              onHint={() => {
                setHint((x) => !x);
                setHintUsed(true);
              }}
              onSkip={skipCard}
              onConfused={() => setConfusedUsed(true)}
            />
          )}
        >
          {hint ? <ExerciseStateBanner tone="info" message="Hint" detail={cur.hint || 'No hint for this card.'} /> : null}
          {feedbackCard ? <ExerciseFeedbackCard feedback={feedbackCard} languageCode={activeLanguage.code} /> : null}

          {activeExercise && validExercise ? (
            <activeExercise.component
              question={cur}
              done={Boolean(done)}
              checking={checking}
              onGrade={grade}
              onSetPick={setPick}
              pick={pick}
              onSetText={setTxt}
              text={txt}
              onSubmitWrite={() => {
                void submitWrite();
              }}
              onSetBuild={setBuild}
              build={build}
              onSetTf={setTf}
              tf={tf}
              onSetWhy={setWhy}
              why={why}
              onSubmitTfj={() => {
                void submitTfj();
              }}
              onSetReveal={setRev}
              revealed={rev}
              onSkip={skipCard}
            />
          ) : (
            <UnsupportedExerciseCard reason={`Review type "${cur.type}" has invalid payload and was blocked.`} />
          )}

          {fb[cur.id] ? <ExerciseStateBanner tone={done === 'correct' ? 'success' : 'incorrect'} message={fb[cur.id]} /> : null}

          <div className="flex justify-between mt-2 gap-2">
            <button onClick={prev} disabled={i === 0} className="page-primary-action">Previous</button>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPick(null);
                  setTxt('');
                  setBuild([]);
                  setTf(null);
                  setWhy('');
                  setRev(false);
                  setFeedbackCard(null);
                }}
                className="page-primary-action"
              >
                Reset Card
              </button>
              <button onClick={next} className="page-primary-action">Next</button>
            </div>
          </div>
        </ExerciseShell>
      ) : null}
    </PageContent>
  );
}
