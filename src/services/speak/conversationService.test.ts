import { beforeEach, describe, expect, it, vi } from 'vitest';

const completeLanguageChat = vi.fn();
const completeWithEcho = vi.fn();

vi.mock('../aiProvider', () => ({
  completeLanguageChat: (...args: unknown[]) => completeLanguageChat(...args),
  completeWithEcho: (...args: unknown[]) => completeWithEcho(...args),
}));

const { glossLearnerLine, openingLine, takeConversationTurn, toChatHistory } = await import(
  './conversationService'
);

const language = { code: 'es', name: 'Spanish' };

const reply = {
  targetText: 'Muy bien, ¿y tú?',
  englishMeaning: 'Very well, and you?',
  words: [
    { text: 'Muy', pronunciation: 'mwee' },
    { text: 'bien', pronunciation: 'byen' },
  ],
};

beforeEach(() => {
  completeLanguageChat.mockReset();
  completeWithEcho.mockReset();
});

describe('toChatHistory', () => {
  it('maps speakers onto chat roles', () => {
    const history = toChatHistory([
      { id: '1', speaker: 'learner', targetText: 'Hola', englishMeaning: 'Hello', words: [], createdAt: 1 },
      { id: '2', speaker: 'companion', targetText: '¿Qué tal?', englishMeaning: 'How are you?', words: [], createdAt: 2 },
    ]);

    expect(history.map((message) => message.role)).toEqual(['user', 'assistant']);
  });

  it('sends only target-language text, not the English glosses', () => {
    const history = toChatHistory([
      { id: '1', speaker: 'learner', targetText: 'Hola', englishMeaning: 'Hello', words: [], createdAt: 1 },
    ]);
    expect(history[0].content).toBe('Hola');
    expect(JSON.stringify(history)).not.toContain('Hello');
  });
});

describe('glossLearnerLine', () => {
  it('extracts the meaning from a JSON reply', async () => {
    completeWithEcho.mockResolvedValue('{"englishMeaning":"Hello, how are you?"}');
    expect(await glossLearnerLine('Hola, ¿qué tal?', language)).toBe('Hello, how are you?');
  });

  it('tolerates the model wrapping its JSON in prose', async () => {
    completeWithEcho.mockResolvedValue('Sure! {"englishMeaning":"Good morning"} hope that helps');
    expect(await glossLearnerLine('Buenos días', language)).toBe('Good morning');
  });

  it('returns nothing rather than inventing a meaning when the call fails', async () => {
    completeWithEcho.mockRejectedValue(new Error('offline'));
    expect(await glossLearnerLine('Hola', language)).toBe('');
  });

  it('returns nothing when the reply carries no JSON', async () => {
    completeWithEcho.mockResolvedValue('I could not translate that.');
    expect(await glossLearnerLine('Hola', language)).toBe('');
  });

  it('does not call the model for an empty transcript', async () => {
    expect(await glossLearnerLine('   ', language)).toBe('');
    expect(completeWithEcho).not.toHaveBeenCalled();
  });
});

describe('takeConversationTurn', () => {
  it('returns both sides of the exchange', async () => {
    completeWithEcho.mockResolvedValue('{"englishMeaning":"Hello"}');
    completeLanguageChat.mockResolvedValue(reply);

    const turn = await takeConversationTurn({ transcript: 'Hola', history: [], language });

    expect(turn.learnerLine.targetText).toBe('Hola');
    expect(turn.learnerLine.englishMeaning).toBe('Hello');
    expect(turn.companionLine.targetText).toBe('Muy bien, ¿y tú?');
    expect(turn.companionLine.words).toHaveLength(2);
  });

  it('still returns the turn when the learner gloss fails', async () => {
    completeWithEcho.mockRejectedValue(new Error('rate limited'));
    completeLanguageChat.mockResolvedValue(reply);

    const turn = await takeConversationTurn({ transcript: 'Hola', history: [], language });

    expect(turn.learnerLine.targetText).toBe('Hola');
    expect(turn.learnerLine.englishMeaning).toBe('');
    expect(turn.companionLine.targetText).toBe('Muy bien, ¿y tú?');
  });

  it('fails the turn when the companion cannot reply', async () => {
    completeWithEcho.mockResolvedValue('{"englishMeaning":"Hello"}');
    completeLanguageChat.mockRejectedValue(new Error('no provider configured'));

    await expect(
      takeConversationTurn({ transcript: 'Hola', history: [], language }),
    ).rejects.toThrow('no provider configured');
  });

  it('passes prior turns to the model so the thread has context', async () => {
    completeWithEcho.mockResolvedValue('{"englishMeaning":"And you?"}');
    completeLanguageChat.mockResolvedValue(reply);

    await takeConversationTurn({
      transcript: '¿Y tú?',
      history: [
        { id: '1', speaker: 'learner', targetText: 'Hola', englishMeaning: 'Hello', words: [], createdAt: 1 },
        { id: '2', speaker: 'companion', targetText: '¿Qué tal?', englishMeaning: 'How are you?', words: [], createdAt: 2 },
      ],
      language,
    });

    const [messages] = completeLanguageChat.mock.calls[0];
    expect(messages).toHaveLength(3);
    expect(messages[2].content).toBe('¿Y tú?');
  });
});

describe('openingLine', () => {
  it('names the target language and carries no target text to speak', () => {
    const line = openingLine(language);
    expect(line.englishMeaning).toContain('Spanish');
    expect(line.targetText).toBe('');
  });
});
