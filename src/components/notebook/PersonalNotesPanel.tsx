import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Lightbulb, PenLine } from 'lucide-react';
import type { NotebookEntry } from '../../data/types';

interface PersonalNotesPanelProps {
  entry: NotebookEntry;
  onSave: (
    patch: Partial<Pick<NotebookEntry, 'personalHint' | 'personalExample' | 'isDifficult'>>,
  ) => void;
}

/**
 * A learner's own mnemonic, example sentence, and difficulty flag for a word.
 *
 * `personal_hint`, `personal_example` and `is_difficult` have been real columns
 * with real repository update logic since the schema was written, and nothing
 * in the app ever set or read them. Writing your own hook for a word is one of
 * the few vocabulary techniques that reliably works, so the storage existed for
 * a feature the learner could never reach.
 */
export function PersonalNotesPanel({ entry, onSave }: PersonalNotesPanelProps) {
  const [hint, setHint] = useState(entry.personalHint ?? '');
  const [example, setExample] = useState(entry.personalExample ?? '');
  const [saved, setSaved] = useState(false);

  // Switching to another word must not carry the previous one's draft over.
  useEffect(() => {
    setHint(entry.personalHint ?? '');
    setExample(entry.personalExample ?? '');
    setSaved(false);
  }, [entry.id, entry.personalHint, entry.personalExample]);

  const dirty = hint !== (entry.personalHint ?? '') || example !== (entry.personalExample ?? '');

  const save = () => {
    onSave({ personalHint: hint.trim(), personalExample: example.trim() });
    setSaved(true);
  };

  return (
    <section className="mt-4 rounded-xl border border-white/5 bg-graphite p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[15px] text-mist">
          <Lightbulb size={15} className="text-amber" />
          Make it stick
        </h3>

        <button
          type="button"
          onClick={() => onSave({ isDifficult: !entry.isDifficult })}
          aria-pressed={Boolean(entry.isDifficult)}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] transition-colors ${
            entry.isDifficult
              ? 'border-coral/40 bg-coral-dim text-coral'
              : 'border-white/10 text-dim hover:text-mist'
          }`}
        >
          <AlertTriangle size={13} />
          {entry.isDifficult ? 'Marked difficult' : 'Mark difficult'}
        </button>
      </div>

      <label className="block">
        <span className="text-[12px] text-dim">Your hint</span>
        <input
          value={hint}
          onChange={(event) => {
            setHint(event.target.value);
            setSaved(false);
          }}
          placeholder="A mnemonic, a sound-alike, anything that hooks it"
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[14px] text-mist outline-none transition-colors placeholder:text-dim/70 focus:border-violet/40"
        />
      </label>

      <label className="mt-3 block">
        <span className="text-[12px] text-dim">Your own sentence</span>
        <textarea
          value={example}
          onChange={(event) => {
            setExample(event.target.value);
            setSaved(false);
          }}
          rows={2}
          placeholder="Use the word in a sentence that means something to you"
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[14px] text-mist outline-none transition-colors placeholder:text-dim/70 focus:border-violet/40"
        />
      </label>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!dirty}
          className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-1.5 text-[13px] text-dim transition-colors hover:border-violet/40 hover:text-mist disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PenLine size={13} />
          Save
        </button>
        {saved && !dirty && (
          <span className="flex items-center gap-1.5 text-[12px] text-mint">
            <Check size={13} /> Saved
          </span>
        )}
      </div>
    </section>
  );
}
