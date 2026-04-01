export const SCRIPT_PRACTICE_MODES = [
  'watch',
  'trace',
  'guided_draw',
  'free_draw',
  'timed_recall_draw',
] as const;

export type ScriptPracticeMode = (typeof SCRIPT_PRACTICE_MODES)[number];

export interface ScriptPracticeStroke {
  x: number;
  y: number;
  t: number;
}

export interface ScriptPracticePayload {
  strokes: ScriptPracticeStroke[];
  width: number;
  height: number;
}

