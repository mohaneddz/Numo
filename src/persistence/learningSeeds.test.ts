import { describe, expect, it } from 'vitest';
import { seedLearningPlan } from './learningSeeds';
import type { PersistenceContext } from './types';

interface UnitRow {
  id: string;
  unit_key: string;
  language_id: string;
}

/**
 * An in-memory stand-in for the tables the seeder touches. Only unit identity
 * matters here — whether a second run destroys and recreates the tree.
 */
function createContext() {
  const units: UnitRow[] = [];
  const inserts = { units: 0, lessons: 0, objectives: 0, templates: 0 };
  const deletes: string[] = [];

  const context = {
    db: {
      async execute(query: string, bind: unknown[] = []) {
        if (query.includes('DELETE FROM')) {
          deletes.push(query);
          return undefined;
        }
        if (query.includes('INSERT INTO learning_units')) {
          inserts.units += 1;
          units.push({
            id: String(bind[0]),
            language_id: String(bind[1]),
            unit_key: String(bind[2]),
          });
        }
        if (query.includes('INSERT INTO learning_lessons')) inserts.lessons += 1;
        if (query.includes('INSERT INTO lesson_objectives')) inserts.objectives += 1;
        if (query.includes('INSERT INTO lesson_task_templates')) inserts.templates += 1;
        return undefined;
      },
      async select<T>(query: string, bind: unknown[] = []): Promise<T[]> {
        if (query.includes('SELECT unit_key FROM learning_units')) {
          return units.filter((unit) => unit.language_id === String(bind[0])) as T[];
        }
        return [] as T[];
      },
    },
    repositories: {
      languages: {
        async getLanguageByCode(code: string) {
          // Only one seeded language, so the counts in these tests stay legible.
          return code === 'es' ? { id: 'lang-es', code } : null;
        },
      },
    },
  } as unknown as PersistenceContext;

  return { context, units, inserts, deletes };
}

describe('seedLearningPlan', () => {
  it('seeds the starter units on a first run', async () => {
    const { context, inserts } = createContext();
    await seedLearningPlan(context);

    expect(inserts.units).toBeGreaterThan(0);
    expect(inserts.templates).toBeGreaterThan(0);
  });

  it('inserts nothing on a second run', async () => {
    const { context, units, inserts } = createContext();
    await seedLearningPlan(context);
    const afterFirst = { ...inserts };
    const idsAfterFirst = units.map((unit) => unit.id);

    await seedLearningPlan(context);

    expect(inserts.units).toBe(afterFirst.units);
    expect(inserts.templates).toBe(afterFirst.templates);
    expect(units.map((unit) => unit.id)).toEqual(idsAfterFirst);
  });

  it('never deletes the plan it is seeding', async () => {
    // Rebuilding the tree with fresh ids on every launch orphaned every
    // task attempt older than the current session.
    const { context, deletes } = createContext();
    await seedLearningPlan(context);
    await seedLearningPlan(context);

    expect(deletes).toEqual([]);
  });

  it('fills in a unit that is missing without touching the others', async () => {
    const { context, units, inserts } = createContext();
    await seedLearningPlan(context);

    const removed = units.pop()!;
    const before = inserts.units;
    await seedLearningPlan(context);

    expect(inserts.units).toBe(before + 1);
    expect(units.some((unit) => unit.unit_key === removed.unit_key)).toBe(true);
  });
});
