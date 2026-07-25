/**
 * Progressive hints derived from the task itself.
 *
 * Every exercise previously rendered `<HintSection hints={payload.distractors} />`,
 * which showed the learner the list of *wrong answers* under a lightbulb labelled
 * "Hints". For a multiple-choice task that is the set of options minus the correct
 * one, so opening the hint solved the exercise by elimination. Free-text exercises
 * additionally printed "Expected pattern: <answer>" directly under the input.
 *
 * A hint should reduce the search space without removing the thinking. These are
 * graded: a nudge, then a structural clue, then a partial reveal.
 */

import { isSpacelessScript, stripTargetMarkers } from '../../utils/textNormalize';

export type HintLevel = 1 | 2 | 3;

export interface Hint {
  level: HintLevel;
  label: string;
  text: string;
}

export interface BuildHintsInput {
  expectedAnswer: string;
  languageCode?: string;
  /** One-line explanation of the point being taught, when the content provides it. */
  teachingNote?: string;
  /** English meaning of the target text. */
  translation?: string;
  /** Romanized reading for non-Latin scripts. */
  romanization?: string;
}

/** Masks a word, revealing the opening character(s) and the shape of the rest. */
function maskWord(word: string, revealCount: number): string {
  const characters = [...word];
  if (characters.length <= revealCount) return word;
  return characters
    .map((character, index) => {
      if (index < revealCount) return character;
      // Keep punctuation visible; it is structure, not answer.
      return /\p{L}|\p{N}/u.test(character) ? '·' : character;
    })
    .join('');
}

function maskAnswer(answer: string, languageCode: string | undefined, reveal: 'first' | 'half'): string {
  if (isSpacelessScript(languageCode)) {
    const characters = [...answer];
    const revealCount = reveal === 'first' ? 1 : Math.ceil(characters.length / 2);
    return maskWord(answer, revealCount);
  }

  return answer
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      const revealCount = reveal === 'first' ? 1 : Math.max(1, Math.ceil([...part].length / 2));
      return maskWord(part, revealCount);
    })
    .join('');
}

function describeShape(answer: string, languageCode: string | undefined): string {
  const clean = answer.trim();
  if (isSpacelessScript(languageCode)) {
    return `${[...clean].length} characters.`;
  }
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) return `One word, ${[...words[0]].length} letters.`;
  return `${words.length} words.`;
}

/**
 * Builds the hint ladder for a task. Levels are revealed one at a time, and each
 * one the learner opens is recorded against the skill, so leaning on hints shortens
 * that skill's review interval instead of silently inflating its mastery.
 */
export function buildHints(input: BuildHintsInput): Hint[] {
  const answer = stripTargetMarkers(input.expectedAnswer ?? '').trim();
  if (!answer) return [];

  const hints: Hint[] = [];

  // Level 1 — point at the idea without touching the form.
  const nudge = input.teachingNote?.trim() || (input.translation?.trim() ? `It means "${input.translation.trim()}".` : '');
  if (nudge) {
    hints.push({ level: 1, label: 'Nudge', text: nudge });
  }

  // Level 2 — structure: how long, and how it sounds if the script needs it.
  const shape = describeShape(answer, input.languageCode);
  const reading = input.romanization?.trim();
  hints.push({
    level: hints.length === 0 ? 1 : 2,
    label: 'Shape',
    text: reading ? `${shape} It reads as "${reading}".` : shape,
  } as Hint);

  // Level 3 — partial reveal: enough to unblock, not enough to skip the recall.
  hints.push({
    level: 3,
    label: 'Almost there',
    text: maskAnswer(answer, input.languageCode, 'first'),
  });

  return hints.map((hint, index) => ({ ...hint, level: (index + 1) as HintLevel }));
}

/**
 * Cost applied to the grading score for each hint level opened. Using a hint is
 * allowed and useful; it just should not read as unaided mastery.
 */
export function hintPenalty(levelsOpened: number): number {
  if (levelsOpened <= 0) return 0;
  return Math.min(30, levelsOpened * 12);
}
