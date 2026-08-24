import { describe, expect, it } from 'vitest';
import { evaluateLearnTaskAnswer } from './learningPlanService';

describe('evaluateLearnTaskAnswer', () => {
  it('returns perfect score for exact normalized match', () => {
    const result = evaluateLearnTaskAnswer('Bonjour, je m appelle Lea', 'bonjour je m appelle lea');
    expect(result.isCorrect).toBe(true);
    expect(result.score).toBe(100);
  });

  it('does not accept a fragment of the target as correct', () => {
    // This previously returned isCorrect: true at 78%, because a substring match in
    // either direction counted as "close enough". Producing three words of a
    // six-word target is not producing the target.
    const result = evaluateLearnTaskAnswer('I would like a table for two', 'table for two');
    expect(result.isCorrect).toBe(false);
  });

  it('returns incorrect with no credit when the answer is unrelated', () => {
    const result = evaluateLearnTaskAnswer('Good morning', 'See you later');
    expect(result.isCorrect).toBe(false);
    expect(result.score).toBe(0);
  });

  it('grades non-Latin scripts instead of erasing them', () => {
    // The old normalizer stripped everything outside [a-z0-9], so both sides of
    // this comparison became the empty string and every CJK answer was graded as
    // "no answer submitted".
    expect(evaluateLearnTaskAnswer('你好', '你好', 'zh').isCorrect).toBe(true);
    expect(evaluateLearnTaskAnswer('你好', '再见', 'zh').isCorrect).toBe(false);
  });

  it('accepts a missing accent with a reduced score and a note', () => {
    const result = evaluateLearnTaskAnswer('sí, gracias', 'si, gracias', 'es');
    expect(result.isCorrect).toBe(true);
    expect(result.score).toBeLessThan(100);
    expect(result.feedback).toBeTruthy();
  });

  it('distinguishes an empty submission from a wrong one', () => {
    expect(evaluateLearnTaskAnswer('hola', '  ').feedback).toBe('No answer submitted.');
  });
});
