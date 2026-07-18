import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Copy, Loader2, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { PracticeCard } from '../../components/practice/PracticeCard';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { DropdownSelect, type DropdownOption } from '../../components/ui/DropdownSelect';
import { InteractiveText } from '../../components/exercises/shared/InteractiveText';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  generateExerciseDraft,
  type GenerateExerciseDraftOutput,
  type PracticeItem,
} from '../../lib/sessionEngine';
import { resolveQuickExercise } from '../../components/exercises/quick/registry';
import { UnsupportedExerciseCard } from '../../components/exercises/shared/UnsupportedExerciseCard';
import { getLessonCatalog } from '../../services/learningPlanService';
import {
  getExerciseByUserKey,
  getExerciseCategories,
  getExercisesByCategory,
  type ExerciseCatalogCategory,
} from '../../services/exercises/exerciseCatalog';

const conceptSuggestions = [
  'greetings',
  'food and drink',
  'travel',
  'daily routine',
  'questions',
  'pronunciation',
  'grammar',
];

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

  const categories = useMemo(() => getExerciseCategories(), []);
  const categoryOptions = useMemo<DropdownOption[]>(
    () => categories.map((category) => ({ value: category, label: category })),
    [categories],
  );

  const [category, setCategory] = useState<ExerciseCatalogCategory>(categories[0] ?? 'Selection');
  const [exerciseKey, setExerciseKey] = useState<string>('');

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
  const [unitOptions, setUnitOptions] = useState<DropdownOption[]>([]);
  const [unitId, setUnitId] = useState<string>('');
  const [concept, setConcept] = useState('');

  const [generated, setGenerated] = useState<GenerateExerciseDraftOutput | null>(null);
  const [generatedAll, setGeneratedAll] = useState<Array<{ exerciseKey: string; draft: GenerateExerciseDraftOutput }>>([]);
  const [quickItem, setQuickItem] = useState<PracticeItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [allFeedback, setAllFeedback] = useState<Record<string, 'correct' | 'incorrect' | null>>({});
  const [allSelectedOptions, setAllSelectedOptions] = useState<Record<string, string[]>>({});
  const [rapidMode, setRapidMode] = useState(false);

  const languageName = useMemo(() => {
    return languageOptions.find((entry) => entry.value === languageCode)?.label.split(' (')[0] ?? languageCode.toUpperCase();
  }, [languageCode, languageOptions]);

  const exercisesInCategory = useMemo(() => getExercisesByCategory(category), [category]);

  const exerciseOptions = useMemo<DropdownOption[]>(
    () => exercisesInCategory.map((entry) => ({ value: entry.userKey, label: entry.displayName })),
    [exercisesInCategory],
  );

  const selectedEntry = useMemo(() => getExerciseByUserKey(exerciseKey), [exerciseKey]);

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
    const available = getExercisesByCategory(category);
    if (available.length === 0) {
      setExerciseKey('');
      return;
    }
    if (!available.some((entry) => entry.userKey === exerciseKey)) {
      setExerciseKey(available[0].userKey);
    }
  }, [category, exerciseKey]);

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
    if (!selectedEntry) return;
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
        exerciseDomain: selectedEntry.adapter.engineDomain,
        exerciseType: selectedEntry.adapter.internalType,
        userExerciseKey: selectedEntry.userKey,
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
    if (exercisesInCategory.length === 0) return;
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
      const drafts = await Promise.all(exercisesInCategory.map(async (entry) => {
        const draft = await generateExerciseDraft({
          languageCode,
          languageName,
          exerciseDomain: entry.adapter.engineDomain,
          exerciseType: entry.adapter.internalType,
          userExerciseKey: entry.userKey,
          unit: selectedUnit ?? undefined,
          concept: concept.trim() || undefined,
        });
        return { exerciseKey: entry.userKey, draft };
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
    const isMatchCorrect =
      item.type === 'match'
      && item.pairs
      && structuredResponse
      && structuredResponse.mapping
      && typeof structuredResponse.mapping === 'object'
        ? item.pairs.every((pair) => (structuredResponse.mapping as Record<string, unknown>)[pair.left] === pair.right)
        : null;

    const isCorrect = isMatchCorrect ?? (() => {
      const expected = new Set(parseExpectedAnswers(item.answer));
      const selected = new Set(picked.map((entry) => entry.toLowerCase()));
      return expected.size > 0
        && expected.size === selected.size
        && Array.from(expected).every((entry) => selected.has(entry));
    })();
    setAllFeedback((previous) => ({ ...previous, [exerciseTypeKey]: isCorrect ? 'correct' : 'incorrect' }));
  };

  return (
    <PageContent className="max-w-none pb-12">
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
            Category
            <DropdownSelect
              value={category}
              onChange={(value) => setCategory(value as ExerciseCatalogCategory)}
              options={categoryOptions}
            />
          </label>

          <label className="grid gap-1.5 text-[12px] uppercase tracking-wide text-dim">
            Exercise
            <DropdownSelect value={exerciseKey} onChange={setExerciseKey} options={exerciseOptions} />
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
            onClick={() => {
              void handleCreate();
            }}
            disabled={isGenerating || isGeneratingAll || !selectedEntry}
            className="page-primary-action"
            style={{ opacity: isGenerating ? 0.6 : 1 }}
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {isGenerating ? 'Creating...' : `Create ${selectedEntry?.displayName ?? 'Exercise'}`}
          </button>

          <button
            type="button"
            onClick={() => {
              void handleGenerateAll();
            }}
            disabled={isGenerating || isGeneratingAll || exerciseOptions.length === 0}
            className="page-primary-action"
            style={{ opacity: isGeneratingAll ? 0.6 : 1 }}
          >
            {isGeneratingAll ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {isGeneratingAll ? 'Creating All...' : `Generate All (${exerciseOptions.length})`}
          </button>

          <button
            type="button"
            onClick={() => setRapidMode((value) => !value)}
            className={`rounded-lg border px-4 py-2 text-[13px] font-medium transition-colors ${
              rapidMode
                ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100'
                : 'border-white/15 bg-white/5 text-dim hover:text-white'
            }`}
            aria-pressed={rapidMode}
          >
            Rapid mode: {rapidMode ? 'ON' : 'OFF'}
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
            <button type="button" className="page-primary-action" onClick={() => {
              void handleCopy();
            }}>
              <Copy size={16} /> Copy
            </button>
          </div>

          {copyStatus ? <p className="mb-4 text-[12px] text-dim">{copyStatus}</p> : null}

          {quickItem ? (
            <PracticeCard>
              <div className="text-[12px] uppercase tracking-wider text-dim mb-2">
                {selectedEntry?.displayName ?? quickItem.userKey ?? quickItem.type} | {languageName}
                {selectedUnit ? ` | ${selectedUnit.title}` : ''}
                {concept.trim() ? ` | ${concept.trim()}` : ''}
              </div>
              <InteractiveText
                text={quickItem.prompt}
                languageCode={quickItem.languageCode ?? languageCode}
                className="text-[18px] text-white font-medium mb-6 block"
              />

              {activeQuickExercise ? (
                <activeQuickExercise.component
                  item={quickItem}
                  disabled={feedback !== null || isGenerating}
                  rapidMode={rapidMode}
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
          ) : (
            <UnsupportedExerciseCard reason="Draft did not produce a runnable preview component." />
          )}

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

          <div className="grid gap-3 md:grid-cols-3">
            {generatedAll.map((entry) => {
              const catalogEntry = getExerciseByUserKey(entry.exerciseKey);
              return (
                <div key={entry.exerciseKey} className="rounded-lg border border-white/10 bg-black/20 p-3 flex flex-col h-full">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[14px] font-semibold text-white">
                      {catalogEntry?.displayName ?? entry.exerciseKey} | {languageName}
                    </p>
                  </div>
                  {entry.draft.quickItem ? (
                    <div className="mb-3 flex-1">
                      {(() => {
                        const item = entry.draft.quickItem as PracticeItem;
                        const registration = resolveQuickExercise(item);
                        if (!registration) {
                          return <UnsupportedExerciseCard reason={`Unsupported quick exercise payload for "${item.type}".`} />;
                        }
                        const exerciseTypeKey = entry.exerciseKey;
                        const itemFeedback = allFeedback[exerciseTypeKey] ?? null;
                        const itemSelected = allSelectedOptions[exerciseTypeKey] ?? [];
                        return (
                          <PracticeCard>
                            <InteractiveText
                              text={item.prompt}
                              languageCode={item.languageCode ?? languageCode}
                              className="text-[16px] text-white font-medium mb-4 block"
                            />
                            <registration.component
                              item={item}
                              disabled={itemFeedback !== null || isGeneratingAll}
                              rapidMode={rapidMode}
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
                  ) : (
                    <div className="mb-3 flex-1">
                      <UnsupportedExerciseCard reason="Draft did not produce a runnable preview component." />
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-auto">
                    <button
                      type="button"
                      className="p-2 rounded-md hover:bg-white/10 transition-colors text-blue-400"
                      title="Copy Input JSON"
                      onClick={() => {
                        void handleCopyBlock(entry.draft.input, `${catalogEntry?.displayName ?? entry.exerciseKey} input`);
                      }}
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      type="button"
                      className="p-2 rounded-md hover:bg-white/10 transition-colors text-emerald-400"
                      title="Copy Template JSON"
                      onClick={() => {
                        void handleCopyBlock(entry.draft.template, `${catalogEntry?.displayName ?? entry.exerciseKey} template`);
                      }}
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      type="button"
                      className="p-2 rounded-md hover:bg-white/10 transition-colors text-amber-400"
                      title="Copy Result JSON"
                      onClick={() => {
                        void handleCopyBlock(entry.draft.result, `${catalogEntry?.displayName ?? entry.exerciseKey} result`);
                      }}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </SpotlightCard>
      ) : null}
    </PageContent>
  );
}
