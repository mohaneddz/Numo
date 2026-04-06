import type { TaskType } from '../../../types/learningPlan';
import { BuildFromChunksExercise } from './BuildFromChunksExercise';
import { ChooseResponseExercise } from './ChooseResponseExercise';
import { ChooseVerbFormExercise } from './ChooseVerbFormExercise';
import { CompareStructuresExercise } from './CompareStructuresExercise';
import { CompleteDialogueExercise } from './CompleteDialogueExercise';
import { CorrectGrammarExercise } from './CorrectGrammarExercise';
import { ExplainPronunciationRuleExercise } from './ExplainPronunciationRuleExercise';
import { FillMissingWordExercise } from './FillMissingWordExercise';
import { FinishSentenceStarterExercise } from './FinishSentenceStarterExercise';
import { GroupWordsTopicExercise } from './GroupWordsTopicExercise';
import { IdentifyContextMeaningExercise } from './IdentifyContextMeaningExercise';
import { IdentifySoundsExercise } from './IdentifySoundsExercise';
import { ListenChooseWrittenExercise } from './ListenChooseWrittenExercise';
import { ListenRepeatExercise } from './ListenRepeatExercise';
import { MatchSentenceTranslationExercise } from './MatchSentenceTranslationExercise';
import { MatchWordMeaningExercise } from './MatchWordMeaningExercise';
import { ReadAnswerQuestionsExercise } from './ReadAnswerQuestionsExercise';
import { ReorderSentenceExercise } from './ReorderSentenceExercise';
import { ReplaceSynonymExercise } from './ReplaceSynonymExercise';
import { TransformStatementQuestionExercise } from './TransformStatementQuestionExercise';
import { OptionSelectExercise } from './base/OptionSelectExercise';
import { PairMatchExercise } from './base/PairMatchExercise';
import { TextEntryExercise } from './base/TextEntryExercise';
import { asGroups, asPairs, asStringArray, type LearnExerciseRegistry, type LearnTaskPayload } from './types';

function normalizeTextPayload(raw: Record<string, unknown>, fallback: LearnTaskPayload): LearnTaskPayload | null {
  const promptText = typeof raw.promptText === 'string' ? raw.promptText.trim() : fallback.promptText;
  const expectedText = typeof raw.expectedText === 'string' ? raw.expectedText.trim() : fallback.expectedText;
  if (!promptText && !expectedText) return null;
  return {
    ...fallback,
    promptText,
    expectedText,
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : fallback.imageUrl,
    imageAlt: typeof raw.imageAlt === 'string' ? raw.imageAlt : fallback.imageAlt,
    audioText: typeof raw.audioText === 'string' ? raw.audioText : fallback.audioText,
  };
}

function normalizeOptionPayload(raw: Record<string, unknown>, fallback: LearnTaskPayload): LearnTaskPayload | null {
  const rawOptions = asStringArray(raw.options);
  const fallbackOptions = fallback.options ?? [];
  const merged = Array.from(new Set([...rawOptions, ...fallbackOptions])).filter(Boolean);
  if (merged.length < 2) return null;
  return {
    ...fallback,
    options: merged,
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : fallback.imageUrl,
    imageAlt: typeof raw.imageAlt === 'string' ? raw.imageAlt : fallback.imageAlt,
    audioText: typeof raw.audioText === 'string' ? raw.audioText : fallback.audioText,
    correctOption: typeof raw.correctOption === 'string' && raw.correctOption.trim() ? raw.correctOption.trim() : fallback.correctOption,
  };
}

function normalizePairPayload(raw: Record<string, unknown>, fallback: LearnTaskPayload): LearnTaskPayload | null {
  const mergedPairs = asPairs(raw.pairs);
  const fallbackPairs = fallback.pairs ?? [];
  const pairs = mergedPairs.length >= 2 ? mergedPairs : fallbackPairs;
  if (pairs.length < 2) return null;
  return {
    ...fallback,
    pairs,
  };
}

function normalizeTokenPayload(raw: Record<string, unknown>, fallback: LearnTaskPayload): LearnTaskPayload | null {
  const rawTokens = asStringArray(raw.tokens);
  let tokens = rawTokens.length > 0 ? rawTokens : fallback.tokens ?? [];
  if (tokens.length === 0 && fallback.expectedText) {
    tokens = fallback.expectedText.split(/\s+/).filter(Boolean);
  }
  if (tokens.length < 2) return null;
  return {
    ...fallback,
    tokens,
  };
}

function normalizeGroupPayload(raw: Record<string, unknown>, fallback: LearnTaskPayload): LearnTaskPayload | null {
  const parsed = asGroups(raw.groups);
  if (parsed.length > 0) {
    return {
      ...fallback,
      groups: parsed,
    };
  }
  if ((fallback.groups ?? []).length > 0) return fallback;
  const options = fallback.options ?? [];
  if (options.length < 4) return null;
  const midpoint = Math.ceil(options.length / 2);
  return {
    ...fallback,
    groups: [
      { name: 'Group A', items: options.slice(0, midpoint) },
      { name: 'Group B', items: options.slice(midpoint) },
    ],
  };
}

function deterministicOptionRegistration() {
  return { component: OptionSelectExercise, validatePayload: normalizeOptionPayload, grading: 'deterministic' as const };
}

function deterministicPairRegistration() {
  return { component: PairMatchExercise, validatePayload: normalizePairPayload, grading: 'deterministic' as const };
}

function hybridTextRegistration() {
  return { component: TextEntryExercise, validatePayload: normalizeTextPayload, grading: 'hybrid' as const };
}

export const learnExerciseRegistry = {
  match_word_meaning: { component: MatchWordMeaningExercise, validatePayload: normalizePairPayload, grading: 'deterministic' },
  match_sentence_translation: { component: MatchSentenceTranslationExercise, validatePayload: normalizePairPayload, grading: 'deterministic' },
  group_words_topic: { component: GroupWordsTopicExercise, validatePayload: normalizeGroupPayload, grading: 'deterministic' },
  replace_synonym: { component: ReplaceSynonymExercise, validatePayload: normalizeTextPayload, grading: 'hybrid' },
  identify_context_meaning: { component: IdentifyContextMeaningExercise, validatePayload: normalizeOptionPayload, grading: 'deterministic' },
  reorder_sentence: { component: ReorderSentenceExercise, validatePayload: normalizeTokenPayload, grading: 'deterministic' },
  fill_missing_word: { component: FillMissingWordExercise, validatePayload: normalizeTextPayload, grading: 'deterministic' },
  finish_sentence_starter: { component: FinishSentenceStarterExercise, validatePayload: normalizeTextPayload, grading: 'hybrid' },
  build_from_chunks: { component: BuildFromChunksExercise, validatePayload: normalizeTokenPayload, grading: 'deterministic' },
  complete_dialogue: { component: CompleteDialogueExercise, validatePayload: normalizeTextPayload, grading: 'hybrid' },
  read_answer_questions: { component: ReadAnswerQuestionsExercise, validatePayload: normalizeTextPayload, grading: 'hybrid' },
  choose_response: { component: ChooseResponseExercise, validatePayload: normalizeOptionPayload, grading: 'deterministic' },
  choose_verb_form: { component: ChooseVerbFormExercise, validatePayload: normalizeOptionPayload, grading: 'deterministic' },
  transform_statement_question: { component: TransformStatementQuestionExercise, validatePayload: normalizeTextPayload, grading: 'hybrid' },
  correct_grammar: { component: CorrectGrammarExercise, validatePayload: normalizeTextPayload, grading: 'hybrid' },
  compare_structures: { component: CompareStructuresExercise, validatePayload: normalizeTextPayload, grading: 'hybrid' },
  listen_repeat: { component: ListenRepeatExercise, validatePayload: normalizeTextPayload, grading: 'hybrid' },
  identify_sounds: { component: IdentifySoundsExercise, validatePayload: normalizeOptionPayload, grading: 'deterministic' },
  listen_choose_written: { component: ListenChooseWrittenExercise, validatePayload: normalizeOptionPayload, grading: 'deterministic' },
  explain_pronunciation_rule: { component: ExplainPronunciationRuleExercise, validatePayload: normalizeTextPayload, grading: 'ai' },
  greeting_response_select: deterministicOptionRegistration(),
  single_slot_fill: { component: FillMissingWordExercise, validatePayload: normalizeTextPayload, grading: 'deterministic' },
  image_word_recognition: deterministicOptionRegistration(),
  sound_word_recognition: deterministicOptionRegistration(),
  character_reading_match: deterministicPairRegistration(),
  reading_character_match: deterministicPairRegistration(),
  radical_component_identify: deterministicOptionRegistration(),
  missing_character_choice: deterministicOptionRegistration(),
  replace_wrong_character: hybridTextRegistration(),
  tone_pair_identify: deterministicOptionRegistration(),
  kana_confusion_select: deterministicOptionRegistration(),
  particle_choice: deterministicOptionRegistration(),
  classifier_choice: deterministicOptionRegistration(),
  okurigana_fill: hybridTextRegistration(),
} satisfies LearnExerciseRegistry;

export function resolveLearnExercise(taskType: TaskType, rawPayload: Record<string, unknown>, fallback: LearnTaskPayload) {
  const registration = learnExerciseRegistry[taskType];
  const validated = registration.validatePayload(rawPayload, fallback);
  if (!validated) return null;
  return {
    component: registration.component,
    grading: registration.grading,
    payload: validated,
  };
}
