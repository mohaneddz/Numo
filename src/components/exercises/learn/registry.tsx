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
import { ListenTypeDictationExercise } from './ListenTypeDictationExercise';
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

/** Fields every exercise can use, carried through from the generated content. */
function commonFields(raw: Record<string, unknown>, fallback: LearnTaskPayload): Partial<LearnTaskPayload> {
  return {
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : fallback.imageUrl,
    imageAlt: typeof raw.imageAlt === 'string' ? raw.imageAlt : fallback.imageAlt,
    audioText: typeof raw.audioText === 'string' ? raw.audioText : fallback.audioText,
    translation: typeof raw.translation === 'string' ? raw.translation : fallback.translation,
    romanization: typeof raw.romanization === 'string' ? raw.romanization : fallback.romanization,
    teachingNote: typeof raw.teachingNote === 'string' ? raw.teachingNote : fallback.teachingNote,
  };
}

/**
 * Dictation needs audio and an expected spelling. Without the audio there is no
 * question at all, so the task is dropped rather than shown as a blank prompt.
 */
function normalizeDictationPayload(raw: Record<string, unknown>, fallback: LearnTaskPayload): LearnTaskPayload | null {
  const payload = normalizeTextPayload(raw, fallback);
  if (!payload) return null;
  const audioText = payload.audioText?.trim() || payload.expectedText?.trim();
  if (!audioText || !payload.expectedText?.trim()) return null;
  return { ...payload, audioText };
}

function normalizeTextPayload(raw: Record<string, unknown>, fallback: LearnTaskPayload): LearnTaskPayload | null {
  const promptText = typeof raw.promptText === 'string' ? raw.promptText.trim() : fallback.promptText;
  const expectedText = typeof raw.expectedText === 'string' ? raw.expectedText.trim() : fallback.expectedText;
  if (!promptText && !expectedText) return null;
  return {
    ...fallback,
    ...commonFields(raw, fallback),
    promptText,
    expectedText,
  };
}

function normalizeOptionPayload(raw: Record<string, unknown>, fallback: LearnTaskPayload): LearnTaskPayload | null {
  const rawOptions = asStringArray(raw.options);
  const fallbackOptions = fallback.options ?? [];
  const merged = Array.from(new Set([...rawOptions, ...fallbackOptions])).filter(Boolean);
  const correctOption = typeof raw.correctOption === 'string' && raw.correctOption.trim()
    ? raw.correctOption.trim()
    : fallback.correctOption;

  // A choice needs a real field of candidates. Two options is a coin flip, and an
  // option set that does not contain the answer is unanswerable.
  if (merged.length < 3) return null;
  if (correctOption && !merged.includes(correctOption)) return null;

  return {
    ...fallback,
    ...commonFields(raw, fallback),
    options: merged,
    correctOption,
  };
}

function normalizePairPayload(raw: Record<string, unknown>, fallback: LearnTaskPayload): LearnTaskPayload | null {
  const mergedPairs = asPairs(raw.pairs);
  const fallbackPairs = fallback.pairs ?? [];
  const candidate = mergedPairs.length >= 2 ? mergedPairs : fallbackPairs;

  // A pair whose two sides are the same string answers itself, so drop those and
  // only keep the task if enough real pairs remain.
  const pairs = candidate.filter((pair) => pair.left.trim() !== pair.right.trim());
  if (pairs.length < 3) return null;

  return {
    ...fallback,
    ...commonFields(raw, fallback),
    pairs,
  };
}

function normalizeTokenPayload(raw: Record<string, unknown>, fallback: LearnTaskPayload): LearnTaskPayload | null {
  const rawTokens = asStringArray(raw.tokens);
  let tokens = rawTokens.length > 0 ? rawTokens : fallback.tokens ?? [];
  if (tokens.length === 0 && fallback.expectedText) {
    tokens = fallback.expectedText.split(/\s+/).filter(Boolean);
  }
  if (tokens.length < 3) return null;
  return {
    ...fallback,
    ...commonFields(raw, fallback),
    tokens,
  };
}

function normalizeGroupPayload(raw: Record<string, unknown>, fallback: LearnTaskPayload): LearnTaskPayload | null {
  const parsed = asGroups(raw.groups);
  const groups = parsed.length > 0 ? parsed : fallback.groups ?? [];

  // Splitting an arbitrary word list into "Group A" and "Group B" was the old
  // fallback. There is nothing to reason about in that task, so it is refused
  // rather than manufactured.
  if (groups.length < 2) return null;
  if (groups.some((group) => group.items.length < 2)) return null;

  return {
    ...fallback,
    ...commonFields(raw, fallback),
    groups,
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
  listen_type_dictation: { component: ListenTypeDictationExercise, validatePayload: normalizeDictationPayload, grading: 'deterministic' },
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
