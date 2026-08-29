import { describe, expect, it } from 'vitest';
import { buildTruthStatement, type TruthCandidate } from './truthStatementService';

const pool: TruthCandidate[] = [
  { id: '1', term: '猫', translation: 'cat' },
  { id: '2', term: '狗', translation: 'dog' },
  { id: '3', term: '鸟', translation: 'bird' },
  { id: '4', term: '鱼', translation: 'fish' },
];

describe('buildTruthStatement', () => {
  it('produces both true and false cards across a queue', () => {
    const answers = pool.map((item) => buildTruthStatement(item, pool, `tf-${item.id}`).correctBool);
    expect(answers).toContain(true);
    expect(answers).toContain(false);
  });

  it('is stable for the same seed so the answer cannot flip between renders', () => {
    const first = buildTruthStatement(pool[0], pool, 'tf-1');
    const second = buildTruthStatement(pool[0], pool, 'tf-1');
    expect(second).toEqual(first);
  });

  it('quotes a different item translation when the statement is false', () => {
    const falseCard = pool
      .map((item) => buildTruthStatement(item, pool, `tf-${item.id}`))
      .find((card) => !card.correctBool);

    expect(falseCard).toBeDefined();
    expect(falseCard!.statement).not.toContain(`"${falseCard!.actualMeaning}"`);
    expect(pool.some((item) => falseCard!.statement.includes(`"${item.translation}"`))).toBe(true);
  });

  it('always reports the real meaning even on a false statement', () => {
    const card = buildTruthStatement(pool[0], pool, 'tf-1');
    expect(card.actualMeaning).toBe('cat');
  });

  it('falls back to a true statement when no decoy is available', () => {
    const solo = buildTruthStatement(pool[0], [pool[0]], 'tf-1');
    expect(solo.correctBool).toBe(true);
    expect(solo.statement).toBe('"猫" means "cat".');
  });

  it('does not treat a same-meaning item as a decoy', () => {
    const duplicates: TruthCandidate[] = [
      { id: '1', term: '猫', translation: 'cat' },
      { id: '2', term: '貓', translation: 'Cat' },
    ];
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const card = buildTruthStatement(duplicates[0], duplicates, seed);
      expect(card.correctBool).toBe(true);
    }
  });
});
