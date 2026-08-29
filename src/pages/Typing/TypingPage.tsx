import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, RotateCcw, Hash, Type as TypeIcon, BookMarked } from 'lucide-react';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProfileSession } from '../../contexts/ProfileSessionContext';
import { useAppData } from '../../contexts/AppDataContext';
import { typingWordListForLanguage } from '../../data/typingWordLists';
import {
  buildTestWords,
  rankProblemCharacters,
  summarizeRun,
  tallyCharacters,
  type TypingResult,
  type TypingSample,
  type TypingTestConfig,
  type TypingTestMode,
  type TypedWord,
} from '../../services/typing/typingService';
import {
  bestKey,
  loadTypingHistory,
  recordTypingRun,
  summarizeHistory,
  type TypingHistory,
  type TypingPersonalBest,
} from '../../services/typing/typingHistory';
import { TypingTextDisplay } from '../../components/typing/TypingTextDisplay';
import { TypingResults } from '../../components/typing/TypingResults';

const TIME_AMOUNTS = [15, 30, 60, 120];
const WORD_AMOUNTS = [10, 25, 50, 100];

type Phase = 'idle' | 'running' | 'finished';

export default function TypingPage() {
  const { activeLanguage } = useLanguage();
  const { activeProfile } = useProfileSession();
  const { state: appData } = useAppData();

  const [mode, setMode] = useState<TypingTestMode>('time');
  const [amount, setAmount] = useState(30);
  const [includePunctuation, setIncludePunctuation] = useState(false);
  const [includeNumbers, setIncludeNumbers] = useState(false);
  const [useOwnVocabulary, setUseOwnVocabulary] = useState(true);
  const [seed, setSeed] = useState(() => `${Date.now()}`);

  const [phase, setPhase] = useState<Phase>('idle');
  const [typedWords, setTypedWords] = useState<TypedWord[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeInput, setActiveInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [composing, setComposing] = useState('');
  const [remaining, setRemaining] = useState(30);
  const [liveWpm, setLiveWpm] = useState(0);

  const [result, setResult] = useState<TypingResult | null>(null);
  const [problemCharacters, setProblemCharacters] = useState<Array<{ character: string; count: number }>>([]);
  const [isPersonalBest, setIsPersonalBest] = useState(false);
  const [previousBest, setPreviousBest] = useState<TypingPersonalBest | null>(null);
  const [history, setHistory] = useState<TypingHistory>({ entries: [], bests: {} });

  const inputRef = useRef<HTMLInputElement>(null);
  const startedAtRef = useRef<number | null>(null);
  const keystrokesRef = useRef({ total: 0, correct: 0 });
  const errorsRef = useRef(new Map<string, number>());
  const samplesRef = useRef<TypingSample[]>([]);
  const composingRef = useRef(false);
  const finishRef = useRef<(() => void) | null>(null);

  // Mirrors of the live typing state. `finish` can be called from a timer tick
  // with no access to the latest render's values, and reading them through
  // setState updaters would run persistence inside a reducer.
  const typedWordsRef = useRef<TypedWord[]>([]);
  const activeIndexRef = useRef(0);
  const activeInputRef = useRef('');
  const finishedRef = useRef(false);

  useEffect(() => {
    typedWordsRef.current = typedWords;
  }, [typedWords]);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);
  useEffect(() => {
    activeInputRef.current = activeInput;
  }, [activeInput]);

  const wordList = useMemo(
    () => typingWordListForLanguage(activeLanguage.code),
    [activeLanguage.code],
  );

  const learnerWords = useMemo(() => {
    const words = [
      ...appData.notebookEntries.map((entry) => entry.term),
      ...appData.reviewItems.map((item) => item.term),
    ];
    return words.filter(Boolean);
  }, [appData.notebookEntries, appData.reviewItems]);

  const config = useMemo<TypingTestConfig>(
    () => ({
      mode,
      amount,
      languageCode: activeLanguage.code,
      useOwnVocabulary,
      includePunctuation,
      includeNumbers,
    }),
    [mode, amount, activeLanguage.code, useOwnVocabulary, includePunctuation, includeNumbers],
  );

  const words = useMemo(
    () => buildTestWords(config, { learnerWords }, seed),
    [config, learnerWords, seed],
  );

  const unit = wordList.charsPerWord === 1 ? 'cpm' : 'wpm';
  const personalBest = history.bests[bestKey(mode, amount)] ?? null;
  const summary = useMemo(() => summarizeHistory(history), [history]);

  useEffect(() => {
    if (!activeProfile?.id) return;
    void (async () => {
      setHistory(await loadTypingHistory(activeProfile.id, activeLanguage.code));
    })();
  }, [activeProfile?.id, activeLanguage.code]);

  const reset = useCallback(() => {
    setPhase('idle');
    setTypedWords([]);
    setActiveIndex(0);
    setActiveInput('');
    setComposing('');
    setResult(null);
    setProblemCharacters([]);
    setIsPersonalBest(false);
    setPreviousBest(null);
    setRemaining(mode === 'time' ? amount : 0);
    setLiveWpm(0);
    startedAtRef.current = null;
    keystrokesRef.current = { total: 0, correct: 0 };
    errorsRef.current = new Map();
    samplesRef.current = [];
    composingRef.current = false;
    typedWordsRef.current = [];
    activeIndexRef.current = 0;
    activeInputRef.current = '';
    finishedRef.current = false;
    setSeed(`${Date.now()}`);
  }, [amount, mode]);

  // A settings change mid-run would score the learner against a test they did
  // not start, so any change restarts cleanly.
  useEffect(() => {
    reset();
  }, [mode, amount, includePunctuation, includeNumbers, useOwnVocabulary, activeLanguage.code, reset]);

  const finish = useCallback(() => {
    if (startedAtRef.current === null || finishedRef.current) return;
    finishedRef.current = true;

    const elapsedSeconds = (Date.now() - startedAtRef.current) / 1000;
    const tally = tallyCharacters(
      words,
      typedWordsRef.current,
      activeIndexRef.current,
      activeInputRef.current,
    );

    const runResult = summarizeRun(
      {
        correctCharacters: tally.correct,
        incorrectCharacters: tally.incorrect,
        extraCharacters: tally.extra,
        missedCharacters: tally.missed,
        totalKeystrokes: keystrokesRef.current.total,
        elapsedSeconds,
        samples: samplesRef.current,
      },
      config,
      wordList,
    );

    // Accuracy comes from keystrokes rather than the character walk above: a
    // typo the learner backspaced over is a wrong keystroke but a right result,
    // and only the keystroke count still remembers it happened.
    runResult.accuracy =
      keystrokesRef.current.total > 0
        ? Math.round((keystrokesRef.current.correct / keystrokesRef.current.total) * 1000) / 10
        : 100;

    setPhase('finished');
    setResult(runResult);
    setProblemCharacters(rankProblemCharacters(errorsRef.current));

    if (activeProfile?.id) {
      void recordTypingRun(activeProfile.id, activeLanguage.code, runResult).then((outcome) => {
        setHistory(outcome.history);
        setIsPersonalBest(outcome.isPersonalBest);
        setPreviousBest(outcome.previousBest);
      });
    }
  }, [activeLanguage.code, activeProfile?.id, config, wordList, words]);

  finishRef.current = finish;

  // Ticks the countdown and records one speed sample per second.
  useEffect(() => {
    if (phase !== 'running') return undefined;

    const timer = window.setInterval(() => {
      const startedAt = startedAtRef.current;
      if (startedAt === null) return;

      const elapsed = (Date.now() - startedAt) / 1000;
      const second = Math.round(elapsed);
      const { total, correct } = keystrokesRef.current;
      const wpm = elapsed > 0 ? correct / wordList.charsPerWord / (elapsed / 60) : 0;
      const rawWpm = elapsed > 0 ? total / wordList.charsPerWord / (elapsed / 60) : 0;

      samplesRef.current = [
        ...samplesRef.current,
        {
          second,
          wpm: Math.round(wpm * 10) / 10,
          rawWpm: Math.round(rawWpm * 10) / 10,
          errors: total - correct,
        },
      ];
      setLiveWpm(Math.round(wpm));

      if (mode === 'time') {
        const left = Math.max(0, amount - elapsed);
        setRemaining(Math.ceil(left));
        if (left <= 0) finishRef.current?.();
      } else {
        setRemaining(Math.floor(elapsed));
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [amount, mode, phase, wordList.charsPerWord]);

  /**
   * Counts the characters a change added and grades each against the target.
   *
   * Diffing the value rather than listening for keydown is what makes IME input
   * work: a Chinese or Japanese commit arrives as one change carrying several
   * characters, and there was never a keystroke per character to listen for.
   */
  const scoreAddedCharacters = useCallback(
    (previousValue: string, nextValue: string, targetWord: string) => {
      if (nextValue.length <= previousValue.length) return;

      for (let position = previousValue.length; position < nextValue.length; position += 1) {
        const typed = nextValue[position];
        const expected = targetWord[position];
        keystrokesRef.current.total += 1;
        if (typed === expected) {
          keystrokesRef.current.correct += 1;
        } else if (expected !== undefined) {
          errorsRef.current.set(expected, (errorsRef.current.get(expected) ?? 0) + 1);
        }
      }
    },
    [],
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (phase === 'finished') return;

      const raw = event.target.value;

      // Mid-composition text is a candidate, not a commitment — grading it
      // would punish an IME user for every keystroke of a valid word.
      if (composingRef.current) {
        setComposing(raw.slice(activeInput.length));
        return;
      }

      if (phase === 'idle') {
        setPhase('running');
        startedAtRef.current = Date.now();
      }

      setComposing('');

      if (raw.endsWith(' ')) {
        const finalWord = raw.slice(0, -1);
        if (finalWord.length === 0) return;

        keystrokesRef.current.total += 1;
        keystrokesRef.current.correct += 1;

        const nextTyped = [...typedWords];
        nextTyped[activeIndex] = { typed: finalWord, settled: true };
        setTypedWords(nextTyped);
        setActiveInput('');
        // The mirrors sync via an effect, which has not run yet — finish() below
        // would otherwise score the run without this last word.
        typedWordsRef.current = nextTyped;
        activeInputRef.current = '';

        const nextIndex = activeIndex + 1;
        if (mode === 'words' && nextIndex >= words.length) {
          finishRef.current?.();
          return;
        }
        setActiveIndex(Math.min(nextIndex, words.length - 1));
        activeIndexRef.current = Math.min(nextIndex, words.length - 1);
        return;
      }

      scoreAddedCharacters(activeInput, raw, words[activeIndex] ?? '');
      setActiveInput(raw);
      activeInputRef.current = raw;

      // The last word of a words test has no trailing space to commit it.
      if (mode === 'words' && activeIndex === words.length - 1 && raw === words[activeIndex]) {
        const nextTyped = [...typedWords];
        nextTyped[activeIndex] = { typed: raw, settled: true };
        setTypedWords(nextTyped);
        typedWordsRef.current = nextTyped;
        finishRef.current?.();
      }
    },
    [activeIndex, activeInput, mode, phase, scoreAddedCharacters, typedWords, words],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        reset();
        return;
      }
      if (event.key === 'Backspace' && activeInput.length === 0 && activeIndex > 0) {
        // Stepping back to fix a finished word, the way every typing test allows.
        event.preventDefault();
        const previousIndex = activeIndex - 1;
        setActiveIndex(previousIndex);
        setActiveInput(typedWords[previousIndex]?.typed ?? '');
        const nextTyped = [...typedWords];
        nextTyped[previousIndex] = { typed: nextTyped[previousIndex]?.typed ?? '', settled: false };
        setTypedWords(nextTyped);
      }
    },
    [activeIndex, activeInput.length, reset, typedWords],
  );

  const focusInput = useCallback(() => inputRef.current?.focus(), []);

  useEffect(() => {
    if (phase === 'idle') focusInput();
  }, [focusInput, phase, seed]);

  const progressLabel =
    mode === 'time'
      ? `${remaining}s`
      : `${Math.min(activeIndex + (phase === 'idle' ? 0 : 1), words.length)}/${words.length}`;

  return (
    <>
      <PageActions hideSettingsButton />
      <PageContent>
        <header className="mb-6">
          <h1 className="font-heading text-3xl text-mist">Typing Trainer</h1>
          <p className="mt-1 text-sm text-dim">
            Build muscle memory for {activeLanguage.name} at real speed. Words come from your own
            saved vocabulary when you have enough of it.
          </p>
        </header>

        {phase !== 'finished' && (
          <div className="mb-6 flex flex-wrap items-center gap-2 rounded-full border border-white/5 bg-graphite px-3 py-2 text-sm">
            <SegmentGroup>
              {(['time', 'words'] as TypingTestMode[]).map((option) => (
                <Segment
                  key={option}
                  active={mode === option}
                  onClick={() => {
                    setMode(option);
                    setAmount(option === 'time' ? 30 : 25);
                  }}
                >
                  {option}
                </Segment>
              ))}
            </SegmentGroup>

            <Divider />

            <SegmentGroup>
              {(mode === 'time' ? TIME_AMOUNTS : WORD_AMOUNTS).map((option) => (
                <Segment key={option} active={amount === option} onClick={() => setAmount(option)}>
                  {option}
                </Segment>
              ))}
            </SegmentGroup>

            <Divider />

            <Segment active={includePunctuation} onClick={() => setIncludePunctuation((on) => !on)}>
              <span className="flex items-center gap-1.5">
                <TypeIcon size={13} /> punctuation
              </span>
            </Segment>
            <Segment active={includeNumbers} onClick={() => setIncludeNumbers((on) => !on)}>
              <span className="flex items-center gap-1.5">
                <Hash size={13} /> numbers
              </span>
            </Segment>
            <Segment active={useOwnVocabulary} onClick={() => setUseOwnVocabulary((on) => !on)}>
              <span className="flex items-center gap-1.5">
                <BookMarked size={13} /> my words
              </span>
            </Segment>
          </div>
        )}

        {phase === 'finished' && result ? (
          <TypingResults
            result={result}
            problemCharacters={problemCharacters}
            isPersonalBest={isPersonalBest}
            previousBest={previousBest}
            onRestart={reset}
          />
        ) : (
          <section
            className="rounded-xl border border-white/5 bg-graphite p-6"
            onClick={focusInput}
            role="presentation"
          >
            <div className="mb-5 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-dim">
                <Keyboard size={15} />
                {activeLanguage.name}
                {wordList.usesInputMethod && (
                  <span className="rounded-full border border-cyan/25 bg-cyan-dim px-2 py-0.5 text-[11px] text-cyan">
                    IME
                  </span>
                )}
              </span>
              <span className="flex items-center gap-4">
                <span className="font-heading text-2xl text-violet">{progressLabel}</span>
                {phase === 'running' && (
                  <span className="text-dim">
                    {liveWpm} {unit}
                  </span>
                )}
              </span>
            </div>

            <div className="relative">
              <TypingTextDisplay
                words={words}
                typedWords={typedWords}
                activeIndex={activeIndex}
                activeInput={activeInput}
                direction={wordList.direction}
                largeGlyphs={wordList.charsPerWord <= 2}
                focused={focused}
                composing={composing}
              />

              {!focused && (
                <button
                  type="button"
                  onClick={focusInput}
                  className="absolute inset-0 flex items-center justify-center text-sm text-dim"
                >
                  Click here or press any key to start
                </button>
              )}

              <input
                ref={inputRef}
                value={activeInput}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onCompositionStart={() => {
                  composingRef.current = true;
                  if (phase === 'idle') {
                    setPhase('running');
                    startedAtRef.current = Date.now();
                  }
                }}
                onCompositionEnd={(event) => {
                  composingRef.current = false;
                  setComposing('');
                  const value = event.currentTarget.value;
                  scoreAddedCharacters(activeInput, value, words[activeIndex] ?? '');
                  setActiveInput(value);
                }}
                className="absolute inset-0 h-full w-full cursor-default opacity-0"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label="Typing test input"
              />
            </div>

            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-dim">
              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-1.5 transition-colors hover:border-violet/40 hover:text-mist"
              >
                <RotateCcw size={14} />
                Restart
              </button>
              <span>
                <kbd className="rounded border border-white/10 px-1.5 py-0.5">Tab</kbd> for a new test
              </span>
            </div>
          </section>
        )}

        {summary.runCount > 0 && phase !== 'finished' && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <HistoryStat label={`best ${unit}`} value={personalBest ? personalBest.wpm : '—'} />
            <HistoryStat label={`average ${unit}`} value={summary.averageWpm} />
            <HistoryStat label="avg accuracy" value={`${summary.averageAccuracy}%`} />
            <HistoryStat label="runs" value={summary.runCount} />
          </div>
        )}
      </PageContent>
    </>
  );
}

function SegmentGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1">{children}</div>;
}

function Divider() {
  return <span className="mx-1 h-4 w-px bg-white/10" />;
}

function Segment({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 transition-colors ${
        active ? 'bg-violet-dim text-violet' : 'text-dim hover:text-mist'
      }`}
    >
      {children}
    </button>
  );
}

function HistoryStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-graphite px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-dim">{label}</p>
      <p className="mt-1 font-heading text-2xl text-mist">{value}</p>
    </div>
  );
}
