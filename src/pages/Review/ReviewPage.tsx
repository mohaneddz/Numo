import { Link } from 'react-router-dom';
import { RotateCcw, AlertCircle, Zap } from 'lucide-react';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { useAppData, type ReviewMode } from '../../contexts/AppDataContext';
import { LockedPageState } from '../../components/ui/LockedPageState';
import { useLanguageProgression } from '../../hooks/useLanguageProgression';

const modes: Array<{ mode: ReviewMode; title: string; description: string; icon: typeof RotateCcw }> = [
  { mode: 'due-now', title: 'Due Now', description: 'Only cards due from persisted scheduler.', icon: RotateCcw },
  { mode: 'weak', title: 'Weak Points', description: 'Cards with weak/critical strength in persisted state.', icon: AlertCircle },
  { mode: 'mistakes', title: 'Mistakes', description: 'Cards last graded incorrect.', icon: RotateCcw },
  { mode: 'cram', title: 'Cram', description: 'Low-ease items from real review history.', icon: Zap },
];

export default function ReviewPage() {
  const { dueCount, weakCount, flashCardCount, dueReviewPreview } = useAppData();
  const { lockStates } = useLanguageProgression();
  const lock = lockStates.review;

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
            <Zap size={16} /> Start Due Queue
          </button>
        </Link>
      </PageActions>

      <div className="card" style={{ padding: 20, marginBottom: 12 }}>
        <h2 style={{ marginBottom: 8 }}>Review Overview</h2>
        <p style={{ color: 'var(--color-dim)' }}>
          Due now: {dueCount} • Weak: {weakCount} • Total persisted review items: {flashCardCount}
        </p>
      </div>

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
