import { describe, expect, it } from 'vitest';
import { buildRoadmap, nextAvailableStep } from './checkpointPlan';
import {
  applyOutcome,
  createEmptyMastery,
  selectWeakSkills,
  type SkillMasteryMap,
} from './masteryStore';
import {
  createInitialProgression,
  currentStreak,
  isStepCompleted,
  longestStreak,
  minutesToday,
  type ProgressionState,
} from './progressionStore';
import { planSession } from './sessionPlanner';
import { resolveLearnExercise } from '../../components/exercises/learn/registry';
import { getThemeSkills, THEMES } from './skillGraph';
import type { ExercisePolicyContext } from '../exercises/exercisePolicy';

const POLICY: ExercisePolicyContext = {
  languageCode: 'es',
  level: 'beginner',
  difficulty: 'standard',
};

/**
 * End-to-end checks over the pure part of the curriculum: roadmap → planner →
 * exercise resolution → learner model. Content generation is the only piece that
 * needs the network, so everything else must hold together offline.
 */
describe('curriculum pipeline', () => {
  it('takes a new learner from an empty state to a playable first task', () => {
    const progression = createInitialProgression();
    const roadmap = buildRoadmap({ themeOrder: 1, everdarkLevel: 1, languageCode: 'es', progression });
    expect(roadmap).not.toBeNull();
    if (!roadmap) return;

    const next = nextAvailableStep(roadmap);
    expect(next).not.toBeNull();
    if (!next) return;

    const plan = planSession({
      step: next.step,
      themeId: roadmap.theme.id,
      languageCode: 'es',
      mastery: {},
      policy: POLICY,
    });
    expect(plan.blueprints.length).toBeGreaterThan(0);

    // Every blueprint must resolve to a component with a valid payload once content
    // supplies the fields its exercise type needs.
    for (const blueprint of plan.blueprints) {
      const resolved = resolveLearnExercise(
        blueprint.taskType,
        {},
        {
          languageCode: 'es',
          promptText: '¿Cómo te llamas?',
          expectedText: 'Me llamo Ana',
          options: ['Me llamo Ana', 'Tengo hambre', 'Son las tres', 'Vivo aquí'],
          correctOption: 'Me llamo Ana',
          pairs: [
            { left: 'hola', right: 'hello' },
            { left: 'adiós', right: 'goodbye' },
            { left: 'gracias', right: 'thanks' },
          ],
          tokens: ['me', 'llamo', 'Ana'],
          groups: [
            { name: 'Saludos', items: ['hola', 'buenos días'] },
            { name: 'Despedidas', items: ['adiós', 'hasta luego'] },
          ],
        },
      );
      expect(resolved, `blueprint ${blueprint.taskType} should resolve`).not.toBeNull();
    }
  });

  it('carries a learner through a whole checkpoint and unlocks the next one', () => {
    let progression: ProgressionState = createInitialProgression();
    const roadmap = buildRoadmap({ themeOrder: 1, everdarkLevel: 1, languageCode: 'es', progression });
    if (!roadmap) throw new Error('expected roadmap');

    const checkpoint = roadmap.checkpoints[0];
    for (const step of checkpoint.steps) {
      progression = { ...progression, completedStepIds: [...progression.completedStepIds, step.id] };
    }

    const advanced = buildRoadmap({ themeOrder: 1, everdarkLevel: 1, languageCode: 'es', progression });
    if (!advanced) throw new Error('expected roadmap');

    expect(advanced.checkpoints[0].steps.every((step) => step.status === 'completed')).toBe(true);
    for (const step of checkpoint.steps) {
      expect(isStepCompleted(progression, step.id)).toBe(true);
    }

    // Recording the checkpoint is what opens the next one.
    progression = {
      ...progression,
      checkpointResults: {
        [checkpoint.id]: { score: 90, completedAt: new Date().toISOString(), stepsCompleted: checkpoint.steps.length },
      },
    };
    const unlocked = buildRoadmap({ themeOrder: 1, everdarkLevel: 1, languageCode: 'es', progression });
    expect(unlocked?.checkpoints[1].status).toBe('available');
  });

  it('feeds failures back into later sessions as review', () => {
    const progression = createInitialProgression();
    const roadmap = buildRoadmap({ themeOrder: 4, everdarkLevel: 1, languageCode: 'es', progression });
    if (!roadmap) throw new Error('expected roadmap');

    // The learner meets an early skill and keeps getting it wrong.
    const failing = 'self_introduction';
    let record = createEmptyMastery(failing);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      record = applyOutcome(record, {
        skillId: failing,
        correct: false,
        score: 0,
        modality: 'recognition',
        latencyMs: 8000,
      });
    }
    const mastery: SkillMasteryMap = { [failing]: record };

    const seen = THEMES.filter((theme) => theme.order <= 4).flatMap((theme) => getThemeSkills(theme.id, 'es'));
    expect(selectWeakSkills(mastery, seen, 5).some((entry) => entry.skill.id === failing)).toBe(true);

    // A later step in a later theme should pull that skill back in.
    const step = roadmap.checkpoints.flatMap((cp) => cp.steps).find((candidate) => candidate.kind === 'exercise');
    if (!step) throw new Error('expected an exercise step');

    const plan = planSession({
      step,
      themeId: roadmap.theme.id,
      languageCode: 'es',
      mastery,
      policy: POLICY,
    });
    expect(plan.blueprints.some((blueprint) => blueprint.skillId === failing)).toBe(true);
  });

  it('tracks study time, streaks and today minutes from recorded sessions', () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86_400_000);
    const dayBefore = new Date(today.getTime() - 2 * 86_400_000);
    const key = (date: Date) => date.toISOString().slice(0, 10);

    const progression: ProgressionState = {
      ...createInitialProgression(),
      minutesByDate: {
        [key(dayBefore)]: 12,
        [key(yesterday)]: 8,
        [key(today)]: 15,
      },
    };

    expect(minutesToday(progression)).toBe(15);
    expect(currentStreak(progression, today)).toBe(3);
    expect(longestStreak(progression)).toBe(3);
  });

  it('does not break a streak just because today has not started yet', () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86_400_000);
    const key = (date: Date) => date.toISOString().slice(0, 10);

    const progression: ProgressionState = {
      ...createInitialProgression(),
      minutesByDate: { [key(yesterday)]: 10 },
    };
    expect(currentStreak(progression, today)).toBe(1);
  });

  it('plans every step of every checkpoint in the first theme without gaps', () => {
    const progression = createInitialProgression();
    const roadmap = buildRoadmap({ themeOrder: 1, everdarkLevel: 1, languageCode: 'es', progression });
    if (!roadmap) throw new Error('expected roadmap');

    for (const checkpoint of roadmap.checkpoints) {
      for (const step of checkpoint.steps) {
        const plan = planSession({
          step,
          themeId: roadmap.theme.id,
          languageCode: 'es',
          mastery: {},
          policy: POLICY,
        });
        expect(plan.blueprints.length, `${step.id} (${step.kind}) produced no tasks`).toBeGreaterThan(0);
      }
    }
  });

  it('plans a full theme for a non-Latin language too', () => {
    const progression = createInitialProgression();
    for (const languageCode of ['ja', 'zh', 'ru']) {
      const roadmap = buildRoadmap({ themeOrder: 2, everdarkLevel: 1, languageCode, progression });
      if (!roadmap) throw new Error('expected roadmap');

      for (const step of roadmap.checkpoints[0].steps) {
        const plan = planSession({
          step,
          themeId: roadmap.theme.id,
          languageCode,
          mastery: {},
          policy: { languageCode, level: 'beginner', difficulty: 'standard' },
        });
        expect(plan.blueprints.length, `${languageCode} ${step.id} produced no tasks`).toBeGreaterThan(0);
      }
    }
  });
});
