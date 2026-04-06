import type { LearnTaskRuntime } from '../learningPlanService';

export type ExerciseModality = 'learn' | 'quick' | 'review' | 'script';

export type JourneyLevel = 'complete_beginner' | 'beginner' | 'lower_intermediate' | 'intermediate_plus';
export type DifficultyPreference = 'easier' | 'standard' | 'harder';

export interface ExercisePolicyContext {
  languageCode: string;
  level: JourneyLevel;
  difficulty: DifficultyPreference;
}

export interface ExercisePolicyResult {
  allowed: boolean;
  reason?: string;
}

export interface QuickPolicyItem {
  type: string;
  prompt: string;
  answer: string;
}

const FREE_PRODUCTION_TASKS = new Set<string>([
  'translate',
  'speak',
  'write',
  'free_production',
  'complete_dialogue',
  'read_answer_questions',
  'correct_grammar',
  'compare_structures',
  'explain_pronunciation_rule',
]);

const BEGINNER_SAFE_TASKS = new Set<string>([
  'match_word_meaning',
  'match_sentence_translation',
  'group_words_topic',
  'identify_context_meaning',
  'choose_response',
  'choose_verb_form',
  'identify_sounds',
  'listen_choose_written',
  'reorder_sentence',
  'build_from_chunks',
  'fill_missing_word',
  'single_slot_fill',
  'greeting_response_select',
  'image_word_recognition',
  'sound_word_recognition',
  'character_reading_match',
  'reading_character_match',
  'radical_component_identify',
  'missing_character_choice',
  'replace_wrong_character',
  'tone_pair_identify',
  'kana_confusion_select',
  'particle_choice',
  'classifier_choice',
  'okurigana_fill',
  'mcq',
  'match',
  'image_to_word',
  'word_to_image',
  'sound_to_word',
  'sound_to_image',
  'single_cloze',
  'greeting_response',
  'context_meaning',
  'hanzi_pinyin',
  'kanji_reading',
  'radical_match',
  'kana_confusion',
  'phrase_assembly',
]);

const LEVEL_MAX_PROMPT_WORDS: Record<JourneyLevel, number> = {
  complete_beginner: 18,
  beginner: 26,
  lower_intermediate: 38,
  intermediate_plus: 60,
};

function tokenizeWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

export function trimPromptByPolicy(text: string, level: JourneyLevel): string {
  const maxWords = LEVEL_MAX_PROMPT_WORDS[level];
  const words = tokenizeWords(text);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(' ')}...`;
}

export function canUseExerciseType(type: string, context: ExercisePolicyContext): ExercisePolicyResult {
  if (context.level === 'complete_beginner') {
    if (!BEGINNER_SAFE_TASKS.has(type) && FREE_PRODUCTION_TASKS.has(type)) {
      return { allowed: false, reason: 'free production is locked for complete beginners' };
    }
    if (!BEGINNER_SAFE_TASKS.has(type) && !type.startsWith('match_')) {
      return { allowed: false, reason: 'exercise type is outside complete-beginner safe set' };
    }
  }

  if (context.level === 'beginner' && FREE_PRODUCTION_TASKS.has(type) && context.difficulty !== 'harder') {
    return { allowed: false, reason: 'free production deferred for beginner profile' };
  }

  return { allowed: true };
}

function keepTask(task: LearnTaskRuntime, context: ExercisePolicyContext): boolean {
  const gating = canUseExerciseType(task.taskType, context);
  if (!gating.allowed) return false;
  if (tokenizeWords(task.prompt).length > LEVEL_MAX_PROMPT_WORDS[context.level] + 8 && context.level !== 'intermediate_plus') {
    return false;
  }
  return true;
}

export function applyLearnPolicy(tasks: LearnTaskRuntime[], context: ExercisePolicyContext): LearnTaskRuntime[] {
  const filtered = tasks.filter((task) => keepTask(task, context));
  const target = filtered.length > 0 ? filtered : tasks.slice(0, Math.min(6, tasks.length));

  return target.map((task) => ({
    ...task,
    prompt: trimPromptByPolicy(task.prompt, context.level),
    instruction: trimPromptByPolicy(task.instruction, context.level),
  }));
}

export function applyQuickPolicy<T extends QuickPolicyItem>(items: T[], context: ExercisePolicyContext): T[] {
  const filtered = items.filter((item) => canUseExerciseType(item.type, context).allowed);
  const selected = filtered.length > 0 ? filtered : items.slice(0, Math.min(6, items.length));
  return selected.map((item) => ({
    ...item,
    prompt: trimPromptByPolicy(item.prompt, context.level),
    answer: context.level === 'complete_beginner' ? trimPromptByPolicy(item.answer, 'beginner') : item.answer,
  }));
}

export function prefersScriptScaffolding(context: ExercisePolicyContext): boolean {
  return (context.languageCode === 'zh' || context.languageCode === 'ja') && context.level !== 'intermediate_plus';
}

export function canUseFreeProduction(context: ExercisePolicyContext): boolean {
  if (context.level === 'complete_beginner') return false;
  if (context.level === 'beginner' && context.difficulty !== 'harder') return false;
  return true;
}
