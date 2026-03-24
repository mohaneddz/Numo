import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Volume2, Star, ExternalLink } from 'lucide-react';
import { vocabularyItems, grammarNotes, mistakeEntries } from '../../data/vocabulary';

export default function NotebookDetail() {
  const { itemId } = useParams();
  const allItems = [...vocabularyItems, ...grammarNotes, ...mistakeEntries];
  const item = allItems.find(i => i.id === itemId);

  if (!item) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--color-dim)' }}>Item not found.</p>
        <Link to="/notebook" style={{ color: '#8B5CF6' }}>← Back to Notebook</Link>
      </div>
    );
  }

  const typeColors: Record<string, string> = {
    word: '#8B5CF6', phrase: '#22D3EE', grammar: '#34D399', mistake: '#F87171',
  };
  const color = typeColors[item.type] || '#8B5CF6';

  return (
    <div style={{ maxWidth: 700 }}>
      <Link to="/notebook" style={{ color: 'var(--color-dim)', textDecoration: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back to Notebook
      </Link>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="card" style={{ padding: 28, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <span className="pill" style={{ background: `${color}15`, color }}>{item.type}</span>
            {item.tags.map(t => (
              <span key={t} className="pill" style={{ background: 'var(--color-slate)', color: 'var(--color-dim)' }}>{t}</span>
            ))}
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>{item.term}</h1>
          <p style={{ fontSize: 18, color: '#22D3EE', fontWeight: 500, marginBottom: 16 }}>{item.translation}</p>

          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8, background: 'var(--color-slate)',
              color: 'var(--color-dim)', border: 'none', fontSize: 12, cursor: 'pointer',
            }}>
              <Volume2 size={13} /> Listen
            </button>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8, background: 'var(--color-slate)',
              color: 'var(--color-dim)', border: 'none', fontSize: 12, cursor: 'pointer',
            }}>
              <Star size={13} /> Favorite
            </button>
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

          <p style={{ fontSize: 12, color: 'var(--color-dim-dark)', marginTop: 16 }}>Added on {item.createdAt}</p>
        </div>
      </motion.div>
    </div>
  );
}
