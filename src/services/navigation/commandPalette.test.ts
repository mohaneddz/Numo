import { describe, expect, it } from 'vitest';
import {
  NAVIGATION_COMMANDS,
  PRACTICE_COMMANDS,
  groupCommands,
  searchCommands,
  vocabularyCommands,
} from './commandPalette';

const all = [
  ...PRACTICE_COMMANDS,
  ...NAVIGATION_COMMANDS,
  ...vocabularyCommands([
    { id: 'w1', term: 'ventana', translation: 'window' },
    { id: 'w2', term: 'puerta', translation: 'door' },
  ]),
];

describe('searchCommands', () => {
  it('shows what the app can do before anything is typed', () => {
    const results = searchCommands(all, '');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((command) => command.group !== 'Your words')).toBe(true);
  });

  it('ranks a label that starts with the query above one that merely contains it', () => {
    const results = searchCommands(all, 'review');
    expect(results[0].label.toLowerCase().startsWith('review')).toBe(true);
  });

  it('finds a page by a word that is not in its name', () => {
    const results = searchCommands(all, 'wpm');
    expect(results.some((command) => command.to === '/typing')).toBe(true);
  });

  it('finds a saved word by its translation', () => {
    const results = searchCommands(all, 'window');
    expect(results.some((command) => command.label === 'ventana')).toBe(true);
  });

  it('returns nothing for a query that matches nothing', () => {
    expect(searchCommands(all, 'zzzzqqq')).toEqual([]);
  });

  it('respects the result limit', () => {
    expect(searchCommands(all, 'a', 3)).toHaveLength(3);
  });

  it('ignores surrounding whitespace and case', () => {
    expect(searchCommands(all, '  SETTINGS  ')[0].to).toBe('/settings');
  });
});

describe('vocabularyCommands', () => {
  it('links each word to its notebook entry', () => {
    const [command] = vocabularyCommands([{ id: 'w1', term: 'casa', translation: 'house' }]);
    expect(command.to).toBe('/notebook/w1');
    expect(command.hint).toBe('house');
  });

  it('drops duplicates and blank terms', () => {
    const commands = vocabularyCommands([
      { id: 'a', term: 'casa', translation: 'house' },
      { id: 'b', term: 'Casa', translation: 'home' },
      { id: 'c', term: '  ', translation: 'nothing' },
    ]);
    expect(commands).toHaveLength(1);
  });
});

describe('groupCommands', () => {
  it('puts practice actions ahead of navigation', () => {
    const grouped = groupCommands(searchCommands(all, ''));
    expect(grouped[0][0]).toBe('Practice');
  });

  it('omits groups with no results', () => {
    const grouped = groupCommands(searchCommands(all, 'ventana'));
    expect(grouped.map(([group]) => group)).toEqual(['Your words']);
  });
});
