import { describe, expect, it } from 'vitest';
import { findScriptModel } from '../../data/scriptModels';
import { scoreScriptAttempt } from './scriptScoringService';

describe('scriptScoringService', () => {
  it('produces bounded scores without model', () => {
    const score = scoreScriptAttempt({
      strokePaths: [
        { id: 's1', points: [{ x: 10, y: 20, t: 1 }, { x: 20, y: 30, t: 2 }] },
      ],
      width: 320,
      height: 220,
    });

    expect(score.totalScore).toBeGreaterThanOrEqual(0);
    expect(score.totalScore).toBeLessThanOrEqual(100);
  });

  it('returns higher score for model-aligned trace', () => {
    const model = findScriptModel('ja', 'ja:\u3042');
    expect(model).not.toBeNull();

    const aligned = scoreScriptAttempt(
      {
        strokePaths: model!.strokes.map((stroke) => ({
          id: `stroke-${stroke.index}`,
          points: stroke.points,
        })),
        width: 380,
        height: 220,
      },
      model ?? undefined,
    );

    expect(aligned.totalScore).toBeGreaterThan(70);
    expect(aligned.strokeCountScore).toBeGreaterThan(70);
  });
});
