export const LESSON_TASK_TYPES = [
  'match_word_meaning',
  'match_sentence_translation',
  'group_words_topic',
  'replace_synonym',
  'identify_context_meaning',
  'reorder_sentence',
  'fill_missing_word',
  'finish_sentence_starter',
  'build_from_chunks',
  'complete_dialogue',
  'read_answer_questions',
  'choose_response',
  'choose_verb_form',
  'transform_statement_question',
  'correct_grammar',
  'compare_structures',
  'listen_repeat',
  'identify_sounds',
  'listen_choose_written',
  'listen_type_dictation',
  'explain_pronunciation_rule',
  'greeting_response_select',
  'single_slot_fill',
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
] as const;

export type TaskType = (typeof LESSON_TASK_TYPES)[number];

export const TASK_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export type TaskDifficulty = (typeof TASK_DIFFICULTIES)[number];

export interface Unit {
  id: string;
  languageCode: string;
  unitKey: string;
  title: string;
  description: string;
  orderIndex: number;
}

export interface Lesson {
  id: string;
  unitId: string;
  lessonKey: string;
  title: string;
  description: string;
  communicationGoal: string;
  levelBand: TaskDifficulty;
  orderIndex: number;
  estDurationMin: number;
}

export interface LessonObjective {
  id: string;
  lessonId: string;
  objectiveKey: string;
  title: string;
  practicalGoal: string;
  vocabularyFocus: string[];
  grammarFocus: string[];
  pronunciationFocus?: string[];
  orderIndex: number;
}

export interface LessonTask {
  id: string;
  objectiveId: string;
  taskType: TaskType;
  instruction: string;
  prompt: string;
  answer: string;
  distractors?: string[];
  metadata?: Record<string, unknown>;
  difficulty: TaskDifficulty;
  orderIndex: number;
}

export interface TaskEvaluation {
  isCorrect: boolean;
  score: number;
  feedback: string;
  expectedAnswer: string;
}

export interface TaskAttempt {
  id: string;
  taskId: string;
  learnerAnswer: string;
  evaluation: TaskEvaluation;
  submittedAt: string;
}
