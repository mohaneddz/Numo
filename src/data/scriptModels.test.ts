import { describe, expect, it } from 'vitest';
import {
  SCRIPT_CANVAS_SIZE,
  findScriptModel,
  getScriptModels,
  listScriptCharacters,
  scriptLanguageIsSupported,
} from './scriptModels';

describe('script model coverage', () => {
  it('covers far more than the three characters it started with', () => {
    expect(getScriptModels('zh').length).toBeGreaterThan(400);
    expect(getScriptModels('ja').length).toBeGreaterThan(200);
  });

  it('includes the full kana syllabaries', () => {
    const kinds = listScriptCharacters('ja');
    expect(kinds.filter((entry) => entry.kind === 'hiragana')).toHaveLength(46);
    expect(kinds.filter((entry) => entry.kind === 'katakana')).toHaveLength(46);
  });

  it('reports support from the data itself, not a hardcoded list', () => {
    expect(scriptLanguageIsSupported('zh')).toBe(true);
    expect(scriptLanguageIsSupported('ja')).toBe(true);
    expect(scriptLanguageIsSupported('es')).toBe(false);
  });
});

describe('stroke data correctness', () => {
  it('records the real stroke count for known characters', () => {
    // Stroke counts these characters are actually written with.
    const expected: Array<[string, string, number]> = [
      ['zh', '一', 1],
      ['zh', '二', 2],
      ['zh', '口', 3],
      ['zh', '你', 7],
      ['ja', 'あ', 3],
      ['ja', 'カ', 2],
      ['ja', 'ん', 1],
    ];

    for (const [language, character, strokes] of expected) {
      const model = findScriptModel(language, character);
      expect(model?.character, `${character} should be present`).toBe(character);
      expect(model?.strokes.length, `${character} stroke count`).toBe(strokes);
    }
  });

  it('scales every point inside the canvas', () => {
    for (const model of getScriptModels('zh')) {
      for (const stroke of model.strokes) {
        for (const point of stroke.points) {
          expect(point.x).toBeGreaterThanOrEqual(0);
          expect(point.x).toBeLessThanOrEqual(SCRIPT_CANVAS_SIZE);
          expect(point.y).toBeGreaterThanOrEqual(0);
          expect(point.y).toBeLessThanOrEqual(SCRIPT_CANVAS_SIZE);
        }
      }
    }
  });

  it('numbers strokes in writing order with no gaps', () => {
    for (const model of getScriptModels('ja').slice(0, 60)) {
      model.strokes.forEach((stroke, index) => {
        expect(stroke.index).toBe(index + 1);
        expect(stroke.points.length).toBeGreaterThanOrEqual(2);
      });
    }
  });

  it('writes 一 as a single horizontal stroke across the middle', () => {
    const model = findScriptModel('zh', '一');
    const points = model!.strokes[0].points;
    const first = points[0];
    const last = points[points.length - 1];

    expect(last.x - first.x).toBeGreaterThan(SCRIPT_CANVAS_SIZE * 0.5);
    expect(Math.abs(last.y - first.y)).toBeLessThan(SCRIPT_CANVAS_SIZE * 0.1);
    expect(first.y).toBeGreaterThan(SCRIPT_CANVAS_SIZE * 0.3);
    expect(first.y).toBeLessThan(SCRIPT_CANVAS_SIZE * 0.7);
  });

  it('scales to a requested size', () => {
    const small = findScriptModel('zh', '一', 160);
    const large = findScriptModel('zh', '一', 640);
    expect(large!.strokes[0].points[0].x).toBeGreaterThan(small!.strokes[0].points[0].x);
  });

  it('gives kana a romaji reading and leaves Han readings blank rather than inventing them', () => {
    expect(findScriptModel('ja', 'あ')?.reading).toBe('a');
    expect(findScriptModel('ja', 'ン')?.reading).toBe('n');
    expect(findScriptModel('zh', '你')?.reading).toBeUndefined();
  });
});

describe('stroke geometry matches how the characters are actually written', () => {
  const strokeEnds = (language: string, character: string) =>
    findScriptModel(language, character)!.strokes.map((stroke) => ({
      from: stroke.points[0],
      to: stroke.points[stroke.points.length - 1],
    }));

  const isHorizontal = (stroke: { from: { x: number; y: number }; to: { x: number; y: number } }) =>
    Math.abs(stroke.to.x - stroke.from.x) > Math.abs(stroke.to.y - stroke.from.y);

  it('writes 三 as three horizontal strokes, ordered top to bottom', () => {
    const strokes = strokeEnds('zh', '三');
    expect(strokes).toHaveLength(3);
    expect(strokes.every(isHorizontal)).toBe(true);
    expect(strokes[0].from.y).toBeLessThan(strokes[1].from.y);
    expect(strokes[1].from.y).toBeLessThan(strokes[2].from.y);
  });

  it('writes 十 as the horizontal stroke before the vertical one', () => {
    const [first, second] = strokeEnds('zh', '十');
    expect(isHorizontal(first)).toBe(true);
    expect(isHorizontal(second)).toBe(false);
  });

  it('writes 人 as a left-falling stroke then a right-falling one', () => {
    const [left, right] = strokeEnds('zh', '人');
    expect(left.to.x).toBeLessThan(left.from.x);
    expect(right.to.x).toBeGreaterThan(right.from.x);
    // Both sweep downward from near the apex.
    expect(left.to.y).toBeGreaterThan(left.from.y);
    expect(right.to.y).toBeGreaterThan(right.from.y);
  });

  it('orients characters upright rather than flipped', () => {
    // A sign error in the source's y-up-to-y-down conversion would put 二's
    // second stroke above its first, and nothing else would catch it.
    const [top, bottom] = strokeEnds('zh', '二');
    expect(top.from.y).toBeLessThan(bottom.from.y);
  });
});

describe('coverage of the characters the app actually teaches', () => {
  /**
   * Every Han character the app puts in front of a learner needs a stroke
   * model. Without one it cannot be practised, and the reference hub shows it
   * with no route through to writing practice.
   *
   * Reads the source tree so adding a character to a word list, a speaking
   * prompt or a curriculum seed without regenerating the models fails here
   * rather than silently degrading.
   */
  it('has a model for every Han character used in the app content', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const { join, resolve } = await import('node:path');

    const root = resolve(__dirname, '..');
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return entry.name === 'scriptModels' ? [] : walk(path);
        return /\.(ts|tsx|json)$/.test(entry.name) && !entry.name.includes('.test.')
          ? [path]
          : [];
      });

    const modelled = new Set([
      ...getScriptModels('zh').map((model) => model.character),
      ...getScriptModels('ja').map((model) => model.character),
    ]);

    const missing = new Map<string, string>();
    for (const file of walk(root)) {
      // Script-detection regexes carry Han characters as range bounds, which
      // are not content and correctly have no model.
      const source = readFileSync(file, 'utf8').replace(/[\u4e00-\u9fff]-[\u4e00-\u9fff]/g, '');
      for (const character of source.match(/[\u4e00-\u9fff]/g) ?? []) {
        if (!modelled.has(character) && !missing.has(character)) missing.set(character, file);
      }
    }

    expect(
      [...missing].map(([character, file]) => `${character} (${file})`),
      'Characters used in app content with no stroke model. Add them to scripts/characterSets.mjs and run: pnpm seed:script-models',
    ).toEqual([]);
  });
});
