import { describe, expect, it } from 'vitest';
import {
  applyOutcome,
  aggregateProgress,
  createEmptyMastery,
  isDue,
  recognitionProductionGap,
  selectDueSkills,
  selectUnseenSkills,
  selectWeakSkills,
  summarizeCategories,
  WEAK_THRESHOLD,
  type SkillMastery,
  type SkillMasteryMap,
  type SkillOutcome,
} from './masteryStore';
import { getSkill, type Skill } from './skillGraph';

function skill(id: string): Skill {
  const found = getSkill(id);
  if (!found) throw new Error(`missing test skill ${id}`);
  return found;
}

function drill(skillId: string, outcomes: Array<Partial<SkillOutcome>>): SkillMastery {
  let record = createEmptyMastery(skillId);
  for (const outcome of outcomes) {
    record = applyOutcome(record, {
      skillId,
      correct: outcome.correct ?? true,
      score: outcome.score ?? (outcome.correct === false ? 0 : 100),
      modality: outcome.modality ?? 'recognition',
      latencyMs: outcome.latencyMs ?? 4000,
      hintUsed: outcome.hintUsed,
      skipped: outcome.skipped,
    });
  }
  return record;
}

describe('applyOutcome', () => {
  it('raises mastery on repeated success and lowers it on failure', () => {
    const strong = drill('pronouns', Array.from({ length: 5 }, () => ({ correct: true })));
    expect(strong.mastery).toBeGreaterThan(WEAK_THRESHOLD);
    expect(strong.streak).toBe(5);

    const shaken = applyOutcome(strong, {
      skillId: 'pronouns',
      correct: false,
      score: 0,
      modality: 'recognition',
    });
    expect(shaken.mastery).toBeLessThan(strong.mastery);
    expect(shaken.streak).toBe(0);
    expect(shaken.lapses).toBe(1);
  });

  it('does not let a single miss erase established mastery', () => {
    const strong = drill('pronouns', Array.from({ length: 12 }, () => ({ correct: true })));
    const shaken = applyOutcome(strong, {
      skillId: 'pronouns',
      correct: false,
      score: 0,
      modality: 'recognition',
    });
    expect(shaken.mastery).toBeGreaterThan(strong.mastery * 0.75);
  });

  it('tracks recognition and production separately', () => {
    const record = drill('pronouns', [
      { correct: true, modality: 'recognition' },
      { correct: true, modality: 'recognition' },
      { correct: false, score: 10, modality: 'production' },
    ]);
    expect(record.recognition).toBeGreaterThan(record.production);
  });

  it('schedules an immediate revisit after a miss and spaces out after success', () => {
    const missed = drill('pronouns', [{ correct: false, score: 0 }]);
    expect(missed.intervalDays).toBe(0);

    const learned = drill('pronouns', Array.from({ length: 4 }, () => ({ correct: true })));
    expect(learned.intervalDays).toBeGreaterThan(1);
  });

  it('counts a skip as weak evidence rather than a correct answer', () => {
    const skipped = drill('pronouns', [{ skipped: true, correct: false, score: 0 }]);
    expect(skipped.incorrect).toBe(1);
    expect(skipped.streak).toBe(0);
    expect(skipped.mastery).toBeLessThan(WEAK_THRESHOLD);
  });

  it('shortens the interval when the answer needed a hint', () => {
    const unaided = drill('pronouns', [{ correct: true }, { correct: true }, { correct: true }]);
    const hinted = drill('pronouns', [
      { correct: true },
      { correct: true },
      { correct: true, hintUsed: true },
    ]);
    expect(hinted.intervalDays).toBeLessThan(unaided.intervalDays);
  });
});

describe('learner-model queries', () => {
  const candidates = ['pronouns', 'question_words', 'numbers', 'past_reference'].map(skill);

  function buildMap(entries: Record<string, SkillMastery>): SkillMasteryMap {
    return entries;
  }

  it('ranks weak skills above solid ones and ignores unseen ones', () => {
    const map = buildMap({
      pronouns: drill('pronouns', Array.from({ length: 6 }, () => ({ correct: true }))),
      question_words: drill('question_words', [
        { correct: false, score: 0 },
        { correct: false, score: 0 },
      ]),
    });

    const weak = selectWeakSkills(map, candidates);
    expect(weak[0].skill.id).toBe('question_words');
    expect(weak.some((entry) => entry.skill.id === 'numbers')).toBe(false);
  });

  it('treats a never-attempted skill as unseen, not as due', () => {
    const map = buildMap({});
    expect(selectDueSkills(map, candidates)).toHaveLength(0);
    expect(selectUnseenSkills(map, candidates)).toHaveLength(candidates.length);
    expect(isDue(createEmptyMastery('pronouns'))).toBe(false);
  });

  it('returns skills whose review time has passed', () => {
    const overdue = {
      ...drill('pronouns', [{ correct: true }]),
      dueAt: new Date(Date.now() - 86_400_000).toISOString(),
    };
    const map = buildMap({ pronouns: overdue });
    expect(selectDueSkills(map, candidates).map((entry) => entry.skill.id)).toEqual(['pronouns']);
  });

  it('summarizes only categories that were actually practised', () => {
    const map = buildMap({
      pronouns: drill('pronouns', [{ correct: true }, { correct: true }]),
    });
    const summary = summarizeCategories(map, candidates);
    expect(summary).toHaveLength(1);
    expect(summary[0].category).toBe(skill('pronouns').category);
    expect(summary[0].skillsTracked).toBe(1);
  });

  it('reports a positive recognition/production gap when production lags', () => {
    const map = buildMap({
      pronouns: drill('pronouns', [
        { correct: true, modality: 'recognition' },
        { correct: true, modality: 'recognition' },
        { correct: false, score: 0, modality: 'production' },
      ]),
    });
    expect(recognitionProductionGap(map, ['pronouns'])).toBeGreaterThan(0);
  });

  it('aggregates progress across a skill set', () => {
    const map = buildMap({
      pronouns: drill('pronouns', Array.from({ length: 10 }, () => ({ correct: true }))),
      question_words: drill('question_words', [{ correct: false, score: 0 }]),
    });
    const progress = aggregateProgress(map, candidates);
    expect(progress.totalSkills).toBe(4);
    expect(progress.skillsStarted).toBe(2);
    expect(progress.skillsMastered).toBe(1);
  });
});
