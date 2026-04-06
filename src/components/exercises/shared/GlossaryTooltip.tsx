import type { GlossaryEntry } from '../../../services/exercises/glossaryData';

interface GlossaryTooltipProps {
  entry: GlossaryEntry;
  anchorRect: DOMRect | null;
  onSave: () => void;
  onHear?: () => void;
}

export function GlossaryTooltip({ entry, anchorRect, onSave, onHear }: GlossaryTooltipProps) {
  if (!anchorRect) return null;

  return (
    <div
      className="fixed z-50 w-[280px] rounded-xl border border-white/15 bg-[#0b122d] p-3 shadow-2xl"
      style={{
        left: Math.min(window.innerWidth - 300, Math.max(8, anchorRect.left + window.scrollX)),
        top: Math.max(8, anchorRect.bottom + window.scrollY + 8),
      }}
      role="dialog"
      aria-label="Word details"
    >
      <p className="text-[13px] font-semibold text-white">{entry.token}</p>
      <p className="mt-1 text-[13px] text-cyan-200">{entry.translation}</p>
      {entry.romanization ? <p className="mt-1 text-[12px] text-dim">{entry.romanization}</p> : null}
      {entry.partOfSpeech ? <p className="mt-1 text-[11px] uppercase tracking-wide text-amber-300">{entry.partOfSpeech}</p> : null}
      {entry.example ? <p className="mt-2 text-[12px] text-mist">{entry.example}</p> : null}
      <div className="mt-3 flex gap-2">
        <button type="button" className="rounded-lg border border-white/20 bg-white/5 px-2.5 py-1 text-[11px] text-mist" onClick={onSave}>
          Save Word
        </button>
        {onHear ? (
          <button type="button" className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-1 text-[11px] text-cyan-100" onClick={onHear}>
            Hear
          </button>
        ) : null}
      </div>
    </div>
  );
}
