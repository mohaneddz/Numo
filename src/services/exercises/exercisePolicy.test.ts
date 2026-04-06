import { describe, expect, it } from 'vitest';
import { applyQuickPolicy, canUseExerciseType, type QuickPolicyItem } from './exercisePolicy';

describe('exercisePolicy', () => {
  it('blocks free production for complete beginners', () => {
    const result = canUseExerciseType('translate', {
      languageCode: 'es',
      level: 'complete_beginner',
      difficulty: 'easier',
    });
    expect(result.allowed).toBe(false);
  });

  it('allows beginner-safe recognition drill types', () => {
    const result = canUseExerciseType('image_to_word', {
      languageCode: 'ja',
      level: 'complete_beginner',
      difficulty: 'easier',
    });
    expect(result.allowed).toBe(true);
  });

  it('applies quick policy filtering and prompt trimming', () => {
    const items: QuickPolicyItem[] = [
      {
        type: 'translate',
        prompt: 'This should be removed for complete beginners',
        answer: 'x',
      },
      {
        type: 'context_meaning',
        prompt: 'Choose the practical meaning for this phrase in a short beginner-safe context now please.',
        answer: 'meaning',
      },
    ];

    const output = applyQuickPolicy(items, {
      languageCode: 'es',
      level: 'complete_beginner',
      difficulty: 'easier',
    });

    expect(output).toHaveLength(1);
    expect(output[0].type).toBe('context_meaning');
    expect(output[0].prompt.length).toBeLessThanOrEqual(items[1].prompt.length);
  });
});
