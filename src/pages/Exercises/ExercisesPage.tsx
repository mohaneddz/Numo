import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Copy, Loader2, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { PracticeCard } from '../../components/practice/PracticeCard';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { DropdownSelect, type DropdownOption } from '../../components/ui/DropdownSelect';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  generateExerciseDraft,
  type ExerciseDomain,
  type GenerateExerciseDraftOutput,
  type PracticeItem,
} from '../../lib/sessionEngine';
import { resolveQuickExercise } from '../../components/exercises/quick/registry';
import { UnsupportedExerciseCard } from '../../components/exercises/shared/UnsupportedExerciseCard';
import { learnExerciseRegistry } from '../../components/exercises/learn/registry';
import { quickExerciseRegistry } from '../../components/exercises/quick/registry';
import { reviewExerciseRegistry } from '../../components/exercises/review/registry';
import { scriptExerciseRegistry } from '../../components/exercises/script/registry';
import { speakExerciseRegistry } from '../../components/exercises/speak/registry';
import { writeExerciseRegistry } from '../../components/exercises/write/registry';
import { getLessonCatalog } from '../../services/learningPlanService';

const exerciseGroupOptions: Array<{ value: ExerciseDomain; label: string }> = [
  { value: 'learn', label: 'Learn' },
  { value: 'quick', label: 'Quick' },
  { value: 'review', label: 'Review' },
  { value: 'script', label: 'Script' },
  { value: 'speak', label: 'Speak' },
  { value: 'write', label: 'Write' },
];

const conceptSuggestions = [
  'greetings',
  'food and drink',
  'travel',
  'daily routine',
  'questions',
  'pronunciation',
  'grammar',
];

const hiddenQuickExerciseTypes = new Set([
  'greeting_response',
  'context_meaning',
  'hanzi_pinyin',
  'kanji_reading',
  'radical_match',
  'kana_confusion',
]);

function toLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function parseExpectedAnswers(answer: string): string[] {
  return answer
    .split('||')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export default function ExercisesPage() {
  const navigate = useNavigate();
  const { activeLanguage, languages } = useLanguage();

  const exerciseCatalog = useMemo<Record<ExerciseDomain, string[]>>(
    () => ({
      learn: Object.keys(learnExerciseRegistry).sort(),
      quick: Object.keys(quickExerciseRegistry).filter((type) => !hiddenQuickExerciseTypes.has(type)).sort(),
      review: Object.keys(reviewExerciseRegistry).sort(),
      script: Object.keys(scriptExerciseRegistry).sort(),
      speak: Object.keys(speakExerciseRegistry).sort(),
      write: Object.keys(writeExerciseRegistry).sort(),
    }),
    [],
  );

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
  const [exerciseDomain, setExerciseDomain] = useState<ExerciseDomain>('quick');
  const [exerciseType, setExerciseType] = useState<string>(exerciseCatalog.quick[0] ?? '');
  const [unitOptions, setUnitOptions] = useState<DropdownOption[]>([]);
  const [unitId, setUnitId] = useState<string>('');
  const [concept, setConcept] = useState('');

  const [generated, setGenerated] = useState<GenerateExerciseDraftOutput | null>(null);
  const [generatedAll, setGeneratedAll] = useState<Array<{ exerciseType: string; draft: GenerateExerciseDraftOutput }>>([]);
  const [quickItem, setQuickItem] = useState<PracticeItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [allFeedback, setAllFeedback] = useState<Record<string, 'correct' | 'incorrect' | null>>({});
  const [allSelectedOptions, setAllSelectedOptions] = useState<Record<string, string[]>>({});

  const languageName = useMemo(() => {
    return languageOptions.find((entry) => entry.value === languageCode)?.label.split(' (')[0] ?? languageCode.toUpperCase();
  }, [languageCode, languageOptions]);

  const exerciseOptions = useMemo<DropdownOption[]>(
    () => exerciseCatalog[exerciseDomain].map((value) => ({ value, label: toLabel(value) })),
    [exerciseCatalog, exerciseDomain],
  );

  const selectedUnit = useMemo(() => {
    if (!unitId) return null;
    const selected = unitOptions.find((unit) => unit.value === unitId);
    if (!selected) return null;
    return { id: selected.value, title: selected.label };
  }, [unitId, unitOptions]);

  const activeQuickExercise = quickItem ? resolveQuickExercise(quickItem) : null;

  useEffect(() => {
    if (!languageOptions.some((entry) => entry.value === languageCode)) {
      setLanguageCode(activeLanguage.code);
    }
  }, [activeLanguage.code, languageCode, languageOptions]);

  useEffect(() => {
    const next = exerciseCatalog[exerciseDomain];
    if (!next.includes(exerciseType)) {
      setExerciseType(next[0] ?? '');
    }
  }, [exerciseCatalog, exerciseDomain, exerciseType]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const snapshot = await getLessonCatalog(languageCode);
        if (cancelled) return;
        const nextOptions = snapshot.units.map((entry) => ({
          value: entry.unit.id,
          label: entry.unit.title,
        }));
        setUnitOptions(nextOptions);
        if (nextOptions.length === 0) {
          setUnitId('');
          return;
        }
        if (!nextOptions.some((entry) => entry.value === unitId)) {
          setUnitId(nextOptions[0].value);
        }
      } catch {
        if (!cancelled) {
          setUnitOptions([]);
          setUnitId('');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [languageCode, unitId]);

  const handleCreate = async () => {
    if (!exerciseType) return;
    setIsGenerating(true);
    setLoadError(null);
    setCopyStatus(null);
    setFeedback(null);
    setSelectedOptions([]);
    setAllFeedback({});
    setAllSelectedOptions({});
    setGeneratedAll([]);
    try {
      const draft = await generateExerciseDraft({
        languageCode,
        languageName,
        exerciseDomain,
        exerciseType,
        unit: selectedUnit ?? undefined,
        concept: concept.trim() || undefined,
      });
      setGenerated(draft);
      setQuickItem(draft.quickItem);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to create exercise');
      setGenerated(null);
      setQuickItem(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAll = async () => {
    const types = exerciseCatalog[exerciseDomain] ?? [];
    if (types.length === 0) return;
    setIsGeneratingAll(true);
    setLoadError(null);
    setCopyStatus(null);
    setFeedback(null);
    setSelectedOptions([]);
    setAllFeedback({});
    setAllSelectedOptions({});
    setGenerated(null);
    setQuickItem(null);
    try {
      const drafts = await Promise.all(types.map(async (type) => {
        const draft = await generateExerciseDraft({
          languageCode,
          languageName,
          exerciseDomain,
          exerciseType: type,
          unit: selectedUnit ?? undefined,
          concept: concept.trim() || undefined,
        });
        return { exerciseType: type, draft };
      }));
      setGeneratedAll(drafts);
      setAllFeedback({});
      setAllSelectedOptions({});
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to create exercises');
      setGeneratedAll([]);
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const handleAnswer = (answer: string, structuredResponse?: Record<string, unknown>) => {
    if (!quickItem || feedback !== null) return;
    const picked = Array.isArray(structuredResponse?.selectedOptions)
      ? (structuredResponse.selectedOptions as unknown[]).map((entry) => String(entry).trim()).filter(Boolean)
      : [typeof structuredResponse?.selectedOption === 'string' ? structuredResponse.selectedOption : answer].filter(Boolean);
    setSelectedOptions(picked);
    const isMatchCorrect =
      quickItem.type === 'match'
      && quickItem.pairs
      && structuredResponse
      && structuredResponse.mapping
      && typeof structuredResponse.mapping === 'object'
        ? quickItem.pairs.every((pair) => (structuredResponse.mapping as Record<string, unknown>)[pair.left] === pair.right)
        : null;
    const isCorrect = isMatchCorrect ?? (() => {
      const expected = new Set(parseExpectedAnswers(quickItem.answer));
      const selected = new Set(picked.map((entry) => entry.toLowerCase()));
      if (expected.size === 0 || selected.size === 0) return false;
      if (expected.size !== selected.size) return false;
      return Array.from(expected).every((entry) => selected.has(entry));
    })();
    setFeedback(isCorrect ? 'correct' : 'incorrect');
  };

  const handleCopy = async () => {
    if (!generated) return;
    const payload = {
      input: generated.input,
      template: generated.template,
      result: generated.result,
    };
    try {
      await navigator.clipboard.writeText(formatJson(payload));
      setCopyStatus('Copied JSON to clipboard.');
    } catch {
      setCopyStatus('Clipboard copy failed.');
    }
  };

  const handleCopyBlock = async (value: unknown, label: string) => {
    try {
      await navigator.clipboard.writeText(formatJson(value));
      setCopyStatus(`${label} copied.`);
    } catch {
      setCopyStatus(`Failed to copy ${label.toLowerCase()}.`);
    }
  };

  const handleAllAnswer = (exerciseTypeKey: string, item: PracticeItem, answer: string, structuredResponse?: Record<string, unknown>) => {
    if (allFeedback[exerciseTypeKey] !== null && allFeedback[exerciseTypeKey] !== undefined) return;
    const picked = Array.isArray(structuredResponse?.selectedOptions)
      ? (structuredResponse.selectedOptions as unknown[]).map((entry) => String(entry).trim()).filter(Boolean)
      : [typeof structuredResponse?.selectedOption === 'string' ? structuredResponse.selectedOption : answer].filter(Boolean);
    setAllSelectedOptions((previous) => ({ ...previous, [exerciseTypeKey]: picked }));
    const expected = new Set(parseExpectedAnswers(item.answer));
    const selected = new Set(picked.map((entry) => entry.toLowerCase()));
    const isCorrect = expected.size > 0
      && expected.size === selected.size
      && Array.from(expected).every((entry) => selected.has(entry));
    setAllFeedback((previous) => ({ ...previous, [exerciseTypeKey]: isCorrect ? 'correct' : 'incorrect' }));
  };

  return (
    <PageContent width="narrow" className="pb-12">
      <PageActions>
        <button className="page-primary-action" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>
      </PageActions>

      <SpotlightCard className="p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-[20px] font-bold text-white">Exercises Generator</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1.5 text-[12px] uppercase tracking-wide text-dim">
            Language
            <DropdownSelect value={languageCode} onChange={setLanguageCode} options={languageOptions} />
          </label>

          <label className="grid gap-1.5 text-[12px] uppercase tracking-wide text-dim">
            Type
            <DropdownSelect
              value={exerciseDomain}
              onChange={(value) => setExerciseDomain(value as ExerciseDomain)}
              options={exerciseGroupOptions}
            />
          </label>

          <label className="grid gap-1.5 text-[12px] uppercase tracking-wide text-dim">
            Exercise
            <DropdownSelect value={exerciseType} onChange={setExerciseType} options={exerciseOptions} />
          </label>

          <label className="grid gap-1.5 text-[12px] uppercase tracking-wide text-dim">
            Unit
            <DropdownSelect
              value={unitId}
              onChange={setUnitId}
              options={unitOptions.length > 0 ? unitOptions : [{ value: '', label: 'No units available' }]}
            />
          </label>

          <label className="grid gap-1.5 text-[12px] uppercase tracking-wide text-dim md:col-span-2">
            Concept (Optional Guidance)
            <input
              list="exercise-concept-suggestions"
              value={concept}
              onChange={(event) => setConcept(event.target.value)}
              className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-[13px] text-white outline-none focus:border-white/25"
              placeholder="e.g. travel or pronunciation"
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
            onClick={() => void handleCreate()}
            disabled={isGenerating || isGeneratingAll || !exerciseType}
            className="page-primary-action"
            style={{ opacity: isGenerating ? 0.6 : 1 }}
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {isGenerating ? 'Creating...' : `Create ${toLabel(exerciseType)}`}
          </button>

          <button
            type="button"
            onClick={() => void handleGenerateAll()}
            disabled={isGenerating || isGeneratingAll || exerciseOptions.length === 0}
            className="page-primary-action"
            style={{ opacity: isGeneratingAll ? 0.6 : 1 }}
          >
            {isGeneratingAll ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {isGeneratingAll ? 'Creating All...' : `Generate All (${exerciseOptions.length})`}
          </button>
        </div>
      </SpotlightCard>

      {loadError ? (
        <SpotlightCard className="p-4 text-rose-300 text-[14px]">
          {loadError}
        </SpotlightCard>
      ) : null}

      {generated ? (
        <SpotlightCard className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-[18px] font-semibold text-white">Generated Exercise</h3>
            <button type="button" className="page-primary-action" onClick={() => void handleCopy()}>
              <Copy size={16} /> Copy
            </button>
          </div>

          {copyStatus ? <p className="mb-4 text-[12px] text-dim">{copyStatus}</p> : null}

          {quickItem ? (
            <PracticeCard>
              <div className="text-[12px] uppercase tracking-wider text-dim mb-2">
                {toLabel(quickItem.type)} | {languageName}
                {selectedUnit ? ` | ${selectedUnit.title}` : ''}
                {concept.trim() ? ` | ${concept.trim()}` : ''}
              </div>
              <p className="text-[18px] text-white font-medium mb-6">{quickItem.prompt}</p>

              {activeQuickExercise ? (
                <activeQuickExercise.component
                  item={quickItem}
                  disabled={feedback !== null || isGenerating}
                  onAnswer={handleAnswer}
                  selectionFeedback={feedback ? {
                    selectedOption: selectedOptions[0],
                    selectedOptions,
                    isCorrect: feedback === 'correct',
                    correctAnswer: quickItem.answer,
                    correctAnswers: parseExpectedAnswers(quickItem.answer),
                  } : undefined}
                />
              ) : (
                <UnsupportedExerciseCard reason={`Unsupported quick exercise payload for "${quickItem.type}".`} />
              )}
            </PracticeCard>
          ) : null}

          <div className="mt-4 grid gap-3">
            <details className="rounded-lg border border-white/10 bg-black/20 p-3" open>
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-[12px] uppercase tracking-wide text-dim">
                Input JSON Sent To AI
                <button
                  type="button"
                  className="page-primary-action"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void handleCopyBlock(generated.input, 'Input JSON');
                  }}
                >
                  <Copy size={14} /> Copy
                </button>
              </summary>
              <pre className="mt-3 overflow-auto text-[12px] text-slate-100">{formatJson(generated.input)}</pre>
            </details>

            <details className="rounded-lg border border-white/10 bg-black/20 p-3">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-[12px] uppercase tracking-wide text-dim">
                Template Followed
                <button
                  type="button"
                  className="page-primary-action"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void handleCopyBlock(generated.template, 'Template');
                  }}
                >
                  <Copy size={14} /> Copy
                </button>
              </summary>
              <pre className="mt-3 overflow-auto text-[12px] text-slate-100">{formatJson(generated.template)}</pre>
            </details>

            <details className="rounded-lg border border-white/10 bg-black/20 p-3">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-[12px] uppercase tracking-wide text-dim">
                Exercise Result Taken From AI
                <button
                  type="button"
                  className="page-primary-action"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void handleCopyBlock(generated.result, 'Result');
                  }}
                >
                  <Copy size={14} /> Copy
                </button>
              </summary>
              <pre className="mt-3 overflow-auto text-[12px] text-slate-100">{formatJson(generated.result)}</pre>
            </details>
          </div>
        </SpotlightCard>
      ) : null}

      {generatedAll.length > 0 ? (
        <SpotlightCard className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-[18px] font-semibold text-white">Generated All Exercises</h3>
            <p className="text-[12px] text-dim">{generatedAll.length} generated</p>
          </div>

          {copyStatus ? <p className="mb-4 text-[12px] text-dim">{copyStatus}</p> : null}

          <div className="grid gap-3">
            {generatedAll.map((entry) => (
              <div key={entry.exerciseType} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[14px] font-semibold text-white">
                    {toLabel(entry.exerciseType)} | {languageName}
                  </p>
                </div>
                {entry.draft.quickItem ? (
                  <div className="mb-3">
                    {(() => {
                      const item = entry.draft.quickItem as PracticeItem;
                      const registration = resolveQuickExercise(item);
                      if (!registration) {
                        return <UnsupportedExerciseCard reason={`Unsupported quick exercise payload for "${item.type}".`} />;
                      }
                      const exerciseTypeKey = entry.exerciseType;
                      const itemFeedback = allFeedback[exerciseTypeKey] ?? null;
                      const itemSelected = allSelectedOptions[exerciseTypeKey] ?? [];
                      return (
                        <PracticeCard>
                          <p className="text-[16px] text-white font-medium mb-4">{item.prompt}</p>
                          <registration.component
                            item={item}
                            disabled={itemFeedback !== null || isGeneratingAll}
                            onAnswer={(answer, structuredResponse) => handleAllAnswer(exerciseTypeKey, item, answer, structuredResponse)}
                            selectionFeedback={itemFeedback ? {
                              selectedOption: itemSelected[0],
                              selectedOptions: itemSelected,
                              isCorrect: itemFeedback === 'correct',
                              correctAnswer: item.answer,
                              correctAnswers: parseExpectedAnswers(item.answer),
                            } : undefined}
                          />
                        </PracticeCard>
                      );
                    })()}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="page-primary-action"
                    onClick={() => {
                      void handleCopyBlock(entry.draft.input, `${toLabel(entry.exerciseType)} input`);
                    }}
                  >
                    <Copy size={14} /> Copy Input JSON
                  </button>
                  <button
                    type="button"
                    className="page-primary-action"
                    onClick={() => {
                      void handleCopyBlock(entry.draft.template, `${toLabel(entry.exerciseType)} template`);
                    }}
                  >
                    <Copy size={14} /> Copy Template JSON
                  </button>
                  <button
                    type="button"
                    className="page-primary-action"
                    onClick={() => {
                      void handleCopyBlock(entry.draft.result, `${toLabel(entry.exerciseType)} result`);
                    }}
                  >
                    <Copy size={14} /> Copy Result JSON
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SpotlightCard>
      ) : null}
    </PageContent>
  );
}
