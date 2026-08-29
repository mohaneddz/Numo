/**
 * Turn handling for live spoken conversation practice.
 *
 * A turn is two independent pieces of work: understanding what the learner
 * said, and answering it. They are kept separate on purpose — if the gloss of
 * the learner's own line fails, their transcript and the companion's reply
 * should still appear, rather than the whole turn collapsing.
 */
import { completeLanguageChat, completeWithEcho } from '../aiProvider';
import type { ChatMessage } from '../../types/ai';

export interface SubtitleWord {
  text: string;
  pronunciation: string;
}

export interface ConversationLine {
  id: string;
  speaker: 'learner' | 'companion';
  /** What was said, in the target language. */
  targetText: string;
  /** English meaning, shown as the second subtitle row. */
  englishMeaning: string;
  /** Per-word pronunciation, when the provider supplied it. */
  words: SubtitleWord[];
  createdAt: number;
}

export interface ConversationTurn {
  learnerLine: ConversationLine;
  companionLine: ConversationLine;
}

function makeId(speaker: string): string {
  return `${speaker}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Builds the running history handed to the model.
 *
 * Only the target-language text goes in: including the English glosses taught
 * the model to reply bilingually, which is not what a speaking drill wants.
 */
export function toChatHistory(lines: readonly ConversationLine[]): ChatMessage[] {
  return lines.map((line) => ({
    id: line.id,
    role: line.speaker === 'learner' ? ('user' as const) : ('assistant' as const),
    content: line.targetText,
    createdAt: line.createdAt,
  }));
}

/**
 * Translates the learner's own transcript so the subtitle can show what they
 * actually said, not just how it sounded.
 *
 * Returns an empty string on failure; the caller shows the transcript alone
 * rather than inventing a meaning for it.
 */
export async function glossLearnerLine(
  transcript: string,
  language: { code: string; name: string },
): Promise<string> {
  if (!transcript.trim()) return '';

  try {
    const raw = await completeWithEcho(
      [
        {
          id: makeId('gloss'),
          role: 'user',
          content: [
            `A learner of ${language.name} (${language.code}) said: "${transcript}"`,
            'Give the natural English meaning of that line.',
            'Return only one JSON object: {"englishMeaning":"..."}',
            'Do not correct or improve the line, translate it as said.',
          ].join(' '),
          createdAt: Date.now(),
        },
      ],
      'analyst',
    );

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return '';
    const parsed = JSON.parse(match[0]) as { englishMeaning?: unknown };
    return typeof parsed.englishMeaning === 'string' ? parsed.englishMeaning.trim() : '';
  } catch {
    return '';
  }
}

export interface TakeTurnInput {
  transcript: string;
  history: readonly ConversationLine[];
  language: { code: string; name: string };
}

/**
 * Runs one full exchange: the learner's line, then the companion's reply.
 *
 * Throws only when the companion's reply fails, since a turn with no reply is
 * not a conversation. A failed gloss is degraded to an empty meaning instead.
 */
export async function takeConversationTurn({
  transcript,
  history,
  language,
}: TakeTurnInput): Promise<ConversationTurn> {
  const learnerLine: ConversationLine = {
    id: makeId('learner'),
    speaker: 'learner',
    targetText: transcript,
    englishMeaning: '',
    words: [],
    createdAt: Date.now(),
  };

  const [gloss, reply] = await Promise.all([
    glossLearnerLine(transcript, language),
    completeLanguageChat(
      [...toChatHistory(history), ...toChatHistory([learnerLine])],
      language,
      'chatty',
    ),
  ]);

  learnerLine.englishMeaning = gloss;

  return {
    learnerLine,
    companionLine: {
      id: makeId('companion'),
      speaker: 'companion',
      targetText: reply.targetText,
      englishMeaning: reply.englishMeaning,
      words: reply.words,
      createdAt: Date.now(),
    },
  };
}

/**
 * The companion's opening line, so a session does not start on silence waiting
 * for the learner to think of something.
 */
export function openingLine(language: { code: string; name: string }): ConversationLine {
  return {
    id: makeId('companion'),
    speaker: 'companion',
    targetText: '',
    englishMeaning: `Say anything in ${language.name} to start. Your companion answers in ${language.name}, with the meaning shown underneath.`,
    words: [],
    createdAt: Date.now(),
  };
}
