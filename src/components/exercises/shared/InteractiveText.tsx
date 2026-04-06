import { useMemo, useState } from 'react';
import { useGlossary } from '../../../hooks/useGlossary';
import type { GlossaryEntry } from '../../../services/exercises/glossaryData';
import { synthesizeSpeech } from '../../../services/aiProvider';
import { GlossarySheet } from './GlossarySheet';
import { GlossaryTooltip } from './GlossaryTooltip';

interface InteractiveTextProps {
  text: string;
  languageCode?: string;
  className?: string;
  onGlossaryUsage?: (count: number) => void;
}

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

export function InteractiveText({ text, languageCode, className, onGlossaryUsage }: InteractiveTextProps) {
  const glossary = useGlossary(languageCode);
  const [activeEntry, setActiveEntry] = useState<GlossaryEntry | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [sheetEntry, setSheetEntry] = useState<GlossaryEntry | null>(null);
  const tokens = useMemo(() => glossary.tokenized(text), [glossary, text]);

  const handleOpen = async (token: string, target: HTMLElement) => {
    const entry = await glossary.resolveEntry(token);
    if (!entry) return;
    glossary.trackHover();
    onGlossaryUsage?.(1);

    if (isMobileViewport()) {
      setSheetEntry(entry);
      return;
    }

    setActiveEntry(entry);
    setAnchorRect(target.getBoundingClientRect());
  };

  const hearEntry = async (entry: GlossaryEntry) => {
    try {
      const blob = await synthesizeSpeech(entry.token);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      void audio.play();
    } catch {
      // Silence optional hear failures.
    }
  };

  return (
    <>
      <span className={className}>
        {tokens.map(({ token, interactive }, index) => {
          if (!interactive || token.trim().length === 0) {
            return <span key={`${token}-${index}`}>{token}</span>;
          }

          return (
            <button
              key={`${token}-${index}`}
              type="button"
              onClick={(event) => {
                void handleOpen(token, event.currentTarget);
              }}
              onMouseEnter={(event) => {
                void handleOpen(token, event.currentTarget);
              }}
              className="rounded px-0.5 py-0 text-inherit transition-colors hover:bg-cyan-500/15 hover:text-cyan-100 focus:bg-cyan-500/15 focus:text-cyan-100 focus:outline-none"
            >
              {token}
            </button>
          );
        })}
      </span>

      {activeEntry ? (
        <GlossaryTooltip
          entry={activeEntry}
          anchorRect={anchorRect}
          onSave={() => glossary.saveWord(activeEntry)}
          onHear={() => {
            void hearEntry(activeEntry);
          }}
        />
      ) : null}

      {sheetEntry ? (
        <GlossarySheet
          entry={sheetEntry}
          onClose={() => setSheetEntry(null)}
          onSave={() => glossary.saveWord(sheetEntry)}
          onHear={() => {
            void hearEntry(sheetEntry);
          }}
        />
      ) : null}
    </>
  );
}
