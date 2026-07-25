import { describe, expect, it } from 'vitest';
import {
  buildRoadmap,
  checkpointCountFor,
  findStep,
  nextAvailableStep,
  parseStepId,
} from './checkpointPlan';
import {
  createInitialProgression,
  type ProgressionState,
} from './progressionStore';
import { getThemeByOrder } from './skillGraph';

function roadmapFor(progression: ProgressionState, themeOrder = 1, everdarkLevel = 1) {
  const roadmap = buildRoadmap({ themeOrder, everdarkLevel, languageCode: 'es', progression });
  if (!roadmap) throw new Error('expected roadmap');
  return roadmap;
}

describe('checkpointCountFor', () => {
  it('uses the theme designed session range and deepens with Everdark level', () => {
    const theme = getThemeByOrder(1);
    if (!theme) throw new Error('missing theme');
    expect(checkpointCountFor(theme, 1)).toBe(theme.coreSessionRange[0]);
    expect(checkpointCountFor(theme, 5)).toBeLessThanOrEqual(theme.coreSessionRange[1]);
    expect(checkpointCountFor(theme, 5)).toBeGreaterThan(checkpointCountFor(theme, 1));
  });
});

describe('buildRoadmap', () => {
  it('opens the first checkpoint and locks the rest for a new learner', () => {
    const roadmap = roadmapFor(createInitialProgression());
    expect(roadmap.checkpoints[0].status).toBe('available');
    expect(roadmap.checkpoints[1].status).toBe('locked');
    expect(roadmap.completedSteps).toBe(0);
  });

  it('opens only the first step of an available checkpoint', () => {
    const roadmap = roadmapFor(createInitialProgression());
    const [first, second] = roadmap.checkpoints[0].steps;
    expect(first.status).toBe('available');
    expect(second.status).toBe('locked');
  });

  it('advances step availability as steps are completed', () => {
    const base = createInitialProgression();
    const roadmap = roadmapFor(base);
    const firstStepId = roadmap.checkpoints[0].steps[0].id;

    const advanced = roadmapFor({ ...base, completedStepIds: [firstStepId] });
    expect(advanced.checkpoints[0].steps[0].status).toBe('completed');
    expect(advanced.checkpoints[0].steps[1].status).toBe('available');
    expect(advanced.completedSteps).toBe(1);
  });

  it('unlocks the next checkpoint once the previous one is recorded', () => {
    const base = createInitialProgression();
    const roadmap = roadmapFor(base);
    const firstCheckpointId = roadmap.checkpoints[0].id;

    const advanced = roadmapFor({
      ...base,
      checkpointResults: {
        [firstCheckpointId]: { score: 88, completedAt: new Date().toISOString(), stepsCompleted: 5 },
      },
    });
    expect(advanced.checkpoints[0].status).toBe('completed');
    expect(advanced.checkpoints[0].score).toBe(88);
    expect(advanced.checkpoints[1].status).toBe('available');
    expect(advanced.completedCheckpoints).toBe(1);
  });

  it('gives every step at least one real skill from the graph', () => {
    const roadmap = roadmapFor(createInitialProgression());
    for (const checkpoint of roadmap.checkpoints) {
      for (const step of checkpoint.steps) {
        expect(step.skillIds.length).toBeGreaterThan(0);
        expect(step.taskCount).toBeGreaterThan(0);
      }
    }
  });

  it('shifts later checkpoints toward production work', () => {
    const roadmap = roadmapFor(createInitialProgression());
    const firstKinds = roadmap.checkpoints[0].steps.map((step) => step.kind);
    const lastKinds = roadmap.checkpoints[roadmap.checkpoints.length - 1].steps.map((step) => step.kind);
    expect(firstKinds).not.toContain('speaking');
    expect(lastKinds).toContain('speaking');
  });

  it('raises task volume at higher Everdark levels', () => {
    const base = createInitialProgression();
    const level1 = roadmapFor(base, 1, 1);
    const level3 = roadmapFor(base, 1, 3);
    expect(level3.checkpoints[0].steps[0].taskCount).toBeGreaterThan(level1.checkpoints[0].steps[0].taskCount);
  });

  it('produces stable step ids across rebuilds', () => {
    const a = roadmapFor(createInitialProgression());
    const b = roadmapFor(createInitialProgression());
    expect(a.checkpoints[2].steps[1].id).toBe(b.checkpoints[2].steps[1].id);
  });
});

describe('roadmap navigation', () => {
  it('finds the next available step', () => {
    const roadmap = roadmapFor(createInitialProgression());
    const next = nextAvailableStep(roadmap);
    expect(next?.step.id).toBe(roadmap.checkpoints[0].steps[0].id);
  });

  it('looks up a step by id', () => {
    const roadmap = roadmapFor(createInitialProgression());
    const target = roadmap.checkpoints[1].steps[2];
    expect(findStep(roadmap, target.id)?.step.title).toBe(target.title);
    expect(findStep(roadmap, 'missing-step')).toBeNull();
  });

  it('round-trips step ids', () => {
    const roadmap = roadmapFor(createInitialProgression(), 3, 2);
    const step = roadmap.checkpoints[1].steps[0];
    const parsed = parseStepId(step.id);
    expect(parsed).toEqual({
      themeId: roadmap.theme.id,
      everdarkLevel: 2,
      checkpointNumber: 2,
      stepNumber: 1,
    });
  });
});
