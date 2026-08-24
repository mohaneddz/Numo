import { describe, expect, it } from 'vitest';
import { parseLanguageLearningReply } from './aiProvider';

describe('parseLanguageLearningReply', () => {
  it('parses a fenced three-part language reply', () => {
    const reply = parseLanguageLearningReply(`\`\`\`json
      {
        "targetText": "Hola, ¿cómo estás?",
        "words": [
          { "text": "Hola,", "pronunciation": "OH-lah" },
          { "text": "¿cómo", "pronunciation": "KOH-moh" },
          { "text": "estás?", "pronunciation": "eh-STAHS" }
        ],
        "englishMeaning": "Hello, how are you?"
      }
    \`\`\``);

    expect(reply.targetText).toBe('Hola, ¿cómo estás?');
    expect(reply.words).toHaveLength(3);
    expect(reply.words[1]).toEqual({
      text: '¿cómo',
      pronunciation: 'KOH-moh',
    });
    expect(reply.englishMeaning).toBe('Hello, how are you?');
  });

  it('rejects a real word without pronunciation', () => {
    expect(() =>
      parseLanguageLearningReply(JSON.stringify({
        targetText: 'Guten Tag',
        words: [
          { text: 'Guten', pronunciation: 'GOO-ten' },
          { text: 'Tag', pronunciation: '' },
        ],
        englishMeaning: 'Good day',
      })),
    ).toThrow('incomplete language-learning response');
  });

  it('allows punctuation-only tokens without pronunciation', () => {
    const reply = parseLanguageLearningReply(JSON.stringify({
      targetText: '你好！',
      words: [
        { text: '你好', pronunciation: 'nǐ hǎo' },
        { text: '！', pronunciation: '' },
      ],
      englishMeaning: 'Hello!',
    }));

    expect(reply.words[1]).toEqual({ text: '！', pronunciation: '' });
  });
});
