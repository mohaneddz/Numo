import { runInTransaction } from '../db';
import { RepositoryError } from '../errors';
import {
  fromSqlBool,
  makeId,
  nowIso,
  parseJsonArray,
  parseJsonObject,
  stringifyJson,
  toSqlBool,
} from '../utils';
import type {
  AppendContentRevisionInput,
  ContentItemRecord,
  ContentRepository,
  ContentRevisionRecord,
  CreateContentItemInput,
  SqlDatabase,
} from '../types';

interface ContentItemRow {
  id: string;
  language_id: string;
  content_type: string;
  modality: string | null;
  title: string;
  summary: string | null;
  status: ContentItemRecord['status'];
  approval_status: ContentItemRecord['approvalStatus'];
  difficulty_band: string | null;
  source_type: string;
  source_refs_json: string;
  quality_score: number | null;
  generation_version: string | null;
  estimated_duration_sec: number | null;
  tags_json: string;
  metadata_json: string;
  active_revision_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ContentRevisionRow {
  id: string;
  content_item_id: string;
  parent_revision_id: string | null;
  revision_number: number;
  payload_json: string;
  created_by: string;
  created_by_system: number;
  reason_note: string | null;
  is_active: number;
  created_at: string;
}

function mapContentItem(row: ContentItemRow): ContentItemRecord {
  return {
    id: row.id,
    languageId: row.language_id,
    contentType: row.content_type,
    modality: row.modality,
    title: row.title,
    summary: row.summary,
    status: row.status,
    approvalStatus: row.approval_status,
    difficultyBand: row.difficulty_band,
    sourceType: row.source_type,
    sourceRefs: parseJsonArray(row.source_refs_json),
    qualityScore: row.quality_score,
    generationVersion: row.generation_version,
    estimatedDurationSec: row.estimated_duration_sec,
    tags: parseJsonArray(row.tags_json),
    metadata: parseJsonObject(row.metadata_json),
    activeRevisionId: row.active_revision_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapContentRevision(row: ContentRevisionRow): ContentRevisionRecord {
  return {
    id: row.id,
    contentItemId: row.content_item_id,
    parentRevisionId: row.parent_revision_id,
    revisionNumber: row.revision_number,
    payload: parseJsonObject(row.payload_json),
    createdBy: row.created_by,
    createdBySystem: fromSqlBool(row.created_by_system),
    reasonNote: row.reason_note,
    isActive: fromSqlBool(row.is_active),
    createdAt: row.created_at,
  };
}

export class SqliteContentRepository implements ContentRepository {
  constructor(private readonly db: SqlDatabase) {}

  async createContentItem(input: CreateContentItemInput): Promise<ContentItemRecord> {
    try {
      const id = makeId('content');
      const timestamp = nowIso();
      await this.db.execute(
        `
        INSERT INTO content_items (
          id, language_id, content_type, modality, title, summary, status, approval_status,
          difficulty_band, source_type, source_refs_json, quality_score, generation_version,
          estimated_duration_sec, tags_json, metadata_json, active_revision_id, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?);
        `,
        [
          id,
          input.languageId,
          input.contentType,
          input.modality ?? null,
          input.title,
          input.summary ?? null,
          input.status ?? 'draft',
          input.approvalStatus ?? 'pending',
          input.difficultyBand ?? null,
          input.sourceType,
          stringifyJson(input.sourceRefs ?? []),
          input.qualityScore ?? null,
          input.generationVersion ?? null,
          input.estimatedDurationSec ?? null,
          stringifyJson(input.tags ?? []),
          stringifyJson(input.metadata ?? {}),
          timestamp,
          timestamp,
        ],
      );
      return this.getContentItemById(id);
    } catch (error) {
      throw new RepositoryError('content', 'createContentItem', error);
    }
  }

  async appendRevision(input: AppendContentRevisionInput): Promise<ContentRevisionRecord> {
    try {
      return runInTransaction(this.db, async () => {
        const currentRows = await this.db.select<ContentRevisionRow>(
          `
          SELECT
            id, content_item_id, parent_revision_id, revision_number, payload_json,
            created_by, created_by_system, reason_note, is_active, created_at
          FROM content_revisions
          WHERE content_item_id = ?
          ORDER BY revision_number DESC
          LIMIT 1;
          `,
          [input.contentItemId],
        );

        const current = currentRows[0];
        const revisionNumber = current ? current.revision_number + 1 : 1;
        const revisionId = makeId('revision');
        const createdAt = nowIso();
        const setActive = input.setActive ?? true;

        if (setActive) {
          await this.db.execute(
            'UPDATE content_revisions SET is_active = 0 WHERE content_item_id = ?;',
            [input.contentItemId],
          );
        }

        await this.db.execute(
          `
          INSERT INTO content_revisions (
            id, content_item_id, parent_revision_id, revision_number, payload_json,
            created_by, created_by_system, reason_note, is_active, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
          `,
          [
            revisionId,
            input.contentItemId,
            current?.id ?? null,
            revisionNumber,
            stringifyJson(input.payload),
            input.createdBy,
            toSqlBool(input.createdBySystem),
            input.reasonNote ?? null,
            toSqlBool(setActive),
            createdAt,
          ],
        );

        if (setActive) {
          await this.db.execute(
            'UPDATE content_items SET active_revision_id = ?, updated_at = ? WHERE id = ?;',
            [revisionId, createdAt, input.contentItemId],
          );
        }

        const rows = await this.db.select<ContentRevisionRow>(
          `
          SELECT
            id, content_item_id, parent_revision_id, revision_number, payload_json,
            created_by, created_by_system, reason_note, is_active, created_at
          FROM content_revisions
          WHERE id = ?
          LIMIT 1;
          `,
          [revisionId],
        );

        return mapContentRevision(rows[0]);
      });
    } catch (error) {
      throw new RepositoryError('content', 'appendRevision', error);
    }
  }

  async getRevisionHistory(contentItemId: string): Promise<ContentRevisionRecord[]> {
    try {
      const rows = await this.db.select<ContentRevisionRow>(
        `
        SELECT
          id, content_item_id, parent_revision_id, revision_number, payload_json,
          created_by, created_by_system, reason_note, is_active, created_at
        FROM content_revisions
        WHERE content_item_id = ?
        ORDER BY revision_number DESC;
        `,
        [contentItemId],
      );
      return rows.map(mapContentRevision);
    } catch (error) {
      throw new RepositoryError('content', 'getRevisionHistory', error);
    }
  }

  async getActiveRevision(contentItemId: string): Promise<ContentRevisionRecord | null> {
    try {
      const rows = await this.db.select<ContentRevisionRow>(
        `
        SELECT
          id, content_item_id, parent_revision_id, revision_number, payload_json,
          created_by, created_by_system, reason_note, is_active, created_at
        FROM content_revisions
        WHERE content_item_id = ? AND is_active = 1
        ORDER BY revision_number DESC
        LIMIT 1;
        `,
        [contentItemId],
      );
      return rows.length > 0 ? mapContentRevision(rows[0]) : null;
    } catch (error) {
      throw new RepositoryError('content', 'getActiveRevision', error);
    }
  }

  async linkContentToNode(input: {
    contentItemId: string;
    nodeId: string;
    languageId: string;
    relationType?: string;
    coverageWeight?: number;
  }): Promise<void> {
    try {
      await this.db.execute(
        `
        INSERT INTO content_node_links (
          id, content_item_id, node_id, language_id, relation_type, coverage_weight, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(content_item_id, node_id, relation_type) DO UPDATE SET
          coverage_weight = excluded.coverage_weight;
        `,
        [
          makeId('cnl'),
          input.contentItemId,
          input.nodeId,
          input.languageId,
          input.relationType ?? 'covers',
          input.coverageWeight ?? 1,
          nowIso(),
        ],
      );
    } catch (error) {
      throw new RepositoryError('content', 'linkContentToNode', error);
    }
  }

  private async getContentItemById(id: string): Promise<ContentItemRecord> {
    const rows = await this.db.select<ContentItemRow>(
      `
      SELECT
        id, language_id, content_type, modality, title, summary, status, approval_status,
        difficulty_band, source_type, source_refs_json, quality_score, generation_version,
        estimated_duration_sec, tags_json, metadata_json, active_revision_id, created_at, updated_at
      FROM content_items
      WHERE id = ?
      LIMIT 1;
      `,
      [id],
    );
    if (rows.length === 0) {
      throw new Error(`Content item not found: ${id}`);
    }
    return mapContentItem(rows[0]);
  }
}
