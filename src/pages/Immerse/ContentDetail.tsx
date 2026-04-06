import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2, BookmarkPlus, Languages } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { buildTemplateUrl } from '../../navigation/actionTemplates';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { integrationService, type LibraryApprovedItem } from '../../services/integrationService';
import { useAppData } from '../../contexts/AppDataContext';

interface TranscriptLine {
  id: string;
  time: string;
  source: string;
  translation?: string;
}

function formatDuration(totalSec: number | null): string {
  if (!totalSec || totalSec <= 0) return '0:00';
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function parseTranscript(body: string): TranscriptLine[] {
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    const timed = line.match(/^\[?(\d{1,2}:\d{2})\]?\s+(.+)$/);
    if (timed) {
      return {
        id: `line-${index + 1}`,
        time: timed[1],
        source: timed[2],
      };
    }

    const bilingual = line.split(' | ');
    if (bilingual.length >= 2) {
      return {
        id: `line-${index + 1}`,
        time: '-',
        source: bilingual[0],
        translation: bilingual.slice(1).join(' | '),
      };
    }

    return {
      id: `line-${index + 1}`,
      time: '-',
      source: line,
    };
  });
}

export default function ContentDetail() {
  const { contentId } = useParams();
  const navigate = useNavigate();
  const { activeLanguage } = useLanguage();
  const { saveImmersionPhrase } = useAppData();

  const [content, setContent] = useState<LibraryApprovedItem | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!contentId) {
        setContent(null);
        setTranscript([]);
        return;
      }

      setLoading(true);
      try {
        const approved = await integrationService.listApprovedContent(activeLanguage.code);
        const found = approved.find((item) => item.contentItemId === contentId) ?? null;
        if (!found) {
          if (!cancelled) {
            setContent(null);
            setTranscript([]);
          }
          return;
        }

        const history = await integrationService.getContentRevisionHistory(found.contentItemId);
        const activeRevision = history.find((entry) => entry.isActive) ?? history[0] ?? null;
        const rawBody = activeRevision?.payload?.body;
        const body = typeof rawBody === 'string' ? rawBody : '';

        if (!cancelled) {
          setContent(found);
          setTranscript(parseTranscript(body));
          setActiveLineIndex(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeLanguage.code, contentId]);

  const durationLabel = useMemo(() => formatDuration(content?.estimatedDurationSec ?? null), [content?.estimatedDurationSec]);
  const progress = transcript.length > 0 ? Math.round(((activeLineIndex + 1) / transcript.length) * 100) : 0;

  if (!contentId) {
    return (
      <PageContent width="narrow">
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--color-dim)' }}>Content id missing.</p>
        </div>
      </PageContent>
    );
  }

  if (loading) {
    return (
      <PageContent width="narrow">
        <PageActions>
          <Link to="/immerse" className="no-underline">
            <button className="page-primary-action">
              <ArrowLeft size={16} /> Back to Immerse
            </button>
          </Link>
        </PageActions>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--color-dim)' }}>Loading content...</p>
        </div>
      </PageContent>
    );
  }

  if (!content) {
    return (
      <PageContent width="narrow">
        <PageActions>
          <div className="flex gap-2">
            <Link to="/immerse" className="no-underline">
              <button className="page-primary-action">
                <ArrowLeft size={16} /> Back to Immerse
              </button>
            </Link>
            <button
              className="page-primary-action"
              onClick={() =>
                navigate(
                  buildTemplateUrl({
                    templateId: 'immerse-content-fallback',
                    entityId: contentId,
                    params: { from: '/immerse', lang: activeLanguage.code },
                  }),
                )
              }
            >
              Open Template
            </button>
          </div>
        </PageActions>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--color-dim)' }}>Content not found.</p>
        </div>
      </PageContent>
    );
  }

  return (
    <PageContent width="narrow" className="pb-12">
      <PageActions>
        <Link to="/immerse" className="no-underline">
          <button className="page-primary-action">
            <ArrowLeft size={16} /> Back to Immerse
          </button>
        </Link>
      </PageActions>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {content.tags.map((tag) => (
              <span key={tag} className="pill pill-violet">{tag}</span>
            ))}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>{content.title}</h1>
          <p style={{ color: 'var(--color-dim)', fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>{content.summary || 'No summary available.'}</p>

          <div style={{
            padding: 16, borderRadius: 12,
            background: 'var(--color-slate)',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ height: 4, borderRadius: 99, background: 'var(--color-graphite)', cursor: 'pointer' }}>
              <div style={{ width: `${progress}%`, height: '100%', borderRadius: 99, background: '#8B5CF6' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--color-dim)' }}>
                {transcript[activeLineIndex]?.time ?? '-'}
              </span>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <button
                  onClick={() => setActiveLineIndex((prev) => Math.max(0, prev - 1))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-dim)' }}
                >
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
                <button
                  onClick={() => setActiveLineIndex((prev) => Math.min(Math.max(0, transcript.length - 1), prev + 1))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-dim)' }}
                >
                  <SkipForward size={18} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Volume2 size={16} style={{ color: 'var(--color-dim)' }} />
                <span style={{ fontSize: 12, color: 'var(--color-dim)' }}>{durationLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

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
          {transcript.length === 0 && (
            <div className="card" style={{ padding: '12px 16px' }}>
              <p style={{ fontSize: 13, color: 'var(--color-dim)' }}>No active transcript revision available for this content.</p>
            </div>
          )}

          {transcript.map((line, i) => (
            <div
              key={line.id}
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
                  <p style={{ fontSize: 14, lineHeight: 1.5 }}>{line.source}</p>
                  {showTranslation && line.translation && (
                    <p style={{ fontSize: 13, color: 'var(--color-dim)', marginTop: 4 }}>{line.translation}</p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveImmersionPhrase(content.contentItemId, line.source, line.translation);
                    setNotice(`Saved phrase at ${line.time}`);
                    navigate(
                      buildTemplateUrl({
                        templateId: 'immerse-save-line',
                        entityId: content.contentItemId,
                        params: { from: `/immerse/${content.contentItemId}`, lang: activeLanguage.code, time: line.time },
                      }),
                    );
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-dim-dark)', padding: 4 }}
                >
                  <BookmarkPlus size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        {notice && <p style={{ fontSize: 12, color: '#22D3EE', marginTop: 12 }}>{notice}</p>}
      </motion.div>
    </PageContent>
  );
}
