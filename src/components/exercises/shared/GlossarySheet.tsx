import type { GlossaryEntry } from '../../../services/exercises/glossaryData';

interface GlossarySheetProps {
  entry: GlossaryEntry;
  onClose: () => void;
  onSave: () => void;
  onHear?: () => void;
}

export function GlossarySheet({ entry, onClose, onSave, onHear }: GlossarySheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose} role="dialog" aria-label="Word details sheet">
      <div
        className="w-full rounded-t-2xl border border-white/15 bg-[#0b122d] p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />
        <p className="text-[16px] font-semibold text-white">{entry.token}</p>
        <p className="mt-1 text-[15px] text-cyan-200">{entry.translation}</p>
        {entry.romanization ? <p className="mt-1 text-[13px] text-dim">{entry.romanization}</p> : null}
        {entry.partOfSpeech ? <p className="mt-1 text-[12px] uppercase tracking-wide text-amber-300">{entry.partOfSpeech}</p> : null}
        {entry.example ? <p className="mt-3 text-[13px] text-mist">{entry.example}</p> : null}
        <div className="mt-4 flex gap-2">
          <button type="button" className="flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-[13px] text-mist" onClick={onSave}>
            Save Word
          </button>
          {onHear ? (
            <button type="button" className="flex-1 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-2 text-[13px] text-cyan-100" onClick={onHear}>
              Hear
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
