import { RepositoryError } from './errors';
import { makeId, nowIso, stringifyJson } from './utils';
import type { PersistenceContext, SqlDatabase } from './types';

interface SeedCapability {
  slug: string;
  title: string;
  description: string;
  levelBand: string;
}

interface SeedNode {
  nodeKey: string;
  nodeType:
    | 'vocabulary_cluster'
    | 'grammar_concept'
    | 'phoneme_target'
    | 'script_target'
    | 'sentence_pattern'
    | 'communicative_task'
    | 'reading_pattern'
    | 'listening_pattern'
    | 'writing_target'
    | 'culture_context';
  domainKey: string;
  unitKey: string;
  title: string;
  description: string;
  levelBand: string;
  tags: string[];
}

interface SeedEdge {
  fromNodeKey: string;
  toNodeKey: string;
  edgeType:
    | 'prerequisite_of'
    | 'reinforced_by'
    | 'related_to'
    | 'commonly_confused_with'
    | 'belongs_to_domain'
    | 'belongs_to_unit'
    | 'supports_capability';
  metadata?: Record<string, unknown>;
}

interface SeedPack {
  language: {
    code: string;
    name: string;
    flag: string;
  };
  curriculum: {
    version: number;
    title: string;
    description: string;
    metadata: Record<string, unknown>;
  };
  capabilities: SeedCapability[];
  nodes: SeedNode[];
  edges: SeedEdge[];
  nodeCapabilitySlugs: Array<{ nodeKey: string; capabilitySlug: string }>;
}

const SEED_PACKS: SeedPack[] = [
  {
    language: { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    curriculum: {
      version: 1,
      title: 'Spanish Core Path',
      description: 'Starter graph focused on greetings, sentence patterns, and speaking output.',
      metadata: { seedVersion: 1, pack: 'minimal_core' },
    },
    capabilities: [
      {
        slug: 'conversation_foundations',
        title: 'Conversation Foundations',
        description: 'Handle simple greetings, introductions, and day-to-day openings.',
        levelBand: 'A1',
      },
      {
        slug: 'pronunciation_basics',
        title: 'Pronunciation Basics',
        description: 'Stabilize high-frequency sound patterns for comprehensible speech.',
        levelBand: 'A1',
      },
    ],
    nodes: [
      {
        nodeKey: 'es_greetings_cluster',
        nodeType: 'vocabulary_cluster',
        domainKey: 'foundations',
        unitKey: 'unit_1_openings',
        title: 'Greetings and Courtesy',
        description: 'High-frequency greeting and courtesy expressions.',
        levelBand: 'A1',
        tags: ['greeting', 'politeness'],
      },
      {
        nodeKey: 'es_intro_sentence_pattern',
        nodeType: 'sentence_pattern',
        domainKey: 'foundations',
        unitKey: 'unit_1_openings',
        title: 'Name and Origin Pattern',
        description: 'Introduce yourself with name, origin, and basic state.',
        levelBand: 'A1',
        tags: ['introductions'],
      },
      {
        nodeKey: 'es_rolled_r_target',
        nodeType: 'phoneme_target',
        domainKey: 'pronunciation',
        unitKey: 'unit_1_openings',
        title: 'Single and Trilled R',
        description: 'Differentiate and produce Spanish single and trilled r sounds.',
        levelBand: 'A1',
        tags: ['pronunciation'],
      },
      {
        nodeKey: 'es_order_food_task',
        nodeType: 'communicative_task',
        domainKey: 'travel',
        unitKey: 'unit_2_food',
        title: 'Order Food Casually',
        description: 'Place a simple order and ask for the bill in a cafe setting.',
        levelBand: 'A1-A2',
        tags: ['travel', 'food'],
      },
    ],
    edges: [
      { fromNodeKey: 'es_greetings_cluster', toNodeKey: 'es_order_food_task', edgeType: 'prerequisite_of' },
      { fromNodeKey: 'es_intro_sentence_pattern', toNodeKey: 'es_order_food_task', edgeType: 'prerequisite_of' },
      { fromNodeKey: 'es_rolled_r_target', toNodeKey: 'es_order_food_task', edgeType: 'reinforced_by' },
      { fromNodeKey: 'es_greetings_cluster', toNodeKey: 'es_intro_sentence_pattern', edgeType: 'related_to' },
    ],
    nodeCapabilitySlugs: [
      { nodeKey: 'es_greetings_cluster', capabilitySlug: 'conversation_foundations' },
      { nodeKey: 'es_intro_sentence_pattern', capabilitySlug: 'conversation_foundations' },
      { nodeKey: 'es_rolled_r_target', capabilitySlug: 'pronunciation_basics' },
      { nodeKey: 'es_order_food_task', capabilitySlug: 'conversation_foundations' },
    ],
  },
  {
    language: { code: 'fr', name: 'French', flag: '🇫🇷' },
    curriculum: {
      version: 1,
      title: 'French Core Path',
      description: 'Starter graph for practical interaction and French sound awareness.',
      metadata: { seedVersion: 1, pack: 'minimal_core' },
    },
    capabilities: [
      {
        slug: 'conversation_foundations',
        title: 'Conversation Foundations',
        description: 'Handle greetings, introductions, and basic requests.',
        levelBand: 'A1',
      },
      {
        slug: 'pronunciation_basics',
        title: 'Pronunciation Basics',
        description: 'Build confidence with liaison and vowel contrast awareness.',
        levelBand: 'A1',
      },
    ],
    nodes: [
      {
        nodeKey: 'fr_greetings_cluster',
        nodeType: 'vocabulary_cluster',
        domainKey: 'foundations',
        unitKey: 'unit_1_openings',
        title: 'Greetings and Courtesy',
        description: 'High-frequency greeting and courtesy expressions.',
        levelBand: 'A1',
        tags: ['greeting', 'politeness'],
      },
      {
        nodeKey: 'fr_intro_sentence_pattern',
        nodeType: 'sentence_pattern',
        domainKey: 'foundations',
        unitKey: 'unit_1_openings',
        title: 'Self-Introduction Pattern',
        description: 'Introduce yourself and ask simple identity questions.',
        levelBand: 'A1',
        tags: ['introductions'],
      },
      {
        nodeKey: 'fr_liaison_target',
        nodeType: 'phoneme_target',
        domainKey: 'pronunciation',
        unitKey: 'unit_1_openings',
        title: 'Basic Liaison Awareness',
        description: 'Produce natural linked sounds in common expressions.',
        levelBand: 'A1',
        tags: ['pronunciation'],
      },
      {
        nodeKey: 'fr_order_food_task',
        nodeType: 'communicative_task',
        domainKey: 'travel',
        unitKey: 'unit_2_food',
        title: 'Order Food Casually',
        description: 'Order in a cafe and ask for the check politely.',
        levelBand: 'A1-A2',
        tags: ['travel', 'food'],
      },
    ],
    edges: [
      { fromNodeKey: 'fr_greetings_cluster', toNodeKey: 'fr_order_food_task', edgeType: 'prerequisite_of' },
      { fromNodeKey: 'fr_intro_sentence_pattern', toNodeKey: 'fr_order_food_task', edgeType: 'prerequisite_of' },
      { fromNodeKey: 'fr_liaison_target', toNodeKey: 'fr_order_food_task', edgeType: 'reinforced_by' },
      { fromNodeKey: 'fr_greetings_cluster', toNodeKey: 'fr_intro_sentence_pattern', edgeType: 'related_to' },
    ],
    nodeCapabilitySlugs: [
      { nodeKey: 'fr_greetings_cluster', capabilitySlug: 'conversation_foundations' },
      { nodeKey: 'fr_intro_sentence_pattern', capabilitySlug: 'conversation_foundations' },
      { nodeKey: 'fr_liaison_target', capabilitySlug: 'pronunciation_basics' },
      { nodeKey: 'fr_order_food_task', capabilitySlug: 'conversation_foundations' },
    ],
  },
  {
    language: { code: 'de', name: 'German', flag: '🇩🇪' },
    curriculum: {
      version: 1,
      title: 'German Core Path',
      description: 'Starter graph for practical conversation and sentence-order control.',
      metadata: { seedVersion: 1, pack: 'minimal_core' },
    },
    capabilities: [
      {
        slug: 'conversation_foundations',
        title: 'Conversation Foundations',
        description: 'Handle greetings and practical requests in daily settings.',
        levelBand: 'A1',
      },
      {
        slug: 'pronunciation_basics',
        title: 'Pronunciation Basics',
        description: 'Stabilize core vowel contrasts for clearer speech.',
        levelBand: 'A1',
      },
    ],
    nodes: [
      {
        nodeKey: 'de_greetings_cluster',
        nodeType: 'vocabulary_cluster',
        domainKey: 'foundations',
        unitKey: 'unit_1_openings',
        title: 'Greetings and Courtesy',
        description: 'Core greeting and courtesy expressions for day-to-day interaction.',
        levelBand: 'A1',
        tags: ['greeting', 'politeness'],
      },
      {
        nodeKey: 'de_v2_sentence_pattern',
        nodeType: 'grammar_concept',
        domainKey: 'foundations',
        unitKey: 'unit_1_openings',
        title: 'Verb-Second Word Order',
        description: 'Apply V2 order in short declarative and question-like patterns.',
        levelBand: 'A1',
        tags: ['grammar', 'word-order'],
      },
      {
        nodeKey: 'de_umlaut_target',
        nodeType: 'phoneme_target',
        domainKey: 'pronunciation',
        unitKey: 'unit_1_openings',
        title: 'Umlaut Contrast',
        description: 'Differentiate and produce key umlaut vowel contrasts.',
        levelBand: 'A1',
        tags: ['pronunciation'],
      },
      {
        nodeKey: 'de_order_food_task',
        nodeType: 'communicative_task',
        domainKey: 'travel',
        unitKey: 'unit_2_food',
        title: 'Order Food Casually',
        description: 'Order food and handle simple follow-up questions.',
        levelBand: 'A1-A2',
        tags: ['travel', 'food'],
      },
    ],
    edges: [
      { fromNodeKey: 'de_greetings_cluster', toNodeKey: 'de_order_food_task', edgeType: 'prerequisite_of' },
      { fromNodeKey: 'de_v2_sentence_pattern', toNodeKey: 'de_order_food_task', edgeType: 'prerequisite_of' },
      { fromNodeKey: 'de_umlaut_target', toNodeKey: 'de_order_food_task', edgeType: 'reinforced_by' },
      { fromNodeKey: 'de_v2_sentence_pattern', toNodeKey: 'de_greetings_cluster', edgeType: 'related_to' },
    ],
    nodeCapabilitySlugs: [
      { nodeKey: 'de_greetings_cluster', capabilitySlug: 'conversation_foundations' },
      { nodeKey: 'de_v2_sentence_pattern', capabilitySlug: 'conversation_foundations' },
      { nodeKey: 'de_umlaut_target', capabilitySlug: 'pronunciation_basics' },
      { nodeKey: 'de_order_food_task', capabilitySlug: 'conversation_foundations' },
    ],
  },
  {
    language: { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
    curriculum: {
      version: 1,
      title: 'Chinese Core Path',
      description: 'Starter graph for tones, introductions, and practical exchanges.',
      metadata: { seedVersion: 1, pack: 'minimal_core' },
    },
    capabilities: [
      {
        slug: 'conversation_foundations',
        title: 'Conversation Foundations',
        description: 'Handle simple spoken exchanges with high-frequency patterns.',
        levelBand: 'A1',
      },
      {
        slug: 'pronunciation_basics',
        title: 'Pronunciation Basics',
        description: 'Stabilize tone production for intelligibility.',
        levelBand: 'A1',
      },
    ],
    nodes: [
      {
        nodeKey: 'zh_greetings_cluster',
        nodeType: 'vocabulary_cluster',
        domainKey: 'foundations',
        unitKey: 'unit_1_openings',
        title: 'Greetings and Courtesy',
        description: 'Core greeting and courtesy expressions for short interactions.',
        levelBand: 'A1',
        tags: ['greeting', 'politeness'],
      },
      {
        nodeKey: 'zh_intro_sentence_pattern',
        nodeType: 'sentence_pattern',
        domainKey: 'foundations',
        unitKey: 'unit_1_openings',
        title: 'Self-Introduction Pattern',
        description: 'State name and origin with a compact beginner pattern.',
        levelBand: 'A1',
        tags: ['introductions'],
      },
      {
        nodeKey: 'zh_tones_target',
        nodeType: 'phoneme_target',
        domainKey: 'pronunciation',
        unitKey: 'unit_1_openings',
        title: 'Tone Pair Foundations',
        description: 'Practice key tone-pair contrasts in high-frequency words.',
        levelBand: 'A1',
        tags: ['tones', 'pronunciation'],
      },
      {
        nodeKey: 'zh_order_food_task',
        nodeType: 'communicative_task',
        domainKey: 'travel',
        unitKey: 'unit_2_food',
        title: 'Order Food Casually',
        description: 'Place a simple order and ask for price confirmation.',
        levelBand: 'A1-A2',
        tags: ['travel', 'food'],
      },
    ],
    edges: [
      { fromNodeKey: 'zh_greetings_cluster', toNodeKey: 'zh_order_food_task', edgeType: 'prerequisite_of' },
      { fromNodeKey: 'zh_intro_sentence_pattern', toNodeKey: 'zh_order_food_task', edgeType: 'prerequisite_of' },
      { fromNodeKey: 'zh_tones_target', toNodeKey: 'zh_order_food_task', edgeType: 'reinforced_by' },
      { fromNodeKey: 'zh_greetings_cluster', toNodeKey: 'zh_intro_sentence_pattern', edgeType: 'related_to' },
    ],
    nodeCapabilitySlugs: [
      { nodeKey: 'zh_greetings_cluster', capabilitySlug: 'conversation_foundations' },
      { nodeKey: 'zh_intro_sentence_pattern', capabilitySlug: 'conversation_foundations' },
      { nodeKey: 'zh_tones_target', capabilitySlug: 'pronunciation_basics' },
      { nodeKey: 'zh_order_food_task', capabilitySlug: 'conversation_foundations' },
    ],
  },
];

interface IdRow {
  id: string;
}

async function selectSingleId(db: SqlDatabase, sql: string, params: unknown[]): Promise<string> {
  const rows = await db.select<IdRow>(sql, params);
  if (rows.length === 0) {
    throw new Error('Expected row was not found.');
  }
  return rows[0].id;
}

export async function seedMinimalCurricula(context: PersistenceContext): Promise<void> {
  const { db, repositories } = context;
  try {
    for (const pack of SEED_PACKS) {
      const language = await repositories.languages.upsertLanguage(pack.language);

      const curriculumTimestamp = nowIso();
      await db.execute(
        `
        INSERT INTO curricula (
          id, language_id, version, title, description, status, metadata_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
        ON CONFLICT(language_id, version) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          status = excluded.status,
          metadata_json = excluded.metadata_json,
          updated_at = excluded.updated_at;
        `,
        [
          makeId('curriculum'),
          language.id,
          pack.curriculum.version,
          pack.curriculum.title,
          pack.curriculum.description,
          stringifyJson(pack.curriculum.metadata),
          curriculumTimestamp,
          curriculumTimestamp,
        ],
      );

      const curriculumId = await selectSingleId(
        db,
        'SELECT id FROM curricula WHERE language_id = ? AND version = ? LIMIT 1;',
        [language.id, pack.curriculum.version],
      );

      for (const capability of pack.capabilities) {
        await db.execute(
          `
          INSERT INTO capabilities (
            id, curriculum_id, language_id, slug, title, description, level_band, metadata_json, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, '{}', ?, ?)
          ON CONFLICT(language_id, slug) DO UPDATE SET
            curriculum_id = excluded.curriculum_id,
            title = excluded.title,
            description = excluded.description,
            level_band = excluded.level_band,
            updated_at = excluded.updated_at;
          `,
          [
            makeId('cap'),
            curriculumId,
            language.id,
            capability.slug,
            capability.title,
            capability.description,
            capability.levelBand,
            nowIso(),
            nowIso(),
          ],
        );
      }

      for (const node of pack.nodes) {
        await db.execute(
          `
          INSERT INTO curriculum_nodes (
            id, curriculum_id, language_id, domain_key, unit_key, node_key, node_type,
            title, description, level_band, metadata_json, tags_json, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?, ?)
          ON CONFLICT(curriculum_id, node_key) DO UPDATE SET
            domain_key = excluded.domain_key,
            unit_key = excluded.unit_key,
            node_type = excluded.node_type,
            title = excluded.title,
            description = excluded.description,
            level_band = excluded.level_band,
            tags_json = excluded.tags_json,
            updated_at = excluded.updated_at;
          `,
          [
            makeId('node'),
            curriculumId,
            language.id,
            node.domainKey,
            node.unitKey,
            node.nodeKey,
            node.nodeType,
            node.title,
            node.description,
            node.levelBand,
            stringifyJson(node.tags),
            nowIso(),
            nowIso(),
          ],
        );
      }

      for (const edge of pack.edges) {
        const fromNodeId = await selectSingleId(
          db,
          'SELECT id FROM curriculum_nodes WHERE curriculum_id = ? AND node_key = ? LIMIT 1;',
          [curriculumId, edge.fromNodeKey],
        );
        const toNodeId = await selectSingleId(
          db,
          'SELECT id FROM curriculum_nodes WHERE curriculum_id = ? AND node_key = ? LIMIT 1;',
          [curriculumId, edge.toNodeKey],
        );

        await db.execute(
          `
          INSERT INTO curriculum_edges (
            id, curriculum_id, language_id, from_node_id, to_node_id, edge_type, metadata_json, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(curriculum_id, from_node_id, to_node_id, edge_type) DO UPDATE SET
            metadata_json = excluded.metadata_json;
          `,
          [
            makeId('edge'),
            curriculumId,
            language.id,
            fromNodeId,
            toNodeId,
            edge.edgeType,
            stringifyJson(edge.metadata ?? {}),
            nowIso(),
          ],
        );
      }

      for (const link of pack.nodeCapabilitySlugs) {
        const nodeId = await selectSingleId(
          db,
          'SELECT id FROM curriculum_nodes WHERE curriculum_id = ? AND node_key = ? LIMIT 1;',
          [curriculumId, link.nodeKey],
        );
        const capabilityId = await selectSingleId(
          db,
          'SELECT id FROM capabilities WHERE curriculum_id = ? AND slug = ? LIMIT 1;',
          [curriculumId, link.capabilitySlug],
        );

        await db.execute(
          `
          INSERT INTO curriculum_node_capabilities (id, curriculum_id, node_id, capability_id, created_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(node_id, capability_id) DO NOTHING;
          `,
          [makeId('nodecap'), curriculumId, nodeId, capabilityId, nowIso()],
        );
      }
    }
  } catch (error) {
    throw new RepositoryError('curriculum', 'seedMinimalCurricula', error);
  }
}
