import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, XCircle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { PracticeCard } from '../../components/practice/PracticeCard';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { useLanguage } from '../../contexts/LanguageContext';
import { generateInfiniteExercise, type PracticeItem, type PracticeItemType } from '../../lib/sessionEngine';
import { resolveQuickExercise } from '../../components/exercises/quick/registry';
import { UnsupportedExerciseCard } from '../../components/exercises/shared/UnsupportedExerciseCard';

type ExerciseFilterType = PracticeItemType | 'any';

const exerciseTypeOptions: Array<{ value: ExerciseFilterType; label: string }> = [
  { value: 'any', label: 'Any Type' },
  { value: 'mcq', label: 'MCQ' },
  { value: 'translate', label: 'Translate' },
  { value: 'speak', label: 'Speak' },
  { value: 'match', label: 'Match' },
  { value: 'image_to_word', label: 'Image -> Word' },
  { value: 'word_to_image', label: 'Word -> Image' },
  { value: 'sound_to_word', label: 'Sound -> Word' },
  { value: 'sound_to_image', label: 'Sound -> Image' },
  { value: 'phrase_assembly', label: 'Phrase Assembly' },
  { value: 'single_cloze', label: 'Single Cloze' },
  { value: 'greeting_response', label: 'Greeting Response' },
  { value: 'context_meaning', label: 'Context Meaning' },
  { value: 'hanzi_pinyin', label: 'Hanzi/Pinyin' },
  { value: 'kanji_reading', label: 'Kanji Reading' },
  { value: 'radical_match', label: 'Radical Match' },
  { value: 'kana_confusion', label: 'Kana Confusion' },
];

const conceptSuggestions = [
  'grammar',
  'pronunciation',
  'travel',
  'daily conversation',
  'verbs',
  'vocabulary',
  'food and drink',
  'work and study',
  'questions and answers',
  'listening discrimination',
];

function formatTypeLabel(type: PracticeItemType): string {
  if (type === 'mcq') return 'Multiple Choice';
  if (type === 'translate') return 'Translation';
  if (type === 'speak') return 'Speaking';
  if (type === 'match') return 'Matching';
  if (type === 'image_to_word') return 'Image to Word';
  if (type === 'word_to_image') return 'Word to Image';
  if (type === 'sound_to_word') return 'Sound to Word';
  if (type === 'sound_to_image') return 'Sound to Image';
  if (type === 'phrase_assembly') return 'Phrase Assembly';
  if (type === 'single_cloze') return 'Single Cloze';
  if (type === 'greeting_response') return 'Greeting Response';
  if (type === 'context_meaning') return 'Context Meaning';
  if (type === 'hanzi_pinyin') return 'Hanzi Pinyin';
  if (type === 'kanji_reading') return 'Kanji Reading';
  if (type === 'radical_match') return 'Radical Match';
  return 'Kana Confusion';
}

export default function ExercisesPage() {
  const navigate = useNavigate();
  const { activeLanguage, languages } = useLanguage();

  const languageOptions = useMemo(() => {
    const entries = new Map<string, string>();
    for (const language of languages) {
      entries.set(language.code, language.name);
    }
    if (!entries.has(activeLanguage.code)) {
      entries.set(activeLanguage.code, activeLanguage.name);
    }
    return Array.from(entries.entries()).map(([code, name]) => ({
      value: code,
      label: `${name} (${code.toUpperCase()})`,
    }));
  }, [activeLanguage.code, activeLanguage.name, languages]);

  const [languageCode, setLanguageCode] = useState(activeLanguage.code);
  const [exerciseType, setExerciseType] = useState<ExerciseFilterType>('any');
  const [mode, setMode] = useState('quick');
  const [concept, setConcept] = useState('');
  const [source, setSource] = useState('dev-infinite');

  const [currentItem, setCurrentItem] = useState<PracticeItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const languageName = useMemo(() => {
    return languageOptions.find((entry) => entry.value === languageCode)?.label.split(' (')[0] ?? languageCode.toUpperCase();
  }, [languageCode, languageOptions]);

  const activeExercise = currentItem ? resolveQuickExercise(currentItem) : null;

  useEffect(() => {
    if (!languageOptions.some((entry) => entry.value === languageCode)) {
      setLanguageCode(activeLanguage.code);
    }
  }, [activeLanguage.code, languageCode, languageOptions]);

  const generateNext = async () => {
    setIsGenerating(true);
    setLoadError(null);
    setFeedback(null);
    try {
      const generated = await generateInfiniteExercise({
        languageCode,
        languageName,
        mode: mode.trim() || 'quick',
        source: source.trim() || 'dev-infinite',
        concept: concept.trim() || undefined,
        forceType: exerciseType === 'any' ? undefined : exerciseType,
      });
      setCurrentItem(generated);
      setGeneratedCount((previous) => previous + 1);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to generate exercise');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    void generateNext();
    // run once on initial page load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnswer = (answer: string, structuredResponse?: Record<string, unknown>) => {
    if (!currentItem || feedback !== null) return;
    const isMatchCorrect =
      currentItem.type === 'match' &&
      currentItem.pairs &&
      structuredResponse &&
      structuredResponse.mapping &&
      typeof structuredResponse.mapping === 'object'
        ? currentItem.pairs.every((pair) => (structuredResponse.mapping as Record<string, unknown>)[pair.left] === pair.right)
        : null;

    const isCorrect = isMatchCorrect ?? answer.toLowerCase().trim() === currentItem.answer.toLowerCase().trim();
    if (isCorrect) {
      setCorrectCount((previous) => previous + 1);
      setFeedback('correct');
    } else {
      setFeedback('incorrect');
    }
  };

  const accuracy = generatedCount > 0 ? Math.round((correctCount / generatedCount) * 100) : 0;

  return (
    <PageContent width="narrow" className="pb-12">
      <PageActions>
        <button className="page-primary-action" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>
      </PageActions>

      <SpotlightCard className="p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-[20px] font-bold text-white">Exercises (DEV Infinite Mode)</h2>
          <span className="pill pill-violet">{generatedCount} generated</span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1.5 text-[12px] uppercase tracking-wide text-dim">
            Language
            <DropdownSelect value={languageCode} onChange={setLanguageCode} options={languageOptions} />
          </label>

          <label className="grid gap-1.5 text-[12px] uppercase tracking-wide text-dim">
            Type
            <DropdownSelect value={exerciseType} onChange={(value) => setExerciseType(value as ExerciseFilterType)} options={exerciseTypeOptions} />
          </label>

          <label className="grid gap-1.5 text-[12px] uppercase tracking-wide text-dim">
            Mode
            <input
              value={mode}
              onChange={(event) => setMode(event.target.value)}
              className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-[13px] text-white outline-none focus:border-white/25"
              placeholder="quick"
            />
          </label>

          <label className="grid gap-1.5 text-[12px] uppercase tracking-wide text-dim">
            Source
            <input
              value={source}
              onChange={(event) => setSource(event.target.value)}
              className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-[13px] text-white outline-none focus:border-white/25"
              placeholder="dev-infinite"
            />
          </label>

          <label className="grid gap-1.5 text-[12px] uppercase tracking-wide text-dim md:col-span-2">
            Concept
            <input
              list="exercise-concept-suggestions"
              value={concept}
              onChange={(event) => setConcept(event.target.value)}
              className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-[13px] text-white outline-none focus:border-white/25"
              placeholder="e.g. grammar, travel, pronunciation"
            />
          </label>
        </div>

        <datalist id="exercise-concept-suggestions">
          {conceptSuggestions.map((entry) => (
            <option key={entry} value={entry} />
          ))}
        </datalist>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void generateNext()}
            disabled={isGenerating}
            className="page-primary-action"
            style={{ opacity: isGenerating ? 0.6 : 1 }}
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {isGenerating ? 'Generating...' : 'Next Exercise'}
          </button>
          <span className="text-[12px] text-dim">Accuracy: {accuracy}%</span>
        </div>
      </SpotlightCard>

      {loadError && (
        <SpotlightCard className="p-4 text-rose-300 text-[14px]">
          {loadError}
        </SpotlightCard>
      )}

      {currentItem && (
        <PracticeCard>
          <div className="text-[12px] uppercase tracking-wider text-dim mb-2">
            {formatTypeLabel(currentItem.type)} • {languageName}
            {concept.trim() ? ` • ${concept.trim()}` : ''}
          </div>
          <p className="text-[18px] text-white font-medium mb-6">{currentItem.prompt}</p>

          {activeExercise ? (
            <activeExercise.component item={currentItem} disabled={feedback !== null || isGenerating} onAnswer={handleAnswer} />
          ) : (
            <UnsupportedExerciseCard reason={`Unsupported quick exercise payload for "${currentItem.type}".`} />
          )}

          {feedback === 'correct' && (
            <div className="mt-6 flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
              <CheckCircle2 size={18} /> Correct.
            </div>
          )}

          {feedback === 'incorrect' && (
            <div className="mt-6 flex flex-col gap-2 text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
              <div className="flex items-center gap-2">
                <XCircle size={18} /> Not correct.
              </div>
              {currentItem.type === 'match' && currentItem.pairs ? (
                <div className="text-[14px] text-white">
                  {currentItem.pairs.map((pair) => (
                    <div key={pair.left}>
                      {pair.left} {'->'} {pair.right}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[14px]">
                  Correct answer: <span className="font-bold text-white">{currentItem.answer}</span>
                </div>
              )}
            </div>
          )}
        </PracticeCard>
      )}
    </PageContent>
  );
}
