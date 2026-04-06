import { useEffect, useMemo, useState } from 'react';
import type { ScriptPracticeMode, ScriptPracticePayload, ScriptStrokeModel, ScriptStrokePath } from '../../types/scriptPractice';

interface ScriptDrawingInputProps {
  payload: ScriptPracticePayload;
  mode: ScriptPracticeMode;
  model?: ScriptStrokeModel | null;
  onChange: (payload: ScriptPracticePayload) => void;
}

const CANVAS_WIDTH = 380;
const CANVAS_HEIGHT = 220;

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

  const templateVisible = mode === 'watch' || mode === 'trace' || mode === 'guided_draw';

  const guideGrid = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    const step = 44;
    for (let x = step; x < CANVAS_WIDTH; x += step) {
      lines.push({ x1: x, y1: 0, x2: x, y2: CANVAS_HEIGHT });
    }
    for (let y = step; y < CANVAS_HEIGHT; y += step) {
      lines.push({ x1: 0, y1: y, x2: CANVAS_WIDTH, y2: y });
    }
    return lines;
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
        className="w-full rounded-xl border border-white/15 bg-slate-950/70 touch-none"
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

        {templateVisible && model?.strokes.map((stroke) => (
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
          {model ? `Model: ${model.character}${model.reading ? ` (${model.reading})` : ''} • strokes ${strokePaths.length}/${model.strokes.length}` : `Captured strokes: ${strokePaths.length}`}
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
