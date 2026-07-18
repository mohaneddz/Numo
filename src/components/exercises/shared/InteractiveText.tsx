import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [isTooltipLoading, setIsTooltipLoading] = useState(false);
  const [sheetEntry, setSheetEntry] = useState<GlossaryEntry | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRequestIdRef = useRef(0);
  const tokens = useMemo(() => glossary.tokenized(text), [glossary, text]);

  const closeTooltip = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    openRequestIdRef.current += 1;
    setActiveEntry(null);
    setActiveToken(null);
    setAnchorRect(null);
    setAnchorEl(null);
    setIsTooltipLoading(false);
  };

  const cancelScheduledClose = () => {
    if (!closeTimerRef.current) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };

  const scheduleClose = () => {
    cancelScheduledClose();
    closeTimerRef.current = setTimeout(() => {
      closeTooltip();
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (!closeTimerRef.current) return;
      clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!anchorEl || !activeToken || typeof window === 'undefined') return;

    let raf = 0;
    const updateAnchorRect = () => {
      if (!anchorEl || typeof document === 'undefined' || !document.body.contains(anchorEl)) {
        setAnchorRect(null);
        return;
      }
      setAnchorRect(anchorEl.getBoundingClientRect());
    };

    const scheduleUpdate = () => {
      cancelScheduledClose();
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateAnchorRect);
    };

    updateAnchorRect();
    window.addEventListener('scroll', scheduleUpdate, true);
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      window.removeEventListener('scroll', scheduleUpdate, true);
      window.removeEventListener('resize', scheduleUpdate);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [activeToken, anchorEl]);

  const handleOpen = async (token: string, target: HTMLElement) => {
    cancelScheduledClose();

    if (isMobileViewport()) {
      const entry = await glossary.resolveEntry(token);
      if (!entry) return;
      glossary.trackHover();
      onGlossaryUsage?.(1);
      setSheetEntry(entry);
      return;
    }

    const requestId = openRequestIdRef.current + 1;
    openRequestIdRef.current = requestId;
    setActiveToken(token);
    setActiveEntry(null);
    setAnchorEl(target);
    setAnchorRect(target.getBoundingClientRect());
    setIsTooltipLoading(true);

    const entry = await glossary.resolveEntry(token);
    if (openRequestIdRef.current !== requestId) return;

    if (!entry) {
      setIsTooltipLoading(false);
      closeTooltip();
      return;
    }

    glossary.trackHover();
    onGlossaryUsage?.(1);
    setActiveEntry(entry);
    setIsTooltipLoading(false);
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
        {tokens.map(({ token, interactive, target }, index) => {
          if (!interactive || token.trim().length === 0) {
            return <span key={`${token}-${index}`}>{token}</span>;
          }

          return (
            <span
              key={`${token}-${index}`}
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                void handleOpen(token, event.currentTarget);
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                event.stopPropagation();
                void handleOpen(token, event.currentTarget);
              }}
              onMouseEnter={(event) => {
                void handleOpen(token, event.currentTarget);
              }}
              onMouseLeave={() => {
                scheduleClose();
              }}
              className={`rounded px-0.5 py-0 text-inherit transition-colors hover:bg-cyan-500/15 hover:text-cyan-100 focus:bg-cyan-500/15 focus:text-cyan-100 focus:outline-none cursor-pointer ${target ? 'underline decoration-cyan-400/70 decoration-1 underline-offset-2' : ''}`}
            >
              {token}
            </span>
          );
        })}
      </span>

      {activeToken ? (
        <GlossaryTooltip
          entry={activeEntry}
          token={activeToken}
          loading={isTooltipLoading}
          anchorRect={anchorRect}
          onSave={activeEntry ? () => glossary.saveWord(activeEntry) : undefined}
          onHear={() => {
            if (!activeEntry) return;
            void hearEntry(activeEntry);
          }}
          onMouseEnter={cancelScheduledClose}
          onMouseLeave={scheduleClose}
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
