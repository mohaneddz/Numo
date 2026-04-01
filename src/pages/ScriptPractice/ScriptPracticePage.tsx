import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContent } from '../../components/layout/PageLayout';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { ScriptDrawingInput } from '../../components/script/ScriptDrawingInput';
import { integrationService } from '../../services/integrationService';
import { useLanguage } from '../../contexts/LanguageContext';
import type { ScriptPracticeMode, ScriptPracticePayload } from '../../types/scriptPractice';
import { useLanguageProgression } from '../../hooks/useLanguageProgression';
import { LockedPageState } from '../../components/ui/LockedPageState';

const SUPPORTED_SCRIPT_LANGUAGES = new Set(['zh', 'ja']);
const MODES: ScriptPracticeMode[] = ['watch', 'trace', 'guided_draw', 'free_draw', 'timed_recall_draw'];

export default function ScriptPracticePage() {
  const [searchParams] = useSearchParams();
  const { activeLanguage } = useLanguage();
  const { lockStates } = useLanguageProgression();
  const defaultScriptKey = searchParams.get('script') ?? 'script:default';
  const [scriptKey, setScriptKey] = useState(defaultScriptKey);
  const [mode, setMode] = useState<ScriptPracticeMode>('trace');
  const [payload, setPayload] = useState<ScriptPracticePayload>({ strokes: [], width: 380, height: 220 });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const enabled = useMemo(() => SUPPORTED_SCRIPT_LANGUAGES.has(activeLanguage.code), [activeLanguage.code]);
  const lock = lockStates.script_practice;

  const persistAttempt = async () => {
    setSaving(true);
    setStatus(null);
    const strokeCount = payload.strokes.length;
    const completion = Math.min(100, strokeCount === 0 ? 0 : Math.round(Math.min(1, strokeCount / 48) * 100));
    try {
      await integrationService.logScriptPracticeAttempt({
        languageCode: activeLanguage.code,
        scriptKey: scriptKey.trim() || 'script:default',
        mode,
        completionRatio: completion,
        durationMs: Math.max(15000, strokeCount * 320),
        success: completion >= 60,
        strokeData: {
          mode,
          strokeCount,
          payload,
          captureOnly: true,
        },
      });
      setStatus(`Saved attempt (${completion}% completion, ${strokeCount} points).`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to save attempt.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContent width="wide" className="pb-16">
      <div className="mx-auto max-w-4xl space-y-5">
        <SpotlightCard className="p-5">
          <h1 className="text-[22px] font-bold text-white">Script Practice v1</h1>
          <p className="mt-1 text-[13px] text-dim">
            Capture and state updates only. Stroke-order and shape scoring are intentionally deferred.
          </p>
          <p className="mt-2 text-[12px] text-dim">
            Active language: {activeLanguage.name} ({activeLanguage.code})
          </p>
        </SpotlightCard>

        {!lock.unlocked ? (
          <LockedPageState
            title={lock.title}
            whatThisPageIsFor="Character writing practice tracked separately from recognition and pronunciation."
            whyLocked={lock.whyLocked}
            unlocksWhen={lock.unlocksWhen}
            nextAction={lock.nextAction}
            nextActionTo={enabled ? '/learn' : '/'}
          />
        ) : !enabled ? (
          <SpotlightCard className="p-5">
            <p className="text-[14px] text-amber-300">Script practice is currently enabled for `zh` and `ja` only.</p>
          </SpotlightCard>
        ) : (
          <SpotlightCard className="p-5 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[12px] text-dim">Script key</span>
                <input
                  value={scriptKey}
                  onChange={(event) => setScriptKey(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[13px] text-mist focus:outline-none focus:ring-1 focus:ring-cyan-500/60"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[12px] text-dim">Mode</span>
                <select
                  value={mode}
                  onChange={(event) => setMode(event.target.value as ScriptPracticeMode)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[13px] text-mist focus:outline-none focus:ring-1 focus:ring-cyan-500/60"
                >
                  {MODES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <ScriptDrawingInput onChange={setPayload} />

            <div className="flex items-center justify-between">
              <p className="text-[12px] text-dim">Captured points: {payload.strokes.length}</p>
              <button
                onClick={() => void persistAttempt()}
                disabled={saving}
                className="rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-[13px] text-cyan-100 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Attempt'}
              </button>
            </div>
            {status && <p className="text-[12px] text-mist">{status}</p>}
          </SpotlightCard>
        )}
      </div>
    </PageContent>
  );
}
