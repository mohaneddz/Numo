export type ExerciseCatalogCategory =
  | 'Selection'
  | 'Matching'
  | 'Sorting'
  | 'Ordering'
  | 'Completion'
  | 'Transformation'
  | 'Translation'
  | 'Recall'
  | 'Reading'
  | 'Listening'
  | 'Speaking'
  | 'Writing'
  | 'Conversation'
  | 'Script'
  | 'Review';

export type ExerciseRuntimeDomain = 'quick' | 'learn' | 'review' | 'script' | 'speak' | 'write' | 'conversation';
export type EngineExerciseDomain = 'quick' | 'learn' | 'review' | 'script' | 'speak' | 'write';

export type ExerciseValidationFamily =
  | 'choice'
  | 'binary_choice'
  | 'pair'
  | 'ordering'
  | 'text'
  | 'speech'
  | 'script'
  | 'review_preset';

export interface ExerciseAdapter {
  engineDomain: EngineExerciseDomain;
  internalType: string;
  previewQuickType: string;
  validationFamily: ExerciseValidationFamily;
  reviewPreset?: 'due-now' | 'weak' | 'mistakes' | 'cram';
}

export interface ExerciseCatalogEntry {
  category: ExerciseCatalogCategory;
  displayName: string;
  userKey: string;
  runtimeDomain: ExerciseRuntimeDomain;
  adapter: ExerciseAdapter;
}

export const EXERCISE_CATALOG: ExerciseCatalogEntry[] = [
  { category: 'Selection', displayName: 'Multiple Choice', userKey: 'multiple_choice', runtimeDomain: 'quick', adapter: { engineDomain: 'quick', internalType: 'mcq', previewQuickType: 'mcq', validationFamily: 'choice' } },
  { category: 'Selection', displayName: 'True / False', userKey: 'true_false', runtimeDomain: 'review', adapter: { engineDomain: 'review', internalType: 'tf', previewQuickType: 'mcq', validationFamily: 'binary_choice' } },
  { category: 'Selection', displayName: 'Best Response', userKey: 'best_response', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'choose_response', previewQuickType: 'mcq', validationFamily: 'choice' } },
  { category: 'Selection', displayName: 'Image Choice', userKey: 'image_choice', runtimeDomain: 'quick', adapter: { engineDomain: 'quick', internalType: 'image_to_word', previewQuickType: 'image_to_word', validationFamily: 'choice' } },
  { category: 'Selection', displayName: 'Audio Choice', userKey: 'audio_choice', runtimeDomain: 'quick', adapter: { engineDomain: 'quick', internalType: 'sound_to_word', previewQuickType: 'sound_to_word', validationFamily: 'choice' } },

  { category: 'Matching', displayName: 'Matching', userKey: 'matching', runtimeDomain: 'quick', adapter: { engineDomain: 'quick', internalType: 'match', previewQuickType: 'match', validationFamily: 'pair' } },
  { category: 'Matching', displayName: 'Word ? Meaning Match', userKey: 'word_meaning_match', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'match_word_meaning', previewQuickType: 'match', validationFamily: 'pair' } },
  { category: 'Matching', displayName: 'Sentence ? Translation Match', userKey: 'sentence_translation_match', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'match_sentence_translation', previewQuickType: 'match', validationFamily: 'pair' } },
  { category: 'Matching', displayName: 'Audio ? Text Match', userKey: 'audio_text_match', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'sound_word_recognition', previewQuickType: 'sound_to_word', validationFamily: 'choice' } },
  { category: 'Matching', displayName: 'Image ? Word Match', userKey: 'image_word_match', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'image_word_recognition', previewQuickType: 'image_to_word', validationFamily: 'choice' } },

  { category: 'Sorting', displayName: 'Group by Topic', userKey: 'group_by_topic', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'group_words_topic', previewQuickType: 'match', validationFamily: 'pair' } },
  { category: 'Sorting', displayName: 'Sort by Grammar', userKey: 'sort_by_grammar', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'group_words_topic', previewQuickType: 'match', validationFamily: 'pair' } },
  { category: 'Sorting', displayName: 'Sort by Meaning', userKey: 'sort_by_meaning', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'group_words_topic', previewQuickType: 'match', validationFamily: 'pair' } },
  { category: 'Sorting', displayName: 'Sort by Register', userKey: 'sort_by_register', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'group_words_topic', previewQuickType: 'match', validationFamily: 'pair' } },

  { category: 'Ordering', displayName: 'Phrase Assembly', userKey: 'phrase_assembly', runtimeDomain: 'quick', adapter: { engineDomain: 'quick', internalType: 'phrase_assembly', previewQuickType: 'phrase_assembly', validationFamily: 'ordering' } },
  { category: 'Ordering', displayName: 'Sentence Reordering', userKey: 'sentence_reordering', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'reorder_sentence', previewQuickType: 'phrase_assembly', validationFamily: 'ordering' } },
  { category: 'Ordering', displayName: 'Dialogue Ordering', userKey: 'dialogue_ordering', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'build_from_chunks', previewQuickType: 'phrase_assembly', validationFamily: 'ordering' } },

  { category: 'Completion', displayName: 'Fill in the Blank', userKey: 'fill_in_blank', runtimeDomain: 'quick', adapter: { engineDomain: 'quick', internalType: 'single_cloze', previewQuickType: 'single_cloze', validationFamily: 'text' } },
  { category: 'Completion', displayName: 'Cloze Passage', userKey: 'cloze_passage', runtimeDomain: 'quick', adapter: { engineDomain: 'quick', internalType: 'single_cloze', previewQuickType: 'single_cloze', validationFamily: 'text' } },
  { category: 'Completion', displayName: 'Finish Sentence', userKey: 'finish_sentence', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'finish_sentence_starter', previewQuickType: 'single_cloze', validationFamily: 'text' } },
  { category: 'Completion', displayName: 'Complete Dialogue', userKey: 'complete_dialogue', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'complete_dialogue', previewQuickType: 'single_cloze', validationFamily: 'text' } },

  { category: 'Transformation', displayName: 'Replace with Synonym', userKey: 'replace_with_synonym', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'replace_synonym', previewQuickType: 'single_cloze', validationFamily: 'text' } },
  { category: 'Transformation', displayName: 'Statement ? Question', userKey: 'statement_question', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'transform_statement_question', previewQuickType: 'single_cloze', validationFamily: 'text' } },
  { category: 'Transformation', displayName: 'Verb / Form Change', userKey: 'verb_form_change', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'choose_verb_form', previewQuickType: 'mcq', validationFamily: 'choice' } },
  { category: 'Transformation', displayName: 'Grammar Correction', userKey: 'grammar_correction', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'correct_grammar', previewQuickType: 'single_cloze', validationFamily: 'text' } },
  { category: 'Transformation', displayName: 'Paraphrase', userKey: 'paraphrase', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'compare_structures', previewQuickType: 'single_cloze', validationFamily: 'text' } },

  { category: 'Translation', displayName: 'Translate to Target Language', userKey: 'translate_to_target_language', runtimeDomain: 'quick', adapter: { engineDomain: 'quick', internalType: 'translate', previewQuickType: 'translate', validationFamily: 'text' } },
  { category: 'Translation', displayName: 'Translate to Native Language', userKey: 'translate_to_native_language', runtimeDomain: 'quick', adapter: { engineDomain: 'quick', internalType: 'translate', previewQuickType: 'translate', validationFamily: 'text' } },

  { category: 'Recall', displayName: 'Flashcard Reveal', userKey: 'flashcard_reveal', runtimeDomain: 'review', adapter: { engineDomain: 'review', internalType: 'flash_recall', previewQuickType: 'single_cloze', validationFamily: 'text' } },
  { category: 'Recall', displayName: 'Typed Recall', userKey: 'typed_recall', runtimeDomain: 'review', adapter: { engineDomain: 'review', internalType: 'write', previewQuickType: 'single_cloze', validationFamily: 'text' } },
  { category: 'Recall', displayName: 'Build Recall', userKey: 'build_recall', runtimeDomain: 'review', adapter: { engineDomain: 'review', internalType: 'build', previewQuickType: 'phrase_assembly', validationFamily: 'ordering' } },
  { category: 'Recall', displayName: 'Dictation Recall', userKey: 'dictation_recall', runtimeDomain: 'review', adapter: { engineDomain: 'review', internalType: 'reading_recall', previewQuickType: 'sound_to_word', validationFamily: 'text' } },

  { category: 'Reading', displayName: 'Read and Answer', userKey: 'read_and_answer', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'read_answer_questions', previewQuickType: 'single_cloze', validationFamily: 'text' } },
  { category: 'Reading', displayName: 'Meaning in Context', userKey: 'meaning_in_context', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'identify_context_meaning', previewQuickType: 'mcq', validationFamily: 'choice' } },
  { category: 'Reading', displayName: 'Main Idea', userKey: 'main_idea', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'read_answer_questions', previewQuickType: 'single_cloze', validationFamily: 'text' } },
  { category: 'Reading', displayName: 'Detail Finding', userKey: 'detail_finding', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'read_answer_questions', previewQuickType: 'single_cloze', validationFamily: 'text' } },

  { category: 'Listening', displayName: 'Listen and Choose', userKey: 'listen_and_choose', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'listen_choose_written', previewQuickType: 'sound_to_word', validationFamily: 'choice' } },
  { category: 'Listening', displayName: 'Listen and Type', userKey: 'listen_and_type', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'listen_repeat', previewQuickType: 'sound_to_word', validationFamily: 'text' } },
  { category: 'Listening', displayName: 'Sound Identification', userKey: 'sound_identification', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'identify_sounds', previewQuickType: 'sound_to_word', validationFamily: 'choice' } },
  { category: 'Listening', displayName: 'Pronunciation Rule', userKey: 'pronunciation_rule', runtimeDomain: 'learn', adapter: { engineDomain: 'learn', internalType: 'explain_pronunciation_rule', previewQuickType: 'sound_to_word', validationFamily: 'text' } },

  { category: 'Speaking', displayName: 'Guided Repeat', userKey: 'guided_repeat', runtimeDomain: 'speak', adapter: { engineDomain: 'speak', internalType: 'guided_repeat', previewQuickType: 'speak', validationFamily: 'speech' } },
  { category: 'Speaking', displayName: 'Read Aloud', userKey: 'read_aloud', runtimeDomain: 'speak', adapter: { engineDomain: 'speak', internalType: 'guided_repeat', previewQuickType: 'speak', validationFamily: 'speech' } },
  { category: 'Speaking', displayName: 'Shadowing', userKey: 'shadowing', runtimeDomain: 'speak', adapter: { engineDomain: 'speak', internalType: 'guided_repeat', previewQuickType: 'speak', validationFamily: 'speech' } },
  { category: 'Speaking', displayName: 'Picture Response', userKey: 'picture_response', runtimeDomain: 'speak', adapter: { engineDomain: 'speak', internalType: 'guided_repeat', previewQuickType: 'speak', validationFamily: 'speech' } },
  { category: 'Speaking', displayName: 'Open Spoken Answer', userKey: 'open_spoken_answer', runtimeDomain: 'speak', adapter: { engineDomain: 'speak', internalType: 'guided_repeat', previewQuickType: 'speak', validationFamily: 'speech' } },

  { category: 'Writing', displayName: 'Guided Sentence Writing', userKey: 'guided_sentence_writing', runtimeDomain: 'write', adapter: { engineDomain: 'write', internalType: 'draft_composition', previewQuickType: 'single_cloze', validationFamily: 'text' } },
  { category: 'Writing', displayName: 'Short Composition', userKey: 'short_composition', runtimeDomain: 'write', adapter: { engineDomain: 'write', internalType: 'draft_composition', previewQuickType: 'single_cloze', validationFamily: 'text' } },
  { category: 'Writing', displayName: 'Free Composition', userKey: 'free_composition', runtimeDomain: 'write', adapter: { engineDomain: 'write', internalType: 'draft_composition', previewQuickType: 'single_cloze', validationFamily: 'text' } },

  { category: 'Conversation', displayName: 'Roleplay', userKey: 'roleplay', runtimeDomain: 'conversation', adapter: { engineDomain: 'write', internalType: 'draft_composition', previewQuickType: 'single_cloze', validationFamily: 'text' } },
  { category: 'Conversation', displayName: 'Branching Dialogue', userKey: 'branching_dialogue', runtimeDomain: 'conversation', adapter: { engineDomain: 'write', internalType: 'draft_composition', previewQuickType: 'single_cloze', validationFamily: 'text' } },
  { category: 'Conversation', displayName: 'Goal-Based Chat', userKey: 'goal_based_chat', runtimeDomain: 'conversation', adapter: { engineDomain: 'write', internalType: 'draft_composition', previewQuickType: 'single_cloze', validationFamily: 'text' } },

  { category: 'Script', displayName: 'Stroke Order', userKey: 'stroke_order', runtimeDomain: 'script', adapter: { engineDomain: 'script', internalType: 'watch', previewQuickType: 'mcq', validationFamily: 'script' } },
  { category: 'Script', displayName: 'Trace', userKey: 'trace', runtimeDomain: 'script', adapter: { engineDomain: 'script', internalType: 'trace', previewQuickType: 'mcq', validationFamily: 'script' } },
  { category: 'Script', displayName: 'Guided Draw', userKey: 'guided_draw', runtimeDomain: 'script', adapter: { engineDomain: 'script', internalType: 'guided_draw', previewQuickType: 'mcq', validationFamily: 'script' } },
  { category: 'Script', displayName: 'Free Draw', userKey: 'free_draw', runtimeDomain: 'script', adapter: { engineDomain: 'script', internalType: 'free_draw', previewQuickType: 'mcq', validationFamily: 'script' } },
  { category: 'Script', displayName: 'Timed Recall Draw', userKey: 'timed_recall_draw', runtimeDomain: 'script', adapter: { engineDomain: 'script', internalType: 'timed_recall_draw', previewQuickType: 'mcq', validationFamily: 'script' } },

  { category: 'Review', displayName: 'Mixed Review', userKey: 'mixed_review', runtimeDomain: 'review', adapter: { engineDomain: 'review', internalType: 'reveal', previewQuickType: 'mcq', validationFamily: 'review_preset', reviewPreset: 'due-now' } },
  { category: 'Review', displayName: 'Weak-Point Review', userKey: 'weak_point_review', runtimeDomain: 'review', adapter: { engineDomain: 'review', internalType: 'reveal', previewQuickType: 'mcq', validationFamily: 'review_preset', reviewPreset: 'weak' } },
  { category: 'Review', displayName: 'Timed Review', userKey: 'timed_review', runtimeDomain: 'review', adapter: { engineDomain: 'review', internalType: 'reveal', previewQuickType: 'mcq', validationFamily: 'review_preset', reviewPreset: 'cram' } },
  { category: 'Review', displayName: 'Cumulative Review', userKey: 'cumulative_review', runtimeDomain: 'review', adapter: { engineDomain: 'review', internalType: 'reveal', previewQuickType: 'mcq', validationFamily: 'review_preset', reviewPreset: 'due-now' } },
];

const byUserKey = new Map(EXERCISE_CATALOG.map((entry) => [entry.userKey, entry] as const));
const byInternal = new Map(EXERCISE_CATALOG.map((entry) => [`${entry.adapter.engineDomain}:${entry.adapter.internalType}`, entry] as const));
const internalAliasToUserKey = new Map<string, string>([
  ['quick:greeting_response', 'best_response'],
  ['quick:context_meaning', 'multiple_choice'],
  ['quick:hanzi_pinyin', 'multiple_choice'],
  ['quick:kanji_reading', 'multiple_choice'],
  ['quick:radical_match', 'multiple_choice'],
  ['quick:kana_confusion', 'multiple_choice'],
  ['quick:word_to_image', 'image_choice'],
  ['quick:sound_to_image', 'audio_choice'],
]);

export function getExerciseCategories(): ExerciseCatalogCategory[] {
  return Array.from(new Set(EXERCISE_CATALOG.map((entry) => entry.category)));
}

export function getExercisesByCategory(category: ExerciseCatalogCategory): ExerciseCatalogEntry[] {
  return EXERCISE_CATALOG.filter((entry) => entry.category === category);
}

export function getExerciseByUserKey(userKey: string | null | undefined): ExerciseCatalogEntry | null {
  if (!userKey) return null;
  return byUserKey.get(userKey) ?? null;
}

export function resolveExerciseByInternal(engineDomain: EngineExerciseDomain, internalType: string): ExerciseCatalogEntry | null {
  const direct = byInternal.get(`${engineDomain}:${internalType}`);
  if (direct) return direct;
  const aliasUserKey = internalAliasToUserKey.get(`${engineDomain}:${internalType}`);
  if (!aliasUserKey) return null;
  return byUserKey.get(aliasUserKey) ?? null;
}
