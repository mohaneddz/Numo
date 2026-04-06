import { describe, expect, it } from 'vitest';
import { evaluateLearnTaskAnswer } from './learningPlanService';

describe('evaluateLearnTaskAnswer', () => {
  it('returns perfect score for exact normalized match', () => {
    const result = evaluateLearnTaskAnswer('Bonjour, je m appelle Lea', 'bonjour je m appelle lea');
    expect(result.isCorrect).toBe(true);
    expect(result.score).toBe(100);
  });

  it('returns partial accepted score for close substring answer', () => {
    const result = evaluateLearnTaskAnswer('I would like a table for two', 'table for two');
    expect(result.isCorrect).toBe(true);
    expect(result.score).toBe(78);
  });

  it('returns incorrect when answer is unrelated', () => {
    const result = evaluateLearnTaskAnswer('Good morning', 'See you later');
    expect(result.isCorrect).toBe(false);
    expect(result.score).toBe(25);
  });
});
