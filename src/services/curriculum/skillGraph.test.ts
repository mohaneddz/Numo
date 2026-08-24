import { describe, expect, it } from 'vitest';
import defaultThemes from '../../data/main/defaultThemes.json';
import {
  getPriorSkills,
  getSkill,
  getTheme,
  getThemeSkills,
  listSkills,
  requiresScriptSkills,
  THEMES,
} from './skillGraph';

describe('skillGraph', () => {
  it('classifies every focus token in the theme data', () => {
    // buildGraph throws on an unclassified token, so reaching here means all 30
    // themes resolved. Assert the shape explicitly so a theme-file edit is caught.
    expect(THEMES).toHaveLength(defaultThemes.units.length);
    for (const theme of THEMES) {
      expect(theme.skillIds.length).toBeGreaterThan(0);
      for (const skillId of theme.skillIds) {
        expect(getSkill(skillId)).not.toBeNull();
      }
    }
  });

  it('shares a skill across every theme that teaches it', () => {
    const problemReporting = getSkill('problem_reporting');
    expect(problemReporting?.themeIds).toEqual(
      expect.arrayContaining(['technology_digital_life', 'problems_emergencies']),
    );
  });

  it('assigns rising difficulty as themes progress', () => {
    const first = getSkill('pronunciation_basics');
    const last = getSkill('natural_flow');
    expect(first?.difficulty).toBeLessThan(last?.difficulty ?? 0);
  });

  it('adds script skills only for non-Latin languages', () => {
    expect(requiresScriptSkills('ja')).toBe(true);
    expect(requiresScriptSkills('es')).toBe(false);

    const jaSkills = getThemeSkills('starter_survival', 'ja');
    const esSkills = getThemeSkills('starter_survival', 'es');
    expect(jaSkills.some((skill) => skill.kind === 'script')).toBe(true);
    expect(esSkills.some((skill) => skill.kind === 'script')).toBe(false);
  });

  it('reports prior skills as everything from earlier themes only', () => {
    const theme = getTheme('food_drink');
    expect(theme?.order).toBe(8);

    const prior = getPriorSkills('food_drink', 'es');
    expect(prior.every((skill) => skill.introducedAtTheme < 8)).toBe(true);
    expect(prior.some((skill) => skill.id === 'self_introduction')).toBe(true);
    expect(prior.some((skill) => skill.id === 'preferences')).toBe(false);
  });

  it('gives the first theme no prior skills', () => {
    expect(getPriorSkills('starter_survival', 'es')).toHaveLength(0);
  });

  it('assigns every skill a kind and a category', () => {
    for (const skill of listSkills()) {
      expect(skill.kind).toBeTruthy();
      expect(skill.category).toBeTruthy();
    }
  });
});
