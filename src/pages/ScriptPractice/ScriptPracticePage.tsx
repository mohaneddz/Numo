import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContent } from '../../components/layout/PageLayout';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLanguageProgression } from '../../hooks/useLanguageProgression';
import { LockedPageState } from '../../components/ui/LockedPageState';
import type { ScriptPracticeMode, ScriptPracticePayload } from '../../types/scriptPractice';
import { scriptExerciseRegistry } from '../../components/exercises/script/registry';
import { UnsupportedExerciseCard } from '../../components/exercises/shared/UnsupportedExerciseCard';
import { ExerciseShell } from '../../components/exercises/shared/ExerciseShell';
import { ExerciseStateBanner } from '../../components/exercises/shared/ExerciseStateBanner';
import { ExerciseActionBar } from '../../components/exercises/shared/ExerciseActionBar';
import { integrationService } from '../../services/integrationService';
import { defaultScriptModel, scriptLanguageIsSupported } from '../../data/scriptModels';
import { ScriptCharacterPicker } from '../../components/script/ScriptCharacterPicker';
import { useProfileSession } from '../../contexts/ProfileSessionContext';
import { updateExerciseSignals } from '../../services/exercises/exerciseSignalsService';

const MODES: ScriptPracticeMode[] = ['watch', 'trace', 'guided_draw', 'free_draw', 'timed_recall_draw'];

export default function ScriptPracticePage() {
  const [searchParams] = useSearchParams();
  const { activeLanguage } = useLanguage();
  const { activeProfile } = useProfileSession();
  const { lockStates } = useLanguageProgression();
  // Driven by whether stroke data actually exists, rather than a separate list
  // that could drift away from the generated dataset.
  const enabled = useMemo(() => scriptLanguageIsSupported(activeLanguage.code), [activeLanguage.code]);
  const lock = lockStates.script_practice;

  const defaultModelKey = useMemo(
    () => defaultScriptModel(activeLanguage.code, searchParams.get('script') ?? undefined)?.key ?? 'script:default',
    [activeLanguage.code, searchParams],
  );

  const [scriptKey, setScriptKey] = useState(defaultModelKey);
  const [mode, setMode] = useState<ScriptPracticeMode>('trace');
  const [payload, setPayload] = useState<ScriptPracticePayload>({
    strokePaths: [],
    width: 380,
    height: 220,
    modelKey: defaultModelKey,
    mode: 'trace',
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [confusedUsed, setConfusedUsed] = useState(false);
  // Measured rather than estimated from stroke count, which is what the saved
  // duration used to be.
  const attemptStartedAtRef = useRef(Date.now());

  useEffect(() => {
    attemptStartedAtRef.current = Date.now();
  }, [scriptKey, mode]);

  const activeExercise = scriptExerciseRegistry[mode];

  const persistAttempt = async () => {
    setSaving(true);
    setStatus(null);
    const strokeCount = payload.strokePaths.length;
    const score = payload.score?.totalScore ?? Math.min(100, strokeCount * 12);
    const completion = Math.min(100, Math.round((score + Math.min(100, strokeCount * 5)) / 2));

    try {
      await integrationService.logScriptPracticeAttempt({
        languageCode: activeLanguage.code,
        scriptKey: scriptKey.trim() || defaultModelKey,
        mode,
        completionRatio: completion,
        durationMs: Math.max(1000, Date.now() - attemptStartedAtRef.current),
        success: completion >= 60,
        strokeData: {
          mode,
          strokeCount,
          payload,
          score: payload.score,
          captureOnly: false,
        },
      });

      if (activeProfile?.id) {
        await updateExerciseSignals(activeProfile.id, activeLanguage.code, {
          wasCorrect: completion >= 60,
          scriptTraceScore: mode === 'trace' || mode === 'guided_draw' ? score : undefined,
          scriptRecallScore: mode === 'free_draw' || mode === 'timed_recall_draw' ? score : undefined,
          confusedUsed,
          exerciseType: `script:${mode}`,
        });
      }

      setStatus(`Saved attempt: ${completion}% completion, ${strokeCount} strokes.`);
      setConfusedUsed(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to save attempt.');
    } finally {
      setSaving(false);
    }
  };

  if (!lock.unlocked) {
    return (
      <PageContent width="wide" className="pb-16">
        <LockedPageState
          title={lock.title}
          whatThisPageIsFor="Character writing practice tracked separately from recognition and pronunciation."
          whyLocked={lock.whyLocked}
          unlocksWhen={lock.unlocksWhen}
          nextAction={lock.nextAction}
          nextActionTo={enabled ? '/learn' : '/'}
        />
      </PageContent>
    );
  }

  if (!enabled) {
    return (
      <PageContent width="wide" className="pb-16">
        <ExerciseStateBanner tone="empty" message="Script practice covers Chinese and Japanese, the languages Numo has stroke-order data for." />
      </PageContent>
    );
  }

  return (
    <PageContent width="wide" className="pb-16">
      <div className="mx-auto max-w-4xl">
        <ExerciseShell
          title="Script Practice"
          subtitle={`Language: ${activeLanguage.name}`}
          progressLabel={mode}
          prompt="Use watch -> trace -> guided draw -> free draw -> timed recall to build memory and writing confidence."
          languageCode={activeLanguage.code}
          actions={(
            <ExerciseActionBar
              onHint={() => setStatus('Hint: keep stroke count and center alignment close to model.')}
              onConfused={() => setConfusedUsed(true)}
            />
          )}
        >
          <ScriptCharacterPicker
            languageCode={activeLanguage.code}
            selectedKey={scriptKey}
            onSelect={(key) => {
              setScriptKey(key);
              setPayload((previous) => ({ ...previous, strokePaths: [], modelKey: key }));
            }}
          />

          <div className="grid gap-3">
            <label className="space-y-1">
              <span className="text-[12px] text-dim">Mode</span>
              <select
                value={mode}
                onChange={(event) => {
                  const nextMode = event.target.value as ScriptPracticeMode;
                  setMode(nextMode);
                  setPayload((previous) => ({ ...previous, strokePaths: [], mode: nextMode }));
                }}
                className="select-custom w-full rounded-lg border border-white/10 bg-black/20 pl-3 py-2 text-[13px] text-mist"
              >
                {MODES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {activeExercise && activeExercise.validate(payload) ? (
            <activeExercise.component payload={payload} onChange={setPayload} />
          ) : (
            <UnsupportedExerciseCard reason={`Script mode "${mode}" is not registered.`} />
          )}

          <div className="flex items-center justify-between">
            <p className="text-[12px] text-dim">Captured strokes: {payload.strokePaths.length}</p>
            <button
              onClick={() => {
                void persistAttempt();
              }}
              disabled={saving}
              className="rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-[13px] text-cyan-100 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Attempt'}
            </button>
          </div>

          {status ? (
            <ExerciseStateBanner
              tone={status.toLowerCase().includes('failed') ? 'error' : 'info'}
              message={status}
            />
          ) : null}
        </ExerciseShell>
      </div>
    </PageContent>
  );
}
