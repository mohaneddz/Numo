import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import type { ScriptStrokeModel } from '../../types/scriptPractice';
import { SCRIPT_CANVAS_SIZE } from '../../data/scriptModels';

interface ScriptStrokeAnimationProps {
  model: ScriptStrokeModel | null;
}

/** Canvas units drawn per second. Slow enough to follow the brush by eye. */
const DRAW_SPEED = 260;
/** Pause between strokes, so each one reads as a separate movement. */
const STROKE_GAP_MS = 260;

function pathD(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function strokeLength(points: Array<{ x: number; y: number }>): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
  }
  return total;
}

/** Returns the leading portion of a stroke, `progress` of the way along it. */
function partialStroke(points: Array<{ x: number; y: number }>, progress: number) {
  if (progress <= 0 || points.length < 2) return [];
  if (progress >= 1) return points;

  const total = strokeLength(points);
  const target = total * progress;
  const output = [points[0]];
  let covered = 0;

  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    const segment = Math.hypot(to.x - from.x, to.y - from.y);

    if (covered + segment >= target) {
      const ratio = segment === 0 ? 0 : (target - covered) / segment;
      output.push({ x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio });
      break;
    }
    covered += segment;
    output.push(to);
  }

  return output;
}

/**
 * Plays a character's strokes in order.
 *
 * "Watch" mode previously rendered the same static canvas as every other mode,
 * so there was nothing to watch — the one thing it needed to show, the order
 * and direction the strokes are actually written in, was exactly what was
 * missing.
 */
export function ScriptStrokeAnimation({ model }: ScriptStrokeAnimationProps) {
  // Memoised so the animation effect below has a stable dependency: a bare
  // `?? []` produced a new array every render and restarted the loop.
  const strokes = useMemo(() => model?.strokes ?? [], [model?.strokes]);
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);

  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const gapUntilRef = useRef(0);
  // The animation advances on refs and commits to state once per frame. Driving
  // it from state updaters meant calling setStrokeIndex from inside a
  // setProgress updater, and React may run an updater more than once — which
  // would skip strokes.
  const strokeIndexRef = useRef(0);
  const progressRef = useRef(0);

  const reset = useCallback(() => {
    strokeIndexRef.current = 0;
    progressRef.current = 0;
    setStrokeIndex(0);
    setProgress(0);
    setPlaying(true);
    lastTimeRef.current = null;
    gapUntilRef.current = 0;
  }, []);

  // Starting a new character mid-playback would otherwise continue from
  // whatever stroke the previous one had reached.
  useEffect(() => {
    reset();
  }, [model?.key, reset]);

  useEffect(() => {
    if (!playing || strokes.length === 0) return undefined;

    const step = (time: number) => {
      const last = lastTimeRef.current;
      lastTimeRef.current = time;
      const delta = last === null ? 0 : time - last;

      if (gapUntilRef.current > 0) {
        gapUntilRef.current -= delta;
        frameRef.current = requestAnimationFrame(step);
        return;
      }

      const points = strokes[strokeIndexRef.current]?.points ?? [];
      const length = Math.max(1, strokeLength(points));
      const next = progressRef.current + (DRAW_SPEED * delta) / 1000 / length;

      if (next < 1) {
        progressRef.current = next;
      } else if (strokeIndexRef.current + 1 >= strokes.length) {
        progressRef.current = 1;
        setPlaying(false);
      } else {
        strokeIndexRef.current += 1;
        progressRef.current = 0;
        gapUntilRef.current = STROKE_GAP_MS;
      }

      setStrokeIndex(strokeIndexRef.current);
      setProgress(progressRef.current);

      frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      lastTimeRef.current = null;
    };
  }, [playing, strokes]);

  const goToStroke = (index: number) => {
    const clamped = Math.max(0, Math.min(strokes.length - 1, index));
    strokeIndexRef.current = clamped;
    progressRef.current = 1;
    setStrokeIndex(clamped);
    setProgress(1);
    setPlaying(false);
  };

  if (!model || strokes.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-8 text-center text-[13px] text-dim">
        No stroke data for this character yet.
      </p>
    );
  }

  const mid = SCRIPT_CANVAS_SIZE / 2;
  const currentPoints = strokes[strokeIndex]?.points ?? [];
  const head = partialStroke(currentPoints, progress);
  const brush = head[head.length - 1];

  return (
    <div className="space-y-3">
      <svg
        width={SCRIPT_CANVAS_SIZE}
        height={SCRIPT_CANVAS_SIZE}
        viewBox={`0 0 ${SCRIPT_CANVAS_SIZE} ${SCRIPT_CANVAS_SIZE}`}
        className="mx-auto block w-full max-w-[360px] rounded-xl border border-white/15 bg-slate-950/70"
      >
        {[
          { x1: mid, y1: 0, x2: mid, y2: SCRIPT_CANVAS_SIZE },
          { x1: 0, y1: mid, x2: SCRIPT_CANVAS_SIZE, y2: mid },
          { x1: 0, y1: 0, x2: SCRIPT_CANVAS_SIZE, y2: SCRIPT_CANVAS_SIZE },
          { x1: SCRIPT_CANVAS_SIZE, y1: 0, x2: 0, y2: SCRIPT_CANVAS_SIZE },
        ].map((line, index) => (
          <line
            key={`guide-${index}`}
            {...line}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
        ))}

        {/* The whole character, faint, so the stroke in progress has context. */}
        {strokes.map((stroke) => (
          <path
            key={`ghost-${stroke.index}`}
            d={pathD(stroke.points)}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {strokes.slice(0, strokeIndex).map((stroke) => (
          <path
            key={`done-${stroke.index}`}
            d={pathD(stroke.points)}
            fill="none"
            stroke="#7dd3fc"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {head.length > 1 && (
          <path
            d={pathD(head)}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {brush && <circle cx={brush.x} cy={brush.y} r="7" fill="#22d3ee" opacity="0.9" />}

        {currentPoints[0] && (
          <circle
            cx={currentPoints[0].x}
            cy={currentPoints[0].y}
            r="11"
            fill="none"
            stroke="rgba(34,211,238,0.5)"
            strokeWidth="2"
          />
        )}
      </svg>

      <div className="flex items-center justify-center gap-2">
        <ControlButton label="Previous stroke" onClick={() => goToStroke(strokeIndex - 1)}>
          <SkipBack size={15} />
        </ControlButton>
        <ControlButton
          label={playing ? 'Pause' : 'Play'}
          onClick={() => {
            lastTimeRef.current = null;
            setPlaying((on) => !on);
          }}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </ControlButton>
        <ControlButton label="Next stroke" onClick={() => goToStroke(strokeIndex + 1)}>
          <SkipForward size={15} />
        </ControlButton>
        <ControlButton label="Replay from the first stroke" onClick={reset}>
          <RotateCcw size={15} />
        </ControlButton>
      </div>

      <p className="text-center text-[12px] text-dim">
        Stroke {strokeIndex + 1} of {strokes.length}
      </p>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-dim transition-colors hover:border-cyan-400/40 hover:text-cyan-100"
    >
      {children}
    </button>
  );
}
