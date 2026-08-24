/**
 * Builds a session's task list in real time from the learner model.
 *
 * This is the piece the app was missing. Previously `createLessonSessionRuntime`
 * loaded whichever seeded lesson happened to be first in the database, asked an LLM
 * to rewrite its templates, then appended a fixed list of hard-coded English tasks
 * as "coverage" — for every language, every learner, every session, forever.
 * Nothing consulted progress, weakness, or what the step was supposed to teach.
 *
 * The planner here is pure, synchronous and deterministic: given the step, the
 * skill graph and the mastery map it decides *what* to practise and *how*, in well
 * under a millisecond. Only the content of each task needs generating, which the
 * content service handles separately and caches, so a session can start instantly.
 */

import type { TaskType } from '../../types/learningPlan';
import { canUseExerciseType, type ExercisePolicyContext } from '../exercises/exercisePolicy';
import { chooseExercise, type LadderRung } from './exerciseLadder';
import {
  masteryOf,
  recognitionProductionGap,
  selectDueSkills,
  selectWeakSkills,
  type PracticeModality,
  type SkillMasteryMap,
} from './masteryStore';
import type { RoadmapStep, StepKind } from './checkpointPlan';
import { getPriorSkills, getSkill, getThemeSkills, type Skill } from './skillGraph';

/** Why a task is in the session. Shown to the learner so the adaptation is visible. */
export type TaskRole = 'introduce' | 'practice' | 'reinforce' | 'review' | 'stretch';

export interface TaskBlueprint {
  /** Stable within a session. */
  id: string;
  skillId: string;
  skillTitle: string;
  role: TaskRole;
  taskType: TaskType;
  modality: PracticeModality;
  rung: LadderRung;
  /** 1-5, drives how demanding the generated content should be. */
  difficulty: number;
  /** Learner-facing explanation of why this task was chosen. */
  rationale: string;
}

export interface SessionPlan {
  stepId: string;
  stepKind: StepKind;
  languageCode: string;
  blueprints: TaskBlueprint[];
  /** Skills the learner is meeting for the first time in this session. */
  newSkillIds: string[];
  /** Skills pulled in because they were weak or due, not because of this step. */
  reviewSkillIds: string[];
  estimatedMinutes: number;
}

export interface PlanSessionInput {
  step: RoadmapStep;
  themeId: string;
  languageCode: string;
  mastery: SkillMasteryMap;
  policy: ExercisePolicyContext;
  /** Overrides the step's own task count, e.g. for a shorter session preference. */
  taskCountOverride?: number;
  now?: number;
}

/**
 * Share of the session spent on material from outside the current step.
 * Interleaving old material with new is what turns a lesson into a curriculum:
 * without it, everything taught in checkpoint 1 is never seen again.
 */
const REVIEW_SHARE: Record<StepKind, number> = {
  rule: 0.2,
  vocabulary: 0.25,
  exercise: 0.35,
  listening: 0.3,
  speaking: 0.3,
  review: 0.7,
};

const STEP_MODALITY: Record<StepKind, 'listening' | 'speaking' | 'any'> = {
  rule: 'any',
  vocabulary: 'any',
  exercise: 'any',
  listening: 'listening',
  speaking: 'speaking',
  review: 'any',
};

function difficultyAdjustment(preference: ExercisePolicyContext['difficulty']): number {
  if (preference === 'easier') return -1;
  if (preference === 'harder') return 1;
  return 0;
}

function rationaleFor(role: TaskRole, skill: Skill, mastery: number): string {
  switch (role) {
    case 'introduce':
      return `New in this checkpoint: ${skill.title.toLowerCase()}.`;
    case 'review':
      return `Brought back because ${skill.title.toLowerCase()} was due for review.`;
    case 'reinforce':
      return `${skill.title} is at ${Math.round(mastery)}% — worth another pass.`;
    case 'stretch':
      return `You are solid on ${skill.title.toLowerCase()}; this pushes it further.`;
    default:
      return `Practising ${skill.title.toLowerCase()}.`;
  }
}

function roleFor(mastery: number, exposures: number, isStepSkill: boolean): TaskRole {
  if (exposures === 0) return 'introduce';
  if (!isStepSkill) return 'review';
  if (mastery < 55) return 'reinforce';
  if (mastery >= 82) return 'stretch';
  return 'practice';
}

/**
 * Orders the session so it opens with something achievable and ramps up, spreading
 * the demanding free-production tasks evenly rather than clustering them at the end.
 *
 * Two production tasks only ever land next to each other when production tasks
 * outnumber everything else, which happens legitimately once a learner has mastered
 * the material and the session is genuinely meant to be demanding.
 */
function orderBlueprints(blueprints: TaskBlueprint[]): TaskBlueprint[] {
  const rungWeight: Record<LadderRung, number> = {
    recognize: 0,
    discriminate: 1,
    assemble: 2,
    produce: 3,
  };

  const sorted = [...blueprints].sort((a, b) => rungWeight[a.rung] - rungWeight[b.rung]);
  const easier = sorted.filter((item) => item.rung !== 'produce');
  const harder = sorted.filter((item) => item.rung === 'produce');
  if (harder.length === 0 || easier.length === 0) return sorted;

  const total = easier.length + harder.length;

  // Slot 0 is always a warm-up: the session opens with something the learner can
  // land, then production tasks are spread as evenly as possible over what remains.
  const spreadStart = 1;
  const spreadWidth = total - spreadStart;

  const hardSlots = new Set<number>();
  for (let index = 0; index < harder.length; index += 1) {
    hardSlots.add(spreadStart + Math.floor(((index + 0.5) * spreadWidth) / harder.length));
  }

  const result: TaskBlueprint[] = [];
  let easyIndex = 0;
  let hardIndex = 0;

  for (let slot = 0; slot < total; slot += 1) {
    const wantsHard = hardSlots.has(slot) && hardIndex < harder.length;
    if (wantsHard || easyIndex >= easier.length) {
      result.push(harder[hardIndex]);
      hardIndex += 1;
    } else {
      result.push(easier[easyIndex]);
      easyIndex += 1;
    }
  }

  return result;
}

export function planSession(input: PlanSessionInput): SessionPlan {
  const now = input.now ?? Date.now();
  const taskCount = Math.max(1, input.taskCountOverride ?? input.step.taskCount);

  const stepSkills = input.step.skillIds
    .map((id) => getSkill(id))
    .filter((skill): skill is Skill => Boolean(skill));

  // Everything the learner could reasonably be asked about: this theme plus all
  // earlier ones. Review is drawn from here, never from unseen future material.
  const themeSkills = getThemeSkills(input.themeId, input.languageCode);
  const priorSkills = getPriorSkills(input.themeId, input.languageCode);
  const reviewPool = [...priorSkills, ...themeSkills].filter(
    (skill) => !input.step.skillIds.includes(skill.id),
  );

  const reviewShare = REVIEW_SHARE[input.step.kind];
  const reviewSlots = Math.min(
    Math.round(taskCount * reviewShare),
    Math.max(0, taskCount - 1), // always leave at least one slot for the step's own skills
  );
  const focusSlots = taskCount - reviewSlots;

  // Weak skills come first, then scheduled-due skills, then anything else from the
  // pool so a session is never short of review material.
  const weak = selectWeakSkills(input.mastery, reviewPool, reviewSlots + 2, now).map((entry) => entry.skill);
  const due = selectDueSkills(input.mastery, reviewPool, reviewSlots + 2, now).map((entry) => entry.skill);
  const reviewCandidates: Skill[] = [];
  for (const skill of [...weak, ...due, ...reviewPool]) {
    if (reviewCandidates.length >= reviewSlots) break;
    if (reviewCandidates.some((existing) => existing.id === skill.id)) continue;
    reviewCandidates.push(skill);
  }

  const gap = recognitionProductionGap(input.mastery, [
    ...input.step.skillIds,
    ...reviewCandidates.map((skill) => skill.id),
  ]);

  const isTaskTypeAllowed = (taskType: TaskType) => canUseExerciseType(taskType, input.policy).allowed;
  const requiredModality = STEP_MODALITY[input.step.kind];
  const difficultyShift = difficultyAdjustment(input.policy.difficulty);

  const blueprints: TaskBlueprint[] = [];
  const recentTaskTypes: TaskType[] = [];
  const newSkillIds = new Set<string>();
  const reviewSkillIds = new Set<string>();

  const slots: Array<{ skill: Skill; isStepSkill: boolean }> = [];
  for (let index = 0; index < focusSlots; index += 1) {
    const skill = stepSkills[index % Math.max(1, stepSkills.length)];
    if (skill) slots.push({ skill, isStepSkill: true });
  }
  for (let index = 0; index < reviewCandidates.length; index += 1) {
    slots.push({ skill: reviewCandidates[index], isStepSkill: false });
  }

  slots.forEach((slot, index) => {
    const record = masteryOf(input.mastery, slot.skill.id);
    const role = roleFor(record.mastery, record.exposures, slot.isStepSkill);

    // A brand-new skill always starts on the bottom rung regardless of the gap.
    const effectiveMastery = role === 'introduce' ? 0 : record.mastery;

    const choice = chooseExercise({
      skillKind: slot.skill.kind,
      languageCode: input.languageCode,
      mastery: effectiveMastery,
      recognitionProductionGap: role === 'introduce' ? 0 : gap,
      requiredModality,
      recentTaskTypes,
      isTaskTypeAllowed,
      variantSeed: index + record.exposures,
    });
    if (!choice) return;

    recentTaskTypes.push(choice.taskType);
    if (role === 'introduce') newSkillIds.add(slot.skill.id);
    if (!slot.isStepSkill) reviewSkillIds.add(slot.skill.id);

    blueprints.push({
      id: `${input.step.id}:t${index + 1}`,
      skillId: slot.skill.id,
      skillTitle: slot.skill.title,
      role,
      taskType: choice.taskType,
      modality: choice.modality,
      rung: choice.rung,
      difficulty: Math.min(5, Math.max(1, slot.skill.difficulty + difficultyShift)),
      rationale: rationaleFor(role, slot.skill, record.mastery),
    });
  });

  const ordered = orderBlueprints(blueprints);

  return {
    stepId: input.step.id,
    stepKind: input.step.kind,
    languageCode: input.languageCode,
    blueprints: ordered,
    newSkillIds: [...newSkillIds],
    reviewSkillIds: [...reviewSkillIds],
    // Roughly 40 seconds per recognition task, 75 for production.
    estimatedMinutes: Math.max(
      1,
      Math.round(
        ordered.reduce((total, item) => total + (item.rung === 'produce' ? 75 : 40), 0) / 60,
      ),
    ),
  };
}
