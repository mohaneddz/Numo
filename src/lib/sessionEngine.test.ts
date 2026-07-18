import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateExerciseDraft } from './sessionEngine';

const completeWithEchoMock = vi.fn();
const resolveExerciseImageMock = vi.fn();

vi.mock('../services/aiProvider', () => ({
  completeWithEcho: (...args: unknown[]) => completeWithEchoMock(...args),
}));

vi.mock('../services/exercises/exerciseMediaService', () => ({
  resolveExerciseImage: (...args: unknown[]) => resolveExerciseImageMock(...args),
}));

describe('generateExerciseDraft hardening', () => {
  beforeEach(() => {
    completeWithEchoMock.mockReset();
    resolveExerciseImageMock.mockReset();
    resolveExerciseImageMock.mockResolvedValue({
      imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Hello_cat.jpg',
      thumbnailUrl: 'https://upload.wikimedia.org/mock/thumb/hello-cat.jpg',
      attribution: 'Source: wikimedia',
      query: 'cat german educational illustration',
      fromCache: false,
    });
  });

  it('rejects meaningless MCQ true/false output and falls back to meaningful 4-choice content', async () => {
    completeWithEchoMock.mockResolvedValue(JSON.stringify({
      result: {
        id: '1776234033029',
        type: 'mcq',
        prompt: 'Choose the best answer in German.',
        choices: ['[[True]]', '[[False]]'],
        correctAnswer: '[[True]]',
      },
    }));

    const draft = await generateExerciseDraft({
      languageCode: 'de',
      languageName: 'German',
      exerciseDomain: 'quick',
      exerciseType: 'mcq',
      userExerciseKey: 'multiple_choice',
      mode: 'quick',
      source: 'test',
      journeyLevel: 'beginner',
      difficultyPreference: 'standard',
    });

    expect(draft.quickItem).not.toBeNull();
    const quickItem = draft.quickItem!;
    expect(quickItem.prompt.toLowerCase()).not.toContain('choose the best answer in german');
    expect(quickItem.options).toHaveLength(4);
    expect(quickItem.options?.map((entry) => entry.toLowerCase())).not.toEqual(['[[true]]', '[[false]]']);
  });

  it('forces true/false exercises to include a concrete statement context', async () => {
    completeWithEchoMock.mockResolvedValue(JSON.stringify({
      result: {
        id: '1776234033029',
        type: 'mcq',
        prompt: 'Choose the best answer in German.',
        choices: ['[[True]]', '[[False]]'],
        correctAnswer: '[[True]]',
      },
    }));

    const draft = await generateExerciseDraft({
      languageCode: 'de',
      languageName: 'German',
      exerciseDomain: 'review',
      exerciseType: 'tf',
      userExerciseKey: 'true_false',
      mode: 'quick',
      source: 'test',
      journeyLevel: 'beginner',
      difficultyPreference: 'standard',
    });

    expect(draft.quickItem).not.toBeNull();
    const quickItem = draft.quickItem!;
    expect(quickItem.prompt).toContain('True or False:');
    expect(quickItem.prompt).toContain('[[Guten Tag]]');
    expect(quickItem.options).toEqual(['[[True]]', '[[False]]']);
  });

  it('forces image exercises to use image-style prompt and media search result', async () => {
    completeWithEchoMock.mockResolvedValue(JSON.stringify({
      result: {
        id: 'image_to_word_de_1',
        type: 'image_to_word',
        prompt: {
          method: 'translation_to_target',
          text: "How do we say 'hello' in [[German]]?",
          variables: {
            englishPhrase: 'hello',
            targetPhrase: 'Hallo',
          },
        },
        choices: [
          '[[Hallo]]',
          '[[Auf Wiedersehen]]',
          '[[Guten Tag]]',
          '[[Gute Nacht]]',
        ],
        correctAnswer: '[[Hallo]]',
        imageUrl: 'https://example.com/hello_image.jpg',
      },
    }));

    const draft = await generateExerciseDraft({
      languageCode: 'de',
      languageName: 'German',
      exerciseDomain: 'quick',
      exerciseType: 'image_to_word',
      userExerciseKey: 'image_choice',
      mode: 'quick',
      source: 'test',
      journeyLevel: 'beginner',
      difficultyPreference: 'standard',
    });

    expect(draft.quickItem).not.toBeNull();
    const quickItem = draft.quickItem!;
    expect(quickItem.type).toBe('image_to_word');
    expect(quickItem.prompt.toLowerCase()).toMatch(/image|picture|photo/);
    expect(quickItem.imageUrl).toBe('https://commons.wikimedia.org/wiki/Special:FilePath/Hello_cat.jpg');
    expect(resolveExerciseImageMock).toHaveBeenCalledTimes(1);
  });
});
