import { useMemo, useState } from 'react';
import type { ScriptPracticePayload } from '../../types/scriptPractice';

interface ScriptDrawingInputProps {
  onChange: (payload: ScriptPracticePayload) => void;
}

const CANVAS_WIDTH = 380;
const CANVAS_HEIGHT = 220;

export function ScriptDrawingInput({ onChange }: ScriptDrawingInputProps) {
  const [strokes, setStrokes] = useState<Array<{ x: number; y: number; t: number }>>([]);

  const pathD = useMemo(() => {
    if (strokes.length === 0) return '';
    return strokes.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  }, [strokes]);

  const emitChange = (nextStrokes: Array<{ x: number; y: number; t: number }>) => {
    onChange({
      strokes: nextStrokes,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    });
  };

  const appendPoint = (clientX: number, clientY: number, target: Element) => {
    const rect = target.getBoundingClientRect();
    const x = Math.max(0, Math.min(CANVAS_WIDTH, clientX - rect.left));
    const y = Math.max(0, Math.min(CANVAS_HEIGHT, clientY - rect.top));
    const next = [...strokes, { x: Math.round(x), y: Math.round(y), t: Date.now() }];
    setStrokes(next);
    emitChange(next);
  };

  return (
    <div className="space-y-3">
      <svg
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        className="w-full rounded-xl border border-white/10 bg-slate-950/60"
        onMouseMove={(event) => {
          if ((event.buttons & 1) !== 1) return;
          appendPoint(event.clientX, event.clientY, event.currentTarget);
        }}
      >
        <rect x="0" y="0" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="transparent" />
        <path d={pathD} fill="none" stroke="#7dd3fc" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-dim">Capture-only drawing boundary (scoring deferred).</p>
        <button
          className="rounded-md border border-white/20 bg-white/5 px-3 py-1 text-[12px] text-mist hover:bg-white/10"
          onClick={() => {
            setStrokes([]);
            emitChange([]);
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

