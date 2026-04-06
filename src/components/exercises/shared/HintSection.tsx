import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { InteractiveText } from './InteractiveText';

interface HintSectionProps {
  hints?: string[];
  languageCode?: string;
  onHintShown?: () => void;
}

export function HintSection({ hints, languageCode, onHintShown }: HintSectionProps) {
  const [showHints, setShowHints] = useState(false);

  if (!hints || hints.length === 0) return null;

  return (
    <div className="mt-2">
      {!showHints ? (
        <button
          type="button"
          onClick={() => {
            setShowHints(true);
            onHintShown?.();
          }}
          className="text-[12px] text-blue-300 transition-colors hover:text-blue-200"
        >
          <span className="flex items-center gap-1"><Lightbulb size={12} /> Show hint</span>
        </button>
      ) : (
        <div className="rounded-md border border-blue-400/25 bg-blue-500/10 p-3">
          <p className="mb-2 text-[12px] text-blue-200">Hints</p>
          <div className="flex flex-wrap gap-2">
            {hints.map((item, index) => (
              <span key={`${item}-${index}`} className="pill text-[11px] normal-case tracking-normal text-mist">
                <InteractiveText text={item} languageCode={languageCode} />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
