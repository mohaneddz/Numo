import type { PracticeItem } from '../../../lib/sessionEngine';
import { MatchQuickExercise } from './MatchQuickExercise';
import { McqQuickExercise } from './McqQuickExercise';
import { PhraseAssemblyQuickExercise } from './PhraseAssemblyQuickExercise';
import { SpeakQuickExercise } from './SpeakQuickExercise';
import { TranslateQuickExercise } from './TranslateQuickExercise';
import type { QuickExerciseRegistry } from './types';

function hasOptions(item: PracticeItem): boolean {
  return Array.isArray(item.options) && item.options.length >= 2;
}

function hasPairs(item: PracticeItem): boolean {
  return Array.isArray(item.pairs) && item.pairs.length >= 2;
}

export const quickExerciseRegistry = {
  mcq: { component: McqQuickExercise, validate: hasOptions, grading: 'deterministic' },
  translate: { component: TranslateQuickExercise, validate: () => true, grading: 'hybrid' },
  speak: { component: SpeakQuickExercise, validate: () => true, grading: 'hybrid' },
  match: { component: MatchQuickExercise, validate: hasPairs, grading: 'deterministic' },
  image_to_word: { component: McqQuickExercise, validate: hasOptions, grading: 'deterministic' },
  word_to_image: { component: McqQuickExercise, validate: hasOptions, grading: 'deterministic' },
  sound_to_word: { component: McqQuickExercise, validate: hasOptions, grading: 'deterministic' },
  sound_to_image: { component: McqQuickExercise, validate: hasOptions, grading: 'deterministic' },
  phrase_assembly: { component: PhraseAssemblyQuickExercise, validate: (item) => Boolean(item.tokens && item.tokens.length >= 2), grading: 'deterministic' },
  single_cloze: { component: TranslateQuickExercise, validate: () => true, grading: 'hybrid' },
  greeting_response: { component: McqQuickExercise, validate: hasOptions, grading: 'deterministic' },
  context_meaning: { component: McqQuickExercise, validate: hasOptions, grading: 'deterministic' },
  hanzi_pinyin: { component: McqQuickExercise, validate: hasOptions, grading: 'deterministic' },
  kanji_reading: { component: McqQuickExercise, validate: hasOptions, grading: 'deterministic' },
  radical_match: { component: McqQuickExercise, validate: hasOptions, grading: 'deterministic' },
  kana_confusion: { component: McqQuickExercise, validate: hasOptions, grading: 'deterministic' },
} satisfies QuickExerciseRegistry;

export function resolveQuickExercise(item: PracticeItem) {
  const registration = quickExerciseRegistry[item.type];
  if (!registration.validate(item)) return null;
  return registration;
}
