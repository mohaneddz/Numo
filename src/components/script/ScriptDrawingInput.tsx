import { useEffect, useMemo, useState } from 'react';
import type { ScriptPracticeMode, ScriptPracticePayload, ScriptStrokeModel, ScriptStrokePath } from '../../types/scriptPractice';
import { SCRIPT_CANVAS_SIZE } from '../../data/scriptModels';

interface ScriptDrawingInputProps {
  payload: ScriptPracticePayload;
  mode: ScriptPracticeMode;
  model?: ScriptStrokeModel | null;
  onChange: (payload: ScriptPracticePayload) => void;
}

// CJK characters occupy a square box; a wide canvas stretched every model out
// of shape and made the position score meaningless.
const CANVAS_WIDTH = SCRIPT_CANVAS_SIZE;
const CANVAS_HEIGHT = SCRIPT_CANVAS_SIZE;

function pathD(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function ScriptDrawingInput({ payload, mode, model, onChange }: ScriptDrawingInputProps) {
  const [strokePaths, setStrokePaths] = useState<ScriptStrokePath[]>(payload.strokePaths ?? []);
  const [activePath, setActivePath] = useState<ScriptStrokePath | null>(null);

  useEffect(() => {
    setStrokePaths(payload.strokePaths ?? []);
  }, [payload.strokePaths]);

  const emit = (nextPaths: ScriptStrokePath[]) => {
    onChange({
      ...payload,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      strokePaths: nextPaths,
      mode,
      modelKey: model?.key,
    });
  };

  /** Seconds the character is shown before a timed-recall attempt. */
  const RECALL_PREVIEW_SECONDS = 5;
  const [previewLeft, setPreviewLeft] = useState(
    mode === 'timed_recall_draw' ? RECALL_PREVIEW_SECONDS : 0,
  );

  // Timed recall shows the character briefly, then takes it away — the whole
  // point of the mode is drawing it back from memory.
  useEffect(() => {
    if (mode !== 'timed_recall_draw') {
      setPreviewLeft(0);
      return undefined;
    }
    setPreviewLeft(RECALL_PREVIEW_SECONDS);
    const timer = window.setInterval(() => {
      setPreviewLeft((left) => (left <= 1 ? 0 : left - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode, model?.key]);

  /**
   * Which model strokes to show, which is what actually separates the modes.
   * They previously all rendered the same full template despite their copy
   * promising otherwise.
   */
  const visibleModelStrokes = useMemo(() => {
    const all = model?.strokes ?? [];
    switch (mode) {
      case 'trace':
        return all;
      case 'guided_draw':
        // Only the stroke that comes next, so the learner is led one stroke at
        // a time rather than copying the finished character.
        return all.slice(strokePaths.length, strokePaths.length + 1);
      case 'timed_recall_draw':
        return previewLeft > 0 ? all : [];
      default:
        return [];
    }
  }, [mode, model?.strokes, previewLeft, strokePaths.length]);

  // The guide used on real character practice paper: a centre cross plus
  // diagonals, which is what a character's proportions are actually judged
  // against. A plain square grid told the learner nothing.
  const guideGrid = useMemo(() => {
    const mid = CANVAS_WIDTH / 2;
    return [
      { x1: mid, y1: 0, x2: mid, y2: CANVAS_HEIGHT },
      { x1: 0, y1: mid, x2: CANVAS_WIDTH, y2: mid },
      { x1: 0, y1: 0, x2: CANVAS_WIDTH, y2: CANVAS_HEIGHT },
      { x1: CANVAS_WIDTH, y1: 0, x2: 0, y2: CANVAS_HEIGHT },
    ];
  }, []);

  const startPath = (clientX: number, clientY: number, target: Element) => {
    const rect = target.getBoundingClientRect();
    const firstPoint = {
      x: Math.round(clamp(clientX - rect.left, 0, CANVAS_WIDTH)),
      y: Math.round(clamp(clientY - rect.top, 0, CANVAS_HEIGHT)),
      t: Date.now(),
    };
    const path: ScriptStrokePath = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      points: [firstPoint],
    };
    setActivePath(path);
  };

  const appendPoint = (clientX: number, clientY: number, target: Element) => {
    setActivePath((previous) => {
      if (!previous) return previous;
      const rect = target.getBoundingClientRect();
      const point = {
        x: Math.round(clamp(clientX - rect.left, 0, CANVAS_WIDTH)),
        y: Math.round(clamp(clientY - rect.top, 0, CANVAS_HEIGHT)),
        t: Date.now(),
      };
      return { ...previous, points: [...previous.points, point] };
    });
  };

  const commitPath = () => {
    if (!activePath || activePath.points.length < 2) {
      setActivePath(null);
      return;
    }
    const next = [...strokePaths, activePath];
    setStrokePaths(next);
    setActivePath(null);
    emit(next);
  };

  const clearAll = () => {
    setStrokePaths([]);
    setActivePath(null);
    emit([]);
  };

  return (
    <div className="space-y-3">
      <svg
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        className="mx-auto block w-full max-w-[360px] rounded-xl border border-white/15 bg-slate-950/70 touch-none"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          startPath(event.clientX, event.clientY, event.currentTarget);
        }}
        onPointerMove={(event) => {
          if (!activePath) return;
          appendPoint(event.clientX, event.clientY, event.currentTarget);
        }}
        onPointerUp={() => commitPath()}
        onPointerCancel={() => commitPath()}
      >
        <rect x="0" y="0" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="transparent" />

        {guideGrid.map((line, index) => (
          <line
            key={`grid-${index}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}

        {visibleModelStrokes.map((stroke) => (
          <g key={`model-${stroke.index}`}>
            <path d={pathD(stroke.points)} fill="none" stroke="rgba(125,211,252,0.35)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {stroke.points[0] ? (
              <g>
                <circle cx={stroke.points[0].x} cy={stroke.points[0].y} r="10" fill="rgba(125,211,252,0.18)" />
                <text x={stroke.points[0].x} y={stroke.points[0].y + 4} textAnchor="middle" fontSize="10" fill="#bfe8ff">{stroke.index}</text>
              </g>
            ) : null}
          </g>
        ))}

        {strokePaths.map((path) => (
          <path key={path.id} d={pathD(path.points)} fill="none" stroke="#7dd3fc" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        ))}

        {activePath ? (
          <path d={pathD(activePath.points)} fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
      </svg>

      <div className="flex items-center justify-between">
        <p className="text-[12px] text-dim">
          {mode === 'timed_recall_draw' && previewLeft > 0 ? `Memorise it — ${previewLeft}s · ` : ''}
          {model ? `Model: ${model.character}${model.reading ? ` (${model.reading})` : ''} · stroke ${strokePaths.length}/${model.strokes.length}` : `Captured strokes: ${strokePaths.length}`}
        </p>
        <button
          type="button"
          className="rounded-md border border-white/20 bg-white/5 px-3 py-1 text-[12px] text-mist hover:bg-white/10"
          onClick={clearAll}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
