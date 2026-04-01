import type { CurriculumNodeRecord } from '../../persistence';
import type { EvidenceActivityType } from './types';

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function byNodeKeys(
  nodes: CurriculumNodeRecord[],
  keys: string[],
): string[] {
  const keySet = new Set(keys);
  return nodes.filter((node) => keySet.has(node.nodeKey)).map((node) => node.id);
}

function byNodeType(nodes: CurriculumNodeRecord[], nodeType: CurriculumNodeRecord['nodeType']): string[] {
  return nodes.filter((node) => node.nodeType === nodeType).map((node) => node.id);
}

export function heuristicNodeKeysForActivity(
  languageCode: string,
  activityType: EvidenceActivityType,
): string[] {
  if (activityType === 'review') return [`${languageCode}_greetings_cluster`];
  if (activityType === 'write') return [`${languageCode}_intro_sentence_pattern`];
  if (activityType === 'speak') {
    return [
      `${languageCode}_rolled_r_target`,
      `${languageCode}_liaison_target`,
      `${languageCode}_tones_target`,
      `${languageCode}_umlaut_target`,
    ];
  }
  return [`${languageCode}_order_food_task`];
}

export function resolveNodeIds(params: {
  nodes: CurriculumNodeRecord[];
  explicitNodeIds?: string[];
  explicitNodeKeys?: string[];
  languageCode: string;
  activityType: EvidenceActivityType;
}): { nodeIds: string[]; source: 'explicit_ids' | 'explicit_keys' | 'heuristic' | 'empty' } {
  if (params.explicitNodeIds && params.explicitNodeIds.length > 0) {
    return { nodeIds: unique(params.explicitNodeIds), source: 'explicit_ids' };
  }

  if (params.explicitNodeKeys && params.explicitNodeKeys.length > 0) {
    const fromKeys = byNodeKeys(params.nodes, params.explicitNodeKeys);
    if (fromKeys.length > 0) {
      return { nodeIds: unique(fromKeys), source: 'explicit_keys' };
    }
  }

  const heuristics = heuristicNodeKeysForActivity(params.languageCode, params.activityType);
  const fromHeuristics = byNodeKeys(params.nodes, heuristics);
  if (fromHeuristics.length > 0) {
    return { nodeIds: unique(fromHeuristics), source: 'heuristic' };
  }

  if (params.activityType === 'review' || params.activityType === 'learn') {
    const fallback = byNodeType(params.nodes, 'communicative_task');
    if (fallback.length > 0) {
      return { nodeIds: [fallback[0]], source: 'heuristic' };
    }
  }
  if (params.activityType === 'speak') {
    const fallback = byNodeType(params.nodes, 'phoneme_target');
    if (fallback.length > 0) {
      return { nodeIds: [fallback[0]], source: 'heuristic' };
    }
  }

  return { nodeIds: [], source: 'empty' };
}
