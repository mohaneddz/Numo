import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2, BookmarkPlus, Languages } from 'lucide-react';
import { useState } from 'react';
import { immersionContent } from '../../data/immersion';

const fakeTranscript = [
  { time: '0:00', es: 'María llegó al mercado temprano por la mañana.', en: 'María arrived at the market early in the morning.' },
  { time: '0:08', es: 'Las frutas estaban frescas y los colores eran brillantes.', en: 'The fruits were fresh and the colors were bright.' },
  { time: '0:15', es: '"Buenos días, señora. ¿Cuánto cuestan las naranjas?"', en: '"Good morning, ma\'am. How much are the oranges?"' },
  { time: '0:22', es: '"Dos euros el kilo, mi amor. Son las mejores del mercado."', en: '"Two euros per kilo, dear. They\'re the best in the market."' },
  { time: '0:30', es: 'María sonrió y eligió las más grandes.', en: 'María smiled and chose the biggest ones.' },
  { time: '0:37', es: 'Mientras caminaba entre los puestos, escuchó música a lo lejos.', en: 'As she walked among the stalls, she heard music in the distance.' },
];

export default function ContentDetail() {
  const { contentId } = useParams();
  const content = immersionContent.find(c => c.id === contentId);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState(1);

  if (!content) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--color-dim)' }}>Content not found.</p>
        <Link to="/immerse" style={{ color: '#8B5CF6' }}>← Back to Immerse</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <Link to="/immerse" style={{ color: 'var(--color-dim)', textDecoration: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back to Immerse
      </Link>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {content.tags.map(tag => (
              <span key={tag} className="pill pill-violet">{tag}</span>
            ))}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>{content.title}</h1>
          <p style={{ color: 'var(--color-dim)', fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>{content.description}</p>

          {/* Player Controls */}
          <div style={{
            padding: 16, borderRadius: 12,
            background: 'var(--color-slate)',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {/* Progress bar */}
            <div style={{ height: 4, borderRadius: 99, background: 'var(--color-graphite)', cursor: 'pointer' }}>
              <div style={{ width: '35%', height: '100%', borderRadius: 99, background: '#8B5CF6' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--color-dim)' }}>0:22</span>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <button onClick={() => {}} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-dim)' }}>
                  <SkipBack size={18} />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  style={{
                    width: 44, height: 44, borderRadius: 99,
                    background: '#8B5CF6', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                  }}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button onClick={() => {}} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-dim)' }}>
                  <SkipForward size={18} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Volume2 size={16} style={{ color: 'var(--color-dim)' }} />
                <span style={{ fontSize: 12, color: 'var(--color-dim)' }}>{content.duration}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Transcript */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600 }}>Transcript</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowTranslation(!showTranslation)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                background: showTranslation ? 'rgba(34, 211, 238, 0.15)' : 'var(--color-slate)',
                color: showTranslation ? '#22D3EE' : 'var(--color-dim)',
                border: 'none', cursor: 'pointer',
              }}
            >
              <Languages size={13} /> {showTranslation ? 'Hide' : 'Show'} Translation
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {fakeTranscript.map((line, i) => (
            <div
              key={i}
              className="card"
              onClick={() => setActiveLineIndex(i)}
              style={{
                padding: '12px 16px', cursor: 'pointer',
                borderLeft: i === activeLineIndex ? '3px solid #8B5CF6' : '3px solid transparent',
                background: i === activeLineIndex ? 'rgba(139, 92, 246, 0.06)' : undefined,
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 11, color: 'var(--color-dim-dark)', fontWeight: 500, minWidth: 32, paddingTop: 2 }}>{line.time}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, lineHeight: 1.5 }}>{line.es}</p>
                  {showTranslation && (
                    <p style={{ fontSize: 13, color: 'var(--color-dim)', marginTop: 4 }}>{line.en}</p>
                  )}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-dim-dark)', padding: 4 }}
                >
                  <BookmarkPlus size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
