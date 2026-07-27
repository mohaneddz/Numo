/**
 * Validation for generated exercise content.
 *
 * Nothing validated task content before. The consequences were visible in almost
 * every exercise:
 *
 *  - multiple-choice options were built as `[answer, ...distractors]`, so the
 *    correct answer was always the first button;
 *  - match-pairs fallbacks produced `"prompt 1" -> answer` and, for character
 *    matching, pairs whose left and right sides were identical;
 *  - group-sort fallbacks split an arbitrary word list into "Category A" and
 *    "Category B" and rendered the items in group order;
 *  - a fixed list of English tasks was appended to every session in every language.
 *
 * Each of those is a rule here. Content that fails is rejected rather than shown,
 * so a bad generation degrades to a retry or a different task instead of teaching
 * the learner something wrong.
 */

import type { TaskType } from '../../types/learningPlan';
import { normalizeAnswer, stripTargetMarkers } from '../../utils/textNormalize';
import { isWrongScript } from './languageProfile';

export interface TaskContent {
  /** Always English: it tells the learner what to do. */
  instruction: string;
  /** The question or stimulus. May contain target-language text. */
  prompt: string;
  expectedAnswer: string;
  distractors: string[];
  /** Exercise-type specific data (options, pairs, tokens, groups, audio, image). */
  payload: Record<string, unknown>;
  /** English meaning of the target text, for feedback and glossary. */
  translation?: string;
  /** Romanized reading, for non-Latin scripts. */
  romanization?: string;
  /** One-line explanation shown after answering. */
  teachingNote?: string;
}

export interface ValidationIssue {
  rule: string;
  detail: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/** Exercise types where the answer legitimately appears in the prompt. */
const ANSWER_MAY_APPEAR_IN_PROMPT = new Set<TaskType>([
  'listen_repeat',
  'compare_structures',
  'explain_pronunciation_rule',
  'read_answer_questions',
]);

/**
 * Exercise types whose answer is deliberately in English, not the target language.
 *
 * `identify_context_meaning` shows a target-language prompt and asks the learner
 * to choose its English meaning from a set of English options — that is the whole
 * point of the exercise. The script check does not apply to its answer, or it
 * would reject every correctly generated instance of this task type.
 */
const ANSWER_IS_ENGLISH_MEANING = new Set<TaskType>(['identify_context_meaning']);

/** Exercise types rendered as a list of options. */
const OPTION_TASK_TYPES = new Set<TaskType>([
  'choose_response',
  'choose_verb_form',
  'identify_context_meaning',
  'identify_sounds',
  'listen_choose_written',
  'greeting_response_select',
  'image_word_recognition',
  'sound_word_recognition',
  'radical_component_identify',
  'missing_character_choice',
  'tone_pair_identify',
  'kana_confusion_select',
  'particle_choice',
  'classifier_choice',
]);

const PAIR_TASK_TYPES = new Set<TaskType>([
  'match_word_meaning',
  'match_sentence_translation',
  'character_reading_match',
  'reading_character_match',
]);

const TOKEN_TASK_TYPES = new Set<TaskType>(['reorder_sentence', 'build_from_chunks']);

const GROUP_TASK_TYPES = new Set<TaskType>(['group_words_topic']);

/** Placeholder group names that indicate the generator gave up. */
const PLACEHOLDER_NAMES = /^(group|category|set|bucket)\s*[a-z0-9]?$/i;

const MIN_OPTIONS = 3;
const MAX_OPTIONS = 5;
const MIN_PAIRS = 3;
const MIN_TOKENS = 3;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function uniqueNormalized(values: string[], languageCode: string): Set<string> {
  return new Set(values.map((value) => normalizeAnswer(value, languageCode)));
}

export function validateTaskContent(
  content: TaskContent,
  context: { taskType: TaskType; languageCode: string },
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const { taskType, languageCode } = context;

  const prompt = stripTargetMarkers(content.prompt ?? '').trim();
  const answer = stripTargetMarkers(content.expectedAnswer ?? '').trim();

  if (!content.instruction?.trim()) {
    issues.push({ rule: 'instruction_required', detail: 'Task has no instruction.' });
  }
  if (!prompt) {
    issues.push({ rule: 'prompt_required', detail: 'Task has no prompt.' });
  }
  if (!answer) {
    issues.push({ rule: 'answer_required', detail: 'Task has no expected answer.' });
  }

  // The answer must be in the language being studied. This is the check that stops
  // English filler content being served to a learner of another language — except
  // for the handful of task types whose answer is meant to be an English meaning.
  if (answer && isWrongScript(answer, languageCode) && !ANSWER_IS_ENGLISH_MEANING.has(taskType)) {
    issues.push({
      rule: 'answer_wrong_script',
      detail: `Expected answer "${answer}" is not written in the script of ${languageCode}.`,
    });
  }

  // An answer visible in the prompt makes the task free.
  if (answer && prompt && !ANSWER_MAY_APPEAR_IN_PROMPT.has(taskType)) {
    const normalizedPrompt = normalizeAnswer(prompt, languageCode);
    const normalizedAnswer = normalizeAnswer(answer, languageCode);
    if (normalizedAnswer.length >= 2 && normalizedPrompt.includes(normalizedAnswer)) {
      issues.push({
        rule: 'answer_leaked_in_prompt',
        detail: 'The expected answer appears in the prompt, so the task gives itself away.',
      });
    }
  }

  if (OPTION_TASK_TYPES.has(taskType)) {
    issues.push(...validateOptions(content, answer, languageCode));
  }
  if (PAIR_TASK_TYPES.has(taskType)) {
    issues.push(...validatePairs(content, languageCode));
  }
  if (TOKEN_TASK_TYPES.has(taskType)) {
    issues.push(...validateTokens(content, answer, languageCode));
  }
  if (GROUP_TASK_TYPES.has(taskType)) {
    issues.push(...validateGroups(content, languageCode));
  }

  return { valid: issues.length === 0, issues };
}

function validateOptions(content: TaskContent, answer: string, languageCode: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const options = asStringArray(content.payload.options).map(stripTargetMarkers);
  const correct = typeof content.payload.correctOption === 'string'
    ? stripTargetMarkers(content.payload.correctOption)
    : answer;

  if (options.length < MIN_OPTIONS) {
    issues.push({
      rule: 'too_few_options',
      detail: `Needs at least ${MIN_OPTIONS} options, got ${options.length}.`,
    });
  }
  if (options.length > MAX_OPTIONS) {
    issues.push({
      rule: 'too_many_options',
      detail: `More than ${MAX_OPTIONS} options makes the task a reading exercise.`,
    });
  }

  const normalized = uniqueNormalized(options, languageCode);
  if (normalized.size !== options.length) {
    issues.push({ rule: 'duplicate_options', detail: 'Two options are the same answer.' });
  }

  if (correct && !normalized.has(normalizeAnswer(correct, languageCode))) {
    issues.push({
      rule: 'correct_option_missing',
      detail: 'The correct answer is not among the options.',
    });
  }

  // Distractors in the wrong script are a giveaway: the odd one out is obvious.
  const wrongScript = options.filter((option) => isWrongScript(option, languageCode));
  if (wrongScript.length > 0 && wrongScript.length < options.length) {
    issues.push({
      rule: 'mixed_script_options',
      detail: `Options mix scripts (${wrongScript.join(', ')}), which signals the answer.`,
    });
  }

  return issues;
}

function validatePairs(content: TaskContent, languageCode: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const raw = Array.isArray(content.payload.pairs) ? content.payload.pairs : [];
  const pairs = raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const left = typeof (item as { left?: unknown }).left === 'string' ? stripTargetMarkers((item as { left: string }).left).trim() : '';
      const right = typeof (item as { right?: unknown }).right === 'string' ? stripTargetMarkers((item as { right: string }).right).trim() : '';
      return left && right ? { left, right } : null;
    })
    .filter((pair): pair is { left: string; right: string } => pair !== null);

  if (pairs.length < MIN_PAIRS) {
    issues.push({ rule: 'too_few_pairs', detail: `Needs at least ${MIN_PAIRS} pairs, got ${pairs.length}.` });
  }

  // A pair whose sides are identical answers itself.
  const identical = pairs.filter(
    (pair) => normalizeAnswer(pair.left, languageCode) === normalizeAnswer(pair.right, languageCode),
  );
  if (identical.length > 0) {
    issues.push({
      rule: 'identity_pair',
      detail: `Pair "${identical[0].left}" matches itself, so the task is not a match.`,
    });
  }

  if (uniqueNormalized(pairs.map((pair) => pair.left), languageCode).size !== pairs.length) {
    issues.push({ rule: 'duplicate_pair_left', detail: 'Two pairs share the same left item.' });
  }
  if (uniqueNormalized(pairs.map((pair) => pair.right), languageCode).size !== pairs.length) {
    issues.push({ rule: 'duplicate_pair_right', detail: 'Two pairs share the same right item.' });
  }

  // Numeric suffixes are the signature of the old synthetic fallback
  // ("prompt 1" -> answer), which made every pair matchable by its number.
  if (pairs.some((pair) => /\s\d+$/.test(pair.left))) {
    issues.push({
      rule: 'positional_pair_label',
      detail: 'Pair labels end in a number, which lets the learner match by index.',
    });
  }

  return issues;
}

function validateTokens(content: TaskContent, answer: string, languageCode: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const tokens = asStringArray(content.payload.tokens).map(stripTargetMarkers);

  if (tokens.length < MIN_TOKENS) {
    issues.push({ rule: 'too_few_tokens', detail: `Needs at least ${MIN_TOKENS} tokens, got ${tokens.length}.` });
    return issues;
  }

  // The tokens must actually be able to build the expected answer, otherwise the
  // task is unsolvable no matter what the learner does.
  const assembled = normalizeAnswer(tokens.join(' '), languageCode);
  const target = normalizeAnswer(answer, languageCode);
  const assembledChars = [...assembled].sort().join('');
  const targetChars = [...target].sort().join('');
  if (target && assembledChars !== targetChars) {
    issues.push({
      rule: 'tokens_do_not_build_answer',
      detail: 'The provided tokens cannot be arranged into the expected answer.',
    });
  }

  return issues;
}

function validateGroups(content: TaskContent, languageCode: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const raw = Array.isArray(content.payload.groups) ? content.payload.groups : [];
  const groups = raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const name = typeof (item as { name?: unknown }).name === 'string' ? (item as { name: string }).name.trim() : '';
      const items = asStringArray((item as { items?: unknown }).items).map(stripTargetMarkers);
      return name && items.length > 0 ? { name, items } : null;
    })
    .filter((group): group is { name: string; items: string[] } => group !== null);

  if (groups.length < 2) {
    issues.push({ rule: 'too_few_groups', detail: 'Needs at least two groups.' });
    return issues;
  }

  // "Group A" / "Category B" means the grouping has no semantic content, so the
  // task teaches nothing.
  const placeholder = groups.find((group) => PLACEHOLDER_NAMES.test(group.name));
  if (placeholder) {
    issues.push({
      rule: 'placeholder_group_name',
      detail: `Group "${placeholder.name}" has no meaning, so there is nothing to reason about.`,
    });
  }

  const undersized = groups.find((group) => group.items.length < 2);
  if (undersized) {
    issues.push({
      rule: 'undersized_group',
      detail: `Group "${undersized.name}" has fewer than two items.`,
    });
  }

  // An item appearing in two groups has no correct answer.
  const seen = new Map<string, string>();
  for (const group of groups) {
    for (const item of group.items) {
      const key = normalizeAnswer(item, languageCode);
      const owner = seen.get(key);
      if (owner && owner !== group.name) {
        issues.push({
          rule: 'ambiguous_group_item',
          detail: `"${item}" appears in both "${owner}" and "${group.name}".`,
        });
      }
      seen.set(key, group.name);
    }
  }

  return issues;
}
