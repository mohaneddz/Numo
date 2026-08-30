import { useMemo, useState } from 'react';
import { BookPlus, Check, ScanText, Sparkles } from 'lucide-react';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppData } from '../../contexts/AppDataContext';
import { useGlossary } from '../../hooks/useGlossary';
import { InteractiveText } from '../../components/exercises/shared/InteractiveText';
import { analyzeText, describeCoverage, type MinedWord } from '../../services/mining/textMining';

/** Right-to-left target languages need the passage flipped. */
const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur']);

/** New words listed at once. Enough to work through, not a wall of text. */
const VISIBLE_NEW_WORDS = 40;

/**
 * Characters rendered as individually clickable words.
 *
 * Every interactive token becomes a focusable element with its own handlers, so
 * a pasted chapter would render thousands of them and put the whole text in the
 * tab order. The analysis still covers the entire passage; only the lookup view
 * is capped.
 */
const INTERACTIVE_CHARACTER_LIMIT = 1500;

/**
 * Text miner: paste anything in the target language and see what you already
 * know.
 *
 * Coverage — the share of a passage a learner can already read — is what makes
 * a text worth attempting or not, and nothing in the app worked it out. Words
 * are matched against the learner's own saved vocabulary, so the figure means
 * something specific to them rather than being a readability score.
 */
export default function TextMinerPage() {
  const { activeLanguage } = useLanguage();
  const { state, createNotebookEntry } = useAppData();
  const glossary = useGlossary(activeLanguage.code);

  const [text, setText] = useState('');
  const [analyzed, setAnalyzed] = useState('');
  const [savingWord, setSavingWord] = useState<string | null>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);

  const knownVocabulary = useMemo(
    () => [
      ...state.notebookEntries.map((entry) => entry.term),
      ...state.reviewItems.map((item) => item.term),
    ],
    [state.notebookEntries, state.reviewItems],
  );

  const analysis = useMemo(
    () => analyzeText(analyzed, activeLanguage.code, knownVocabulary),
    [analyzed, activeLanguage.code, knownVocabulary],
  );

  const newWords = useMemo(
    () => analysis.words.filter((word) => !word.known && !savedWords.has(word.word)),
    [analysis.words, savedWords],
  );

  const rtl = RTL_LANGUAGES.has(activeLanguage.code);

  const saveWord = async (entry: MinedWord) => {
    setSavingWord(entry.word);
    setSaveError(null);
    try {
      // Look the meaning up first: a notebook entry with no translation is not
      // worth having, and this is the same lookup the tooltips use.
      const resolved = await glossary.resolveEntry(entry.word);
      if (!resolved?.translation?.trim()) {
        // Saving a word with no meaning attached produces a notebook entry that
        // can never be reviewed, so this reports instead of storing a blank.
        setSaveError(
          `No meaning found for "${entry.word}". Select it in the passage to look it up first.`,
        );
        return;
      }

      createNotebookEntry({
        term: entry.word,
        translation: resolved.translation,
        type: 'word',
        notes: resolved.example,
        tags: [activeLanguage.code, 'mined'],
        source: 'manual',
        mastery: 0,
        favorited: false,
      });
      setSavedWords((previous) => new Set(previous).add(entry.word));
    } catch (error) {
      setSaveError(
        error instanceof Error && error.message
          ? `Couldn't look up "${entry.word}": ${error.message}`
          : `Couldn't look up "${entry.word}".`,
      );
    } finally {
      setSavingWord(null);
    }
  };

  return (
    <>
      <PageActions hideSettingsButton />
      <PageContent width="wide" className="pb-12">
        <header className="mb-6">
          <h1 className="font-heading text-3xl text-mist">Text Miner</h1>
          <p className="mt-1 text-sm text-dim">
            Paste anything written in {activeLanguage.name} to see how much of it you can already
            read, and save the words you cannot.
          </p>
        </header>

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          dir={rtl ? 'rtl' : 'ltr'}
          rows={6}
          placeholder={`Paste ${activeLanguage.name} text here — an article, song lyrics, a chat message…`}
          className="w-full rounded-xl border border-white/10 bg-black/20 p-4 text-[15px] text-mist outline-none transition-colors placeholder:text-dim focus:border-cyan-400/40"
          aria-label="Text to analyse"
        />

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setAnalyzed(text);
              setSavedWords(new Set());
              setSaveError(null);
            }}
            disabled={!text.trim()}
            className="page-primary-action disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ScanText size={16} /> Analyse
          </button>
          {analyzed && (
            <button
              type="button"
              onClick={() => {
                setText('');
                setAnalyzed('');
                setSavedWords(new Set());
              }}
              className="text-sm text-dim transition-colors hover:text-mist"
            >
              Clear
            </button>
          )}
        </div>

        {analysis.totalCount > 0 && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="coverage" value={`${analysis.coveragePercent}%`} accent />
              <Stat label="words" value={analysis.totalCount} />
              <Stat label="distinct" value={analysis.uniqueCount} />
              <Stat label="new to you" value={analysis.uniqueCount - analysis.knownUnique} />
            </div>

            <p className="mt-3 text-sm text-dim">{describeCoverage(analysis.coveragePercent)}</p>

            <section className="mt-6 rounded-xl border border-white/5 bg-graphite p-5">
              <p className="mb-3 text-xs uppercase tracking-wider text-dim">The passage</p>
              <div dir={rtl ? 'rtl' : 'ltr'} className="text-[17px] leading-relaxed">
                <InteractiveText
                  text={analyzed.slice(0, INTERACTIVE_CHARACTER_LIMIT)}
                  languageCode={activeLanguage.code}
                />
                {analyzed.length > INTERACTIVE_CHARACTER_LIMIT && (
                  <span className="text-dim">
                    {analyzed.slice(INTERACTIVE_CHARACTER_LIMIT)}
                  </span>
                )}
              </div>
              <p className="mt-3 text-xs text-dim">
                {analyzed.length > INTERACTIVE_CHARACTER_LIMIT
                  ? `Select any word in the first ${INTERACTIVE_CHARACTER_LIMIT} characters to see its meaning. The counts above cover the whole passage.`
                  : 'Select any word to see its meaning.'}
              </p>
            </section>

            <section className="mt-6">
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="text-lg text-mist">Words new to you</h2>
                <span className="text-xs text-dim">most frequent first</span>
                <span className="ml-auto text-xs text-dim">{newWords.length}</span>
              </div>

              {saveError && (
                <p className="mb-3 rounded-lg border border-coral/25 bg-coral-dim px-4 py-2 text-sm text-coral">
                  {saveError}
                </p>
              )}

              {newWords.length === 0 ? (
                <p className="rounded-xl border border-white/5 bg-graphite px-4 py-6 text-center text-sm text-dim">
                  <Sparkles size={16} className="mb-2 inline-block text-mint" />
                  <br />
                  You already know every word in this passage.
                </p>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
                  {newWords.slice(0, VISIBLE_NEW_WORDS).map((entry) => (
                    <div
                      key={entry.word}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-graphite px-3 py-2"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-mist">{entry.word}</span>
                        {entry.count > 1 && (
                          <span className="text-[11px] text-dim">appears {entry.count}×</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => void saveWord(entry)}
                        disabled={savingWord === entry.word}
                        title={`Save "${entry.word}" to your notebook`}
                        aria-label={`Save ${entry.word} to your notebook`}
                        className="shrink-0 rounded-md border border-white/10 p-1.5 text-dim transition-colors hover:border-cyan-400/40 hover:text-cyan-100 disabled:opacity-50"
                      >
                        <BookPlus size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {newWords.length > VISIBLE_NEW_WORDS && (
                <p className="mt-3 text-xs text-dim">
                  Showing the {VISIBLE_NEW_WORDS} most frequent of {newWords.length}. Save some and
                  the rest move up.
                </p>
              )}

              {savedWords.size > 0 && (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-mint">
                  <Check size={14} /> Saved {savedWords.size} to your notebook.
                </p>
              )}
            </section>
          </>
        )}
      </PageContent>
    </>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-graphite px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-dim">{label}</p>
      <p className={`mt-1 font-heading text-3xl ${accent ? 'text-violet' : 'text-mist'}`}>{value}</p>
    </div>
  );
}
