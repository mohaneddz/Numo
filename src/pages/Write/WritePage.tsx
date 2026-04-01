import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, Target } from 'lucide-react';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { useAppData } from '../../contexts/AppDataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { buildTemplateUrl } from '../../navigation/actionTemplates';
import { LockedPageState } from '../../components/ui/LockedPageState';
import { useLanguageProgression } from '../../hooks/useLanguageProgression';

export default function WritePage() {
  const navigate = useNavigate();
  const { activeLanguage } = useLanguage();
  const { state } = useAppData();
  const { lockStates } = useLanguageProgression();
  const lock = lockStates.write;

  const drafts = [...state.writingDrafts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const latestDraft = drafts[0];

  if (!lock.unlocked) {
    return (
      <PageContent className="pb-12" width="narrow">
        <LockedPageState
          title={lock.title}
          whatThisPageIsFor="Structured production practice to build writing clarity and accuracy."
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
        <Link to="/write/editor" className="no-underline">
          <button className="page-primary-action">
            <Plus size={16} /> New Draft
          </button>
        </Link>
      </PageActions>

      <div className="card" style={{ padding: 20, marginBottom: 12 }}>
        <h2 style={{ marginBottom: 8 }}>Writing Practice</h2>
        <p style={{ color: 'var(--color-dim)', margin: 0 }}>
          Write naturally, get quick corrections, and keep your drafts organized in one place.
        </p>
      </div>

      {latestDraft && (
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>Continue where you left off</p>
              <p style={{ margin: 0, color: 'var(--color-dim)', fontSize: 13 }}>{latestDraft.title}</p>
            </div>
            <Link to={`/write/editor/${latestDraft.id}`} className="no-underline">
              <button className="page-primary-action">
                <FileText size={14} /> Continue
              </button>
            </Link>
          </div>
        </div>
      )}

      {drafts.length === 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <p style={{ margin: 0, color: 'var(--color-dim)' }}>
            No drafts yet. Start your first entry and build your writing streak.
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {drafts.map((draft) => (
          <div key={draft.id} className="card" style={{ padding: 14 }}>
            <div className="flex items-center justify-between gap-3">
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{draft.title}</p>
                <p style={{ margin: '2px 0 0', color: 'var(--color-dim)', fontSize: 13 }}>
                  {draft.wordCount} words • updated {draft.updatedAt}
                </p>
                <p style={{ margin: '6px 0 0', color: 'var(--color-dim)', fontSize: 13 }}>
                  {(draft.content || '').trim().slice(0, 120) || 'No preview available.'}
                </p>
              </div>
              <Link to={`/write/editor/${draft.id}`} className="no-underline">
                <button className="page-primary-action">
                  <FileText size={14} /> Open
                </button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 16, marginTop: 12 }}>
        <button
          className="page-primary-action"
          onClick={() =>
            navigate(
              buildTemplateUrl({
                templateId: 'write-create-goal',
                params: { from: '/write', lang: activeLanguage.code },
              }),
            )
          }
        >
          <Target size={14} /> Set Writing Goal
        </button>
      </div>
    </PageContent>
  );
}
