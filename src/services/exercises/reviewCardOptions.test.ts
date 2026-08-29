import { describe, expect, it } from 'vitest';
import { buildChoiceOptions, MAX_CHOICE_OPTIONS } from './reviewCardOptions';

const pool = [
  { id: '1', translation: 'house' },
  { id: '2', translation: 'table' },
  { id: '3', translation: 'chair' },
  { id: '4', translation: 'window' },
  { id: '5', translation: 'door' },
];

describe('buildChoiceOptions', () => {
  it('always includes the correct answer', () => {
    const options = buildChoiceOptions(pool[0], pool);
    expect(options).toContain('house');
  });

  it('fills the card with real translations from the queue', () => {
    const options = buildChoiceOptions(pool[0], pool);
    expect(options).toHaveLength(MAX_CHOICE_OPTIONS);
    for (const option of options) {
      expect(pool.some((entry) => entry.translation === option)).toBe(true);
    }
  });

  it('never derives a distractor from the answer itself', () => {
    const options = buildChoiceOptions(pool[0], pool);
    const invented = options.filter(
      (option) => option !== 'house' && option.includes('house'),
    );
    expect(invented).toEqual([]);
  });

  it('is stable for the same item so grading does not reshuffle the session', () => {
    expect(buildChoiceOptions(pool[0], pool)).toEqual(buildChoiceOptions(pool[0], pool));
  });

  it('does not offer the same meaning twice', () => {
    const duplicates = [
      { id: '1', translation: 'house' },
      { id: '2', translation: 'House' },
      { id: '3', translation: ' house ' },
      { id: '4', translation: 'table' },
    ];
    const options = buildChoiceOptions(duplicates[0], duplicates);
    expect(options).toHaveLength(2);
  });

  it('skips the item itself even if it appears in the pool', () => {
    const options = buildChoiceOptions(pool[1], pool);
    expect(options.filter((option) => option === 'table')).toHaveLength(1);
  });

  it('returns too few options rather than inventing one', () => {
    // The caller falls back to a recall card; padding this out would put a
    // fabricated meaning in front of the learner.
    expect(buildChoiceOptions(pool[0], [pool[0]])).toHaveLength(1);
  });

  it('returns nothing when the item has no translation to test', () => {
    expect(buildChoiceOptions({ id: 'x', translation: '  ' }, pool)).toEqual([]);
  });

  it('ignores pool entries with no translation', () => {
    const sparse = [
      { id: '1', translation: 'house' },
      { id: '2', translation: '' },
      { id: '3', translation: '   ' },
    ];
    expect(buildChoiceOptions(sparse[0], sparse)).toEqual(['house']);
  });

  it('handles non-Latin translations, which the old rules could not', () => {
    const chinese = [
      { id: '1', translation: '房子' },
      { id: '2', translation: '桌子' },
      { id: '3', translation: '椅子' },
    ];
    const options = buildChoiceOptions(chinese[0], chinese);
    expect(options).toHaveLength(3);
    expect(options).toContain('房子');
  });
});
