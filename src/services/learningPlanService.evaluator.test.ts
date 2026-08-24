import { describe, expect, it, vi } from 'vitest';

vi.mock('./aiProvider', () => ({
  completeWithEcho: vi.fn().mockRejectedValue(new Error('offline')),
}));

import { evaluateLearnTaskSubmission } from './learningPlanService';

describe('evaluateLearnTaskSubmission', () => {
  it('grades deterministic match tasks from structured mapping', async () => {
    const result = await evaluateLearnTaskSubmission({
      taskType: 'match_word_meaning',
      expectedAnswer: 'unused',
      learnerAnswer: 'unused',
      gradingMode: 'deterministic',
      payload: {
        pairs: [
          { left: 'hola', right: 'hello' },
          { left: 'adios', right: 'bye' },
        ],
      },
      structuredResponse: {
        mapping: {
          hola: 'hello',
          adios: 'bye',
        },
      },
    });
    expect(result.isCorrect).toBe(true);
    expect(result.score).toBe(100);
  });

  it('grades deterministic option tasks against correct option', async () => {
    const result = await evaluateLearnTaskSubmission({
      taskType: 'choose_response',
      expectedAnswer: 'B',
      learnerAnswer: 'A',
      gradingMode: 'deterministic',
      payload: {
        options: ['A', 'B', 'C'],
        correctOption: 'B',
      },
      structuredResponse: {
        selectedOption: 'A',
      },
    });
    expect(result.isCorrect).toBe(false);
  });

  it('falls back to deterministic scoring when hybrid AI grading fails', async () => {
    const result = await evaluateLearnTaskSubmission({
      taskType: 'complete_dialogue',
      expectedAnswer: 'I would like a table for two',
      learnerAnswer: 'I would like a table for two',
      gradingMode: 'hybrid',
      payload: {},
      structuredResponse: {},
    });
    expect(result.isCorrect).toBe(true);
    expect(result.score).toBe(100);
  });
});
