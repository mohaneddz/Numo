import { describe, expect, it } from 'vitest';
import { resolveNodeIds } from './nodeResolver';
import type { CurriculumNodeRecord } from '../../persistence';

const nodes: CurriculumNodeRecord[] = [
  {
    id: 'node-review',
    curriculumId: 'cur-1',
    languageId: 'lang-1',
    domainKey: 'foundations',
    unitKey: 'u1',
    nodeKey: 'es_greetings_cluster',
    nodeType: 'vocabulary_cluster',
    title: 'Greetings',
    description: null,
    levelBand: 'A1',
    metadata: {},
    tags: ['greeting'],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'node-speak',
    curriculumId: 'cur-1',
    languageId: 'lang-1',
    domainKey: 'pronunciation',
    unitKey: 'u1',
    nodeKey: 'es_rolled_r_target',
    nodeType: 'phoneme_target',
    title: 'R sound',
    description: null,
    levelBand: 'A1',
    metadata: {},
    tags: ['pronunciation'],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

describe('resolveNodeIds', () => {
  it('prefers explicit node ids', () => {
    const result = resolveNodeIds({
      nodes,
      explicitNodeIds: ['manual-node'],
      languageCode: 'es',
      activityType: 'review',
    });
    expect(result.source).toBe('explicit_ids');
    expect(result.nodeIds).toEqual(['manual-node']);
  });

  it('resolves by explicit node keys', () => {
    const result = resolveNodeIds({
      nodes,
      explicitNodeKeys: ['es_greetings_cluster'],
      languageCode: 'es',
      activityType: 'review',
    });
    expect(result.source).toBe('explicit_keys');
    expect(result.nodeIds).toEqual(['node-review']);
  });

  it('falls back to heuristic mapping', () => {
    const result = resolveNodeIds({
      nodes,
      languageCode: 'es',
      activityType: 'speak',
    });
    expect(result.source).toBe('heuristic');
    expect(result.nodeIds).toContain('node-speak');
  });
});
