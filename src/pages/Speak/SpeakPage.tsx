import { Link, useNavigate } from 'react-router-dom';
import { Mic, MessagesSquare, Zap } from 'lucide-react';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { useAppData } from '../../contexts/AppDataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { buildActionUrl } from '../../navigation/actionTemplates';
import { LockedPageState } from '../../components/ui/LockedPageState';
import { useLanguageProgression } from '../../hooks/useLanguageProgression';

export default function SpeakPage() {
  const navigate = useNavigate();
  const { activeLanguage } = useLanguage();
  const { state } = useAppData();
  const { lockStates } = useLanguageProgression();
  const lock = lockStates.speak;

  const runs = [...state.speakingRuns].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );
  const avgAccuracy = runs.length
    ? Math.round(runs.reduce((acc, run) => acc + run.accuracy, 0) / runs.length)
    : 0;
  const avgFluency = runs.length
    ? Math.round(runs.reduce((acc, run) => acc + run.fluency, 0) / runs.length)
    : 0;

  if (!lock.unlocked) {
    return (
      <PageContent className="pb-12" width="narrow">
        <LockedPageState
          title={lock.title}
          whatThisPageIsFor="Guided pronunciation and fluency practice with recorded attempts."
          whyLocked={lock.whyLocked}
          unlocksWhen={lock.unlocksWhen}
          nextAction={lock.nextAction}
          nextActionTo="/learn"
        />
      </PageContent>
    );
  }

  return (
    <PageContent className="pb-12" width="narrow">
      <PageActions>
        <button
          className="page-primary-action"
          onClick={() =>
            navigate(
              buildActionUrl('speak_quick_practice', {
                params: { from: '/speak', lang: activeLanguage.code },
              }),
            )
          }
        >
          <Zap size={16} /> Quick Practice
        </button>
      </PageActions>

      <div className="card" style={{ padding: 20, marginBottom: 12 }}>
        <h2 style={{ marginBottom: 8 }}>Speaking Practice</h2>
        <p style={{ color: 'var(--color-dim)', margin: 0 }}>
          Record short sessions, review pronunciation feedback, and track progress over time.
        </p>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>Live conversation</p>
            <p style={{ margin: 0, color: 'var(--color-dim)', fontSize: 13 }}>
              Talk freely with a {activeLanguage.name} companion, subtitled on both sides.
            </p>
          </div>
          <Link to="/speak/conversation" className="no-underline">
            <button className="page-primary-action">
              <MessagesSquare size={14} /> Start Talking
            </button>
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>Start a guided session</p>
            <p style={{ margin: 0, color: 'var(--color-dim)', fontSize: 13 }}>Best for focused pronunciation drills.</p>
          </div>
          <Link to="/speak/session/live" className="no-underline">
            <button className="page-primary-action">
              <Mic size={14} /> Start Session
            </button>
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p style={{ margin: 0, color: 'var(--color-dim)' }}>Attempts: {runs.length}</p>
          <p style={{ margin: 0, color: 'var(--color-dim)' }}>Avg Accuracy: {avgAccuracy}%</p>
          <p style={{ margin: 0, color: 'var(--color-dim)' }}>Avg Fluency: {avgFluency}%</p>
        </div>
      </div>

      {runs.length === 0 && (
        <div className="card" style={{ padding: 16 }}>
          <p style={{ margin: 0, color: 'var(--color-dim)' }}>
            No speaking attempts yet. Record one session to start building your speaking baseline.
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {runs.map((run) => {
          const recordedAt = new Date(run.recordedAt).toLocaleString();
          const needsWork = run.accuracy < 70 || run.fluency < 70;

          return (
            <div key={run.id} className="card" style={{ padding: 14 }}>
              <div className="flex items-center justify-between gap-3">
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{run.sessionId}</p>
                  <p style={{ margin: '2px 0 0', color: 'var(--color-dim)', fontSize: 13 }}>
                    Accuracy {Math.round(run.accuracy)}% • Fluency {Math.round(run.fluency)}% • {recordedAt}
                  </p>
                  {run.tip && <p style={{ margin: '6px 0 0', color: 'var(--color-dim)', fontSize: 13 }}>{run.tip}</p>}
                </div>
                <span className="pill" style={{ background: needsWork ? 'rgba(248,113,113,0.15)' : 'rgba(52,211,153,0.15)', color: needsWork ? '#f87171' : '#34d399' }}>
                  {needsWork ? 'Needs Work' : 'On Track'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </PageContent>
  );
}
