/**
 * Command sources and matching for the Ctrl+K palette.
 *
 * The app has around twenty destinations behind a sidebar, a chord system, and
 * a handful of routes reachable only by typing a URL. This makes all of them,
 * plus the learner's own saved words, reachable by typing part of a name.
 *
 * Kept out of the component so the matching can be tested, and free of any
 * heavy data imports so opening the palette does not pull the stroke dataset
 * into the initial bundle.
 */

export type CommandGroup = 'Go to' | 'Practice' | 'Your words';

export interface Command {
  id: string;
  label: string;
  group: CommandGroup;
  to: string;
  /** Secondary line, e.g. a word's translation. */
  hint?: string;
  /** Extra terms that should match this command. */
  keywords?: string[];
}

export const NAVIGATION_COMMANDS: Command[] = [
  { id: 'nav-home', label: 'Home', group: 'Go to', to: '/', keywords: ['dashboard', 'start'] },
  { id: 'nav-learn', label: 'Learning', group: 'Go to', to: '/learn', keywords: ['lessons', 'course', 'roadmap'] },
  { id: 'nav-review', label: 'Review', group: 'Go to', to: '/review', keywords: ['srs', 'flashcards', 'due'] },
  { id: 'nav-immerse', label: 'Immersion', group: 'Go to', to: '/immerse', keywords: ['video', 'books', 'reading', 'listening'] },
  { id: 'nav-speak', label: 'Speaking', group: 'Go to', to: '/speak', keywords: ['pronunciation', 'microphone'] },
  { id: 'nav-write', label: 'Writing', group: 'Go to', to: '/write', keywords: ['essay', 'draft'] },
  { id: 'nav-notebook', label: 'Notebook', group: 'Go to', to: '/notebook', keywords: ['saved', 'vocabulary', 'words'] },
  { id: 'nav-insights', label: 'Insights', group: 'Go to', to: '/insights', keywords: ['stats', 'progress', 'charts'] },
  { id: 'nav-library', label: 'Reference', group: 'Go to', to: '/library', keywords: ['alphabet', 'characters', 'sounds', 'libraries'] },
  { id: 'nav-typing', label: 'Typing Trainer', group: 'Go to', to: '/typing', keywords: ['speed', 'wpm', 'keyboard'] },
  { id: 'nav-script', label: 'Script Practice', group: 'Go to', to: '/script-practice', keywords: ['handwriting', 'strokes', 'draw', 'kanji', 'hanzi'] },
  { id: 'nav-chat', label: 'Chat', group: 'Go to', to: '/chat', keywords: ['conversation', 'message'] },
  { id: 'nav-search', label: 'Web Search', group: 'Go to', to: '/web-search', keywords: ['lookup', 'find'] },
  { id: 'nav-profile', label: 'Profile', group: 'Go to', to: '/profile', keywords: ['account', 'languages'] },
  { id: 'nav-settings', label: 'Settings', group: 'Go to', to: '/settings', keywords: ['preferences', 'options', 'api key'] },
  { id: 'nav-notifications', label: 'Notifications', group: 'Go to', to: '/notifications', keywords: ['alerts'] },
];

export const PRACTICE_COMMANDS: Command[] = [
  { id: 'do-review', label: 'Start a review session', group: 'Practice', to: '/review/session?mode=due-now', keywords: ['due', 'srs'] },
  { id: 'do-weak', label: 'Review weak points', group: 'Practice', to: '/review/session?mode=weak', keywords: ['difficult', 'struggling'] },
  { id: 'do-cram', label: 'Cram session', group: 'Practice', to: '/review/session?mode=cram', keywords: ['fast', 'timed'] },
  { id: 'do-quick', label: 'Quick practice', group: 'Practice', to: '/practice/quick', keywords: ['drill'] },
  { id: 'do-lesson', label: 'Continue the lesson', group: 'Practice', to: '/learn/session', keywords: ['study', 'next'] },
  { id: 'do-talk', label: 'Start a live conversation', group: 'Practice', to: '/speak/conversation', keywords: ['speak', 'talk', 'voice'] },
  { id: 'do-type', label: 'Take a typing test', group: 'Practice', to: '/typing', keywords: ['speed', 'wpm'] },
  { id: 'do-draw', label: 'Practise writing characters', group: 'Practice', to: '/script-practice', keywords: ['strokes', 'draw'] },
];

export interface VocabularyEntry {
  id: string;
  term: string;
  translation: string;
}

/** Turns saved vocabulary into jump-to-notebook commands. */
export function vocabularyCommands(entries: readonly VocabularyEntry[]): Command[] {
  const seen = new Set<string>();
  const commands: Command[] = [];

  for (const entry of entries) {
    const term = entry.term?.trim();
    if (!term) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    commands.push({
      id: `word-${entry.id}`,
      label: term,
      group: 'Your words',
      to: `/notebook/${entry.id}`,
      hint: entry.translation?.trim() || undefined,
      keywords: entry.translation ? [entry.translation] : undefined,
    });
  }

  return commands;
}

/**
 * Scores a command against the query. Higher is better; 0 means no match.
 *
 * Ranked so that what the learner most likely meant comes first: a label that
 * starts with the query beats one that merely contains it, and both beat a
 * match found only in the keywords.
 */
function score(command: Command, query: string): number {
  const label = command.label.toLowerCase();
  const hint = command.hint?.toLowerCase() ?? '';

  if (label === query) return 100;
  if (label.startsWith(query)) return 80;

  const wordStart = label.split(/\s+/).some((word) => word.startsWith(query));
  if (wordStart) return 65;
  if (label.includes(query)) return 50;
  if (hint.startsWith(query)) return 40;
  if (hint.includes(query)) return 30;

  const keywords = command.keywords ?? [];
  if (keywords.some((keyword) => keyword.toLowerCase().startsWith(query))) return 25;
  if (keywords.some((keyword) => keyword.toLowerCase().includes(query))) return 15;

  return 0;
}

/**
 * Filters and ranks commands.
 *
 * An empty query returns the navigation and practice commands only: opening the
 * palette should show what the app can do, not dump the learner's entire
 * vocabulary at them.
 */
export function searchCommands(
  commands: readonly Command[],
  query: string,
  limit = 12,
): Command[] {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return commands.filter((command) => command.group !== 'Your words').slice(0, limit);
  }

  return commands
    .map((command) => ({ command, score: score(command, needle) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.command.label.localeCompare(b.command.label))
    .slice(0, limit)
    .map((entry) => entry.command);
}

/** Groups ranked results for display, preserving the ranked order within each. */
export function groupCommands(commands: readonly Command[]): Array<[CommandGroup, Command[]]> {
  const order: CommandGroup[] = ['Practice', 'Go to', 'Your words'];
  return order
    .map((group): [CommandGroup, Command[]] => [
      group,
      commands.filter((command) => command.group === group),
    ])
    .filter(([, items]) => items.length > 0);
}
