export const SCRIPT_PRACTICE_MODES = [
  'watch',
  'trace',
  'guided_draw',
  'free_draw',
  'timed_recall_draw',
] as const;

export type ScriptPracticeMode = (typeof SCRIPT_PRACTICE_MODES)[number];

export interface ScriptPracticePoint {
  x: number;
  y: number;
  t: number;
}

export interface ScriptStrokePath {
  id: string;
  points: ScriptPracticePoint[];
}

export interface ScriptStrokeModel {
  key: string;
  character: string;
  reading?: string;
  meaning?: string;
  strokes: Array<{
    index: number;
    points: ScriptPracticePoint[];
    directionHint?: string;
    component?: string;
  }>;
}

export interface ScriptPracticePayload {
  strokePaths: ScriptStrokePath[];
  width: number;
  height: number;
  modelKey?: string;
  mode?: ScriptPracticeMode;
  score?: {
    strokeCountScore: number;
    orderScore: number;
    shapeScore: number;
    positionScore: number;
    totalScore: number;
    feedback: string;
  };
}
