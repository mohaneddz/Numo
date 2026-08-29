import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, AlertCircle, Zap, TrendingUp } from 'lucide-react';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { useAppData, type ReviewMode } from '../../contexts/AppDataContext';
import { LockedPageState } from '../../components/ui/LockedPageState';
import { useLanguageProgression } from '../../hooks/useLanguageProgression';
import {
  detectLeeches,
  forecastReviews,
  summarizeQueueHealth,
} from '../../services/exercises/reviewInsights';
import type { ReviewItem } from '../../data/types';

const modes: Array<{ mode: ReviewMode; title: string; description: string; icon: typeof RotateCcw }> = [
  { mode: 'due-now', title: 'Mixed Review', description: 'Balanced queue from due items and recent review evidence.', icon: RotateCcw },
  { mode: 'weak', title: 'Weak-Point Review', description: 'Focuses on weak or unstable items first.', icon: AlertCircle },
  { mode: 'mistakes', title: 'Cumulative Review', description: 'Runs through accumulated mistake-heavy material.', icon: RotateCcw },
  { mode: 'cram', title: 'Timed Review', description: 'Fast-paced queue optimized for quick repetition.', icon: Zap },
];

const STRENGTH_COLORS: Record<ReviewItem['strength'], string> = {
  'very solid': 'var(--color-mint)',
  solid: 'var(--color-cyan)',
  'needs work': 'var(--color-amber)',
  weak: 'var(--color-coral)',
  critical: '#dc2626',
};

export default function ReviewPage() {
  const { dueCount, weakCount, flashCardCount, dueReviewPreview, state } = useAppData();
  const { lockStates } = useLanguageProgression();
  const lock = lockStates.review;

  const items = state.reviewItems;
  const health = useMemo(() => summarizeQueueHealth(items), [items]);
  const forecast = useMemo(() => forecastReviews(items, 14), [items]);
  const leeches = useMemo(() => detectLeeches(items), [items]);

  const peak = Math.max(1, ...forecast.map((day) => day.count));

  if (!lock.unlocked) {
    return (
      <PageContent width="narrow" className="pb-12">
        <LockedPageState
          title={lock.title}
          whatThisPageIsFor="Scheduled recall practice that keeps learned material stable over time."
          whyLocked={lock.whyLocked}
          unlocksWhen={lock.unlocksWhen}
          nextAction={lock.nextAction}
          nextActionTo="/learn"
        />
      </PageContent>
    );
  }

  return (
    <PageContent width="narrow" className="pb-12">
      <PageActions>
        <Link to="/review/session?mode=due-now" className="no-underline">
          <button className="page-primary-action">
            <Zap size={16} /> Start Mixed Review
          </button>
        </Link>
      </PageActions>

      <div className="card" style={{ padding: 20, marginBottom: 12 }}>
        <h2 style={{ marginBottom: 8 }}>Review Overview</h2>
        <p style={{ color: 'var(--color-dim)', margin: 0 }}>
          Due now: {dueCount} • Weak: {weakCount} • Total persisted review items: {flashCardCount}
        </p>
      </div>

      {health.total > 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div className="mb-3 flex items-center justify-between">
            <h3 style={{ margin: 0 }}>Queue health</h3>
            <span className="text-[13px] text-dim">{health.stablePercent}% solid or better</span>
          </div>

          <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-white/5">
            {health.byStrength
              .filter((band) => band.count > 0)
              .map((band) => (
                <div
                  key={band.strength}
                  title={`${band.strength}: ${band.count}`}
                  style={{
                    width: `${(band.count / health.total) * 100}%`,
                    background: STRENGTH_COLORS[band.strength],
                  }}
                />
              ))}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-dim">
            {health.byStrength
              .filter((band) => band.count > 0)
              .map((band) => (
                <span key={band.strength} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: STRENGTH_COLORS[band.strength] }}
                  />
                  {band.strength} {band.count}
                </span>
              ))}
          </div>

          {health.overdue > 0 && (
            <p className="mt-3 text-[13px] text-amber">
              {health.overdue} {health.overdue === 1 ? 'item is' : 'items are'} past due.
            </p>
          )}
        </div>
      )}

      {health.total > 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp size={15} className="text-dim" />
            <h3 style={{ margin: 0 }}>Coming up</h3>
            <span className="ml-auto text-[12px] text-dim">next 14 days</span>
          </div>

          <div className="flex h-24 items-end gap-1">
            {forecast.map((day) => (
              <div
                key={`${day.date}-${day.overdue}`}
                className="flex flex-1 flex-col items-center gap-1"
                title={
                  day.overdue
                    ? `${day.count} overdue`
                    : `${day.count} due on ${day.date}`
                }
              >
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max(day.count > 0 ? 4 : 1, (day.count / peak) * 72)}px`,
                    background: day.overdue ? 'var(--color-coral)' : 'var(--color-violet)',
                    opacity: day.count === 0 ? 0.18 : 1,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-dim">
            <span>overdue</span>
            <span>in 2 weeks</span>
          </div>
        </div>
      )}

      {leeches.length > 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <h3 style={{ marginTop: 0, marginBottom: 4 }}>These keep tripping you up</h3>
          <p className="mb-3 text-[13px] text-dim">
            Seen many times and still not sticking. Reviewing them again the same way tends not to
            help — try writing your own example sentence, or study the word properly once.
          </p>
          <div className="grid gap-2">
            {leeches.map(({ item, attempts }) => (
              <div key={item.id} className="card" style={{ padding: 10 }}>
                <div className="flex items-center justify-between gap-3">
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>{item.term}</p>
                    <p style={{ margin: 0, color: 'var(--color-dim)', fontSize: 13 }}>
                      {item.translation || 'No translation yet'}
                    </p>
                  </div>
                  <span className="pill shrink-0" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>
                    {attempts} tries
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3" style={{ marginBottom: 12 }}>
        {modes.map((entry) => (
          <div key={entry.mode} className="card" style={{ padding: 16 }}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 style={{ margin: 0 }}>{entry.title}</h3>
                <p style={{ margin: 0, color: 'var(--color-dim)', fontSize: 13 }}>{entry.description}</p>
              </div>
              <Link to={`/review/session?mode=${entry.mode}`} className="no-underline">
                <button className="page-primary-action">
                  <entry.icon size={14} /> Open
                </button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Due Preview</h3>
        {dueReviewPreview.length === 0 && (
          <p style={{ color: 'var(--color-dim)', margin: 0 }}>
            No items are due yet. This view does not generate synthetic cards.
          </p>
        )}
        {dueReviewPreview.length > 0 && (
          <div className="grid gap-2">
            {dueReviewPreview.map((item) => (
              <div key={item.id} className="card" style={{ padding: 10 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{item.term}</p>
                <p style={{ margin: 0, color: 'var(--color-dim)', fontSize: 13 }}>
                  {item.translation || 'No translation yet'} • {item.source ?? 'legacy_unit'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContent>
  );
}
