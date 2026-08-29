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
