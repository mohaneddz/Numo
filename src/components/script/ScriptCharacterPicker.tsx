import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { listScriptCharacters, type ScriptCharacterKind } from '../../data/scriptModels';

interface ScriptCharacterPickerProps {
  languageCode: string;
  selectedKey: string;
  onSelect: (key: string) => void;
}

const KIND_LABELS: Record<ScriptCharacterKind, string> = {
  hiragana: 'Hiragana',
  katakana: 'Katakana',
  kanji: 'Kanji',
  hanzi: 'Characters',
};

/** How many to show before asking the learner to narrow the search. */
const VISIBLE_LIMIT = 120;

/**
 * Character chooser for Script Practice.
 *
 * The set went from three characters to several hundred, which a dropdown
 * cannot present usefully — this is a searchable grid filtered by script type,
 * so a Japanese learner can drill kana without scrolling past kanji.
 */
export function ScriptCharacterPicker({
  languageCode,
  selectedKey,
  onSelect,
}: ScriptCharacterPickerProps) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<ScriptCharacterKind | 'all'>('all');

  const characters = useMemo(() => listScriptCharacters(languageCode), [languageCode]);

  const kinds = useMemo(() => {
    const present = new Set(characters.map((entry) => entry.kind));
    return [...present];
  }, [characters]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return characters.filter((entry) => {
      if (kind !== 'all' && entry.kind !== kind) return false;
      if (!search) return true;
      return (
        entry.character.includes(search)
        || (entry.reading?.toLowerCase().includes(search) ?? false)
      );
    });
  }, [characters, kind, query]);

  const visible = filtered.slice(0, VISIBLE_LIMIT);
  const hidden = filtered.length - visible.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a character or reading"
            className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-[13px] text-mist placeholder:text-dim/70"
          />
        </div>

        {kinds.length > 1 && (
          <div className="flex items-center gap-1">
            <FilterChip active={kind === 'all'} onClick={() => setKind('all')}>
              All
            </FilterChip>
            {kinds.map((option) => (
              <FilterChip key={option} active={kind === option} onClick={() => setKind(option)}>
                {KIND_LABELS[option]}
              </FilterChip>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-white/5 bg-black/20 px-3 py-4 text-center text-[13px] text-dim">
          No character here matches “{query}”.
        </p>
      ) : (
        <div className="grid max-h-52 grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-1.5 overflow-y-auto rounded-lg border border-white/5 bg-black/20 p-2">
          {visible.map((entry) => {
            const selected = entry.key === selectedKey;
            return (
              <button
                key={entry.key}
                type="button"
                onClick={() => onSelect(entry.key)}
                title={`${entry.character}${entry.reading ? ` (${entry.reading})` : ''} · ${entry.strokeCount} strokes`}
                className={`flex aspect-square flex-col items-center justify-center rounded-md border transition-colors ${
                  selected
                    ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-100'
                    : 'border-white/5 text-mist hover:border-white/20 hover:bg-white/5'
                }`}
              >
                <span className="text-xl leading-none">{entry.character}</span>
                <span className="mt-0.5 text-[10px] text-dim">{entry.reading ?? entry.strokeCount}</span>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-dim">
        {filtered.length} of {characters.length} characters
        {hidden > 0 ? ` · refine the search to reach the other ${hidden}` : ''}
      </p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
        active ? 'bg-cyan-400/15 text-cyan-100' : 'text-dim hover:text-mist'
      }`}
    >
      {children}
    </button>
  );
}
