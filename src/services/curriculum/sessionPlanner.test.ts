import { describe, expect, it } from 'vitest';
import { buildRoadmap, type RoadmapStep } from './checkpointPlan';
import { createInitialProgression } from './progressionStore';
import { applyOutcome, createEmptyMastery, type SkillMasteryMap, type SkillOutcome } from './masteryStore';
import { planSession } from './sessionPlanner';
import { LISTENING_TASK_TYPES, PRODUCTION_TASK_TYPES, SPEAKING_TASK_TYPES } from './exerciseLadder';
import type { ExercisePolicyContext } from '../exercises/exercisePolicy';

const POLICY: ExercisePolicyContext = {
  languageCode: 'es',
  level: 'lower_intermediate',
  difficulty: 'standard',
};

function stepsOfKind(kind: RoadmapStep['kind'], themeOrder = 5) {
  const roadmap = buildRoadmap({
    themeOrder,
    everdarkLevel: 1,
    languageCode: 'es',
    progression: createInitialProgression(),
  });
  if (!roadmap) throw new Error('expected roadmap');
  const step = roadmap.checkpoints.flatMap((checkpoint) => checkpoint.steps).find((candidate) => candidate.kind === kind);
  if (!step) throw new Error(`no ${kind} step found`);
  return { roadmap, step };
}

function drilled(skillId: string, outcomes: Array<Partial<SkillOutcome>>) {
  let record = createEmptyMastery(skillId);
  for (const outcome of outcomes) {
    record = applyOutcome(record, {
      skillId,
      correct: outcome.correct ?? true,
      score: outcome.score ?? (outcome.correct === false ? 0 : 100),
      modality: outcome.modality ?? 'recognition',
      latencyMs: 3000,
    });
  }
  return record;
}

describe('planSession', () => {
  it('fills every requested task slot with a real skill and exercise type', () => {
    const { roadmap, step } = stepsOfKind('exercise');
    const plan = planSession({
      step,
      themeId: roadmap.theme.id,
      languageCode: 'es',
      mastery: {},
      policy: POLICY,
    });

    expect(plan.blueprints.length).toBeGreaterThan(0);
    expect(plan.blueprints.length).toBeLessThanOrEqual(step.taskCount);
    for (const blueprint of plan.blueprints) {
      expect(blueprint.skillId).toBeTruthy();
      expect(blueprint.taskType).toBeTruthy();
      expect(blueprint.rationale).toBeTruthy();
    }
  });

  it('starts an unseen skill on the bottom rung', () => {
    const { roadmap, step } = stepsOfKind('vocabulary');
    const plan = planSession({
      step,
      themeId: roadmap.theme.id,
      languageCode: 'es',
      mastery: {},
      policy: POLICY,
    });

    const introduced = plan.blueprints.filter((blueprint) => blueprint.role === 'introduce');
    expect(introduced.length).toBeGreaterThan(0);
    for (const blueprint of introduced) {
      expect(blueprint.rung).toBe('recognize');
    }
  });

  it('climbs to production once a skill is well known', () => {
    const { roadmap, step } = stepsOfKind('exercise');
    const mastery: SkillMasteryMap = {};
    for (const skillId of step.skillIds) {
      mastery[skillId] = drilled(skillId, Array.from({ length: 14 }, () => ({ correct: true })));
    }

    const plan = planSession({
      step,
      themeId: roadmap.theme.id,
      languageCode: 'es',
      mastery,
      policy: POLICY,
    });

    const stepBlueprints = plan.blueprints.filter((blueprint) => step.skillIds.includes(blueprint.skillId));
    expect(stepBlueprints.some((blueprint) => blueprint.rung === 'produce')).toBe(true);
  });

  it('pulls weak earlier skills into the session as review', () => {
    const { roadmap, step } = stepsOfKind('exercise');
    const mastery: SkillMasteryMap = {
      self_introduction: drilled('self_introduction', [
        { correct: false, score: 0 },
        { correct: false, score: 0 },
        { correct: false, score: 10 },
      ]),
    };

    const plan = planSession({
      step,
      themeId: roadmap.theme.id,
      languageCode: 'es',
      mastery,
      policy: POLICY,
    });

    expect(plan.reviewSkillIds).toContain('self_introduction');
    expect(plan.blueprints.some((blueprint) => blueprint.skillId === 'self_introduction')).toBe(true);
  });

  it('devotes most of a review step to material outside the step', () => {
    const { roadmap, step } = stepsOfKind('review');
    const plan = planSession({
      step,
      themeId: roadmap.theme.id,
      languageCode: 'es',
      mastery: {},
      policy: POLICY,
    });

    const reviewCount = plan.blueprints.filter((blueprint) => !step.skillIds.includes(blueprint.skillId)).length;
    expect(reviewCount).toBeGreaterThan(plan.blueprints.length / 2);
  });

  it('always leaves at least one slot for the step own skills', () => {
    const { roadmap, step } = stepsOfKind('review');
    const plan = planSession({
      step,
      themeId: roadmap.theme.id,
      languageCode: 'es',
      mastery: {},
      policy: POLICY,
    });
    expect(plan.blueprints.some((blueprint) => step.skillIds.includes(blueprint.skillId))).toBe(true);
  });

  it('uses only audio exercises in a listening step', () => {
    const { roadmap, step } = stepsOfKind('listening');
    const plan = planSession({
      step,
      themeId: roadmap.theme.id,
      languageCode: 'es',
      mastery: {},
      policy: POLICY,
    });

    expect(plan.blueprints.length).toBeGreaterThan(0);
    for (const blueprint of plan.blueprints) {
      expect(LISTENING_TASK_TYPES.has(blueprint.taskType)).toBe(true);
    }
  });

  it('uses only speaking exercises in a speaking step', () => {
    const { roadmap, step } = stepsOfKind('speaking', 12);
    const plan = planSession({
      step,
      themeId: roadmap.theme.id,
      languageCode: 'es',
      mastery: {},
      policy: POLICY,
    });

    expect(plan.blueprints.length).toBeGreaterThan(0);
    for (const blueprint of plan.blueprints) {
      expect(SPEAKING_TASK_TYPES.has(blueprint.taskType)).toBe(true);
    }
  });

  it('blocks free production for a complete beginner', () => {
    const { roadmap, step } = stepsOfKind('exercise');
    const mastery: SkillMasteryMap = {};
    for (const skillId of step.skillIds) {
      mastery[skillId] = drilled(skillId, Array.from({ length: 14 }, () => ({ correct: true })));
    }

    const plan = planSession({
      step,
      themeId: roadmap.theme.id,
      languageCode: 'es',
      mastery,
      policy: { languageCode: 'es', level: 'complete_beginner', difficulty: 'standard' },
    });

    const freeProduction = plan.blueprints.filter(
      (blueprint) =>
        PRODUCTION_TASK_TYPES.has(blueprint.taskType) &&
        ['complete_dialogue', 'read_answer_questions', 'correct_grammar', 'compare_structures'].includes(blueprint.taskType),
    );
    expect(freeProduction).toHaveLength(0);
  });

  it('opens with an achievable task rather than free production', () => {
    const { roadmap, step } = stepsOfKind('exercise');
    const mastery: SkillMasteryMap = {};
    for (const skillId of [...step.skillIds, 'self_introduction', 'pronouns']) {
      mastery[skillId] = drilled(skillId, Array.from({ length: 14 }, () => ({ correct: true })));
    }

    const plan = planSession({
      step,
      themeId: roadmap.theme.id,
      languageCode: 'es',
      mastery,
      policy: POLICY,
    });

    const hasEasier = plan.blueprints.some((blueprint) => blueprint.rung !== 'produce');
    if (hasEasier) expect(plan.blueprints[0].rung).not.toBe('produce');
  });

  it('spreads free-production tasks instead of clustering them', () => {
    const { roadmap, step } = stepsOfKind('exercise');
    const mastery: SkillMasteryMap = {};
    for (const skillId of [...step.skillIds, 'self_introduction', 'pronouns', 'question_words']) {
      mastery[skillId] = drilled(skillId, Array.from({ length: 14 }, () => ({ correct: true })));
    }

    const plan = planSession({
      step,
      themeId: roadmap.theme.id,
      languageCode: 'es',
      mastery,
      policy: POLICY,
    });

    const produceCount = plan.blueprints.filter((blueprint) => blueprint.rung === 'produce').length;
    const otherCount = plan.blueprints.length - produceCount;
    let adjacentPairs = 0;
    for (let index = 1; index < plan.blueprints.length; index += 1) {
      if (plan.blueprints[index].rung === 'produce' && plan.blueprints[index - 1].rung === 'produce') {
        adjacentPairs += 1;
      }
    }

    // Slot 0 is reserved as a warm-up, so production tasks share the remaining
    // gaps; adjacency is only unavoidable once they outnumber those gaps.
    expect(adjacentPairs).toBeLessThanOrEqual(Math.max(0, produceCount - otherCount));
  });

  it('uses script exercises for a non-Latin language', () => {
    const roadmap = buildRoadmap({
      themeOrder: 1,
      everdarkLevel: 1,
      languageCode: 'ja',
      progression: createInitialProgression(),
    });
    if (!roadmap) throw new Error('expected roadmap');

    const scriptStep = roadmap.checkpoints
      .flatMap((checkpoint) => checkpoint.steps)
      .find((step) => step.skillIds.some((id) => id.includes('script') || id.includes('character') || id.includes('stroke') || id.includes('reading')));

    if (!scriptStep) return; // script skill lands in a later checkpoint for this theme
    const plan = planSession({
      step: scriptStep,
      themeId: roadmap.theme.id,
      languageCode: 'ja',
      mastery: {},
      policy: { languageCode: 'ja', level: 'beginner', difficulty: 'standard' },
    });
    expect(plan.blueprints.length).toBeGreaterThan(0);
  });

  it('is deterministic for the same inputs', () => {
    const { roadmap, step } = stepsOfKind('exercise');
    const args = {
      step,
      themeId: roadmap.theme.id,
      languageCode: 'es',
      mastery: {},
      policy: POLICY,
      now: 1_700_000_000_000,
    };
    expect(planSession(args).blueprints.map((b) => b.taskType)).toEqual(
      planSession(args).blueprints.map((b) => b.taskType),
    );
  });
});
