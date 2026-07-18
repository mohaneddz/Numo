import type { GlossaryEntry } from '../../../services/exercises/glossaryData';
import { createPortal } from 'react-dom';

interface GlossaryTooltipProps {
  entry: GlossaryEntry | null;
  token: string;
  loading: boolean;
  anchorRect: DOMRect | null;
  onSave?: () => void;
  onHear?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function GlossaryTooltip({ entry, token, loading, anchorRect, onSave, onHear, onMouseEnter, onMouseLeave }: GlossaryTooltipProps) {
  if (!anchorRect || typeof window === 'undefined' || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed z-50 w-[280px] rounded-xl border border-white/15 bg-[#0b122d] p-3 shadow-2xl"
      style={{
        left: Math.min(window.innerWidth - 300, Math.max(8, anchorRect.left)),
        top: Math.max(8, anchorRect.bottom + 8),
      }}
      role="dialog"
      aria-label="Word details"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <p className="text-[13px] font-semibold text-white">{entry?.token ?? token}</p>
      {loading ? (
        <div className="mt-2 animate-pulse space-y-2">
          <div className="h-3 w-4/5 rounded bg-cyan-300/25" />
          <div className="h-2.5 w-3/5 rounded bg-white/20" />
          <div className="h-2.5 w-2/5 rounded bg-amber-200/20" />
          <div className="h-2.5 w-full rounded bg-white/15" />
          <div className="h-2.5 w-5/6 rounded bg-white/15" />
        </div>
      ) : (
        <>
          <p className="mt-1 text-[13px] text-cyan-200">{entry?.translation}</p>
          {entry?.romanization ? <p className="mt-1 text-[12px] text-dim">Pronunciation: {entry.romanization}</p> : null}
          {entry?.partOfSpeech ? <p className="mt-1 text-[11px] uppercase tracking-wide text-amber-300">{entry.partOfSpeech}</p> : null}
          {entry?.example ? <p className="mt-2 text-[12px] text-mist">{entry.example}</p> : null}
        </>
      )}
      <div className="mt-3 flex gap-2">
        <button type="button" className="rounded-lg border border-white/20 bg-white/5 px-2.5 py-1 text-[11px] text-mist disabled:opacity-50" onClick={onSave} disabled={loading || !onSave}>
          Save Word
        </button>
        {onHear ? (
          <button type="button" className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-1 text-[11px] text-cyan-100 disabled:opacity-50" onClick={onHear} disabled={loading}>
            Hear
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
