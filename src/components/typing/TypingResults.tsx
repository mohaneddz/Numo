import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { RotateCcw, Trophy } from 'lucide-react';
import type { TypingResult } from '../../services/typing/typingService';
import type { TypingPersonalBest } from '../../services/typing/typingHistory';

interface TypingResultsProps {
  result: TypingResult;
  problemCharacters: Array<{ character: string; count: number }>;
  isPersonalBest: boolean;
  previousBest: TypingPersonalBest | null;
  onRestart: () => void;
}

/** Logographic scripts count one character per word, so "wpm" would mislead. */
function speedUnit(charsPerWord: number): string {
  return charsPerWord === 1 ? 'cpm' : 'wpm';
}

export function TypingResults({
  result,
  problemCharacters,
  isPersonalBest,
  previousBest,
  onRestart,
}: TypingResultsProps) {
  const unit = speedUnit(result.charsPerWord);

  return (
    <div className="flex flex-col gap-6">
      {isPersonalBest && (
        <div className="flex items-center gap-3 rounded-lg border border-amber/30 bg-amber-dim px-4 py-3 text-amber">
          <Trophy size={18} />
          <span className="text-sm">
            New personal best for {result.mode === 'time' ? `${result.amount}s` : `${result.amount} words`}
            {previousBest ? ` — up from ${previousBest.wpm} ${unit}.` : '.'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <PrimaryStat label={unit} value={result.wpm} />
        <PrimaryStat label="accuracy" value={`${result.accuracy}%`} />
        <PrimaryStat label={`raw ${unit}`} value={result.rawWpm} muted />
        <PrimaryStat label="consistency" value={`${result.consistency}%`} muted />
      </div>

      {result.samples.length > 1 && (
        <div className="rounded-lg border border-white/5 bg-graphite p-4">
          <p className="mb-3 text-xs uppercase tracking-wider text-dim">Speed over the run</p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={result.samples} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="typingSpeed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-violet)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-violet)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="second"
                  stroke="var(--color-dim-dark)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  unit="s"
                />
                <YAxis stroke="var(--color-dim-dark)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-night)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelFormatter={(value) => `${value}s`}
                />
                <Area
                  type="monotone"
                  dataKey="wpm"
                  name={unit}
                  stroke="var(--color-violet)"
                  strokeWidth={2}
                  fill="url(#typingSpeed)"
                />
                <Area
                  type="monotone"
                  dataKey="rawWpm"
                  name={`raw ${unit}`}
                  stroke="var(--color-dim-dark)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-white/5 bg-graphite p-4">
          <p className="mb-3 text-xs uppercase tracking-wider text-dim">Characters</p>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <SmallStat label="Correct" value={result.correctCharacters} tone="text-mint" />
            <SmallStat label="Incorrect" value={result.incorrectCharacters} tone="text-coral" />
            <SmallStat label="Extra" value={result.extraCharacters} tone="text-amber" />
            <SmallStat label="Missed" value={result.missedCharacters} tone="text-dim" />
          </div>
          <p className="mt-3 text-xs text-dim">
            {result.elapsedSeconds}s · {result.totalKeystrokes} keystrokes
          </p>
        </div>

        <div className="rounded-lg border border-white/5 bg-graphite p-4">
          <p className="mb-3 text-xs uppercase tracking-wider text-dim">Trouble characters</p>
          {problemCharacters.length === 0 ? (
            <p className="text-sm text-dim">
              No character tripped you up more than once this run.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {problemCharacters.map((entry) => (
                <span
                  key={entry.character}
                  className="flex items-center gap-2 rounded-md border border-coral/25 bg-coral-dim px-2.5 py-1 font-mono text-sm text-mist"
                >
                  {entry.character === ' ' ? 'space' : entry.character}
                  <span className="text-xs text-coral">×{entry.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="flex items-center justify-center gap-2 self-center rounded-full border border-white/10 px-6 py-2.5 text-sm text-dim transition-colors hover:border-violet/40 hover:text-mist"
      >
        <RotateCcw size={16} />
        Next test
      </button>
    </div>
  );
}

function PrimaryStat({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: number | string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-graphite p-4">
      <p className="text-xs uppercase tracking-wider text-dim">{label}</p>
      <p className={`mt-1 font-heading text-4xl ${muted ? 'text-dim' : 'text-violet'}`}>{value}</p>
    </div>
  );
}

function SmallStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <>
      <span className="text-dim">{label}</span>
      <span className={`text-right ${tone}`}>{value}</span>
    </>
  );
}
