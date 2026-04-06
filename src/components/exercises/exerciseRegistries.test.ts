import { describe, expect, it } from 'vitest';
import { LESSON_TASK_TYPES } from '../../types/learningPlan';
import { learnExerciseRegistry, resolveLearnExercise } from './learn/registry';
import { quickExerciseRegistry } from './quick/registry';
import { reviewExerciseRegistry } from './review/registry';
import { scriptExerciseRegistry } from './script/registry';
import { speakExerciseRegistry } from './speak/registry';
import { writeExerciseRegistry } from './write/registry';

describe('exercise registries', () => {
  it('covers all lesson task types', () => {
    const keys = Object.keys(learnExerciseRegistry).sort();
    const expected = [...LESSON_TASK_TYPES].sort();
    expect(keys).toEqual(expected);
  });

  it('covers quick/review/script/speak/write exercise types', () => {
    expect(Object.keys(quickExerciseRegistry).sort()).toEqual([
      'context_meaning',
      'greeting_response',
      'hanzi_pinyin',
      'image_to_word',
      'kana_confusion',
      'kanji_reading',
      'match',
      'mcq',
      'phrase_assembly',
      'radical_match',
      'single_cloze',
      'sound_to_image',
      'sound_to_word',
      'speak',
      'translate',
      'word_to_image',
    ]);
    expect(Object.keys(reviewExerciseRegistry).sort()).toEqual([
      'build',
      'confusion_pair',
      'delayed_recall',
      'flash_recall',
      'multiple',
      'radical_recall',
      'reading_recall',
      'reveal',
      'seen_unseen',
      'tf',
      'tfj',
      'write',
    ]);
    expect(Object.keys(scriptExerciseRegistry).sort()).toEqual(['free_draw', 'guided_draw', 'timed_recall_draw', 'trace', 'watch']);
    expect(Object.keys(speakExerciseRegistry)).toEqual(['guided_repeat']);
    expect(Object.keys(writeExerciseRegistry).sort()).toEqual(['correction_review', 'draft_composition']);
  });

  it('blocks invalid learn payloads before component rendering', () => {
    const noPairs = resolveLearnExercise(
      'match_word_meaning',
      {},
      { promptText: 'match this', expectedText: 'answer' },
    );
    expect(noPairs).toBeNull();

    const withPairs = resolveLearnExercise(
      'match_word_meaning',
      {},
      { promptText: 'match this', expectedText: 'answer', pairs: [{ left: 'hola', right: 'hello' }, { left: 'adios', right: 'bye' }] },
    );
    expect(withPairs).not.toBeNull();
  });
});
