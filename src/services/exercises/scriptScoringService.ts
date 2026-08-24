import type { ScriptPracticePayload, ScriptStrokeModel } from '../../types/scriptPractice';

export interface ScriptHeuristicScore {
  strokeCountScore: number;
  orderScore: number;
  shapeScore: number;
  positionScore: number;
  totalScore: number;
  feedback: string;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function centroid(points: Array<{ x: number; y: number }>): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 };
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function scoreScriptAttempt(payload: ScriptPracticePayload, model?: ScriptStrokeModel): ScriptHeuristicScore {
  const strokePaths = payload.strokePaths ?? [];
  const allPoints = strokePaths.flatMap((path) => path.points);

  if (!model || model.strokes.length === 0) {
    const fallback = clamp(Math.min(100, (allPoints.length / 120) * 100));
    return {
      strokeCountScore: fallback,
      orderScore: fallback,
      shapeScore: fallback,
      positionScore: fallback,
      totalScore: fallback,
      feedback: 'Model unavailable. Capture quality scored from drawing completeness.',
    };
  }

  const modelPoints = model.strokes.flatMap((stroke) => stroke.points);
  const modelCenter = centroid(modelPoints);
  const userCenter = centroid(allPoints);

  const modelStrokeCount = model.strokes.length;
  const userStrokeCount = strokePaths.length;
  const strokeCountScore = clamp(100 - Math.abs(modelStrokeCount - userStrokeCount) * 18);

  const overlapCount = Math.min(modelStrokeCount, userStrokeCount);
  let orderHits = 0;
  for (let index = 0; index < overlapCount; index += 1) {
    const modelStart = model.strokes[index]?.points[0];
    const userStart = strokePaths[index]?.points[0];
    if (!modelStart || !userStart) continue;
    if (distance(modelStart, userStart) < Math.max(payload.width, payload.height) * 0.16) {
      orderHits += 1;
    }
  }
  const orderScore = clamp((orderHits / Math.max(1, modelStrokeCount)) * 100);

  const modelSpread = Math.max(1, Math.max(...modelPoints.map((point) => distance(point, modelCenter))));
  const userSpread = Math.max(1, Math.max(...allPoints.map((point) => distance(point, userCenter))));
  const spreadRatio = Math.min(modelSpread, userSpread) / Math.max(modelSpread, userSpread);
  const shapeScore = clamp(spreadRatio * 100);

  const centerDistance = distance(modelCenter, userCenter);
  const diagonal = Math.hypot(payload.width, payload.height);
  const positionScore = clamp(100 - (centerDistance / Math.max(1, diagonal)) * 140);

  const totalScore = clamp(strokeCountScore * 0.32 + orderScore * 0.26 + shapeScore * 0.22 + positionScore * 0.2);

  const feedback = totalScore >= 85
    ? 'Strong character form. Keep this stroke rhythm.'
    : totalScore >= 65
      ? 'Good base. Focus on stroke order and overall proportion.'
      : 'Needs reinforcement. Use trace mode, then retry from recall.';

  return {
    strokeCountScore,
    orderScore,
    shapeScore,
    positionScore,
    totalScore,
    feedback,
  };
}
