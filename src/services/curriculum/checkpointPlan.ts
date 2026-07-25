/**
 * Builds the roadmap the Learn page renders.
 *
 * The old `createRoadmap` fabricated 20 checkpoints of 7 steps for each of 30
 * themes at each of 5 Everdark levels — 21,000 synthetic steps with invented
 * durations and XP, all locked except the very first, none of which the session
 * runtime ever received. Clicking any of them opened the same first seeded lesson.
 *
 * Here the checkpoint count comes from the theme's own designed session range, each
 * step targets real skills from the skill graph, step ids are stable so completion
 * persists, and unlock status is read from progression rather than hard-coded.
 */

import { createRandom } from '../../utils/seededRandom';
import type { Skill } from './skillGraph';
import { getThemeByOrder, getThemeSkills, type Theme } from './skillGraph';
import {
  isCheckpointCompleted,
  isStepCompleted,
  unlockedEverdarkLevel,
  type ProgressionState,
} from './progressionStore';

/** Matches the icon set the Learn page already renders. */
export type StepKind = 'rule' | 'vocabulary' | 'exercise' | 'listening' | 'speaking' | 'review';

export type StepStatus = 'completed' | 'available' | 'locked';

export interface RoadmapStep {
  id: string;
  checkpointId: string;
  index: number;
  title: string;
  description: string;
  kind: StepKind;
  /** Skills this step teaches or drills. Never empty. */
  skillIds: string[];
  /** Estimated minutes, derived from the step kind and task count. */
  estimatedMinutes: number;
  /** Number of tasks the session planner should build for this step. */
  taskCount: number;
  xp: number;
  status: StepStatus;
}

export interface RoadmapCheckpoint {
  id: string;
  themeId: string;
  themeOrder: number;
  everdarkLevel: number;
  index: number;
  number: number;
  title: string;
  subtitle: string;
  /** Skills introduced by this checkpoint, in teaching order. */
  focusSkillIds: string[];
  steps: RoadmapStep[];
  status: StepStatus;
  /** Recorded score, when the checkpoint has been completed. */
  score: number | null;
}

export interface Roadmap {
  theme: Theme;
  everdarkLevel: number;
  unlockedEverdarkLevel: number;
  checkpoints: RoadmapCheckpoint[];
  totalSteps: number;
  completedSteps: number;
  totalMinutes: number;
  completedCheckpoints: number;
}

/**
 * Step template for a checkpoint. Early checkpoints in a theme front-load
 * recognition; later ones shift to production; every fourth is a consolidation
 * checkpoint that revisits rather than introduces.
 */
const INTRODUCTORY_SEQUENCE: StepKind[] = ['rule', 'vocabulary', 'listening', 'exercise', 'review'];
const PRACTICE_SEQUENCE: StepKind[] = ['vocabulary', 'exercise', 'listening', 'speaking', 'exercise', 'review'];
const PRODUCTION_SEQUENCE: StepKind[] = ['rule', 'exercise', 'speaking', 'listening', 'exercise', 'review'];
const CONSOLIDATION_SEQUENCE: StepKind[] = ['review', 'exercise', 'speaking', 'review'];

const STEP_MINUTES: Record<StepKind, number> = {
  rule: 4,
  vocabulary: 5,
  exercise: 5,
  listening: 4,
  speaking: 5,
  review: 6,
};

const STEP_TASK_COUNT: Record<StepKind, number> = {
  rule: 4,
  vocabulary: 6,
  exercise: 6,
  listening: 5,
  speaking: 4,
  review: 8,
};

const STEP_XP: Record<StepKind, number> = {
  rule: 10,
  vocabulary: 15,
  exercise: 15,
  listening: 12,
  speaking: 18,
  review: 25,
};

const STEP_LABEL: Record<StepKind, string> = {
  rule: 'Pattern',
  vocabulary: 'Words',
  exercise: 'Practice',
  listening: 'Listening',
  speaking: 'Speaking',
  review: 'Review',
};

/**
 * How many checkpoints a theme has at a given Everdark level.
 * Level 1 uses the low end of the theme's designed session range; each further
 * level adds one checkpoint up to the high end, so Everdark deepens a theme rather
 * than duplicating it.
 */
export function checkpointCountFor(theme: Theme, everdarkLevel: number): number {
  const [low, high] = theme.coreSessionRange;
  return Math.min(high, low + Math.max(0, everdarkLevel - 1));
}

function sequenceFor(checkpointIndex: number, total: number): StepKind[] {
  if ((checkpointIndex + 1) % 4 === 0) return CONSOLIDATION_SEQUENCE;
  const position = total <= 1 ? 0 : checkpointIndex / (total - 1);
  if (position < 0.34) return INTRODUCTORY_SEQUENCE;
  if (position < 0.7) return PRACTICE_SEQUENCE;
  return PRODUCTION_SEQUENCE;
}

/**
 * Assigns skills to checkpoints so each checkpoint has a small focus set and every
 * theme skill is revisited across the theme. Deterministic for a given theme+level.
 */
function focusSkillsForCheckpoint(
  skills: Skill[],
  checkpointIndex: number,
  totalCheckpoints: number,
  seed: string,
): Skill[] {
  if (skills.length === 0) return [];

  const perCheckpoint = Math.max(1, Math.min(2, Math.ceil(skills.length / Math.max(1, totalCheckpoints / 2))));
  const primary: Skill[] = [];
  for (let offset = 0; offset < perCheckpoint; offset += 1) {
    primary.push(skills[(checkpointIndex * perCheckpoint + offset) % skills.length]);
  }

  // Consolidation checkpoints also pull in one earlier skill from the same theme.
  if ((checkpointIndex + 1) % 4 === 0 && skills.length > perCheckpoint) {
    const random = createRandom(`${seed}:consolidate:${checkpointIndex}`);
    const extra = skills[Math.floor(random() * skills.length)];
    if (!primary.some((skill) => skill.id === extra.id)) primary.push(extra);
  }

  return primary;
}

function stepTitle(kind: StepKind, skills: Skill[], checkpointNumber: number): string {
  if (kind === 'review') return `Checkpoint ${checkpointNumber} review`;
  const focus = skills[0]?.title ?? 'this checkpoint';
  return `${STEP_LABEL[kind]}: ${focus}`;
}

function stepDescription(kind: StepKind, skills: Skill[], theme: Theme): string {
  const focus = skills.map((skill) => skill.title.toLowerCase()).join(' and ') || theme.title.toLowerCase();
  switch (kind) {
    case 'rule':
      return `See how ${focus} works in ${theme.title.toLowerCase()}, with short worked examples.`;
    case 'vocabulary':
      return `Meet and recognise the core words for ${focus}.`;
    case 'listening':
      return `Hear ${focus} used at natural speed and pick out what was said.`;
    case 'speaking':
      return `Say ${focus} out loud and compare against the model.`;
    case 'review':
      return `Bring back everything from this checkpoint, plus anything that has gone shaky.`;
    default:
      return `Use ${focus} in mixed practice until it is automatic.`;
  }
}

/**
 * Everdark levels raise the demand on the same theme: more tasks per step and a
 * larger share of production work.
 */
function everdarkTaskBonus(everdarkLevel: number): number {
  return Math.max(0, everdarkLevel - 1);
}

export interface BuildRoadmapInput {
  themeOrder: number;
  everdarkLevel: number;
  languageCode: string;
  progression: ProgressionState;
}

export function buildRoadmap(input: BuildRoadmapInput): Roadmap | null {
  const theme = getThemeByOrder(input.themeOrder);
  if (!theme) return null;

  const skills = getThemeSkills(theme.id, input.languageCode);
  const totalCheckpoints = checkpointCountFor(theme, input.everdarkLevel);
  const seed = `${theme.id}:${input.everdarkLevel}:${input.languageCode}`;

  const checkpoints: RoadmapCheckpoint[] = [];
  let previousCheckpointComplete = true;

  for (let index = 0; index < totalCheckpoints; index += 1) {
    const checkpointId = `${theme.id}:e${input.everdarkLevel}:c${index + 1}`;
    const focusSkills = focusSkillsForCheckpoint(skills, index, totalCheckpoints, seed);
    const sequence = sequenceFor(index, totalCheckpoints);
    const completed = isCheckpointCompleted(input.progression, checkpointId);

    // A checkpoint opens once the previous one is finished. The first is always open.
    const status: StepStatus = completed ? 'completed' : previousCheckpointComplete ? 'available' : 'locked';

    let previousStepComplete = true;
    const steps: RoadmapStep[] = sequence.map((kind, stepIndex) => {
      const stepId = `${checkpointId}:s${stepIndex + 1}`;
      // Review steps draw on the whole checkpoint; other steps drill their focus.
      const stepSkills = kind === 'review' ? focusSkills : [focusSkills[stepIndex % Math.max(1, focusSkills.length)]].filter(Boolean);
      const stepCompleted = isStepCompleted(input.progression, stepId);
      const stepStatus: StepStatus = stepCompleted
        ? 'completed'
        : status === 'locked'
          ? 'locked'
          : previousStepComplete
            ? 'available'
            : 'locked';
      previousStepComplete = stepCompleted;

      const taskCount = STEP_TASK_COUNT[kind] + everdarkTaskBonus(input.everdarkLevel);

      return {
        id: stepId,
        checkpointId,
        index: stepIndex,
        title: stepTitle(kind, stepSkills, index + 1),
        description: stepDescription(kind, stepSkills, theme),
        kind,
        skillIds: (stepSkills.length > 0 ? stepSkills : focusSkills).map((skill) => skill.id),
        estimatedMinutes: STEP_MINUTES[kind] + Math.floor(everdarkTaskBonus(input.everdarkLevel) / 2),
        taskCount,
        xp: STEP_XP[kind] + everdarkTaskBonus(input.everdarkLevel) * 5,
        status: stepStatus,
      };
    });

    checkpoints.push({
      id: checkpointId,
      themeId: theme.id,
      themeOrder: theme.order,
      everdarkLevel: input.everdarkLevel,
      index,
      number: index + 1,
      title: focusSkills.length > 0
        ? focusSkills.map((skill) => skill.title).join(' & ')
        : `${theme.title} checkpoint ${index + 1}`,
      subtitle: `${sequence.length} steps · ${focusSkills.map((skill) => skill.title).join(', ') || theme.title}`,
      focusSkillIds: focusSkills.map((skill) => skill.id),
      steps,
      status,
      score: input.progression.checkpointResults[checkpointId]?.score ?? null,
    });

    previousCheckpointComplete = completed;
  }

  const allSteps = checkpoints.flatMap((checkpoint) => checkpoint.steps);

  return {
    theme,
    everdarkLevel: input.everdarkLevel,
    unlockedEverdarkLevel: unlockedEverdarkLevel(input.progression, theme.id),
    checkpoints,
    totalSteps: allSteps.length,
    completedSteps: allSteps.filter((step) => step.status === 'completed').length,
    totalMinutes: allSteps.reduce((total, step) => total + step.estimatedMinutes, 0),
    completedCheckpoints: checkpoints.filter((checkpoint) => checkpoint.status === 'completed').length,
  };
}

/** Finds a step by id within a roadmap. */
export function findStep(roadmap: Roadmap, stepId: string): { checkpoint: RoadmapCheckpoint; step: RoadmapStep } | null {
  for (const checkpoint of roadmap.checkpoints) {
    const step = checkpoint.steps.find((candidate) => candidate.id === stepId);
    if (step) return { checkpoint, step };
  }
  return null;
}

/** The next step the learner should do in this roadmap, if any. */
export function nextAvailableStep(roadmap: Roadmap): { checkpoint: RoadmapCheckpoint; step: RoadmapStep } | null {
  for (const checkpoint of roadmap.checkpoints) {
    if (checkpoint.status === 'locked') break;
    const step = checkpoint.steps.find((candidate) => candidate.status === 'available');
    if (step) return { checkpoint, step };
  }
  return null;
}

/** Parses a step id back into its parts, for deep links into a session. */
export function parseStepId(stepId: string): {
  themeId: string;
  everdarkLevel: number;
  checkpointNumber: number;
  stepNumber: number;
} | null {
  const match = /^(.+):e(\d+):c(\d+):s(\d+)$/.exec(stepId);
  if (!match) return null;
  return {
    themeId: match[1],
    everdarkLevel: Number(match[2]),
    checkpointNumber: Number(match[3]),
    stepNumber: Number(match[4]),
  };
}
