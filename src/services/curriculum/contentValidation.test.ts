import { describe, expect, it } from 'vitest';
import { validateTaskContent, type TaskContent } from './contentValidation';
import { isWrongScript, matchesLanguageScript } from './languageProfile';

function content(overrides: Partial<TaskContent> = {}): TaskContent {
  return {
    instruction: 'Choose the best response.',
    prompt: '¿Cómo te llamas?',
    expectedAnswer: 'Me llamo Ana',
    distractors: ['Tengo hambre', 'Son las tres'],
    payload: {},
    ...overrides,
  };
}

function issueRules(result: ReturnType<typeof validateTaskContent>): string[] {
  return result.issues.map((issue) => issue.rule);
}

describe('languageProfile script checks', () => {
  it('recognizes script per language', () => {
    expect(matchesLanguageScript('こんにちは', 'ja')).toBe(true);
    expect(matchesLanguageScript('Привет', 'ru')).toBe(true);
    expect(matchesLanguageScript('hola', 'es')).toBe(true);
  });

  it('flags Latin text presented as a non-Latin answer', () => {
    expect(isWrongScript('drink', 'ja')).toBe(true);
    expect(isWrongScript('飲みます', 'ja')).toBe(false);
    expect(isWrongScript('drink', 'es')).toBe(false);
  });

  it('accepts numeric answers in any language', () => {
    expect(matchesLanguageScript('42', 'ja')).toBe(true);
  });
});

describe('validateTaskContent', () => {
  it('accepts well-formed option content', () => {
    const result = validateTaskContent(
      content({
        payload: {
          options: ['Me llamo Ana', 'Tengo hambre', 'Son las tres', 'Vivo aquí'],
          correctOption: 'Me llamo Ana',
        },
      }),
      { taskType: 'choose_response', languageCode: 'es' },
    );
    expect(result.valid).toBe(true);
  });

  it('rejects English filler served to a non-Latin language', () => {
    const result = validateTaskContent(
      content({
        prompt: 'I ___ coffee every morning.',
        expectedAnswer: 'drink',
        payload: { options: ['drink', 'table', 'green', 'window'], correctOption: 'drink' },
      }),
      { taskType: 'choose_response', languageCode: 'ja' },
    );
    expect(result.valid).toBe(false);
    expect(issueRules(result)).toContain('answer_wrong_script');
  });

  it('rejects a prompt that contains its own answer', () => {
    const result = validateTaskContent(
      content({
        prompt: 'Complete: Me llamo Ana',
        expectedAnswer: 'Me llamo Ana',
        payload: { options: ['Me llamo Ana', 'Tengo hambre', 'Son las tres'], correctOption: 'Me llamo Ana' },
      }),
      { taskType: 'choose_response', languageCode: 'es' },
    );
    expect(issueRules(result)).toContain('answer_leaked_in_prompt');
  });

  it('rejects too few or duplicated options', () => {
    const tooFew = validateTaskContent(
      content({ payload: { options: ['Me llamo Ana', 'Tengo hambre'], correctOption: 'Me llamo Ana' } }),
      { taskType: 'choose_response', languageCode: 'es' },
    );
    expect(issueRules(tooFew)).toContain('too_few_options');

    const duplicated = validateTaskContent(
      content({
        payload: {
          options: ['Me llamo Ana', 'me llamo ana', 'Tengo hambre', 'Son las tres'],
          correctOption: 'Me llamo Ana',
        },
      }),
      { taskType: 'choose_response', languageCode: 'es' },
    );
    expect(issueRules(duplicated)).toContain('duplicate_options');
  });

  it('rejects options where the correct answer is absent', () => {
    const result = validateTaskContent(
      content({ payload: { options: ['Tengo hambre', 'Son las tres', 'Vivo aquí'], correctOption: 'Me llamo Ana' } }),
      { taskType: 'choose_response', languageCode: 'es' },
    );
    expect(issueRules(result)).toContain('correct_option_missing');
  });

  it('accepts an English answer for identify_context_meaning', () => {
    // This task type shows a target-language prompt and asks for its English
    // meaning, so its answer and options are meant to be English, not Chinese —
    // the script check must not fire here or every correct instance is rejected.
    const result = validateTaskContent(
      content({
        prompt: '你好',
        expectedAnswer: 'hello',
        payload: {
          options: ['hello', 'goodbye', 'thank you', 'excuse me'],
          correctOption: 'hello',
        },
      }),
      { taskType: 'identify_context_meaning', languageCode: 'zh' },
    );
    expect(result.valid).toBe(true);
  });

  it('still rejects options that mix scripts for identify_context_meaning', () => {
    // The per-option mixed-script check is independent of the answer exemption:
    // consistently-English options are fine, a mix of English and target-language
    // options is still a giveaway.
    const result = validateTaskContent(
      content({
        prompt: '你好',
        expectedAnswer: 'hello',
        payload: {
          options: ['hello', '再见', 'thank you', 'excuse me'],
          correctOption: 'hello',
        },
      }),
      { taskType: 'identify_context_meaning', languageCode: 'zh' },
    );
    expect(issueRules(result)).toContain('mixed_script_options');
  });

  it('rejects options that mix scripts', () => {
    const result = validateTaskContent(
      content({
        prompt: 'お名前は？',
        expectedAnswer: '田中です',
        payload: { options: ['田中です', 'hungry', '三時です', '犬です'], correctOption: '田中です' },
      }),
      { taskType: 'choose_response', languageCode: 'ja' },
    );
    expect(issueRules(result)).toContain('mixed_script_options');
  });

  it('rejects self-matching pairs and index-labelled pairs', () => {
    const identity = validateTaskContent(
      content({
        payload: {
          pairs: [
            { left: '水', right: '水' },
            { left: '火', right: 'fire' },
            { left: '木', right: 'tree' },
          ],
        },
      }),
      { taskType: 'character_reading_match', languageCode: 'ja' },
    );
    expect(issueRules(identity)).toContain('identity_pair');

    const positional = validateTaskContent(
      content({
        payload: {
          pairs: [
            { left: 'agua 1', right: 'water' },
            { left: 'fuego 2', right: 'fire' },
            { left: 'árbol 3', right: 'tree' },
          ],
        },
      }),
      { taskType: 'match_word_meaning', languageCode: 'es' },
    );
    expect(issueRules(positional)).toContain('positional_pair_label');
  });

  it('rejects duplicate pair sides', () => {
    const result = validateTaskContent(
      content({
        payload: {
          pairs: [
            { left: 'agua', right: 'water' },
            { left: 'agua', right: 'fire' },
            { left: 'árbol', right: 'tree' },
          ],
        },
      }),
      { taskType: 'match_word_meaning', languageCode: 'es' },
    );
    expect(issueRules(result)).toContain('duplicate_pair_left');
  });

  it('rejects tokens that cannot build the answer', () => {
    const result = validateTaskContent(
      content({
        expectedAnswer: 'yo como pan',
        payload: { tokens: ['yo', 'bebo', 'agua'] },
      }),
      { taskType: 'reorder_sentence', languageCode: 'es' },
    );
    expect(issueRules(result)).toContain('tokens_do_not_build_answer');
  });

  it('accepts tokens that build the answer in any order', () => {
    const result = validateTaskContent(
      content({
        prompt: 'Put the words in order.',
        expectedAnswer: 'yo como pan',
        payload: { tokens: ['pan', 'yo', 'como'] },
      }),
      { taskType: 'reorder_sentence', languageCode: 'es' },
    );
    expect(issueRules(result)).not.toContain('tokens_do_not_build_answer');
  });

  it('rejects placeholder group names and undersized groups', () => {
    const result = validateTaskContent(
      content({
        payload: {
          groups: [
            { name: 'Group A', items: ['agua', 'vino'] },
            { name: 'Category B', items: ['pan'] },
          ],
        },
      }),
      { taskType: 'group_words_topic', languageCode: 'es' },
    );
    expect(issueRules(result)).toContain('placeholder_group_name');
    expect(issueRules(result)).toContain('undersized_group');
  });

  it('rejects an item that belongs to two groups', () => {
    const result = validateTaskContent(
      content({
        payload: {
          groups: [
            { name: 'Bebidas', items: ['agua', 'vino'] },
            { name: 'Comidas', items: ['pan', 'agua'] },
          ],
        },
      }),
      { taskType: 'group_words_topic', languageCode: 'es' },
    );
    expect(issueRules(result)).toContain('ambiguous_group_item');
  });

  it('accepts meaningful groups', () => {
    const result = validateTaskContent(
      content({
        payload: {
          groups: [
            { name: 'Bebidas', items: ['agua', 'vino'] },
            { name: 'Comidas', items: ['pan', 'queso'] },
          ],
        },
      }),
      { taskType: 'group_words_topic', languageCode: 'es' },
    );
    expect(result.valid).toBe(true);
  });
});
