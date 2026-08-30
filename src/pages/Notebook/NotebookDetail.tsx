import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Sparkles } from 'lucide-react';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { useAppData } from '../../contexts/AppDataContext';
import { useNavigate } from 'react-router-dom';
import { buildTemplateUrl } from '../../navigation/actionTemplates';
import { useLanguage } from '../../contexts/LanguageContext';
import { AudioPrompt } from '../../components/exercises/shared/AudioPrompt';
import { PersonalNotesPanel } from '../../components/notebook/PersonalNotesPanel';

export default function NotebookDetail() {
  const navigate = useNavigate();
  const { activeLanguage } = useLanguage();
  const { itemId } = useParams();
  const { state, toggleFavorite, updateNotebookEntry } = useAppData();
  const item = state.notebookEntries.find((i) => i.id === itemId);

  if (!item) {
    return (
      <PageContent width="narrow">
        <PageActions>
          <div className="flex gap-2">
            <Link to="/notebook" className="no-underline">
              <button className="page-primary-action">
                <ArrowLeft size={16} /> Back to Notebook
              </button>
            </Link>
            <button
              className="page-primary-action"
              onClick={() =>
                navigate(
                  buildTemplateUrl({
                    templateId: 'notebook-item-fallback',
                    entityId: itemId,
                    params: { from: '/notebook', lang: activeLanguage.code },
                  }),
                )
              }
            >
              Open Template
            </button>
          </div>
        </PageActions>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--color-dim)' }}>Item not found.</p>
        </div>
      </PageContent>
    );
  }

  const typeColors: Record<string, string> = {
    word: '#8B5CF6',
    phrase: '#22D3EE',
    grammar: '#34D399',
    mistake: '#F87171',
  };
  const color = typeColors[item.type] || '#8B5CF6';
  const canReviewInFlashCards = item.type === 'word' || item.type === 'phrase';

  return (
    <PageContent width="narrow" className="pb-12">
      <PageActions>
        <div className="flex gap-2">
          <Link to="/notebook" className="no-underline">
            <button className="page-primary-action">
              <ArrowLeft size={16} /> Back to Notebook
            </button>
          </Link>
          {canReviewInFlashCards && (
            <Link to="/review/session?mode=due-now" className="no-underline">
              <button className="page-primary-action">
                <Sparkles size={16} /> Review in Flash Cards
              </button>
            </Link>
          )}
        </div>
      </PageActions>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="card" style={{ padding: 28, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <span className="pill" style={{ background: `${color}15`, color }}>{item.type}</span>
            {item.tags.map((t) => (
              <span key={t} className="pill" style={{ background: 'var(--color-slate)', color: 'var(--color-dim)' }}>
                {t}
              </span>
            ))}
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>{item.term}</h1>
          <p style={{ fontSize: 18, color: '#22D3EE', fontWeight: 500, marginBottom: 16 }}>{item.translation}</p>

          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {/* Was a navigation to Quick Practice: a speaker icon labelled
                "Listen" that took you to another page instead of saying the
                word. This plays it, with the same TTS the exercises use. */}
            <AudioPrompt text={item.term} languageCode={activeLanguage.code} label="Listen" />
            <button
              onClick={() => toggleFavorite(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                background: 'var(--color-slate)',
                color: 'var(--color-dim)',
                border: 'none',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <Star size={13} /> {item.favorited ? 'Unfavorite' : 'Favorite'}
            </button>
            {canReviewInFlashCards && (
              <Link to="/review/session?mode=due-now" className="no-underline">
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 8,
                    background: 'rgba(139, 92, 246, 0.12)',
                    color: '#C4B5FD',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  <Sparkles size={13} /> Review in Flash Cards
                </button>
              </Link>
            )}
          </div>

          {item.type !== 'mistake' && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--color-dim)' }}>Mastery</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{item.mastery}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: 'var(--color-slate)', overflow: 'hidden' }}>
                <div style={{ width: `${item.mastery}%`, height: '100%', borderRadius: 99, background: color }} />
              </div>
            </div>
          )}

          {item.context && (
            <div style={{ padding: 14, borderRadius: 10, background: 'var(--color-slate)', marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--color-dim)', marginBottom: 4 }}>Context</p>
              <p style={{ fontSize: 14, fontStyle: 'italic', lineHeight: 1.5 }}>{item.context}</p>
            </div>
          )}

          {item.notes && (
            <div style={{ padding: 14, borderRadius: 10, background: 'rgba(139, 92, 246, 0.06)', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
              <p style={{ fontSize: 12, color: '#8B5CF6', fontWeight: 500, marginBottom: 4 }}>Notes</p>
              <p style={{ fontSize: 14, color: 'var(--color-dim)', lineHeight: 1.5 }}>{item.notes}</p>
            </div>
          )}

          <PersonalNotesPanel
            entry={item}
            onSave={(patch) => updateNotebookEntry(item.id, patch)}
          />

          <p style={{ fontSize: 12, color: 'var(--color-dim-dark)', marginTop: 16 }}>Added on {item.createdAt}</p>
        </div>
      </motion.div>
    </PageContent>
  );
}
