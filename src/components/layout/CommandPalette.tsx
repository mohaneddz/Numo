import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Search } from 'lucide-react';
import { useAppData } from '../../contexts/AppDataContext';
import {
  NAVIGATION_COMMANDS,
  PRACTICE_COMMANDS,
  groupCommands,
  searchCommands,
  vocabularyCommands,
  type Command,
} from '../../services/navigation/commandPalette';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Ctrl+K palette.
 *
 * The app has around twenty destinations behind a sidebar, a chord system, and
 * several routes reachable only by typing a URL. This makes all of them, and
 * the learner's own saved words, reachable by typing part of a name.
 */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { state } = useAppData();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Command[]>(
    () => [
      ...PRACTICE_COMMANDS,
      ...NAVIGATION_COMMANDS,
      ...vocabularyCommands(
        state.notebookEntries.map((entry) => ({
          id: entry.id,
          term: entry.term,
          translation: entry.translation,
        })),
      ),
    ],
    [state.notebookEntries],
  );

  const results = useMemo(() => searchCommands(commands, query), [commands, query]);
  const grouped = useMemo(() => groupCommands(results), [results]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Focus after the overlay has mounted, or the input is not there yet.
      const frame = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  const run = (command: Command) => {
    onClose();
    navigate(command.to);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (results.length === 0 ? 0 : (index + 1) % results.length));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) =>
        results.length === 0 ? 0 : (index - 1 + results.length) % results.length,
      );
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const selected = results[activeIndex];
      if (selected) run(selected);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  // Ranked order is flat, but display is grouped — this maps a rendered row
  // back to its position in the ranking so arrow keys move in the order shown.
  let renderIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#0B1020] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
          <Search size={16} className="text-dim" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, practice, and your words"
            className="flex-1 bg-transparent text-[15px] text-mist outline-none placeholder:text-dim"
            aria-label="Search commands"
          />
          <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[11px] text-dim">esc</kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-dim">
              Nothing matches “{query}”.
            </p>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} className="mb-2 last:mb-0">
                <p className="px-3 py-1 text-[11px] uppercase tracking-wider text-dim/70">{group}</p>
                {items.map((command) => {
                  renderIndex += 1;
                  const isActive = renderIndex === activeIndex;
                  const ownIndex = renderIndex;

                  return (
                    <button
                      key={command.id}
                      type="button"
                      data-active={isActive}
                      onMouseEnter={() => setActiveIndex(ownIndex)}
                      onClick={() => run(command)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                        isActive ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] text-mist">{command.label}</span>
                        {command.hint && (
                          <span className="block truncate text-[12px] text-dim">{command.hint}</span>
                        )}
                      </span>
                      {isActive && <CornerDownLeft size={14} className="shrink-0 text-dim" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
