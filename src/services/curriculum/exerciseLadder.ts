/**
 * Chooses which exercise type to use for a skill.
 *
 * Exercise selection previously did not exist: the session ran whatever task
 * templates happened to be seeded, then appended a fixed list of hard-coded
 * English "coverage" tasks. Nothing considered what kind of skill was being
 * practised or how well the learner already knew it, so a learner who could
 * already recognise a word was asked to recognise it again forever, and a
 * pronunciation skill could be assessed by a silent multiple-choice question.
 *
 * The ladder maps (skill kind, mastery, modality) to a concrete exercise type, so
 * practice climbs from recognition to guided production to free production as the
 * learner improves.
 */

import type { TaskType } from '../../types/learningPlan';
import type { PracticeModality } from './masteryStore';
import type { SkillKind } from './skillGraph';

/** Rungs of the ladder, easiest first. */
export type LadderRung = 'recognize' | 'discriminate' | 'assemble' | 'produce';

export interface ExerciseChoice {
  taskType: TaskType;
  modality: PracticeModality;
  rung: LadderRung;
}

interface LadderEntry {
  rung: LadderRung;
  taskTypes: TaskType[];
  modality: PracticeModality;
}

const LADDERS: Record<SkillKind, LadderEntry[]> = {
  vocabulary: [
    { rung: 'recognize', taskTypes: ['image_word_recognition', 'match_word_meaning'], modality: 'recognition' },
    { rung: 'discriminate', taskTypes: ['sound_word_recognition', 'identify_context_meaning', 'listen_choose_written'], modality: 'listening' },
    { rung: 'assemble', taskTypes: ['fill_missing_word', 'single_slot_fill', 'group_words_topic'], modality: 'recognition' },
    { rung: 'produce', taskTypes: ['replace_synonym', 'finish_sentence_starter'], modality: 'production' },
  ],
  grammar: [
    { rung: 'recognize', taskTypes: ['choose_verb_form', 'choose_response'], modality: 'recognition' },
    { rung: 'discriminate', taskTypes: ['identify_context_meaning', 'match_sentence_translation'], modality: 'recognition' },
    { rung: 'assemble', taskTypes: ['reorder_sentence', 'build_from_chunks', 'fill_missing_word'], modality: 'recognition' },
    { rung: 'produce', taskTypes: ['transform_statement_question', 'correct_grammar', 'compare_structures'], modality: 'production' },
  ],
  function: [
    { rung: 'recognize', taskTypes: ['greeting_response_select', 'choose_response'], modality: 'recognition' },
    { rung: 'discriminate', taskTypes: ['match_sentence_translation', 'identify_context_meaning'], modality: 'recognition' },
    { rung: 'assemble', taskTypes: ['build_from_chunks', 'reorder_sentence'], modality: 'recognition' },
    { rung: 'produce', taskTypes: ['complete_dialogue', 'finish_sentence_starter', 'read_answer_questions'], modality: 'production' },
  ],
  sound: [
    { rung: 'recognize', taskTypes: ['identify_sounds'], modality: 'listening' },
    { rung: 'discriminate', taskTypes: ['listen_choose_written', 'sound_word_recognition'], modality: 'listening' },
    { rung: 'assemble', taskTypes: ['listen_repeat'], modality: 'production' },
    { rung: 'produce', taskTypes: ['explain_pronunciation_rule', 'listen_repeat'], modality: 'production' },
  ],
  discourse: [
    { rung: 'recognize', taskTypes: ['identify_context_meaning', 'match_sentence_translation'], modality: 'recognition' },
    { rung: 'discriminate', taskTypes: ['choose_response'], modality: 'recognition' },
    { rung: 'assemble', taskTypes: ['reorder_sentence', 'build_from_chunks'], modality: 'recognition' },
    { rung: 'produce', taskTypes: ['read_answer_questions', 'complete_dialogue', 'compare_structures'], modality: 'production' },
  ],
  // Overridden per language below; this is the generic non-Latin fallback.
  script: [
    { rung: 'recognize', taskTypes: ['character_reading_match'], modality: 'recognition' },
    { rung: 'discriminate', taskTypes: ['missing_character_choice'], modality: 'recognition' },
    { rung: 'assemble', taskTypes: ['reading_character_match'], modality: 'recognition' },
    { rung: 'produce', taskTypes: ['replace_wrong_character'], modality: 'writing' },
  ],
};

/** Script work is genuinely language-specific, so those ladders are per language. */
const SCRIPT_LADDERS: Record<string, LadderEntry[]> = {
  zh: [
    { rung: 'recognize', taskTypes: ['character_reading_match', 'radical_component_identify'], modality: 'recognition' },
    { rung: 'discriminate', taskTypes: ['tone_pair_identify', 'missing_character_choice'], modality: 'listening' },
    { rung: 'assemble', taskTypes: ['classifier_choice', 'missing_character_choice'], modality: 'recognition' },
    { rung: 'produce', taskTypes: ['replace_wrong_character'], modality: 'writing' },
  ],
  ja: [
    { rung: 'recognize', taskTypes: ['kana_confusion_select', 'reading_character_match'], modality: 'recognition' },
    { rung: 'discriminate', taskTypes: ['missing_character_choice', 'reading_character_match'], modality: 'recognition' },
    { rung: 'assemble', taskTypes: ['particle_choice', 'okurigana_fill'], modality: 'recognition' },
    { rung: 'produce', taskTypes: ['okurigana_fill', 'replace_wrong_character'], modality: 'writing' },
  ],
};

/** Exercise types that present audio the learner must listen to. */
export const LISTENING_TASK_TYPES = new Set<TaskType>([
  'identify_sounds',
  'listen_choose_written',
  'sound_word_recognition',
  'listen_repeat',
  'tone_pair_identify',
]);

/** Exercise types where the learner produces language rather than selecting it. */
export const PRODUCTION_TASK_TYPES = new Set<TaskType>([
  'replace_synonym',
  'finish_sentence_starter',
  'complete_dialogue',
  'read_answer_questions',
  'transform_statement_question',
  'correct_grammar',
  'compare_structures',
  'explain_pronunciation_rule',
  'listen_repeat',
  'replace_wrong_character',
  'okurigana_fill',
]);

/** Exercise types that require the learner to speak. */
export const SPEAKING_TASK_TYPES = new Set<TaskType>(['listen_repeat']);

const RUNG_ORDER: LadderRung[] = ['recognize', 'discriminate', 'assemble', 'produce'];

/**
 * Mastery thresholds for climbing the ladder. A learner is only asked to produce
 * a form once they can reliably recognise it.
 */
export function rungForMastery(mastery: number): LadderRung {
  if (mastery < 30) return 'recognize';
  if (mastery < 55) return 'discriminate';
  if (mastery < 78) return 'assemble';
  return 'produce';
}

function ladderFor(kind: SkillKind, languageCode: string): LadderEntry[] {
  if (kind === 'script') return SCRIPT_LADDERS[languageCode] ?? LADDERS.script;
  return LADDERS[kind];
}

/**
 * Every (rung, exercise type) pair the ladder can produce for a skill kind.
 *
 * `chooseExercise` picks exactly one type for one learner at one moment. This
 * instead lists everything the ladder is *capable* of choosing, unfiltered by any
 * particular mastery level — what a bulk content-seeding pass needs, since it has
 * to warm every type the cache key space actually contains rather than whichever
 * one a single simulated mastery value would select.
 */
export function listLadderExerciseTypes(
  skillKind: SkillKind,
  languageCode: string,
): Array<{ rung: LadderRung; taskType: TaskType; modality: PracticeModality }> {
  const ladder = ladderFor(skillKind, languageCode);
  const seen = new Set<TaskType>();
  const output: Array<{ rung: LadderRung; taskType: TaskType; modality: PracticeModality }> = [];

  for (const entry of ladder) {
    for (const taskType of entry.taskTypes) {
      if (seen.has(taskType)) continue; // A type only needs one representative slot.
      seen.add(taskType);
      output.push({ rung: entry.rung, taskType, modality: entry.modality });
    }
  }
  return output;
}

export interface ChooseExerciseInput {
  skillKind: SkillKind;
  languageCode: string;
  mastery: number;
  /** Positive when recognition outpaces production; pushes selection up a rung. */
  recognitionProductionGap: number;
  /** Restricts the choice to types matching the step's purpose. */
  requiredModality?: 'listening' | 'speaking' | 'any';
  /** Types already used in this session, so the same drill is not repeated. */
  recentTaskTypes?: TaskType[];
  /** Types the policy layer has locked for this learner level. */
  isTaskTypeAllowed?: (taskType: TaskType) => boolean;
  /** Deterministic tie-breaking. */
  variantSeed: number;
}

/**
 * Picks the exercise type for one task slot.
 *
 * Returns null only when every type on every rung is blocked by policy, in which
 * case the caller should skip the slot rather than fall back to something unsuitable.
 */
export function chooseExercise(input: ChooseExerciseInput): ExerciseChoice | null {
  const ladder = ladderFor(input.skillKind, input.languageCode);
  const allowed = input.isTaskTypeAllowed ?? (() => true);
  const recent = input.recentTaskTypes ?? [];

  let targetRung = rungForMastery(input.mastery);

  // A wide recognition/production gap means the learner keeps being tested on the
  // easy side of what they know. Push one rung up to close it.
  if (input.recognitionProductionGap >= 15) {
    const index = RUNG_ORDER.indexOf(targetRung);
    targetRung = RUNG_ORDER[Math.min(RUNG_ORDER.length - 1, index + 1)];
  }

  // Search outward from the target rung: the intended level first, then easier,
  // then harder. Dropping to an easier rung is always safer than over-reaching.
  const targetIndex = RUNG_ORDER.indexOf(targetRung);
  const searchOrder: number[] = [targetIndex];
  for (let distance = 1; distance < RUNG_ORDER.length; distance += 1) {
    if (targetIndex - distance >= 0) searchOrder.push(targetIndex - distance);
    if (targetIndex + distance < RUNG_ORDER.length) searchOrder.push(targetIndex + distance);
  }

  for (const rungIndex of searchOrder) {
    const entry = ladder.find((candidate) => candidate.rung === RUNG_ORDER[rungIndex]);
    if (!entry) continue;

    const candidates = entry.taskTypes.filter((taskType) => {
      if (!allowed(taskType)) return false;
      if (input.requiredModality === 'listening' && !LISTENING_TASK_TYPES.has(taskType)) return false;
      if (input.requiredModality === 'speaking' && !SPEAKING_TASK_TYPES.has(taskType)) return false;
      return true;
    });
    if (candidates.length === 0) continue;

    // Prefer a type not used in the last two slots, so drills stay varied.
    const fresh = candidates.filter((taskType) => !recent.slice(-2).includes(taskType));
    const pool = fresh.length > 0 ? fresh : candidates;
    const taskType = pool[input.variantSeed % pool.length];

    return {
      taskType,
      modality: SPEAKING_TASK_TYPES.has(taskType)
        ? 'production'
        : PRODUCTION_TASK_TYPES.has(taskType)
          ? entry.modality === 'listening' ? 'production' : entry.modality
          : LISTENING_TASK_TYPES.has(taskType)
            ? 'listening'
            : entry.modality,
      rung: entry.rung,
    };
  }

  return null;
}

/** True when the exercise needs audio to make sense. */
export function requiresAudio(taskType: TaskType): boolean {
  return LISTENING_TASK_TYPES.has(taskType);
}

/** True when the exercise needs a supporting image. */
export function requiresImage(taskType: TaskType): boolean {
  return taskType === 'image_word_recognition';
}

/** True when the learner has to speak into the microphone. */
export function requiresMicrophone(taskType: TaskType): boolean {
  return SPEAKING_TASK_TYPES.has(taskType);
}
