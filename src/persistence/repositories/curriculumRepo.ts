import { RepositoryError } from '../errors';
import { parseJsonArray, parseJsonObject } from '../utils';
import type {
  CapabilityRecord,
  CurriculumBundle,
  CurriculumEdgeRecord,
  CurriculumNodeRecord,
  CurriculumRecord,
  CurriculumRepository,
  NodeCapabilityLinkRecord,
  SqlDatabase,
} from '../types';

interface CurriculumRow {
  id: string;
  language_id: string;
  version: number;
  title: string;
  description: string | null;
  status: CurriculumRecord['status'];
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

interface NodeRow {
  id: string;
  curriculum_id: string;
  language_id: string;
  domain_key: string;
  unit_key: string;
  node_key: string;
  node_type: CurriculumNodeRecord['nodeType'];
  title: string;
  description: string | null;
  level_band: string | null;
  metadata_json: string;
  tags_json: string;
  created_at: string;
  updated_at: string;
}

interface EdgeRow {
  id: string;
  curriculum_id: string;
  language_id: string;
  from_node_id: string;
  to_node_id: string;
  edge_type: CurriculumEdgeRecord['edgeType'];
  metadata_json: string;
  created_at: string;
}

interface CapabilityRow {
  id: string;
  curriculum_id: string;
  language_id: string;
  slug: string;
  title: string;
  description: string | null;
  level_band: string | null;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

interface NodeCapabilityLinkRow {
  id: string;
  curriculum_id: string;
  node_id: string;
  capability_id: string;
  created_at: string;
}

function mapCurriculumRow(row: CurriculumRow): CurriculumRecord {
  return {
    id: row.id,
    languageId: row.language_id,
    version: row.version,
    title: row.title,
    description: row.description,
    status: row.status,
    metadata: parseJsonObject(row.metadata_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCapabilityRow(row: CapabilityRow): CapabilityRecord {
  return {
    id: row.id,
    curriculumId: row.curriculum_id,
    languageId: row.language_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    levelBand: row.level_band,
    metadata: parseJsonObject(row.metadata_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNodeRow(row: NodeRow): CurriculumNodeRecord {
  return {
    id: row.id,
    curriculumId: row.curriculum_id,
    languageId: row.language_id,
    domainKey: row.domain_key,
    unitKey: row.unit_key,
    nodeKey: row.node_key,
    nodeType: row.node_type,
    title: row.title,
    description: row.description,
    levelBand: row.level_band,
    metadata: parseJsonObject(row.metadata_json),
    tags: parseJsonArray(row.tags_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEdgeRow(row: EdgeRow): CurriculumEdgeRecord {
  return {
    id: row.id,
    curriculumId: row.curriculum_id,
    languageId: row.language_id,
    fromNodeId: row.from_node_id,
    toNodeId: row.to_node_id,
    edgeType: row.edge_type,
    metadata: parseJsonObject(row.metadata_json),
    createdAt: row.created_at,
  };
}

function mapLinkRow(row: NodeCapabilityLinkRow): NodeCapabilityLinkRecord {
  return {
    id: row.id,
    curriculumId: row.curriculum_id,
    nodeId: row.node_id,
    capabilityId: row.capability_id,
    createdAt: row.created_at,
  };
}

export class SqliteCurriculumRepository implements CurriculumRepository {
  constructor(private readonly db: SqlDatabase) {}

  async getCurriculumByLanguageCode(languageCode: string, version?: number): Promise<CurriculumBundle | null> {
    try {
      const rows = await this.db.select<CurriculumRow>(
        `
        SELECT c.id, c.language_id, c.version, c.title, c.description, c.status, c.metadata_json, c.created_at, c.updated_at
        FROM curricula c
        JOIN languages l ON l.id = c.language_id
        WHERE l.code = ?
          AND (? IS NULL OR c.version = ?)
        ORDER BY c.version DESC
        LIMIT 1;
        `,
        [languageCode, version ?? null, version ?? null],
      );

      if (rows.length === 0) {
        return null;
      }

      const curriculum = mapCurriculumRow(rows[0]);
      const [capabilities, nodes, edges, links] = await Promise.all([
        this.db.select<CapabilityRow>(
          `
          SELECT id, curriculum_id, language_id, slug, title, description, level_band, metadata_json, created_at, updated_at
          FROM capabilities
          WHERE curriculum_id = ?
          ORDER BY slug ASC;
          `,
          [curriculum.id],
        ),
        this.db.select<NodeRow>(
          `
          SELECT id, curriculum_id, language_id, domain_key, unit_key, node_key, node_type, title, description, level_band, metadata_json, tags_json, created_at, updated_at
          FROM curriculum_nodes
          WHERE curriculum_id = ?
          ORDER BY domain_key ASC, unit_key ASC, node_key ASC;
          `,
          [curriculum.id],
        ),
        this.db.select<EdgeRow>(
          `
          SELECT id, curriculum_id, language_id, from_node_id, to_node_id, edge_type, metadata_json, created_at
          FROM curriculum_edges
          WHERE curriculum_id = ?
          ORDER BY created_at ASC;
          `,
          [curriculum.id],
        ),
        this.db.select<NodeCapabilityLinkRow>(
          `
          SELECT id, curriculum_id, node_id, capability_id, created_at
          FROM curriculum_node_capabilities
          WHERE curriculum_id = ?
          ORDER BY created_at ASC;
          `,
          [curriculum.id],
        ),
      ]);

      return {
        curriculum,
        capabilities: capabilities.map(mapCapabilityRow),
        nodes: nodes.map(mapNodeRow),
        edges: edges.map(mapEdgeRow),
        nodeCapabilityLinks: links.map(mapLinkRow),
      };
    } catch (error) {
      throw new RepositoryError('curriculum', 'getCurriculumByLanguageCode', error);
    }
  }

  async listCurriculumNodes(curriculumId: string): Promise<CurriculumNodeRecord[]> {
    try {
      const rows = await this.db.select<NodeRow>(
        `
        SELECT id, curriculum_id, language_id, domain_key, unit_key, node_key, node_type, title, description, level_band, metadata_json, tags_json, created_at, updated_at
        FROM curriculum_nodes
        WHERE curriculum_id = ?
        ORDER BY domain_key ASC, unit_key ASC, node_key ASC;
        `,
        [curriculumId],
      );
      return rows.map(mapNodeRow);
    } catch (error) {
      throw new RepositoryError('curriculum', 'listCurriculumNodes', error);
    }
  }

  async listCurriculumEdges(curriculumId: string): Promise<CurriculumEdgeRecord[]> {
    try {
      const rows = await this.db.select<EdgeRow>(
        `
        SELECT id, curriculum_id, language_id, from_node_id, to_node_id, edge_type, metadata_json, created_at
        FROM curriculum_edges
        WHERE curriculum_id = ?
        ORDER BY created_at ASC;
        `,
        [curriculumId],
      );
      return rows.map(mapEdgeRow);
    } catch (error) {
      throw new RepositoryError('curriculum', 'listCurriculumEdges', error);
    }
  }
}
