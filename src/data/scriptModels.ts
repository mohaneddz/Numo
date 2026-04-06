import type { ScriptStrokeModel } from '../types/scriptPractice';

const zhNiModel: ScriptStrokeModel = {
  key: 'zh:\u4f60',
  character: '\u4f60',
  reading: 'ni3',
  meaning: 'you',
  strokes: [
    { index: 1, component: '\u4ebb', directionHint: 'top to bottom', points: [{ x: 88, y: 34, t: 0 }, { x: 72, y: 94, t: 1 }] },
    { index: 2, component: '\u4ebb', directionHint: 'left to right', points: [{ x: 72, y: 64, t: 0 }, { x: 108, y: 64, t: 1 }] },
    { index: 3, component: '\u5c14', directionHint: 'top to bottom', points: [{ x: 170, y: 36, t: 0 }, { x: 162, y: 94, t: 1 }] },
    { index: 4, component: '\u5c14', directionHint: 'left sweep', points: [{ x: 170, y: 58, t: 0 }, { x: 138, y: 98, t: 1 }] },
    { index: 5, component: '\u5c14', directionHint: 'right sweep', points: [{ x: 170, y: 62, t: 0 }, { x: 196, y: 104, t: 1 }] },
  ],
};

const jaAModel: ScriptStrokeModel = {
  key: 'ja:\u3042',
  character: '\u3042',
  reading: 'a',
  meaning: 'hiragana a',
  strokes: [
    { index: 1, directionHint: 'left curve', points: [{ x: 106, y: 48, t: 0 }, { x: 80, y: 92, t: 1 }, { x: 112, y: 112, t: 2 }] },
    { index: 2, directionHint: 'short horizontal', points: [{ x: 120, y: 72, t: 0 }, { x: 170, y: 72, t: 1 }] },
    { index: 3, directionHint: 'loop down', points: [{ x: 152, y: 48, t: 0 }, { x: 154, y: 134, t: 1 }, { x: 190, y: 126, t: 2 }] },
  ],
};

const jaKaModel: ScriptStrokeModel = {
  key: 'ja:\u30ab',
  character: '\u30ab',
  reading: 'ka',
  meaning: 'katakana ka',
  strokes: [
    { index: 1, directionHint: 'left to right', points: [{ x: 92, y: 66, t: 0 }, { x: 164, y: 66, t: 1 }] },
    { index: 2, directionHint: 'top to bottom', points: [{ x: 142, y: 42, t: 0 }, { x: 110, y: 138, t: 1 }] },
  ],
};

const models: Record<string, ScriptStrokeModel[]> = {
  zh: [zhNiModel],
  ja: [jaAModel, jaKaModel],
};

export function getScriptModels(languageCode: string): ScriptStrokeModel[] {
  return models[languageCode] ?? [];
}

export function findScriptModel(languageCode: string, modelKey?: string): ScriptStrokeModel | null {
  const list = getScriptModels(languageCode);
  if (list.length === 0) return null;
  if (!modelKey) return list[0];
  return list.find((item) => item.key === modelKey) ?? list[0];
}
