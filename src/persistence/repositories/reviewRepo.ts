import { RepositoryError } from '../errors';
import { makeId, nowIso, parseJsonObject, stringifyJson } from '../utils';
import type {
  CreateReviewItemInput,
  DueReviewQuery,
  ReviewItemRecord,
  ReviewRepository,
  SqlDatabase,
  UpdateReviewItemInput,
} from '../types';

interface ReviewItemRow {
  id: string;
  learner_id: string;
  language_id: string;
  node_id: string | null;
  content_item_id: string | null;
  state: ReviewItemRecord['state'];
  due_at: string;
  interval_days: number;
  ease_factor: number;
  last_reviewed_at: string | null;
  last_result: ReviewItemRecord['lastResult'];
  strength: string | null;
  attempts_count: number;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

function mapReviewRow(row: ReviewItemRow): ReviewItemRecord {
  return {
    id: row.id,
    learnerId: row.learner_id,
    languageId: row.language_id,
    nodeId: row.node_id,
    contentItemId: row.content_item_id,
    state: row.state,
    dueAt: row.due_at,
    intervalDays: row.interval_days,
    easeFactor: row.ease_factor,
    lastReviewedAt: row.last_reviewed_at,
    lastResult: row.last_result,
    strength: row.strength,
    attemptsCount: row.attempts_count,
    metadata: parseJsonObject(row.metadata_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteReviewRepository implements ReviewRepository {
  constructor(private readonly db: SqlDatabase) {}

  async createReviewItem(input: CreateReviewItemInput): Promise<ReviewItemRecord> {
    try {
      const timestamp = nowIso();
      const id = makeId('review');

      await this.db.execute(
        `
        INSERT INTO review_items (
          id, learner_id, language_id, node_id, content_item_id, state, due_at,
          interval_days, ease_factor, last_reviewed_at, last_result, strength,
          attempts_count, metadata_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          id,
          input.learnerId,
          input.languageId,
          input.nodeId ?? null,
          input.contentItemId ?? null,
          input.state ?? 'pending',
          input.dueAt,
          input.intervalDays ?? 1,
          input.easeFactor ?? 2.3,
          input.lastReviewedAt ?? null,
          input.lastResult ?? null,
          input.strength ?? null,
          input.attemptsCount ?? 0,
          stringifyJson(input.metadata ?? {}),
          timestamp,
          timestamp,
        ],
      );

      return this.getById(id);
    } catch (error) {
      throw new RepositoryError('review', 'createReviewItem', error);
    }
  }

  async updateReviewItem(input: UpdateReviewItemInput): Promise<ReviewItemRecord> {
    try {
      const current = await this.getById(input.id);
      await this.db.execute(
        `
        UPDATE review_items
        SET
          state = ?,
          due_at = ?,
          interval_days = ?,
          ease_factor = ?,
          last_reviewed_at = ?,
          last_result = ?,
          strength = ?,
          attempts_count = ?,
          metadata_json = ?,
          updated_at = ?
        WHERE id = ?;
        `,
        [
          input.state ?? current.state,
          input.dueAt ?? current.dueAt,
          input.intervalDays ?? current.intervalDays,
          input.easeFactor ?? current.easeFactor,
          input.lastReviewedAt === undefined ? current.lastReviewedAt : input.lastReviewedAt,
          input.lastResult === undefined ? current.lastResult : input.lastResult,
          input.strength === undefined ? current.strength : input.strength,
          input.attemptsCount ?? current.attemptsCount,
          stringifyJson(input.metadata ?? current.metadata),
          nowIso(),
          input.id,
        ],
      );
      return this.getById(input.id);
    } catch (error) {
      throw new RepositoryError('review', 'updateReviewItem', error);
    }
  }

  async fetchDueItemsByLanguage(query: DueReviewQuery): Promise<ReviewItemRecord[]> {
    try {
      const rows = await this.db.select<ReviewItemRow>(
        `
        SELECT
          id, learner_id, language_id, node_id, content_item_id, state, due_at,
          interval_days, ease_factor, last_reviewed_at, last_result, strength,
          attempts_count, metadata_json, created_at, updated_at
        FROM review_items
        WHERE learner_id = ?
          AND language_id = ?
          AND state IN ('pending', 'due')
          AND due_at <= ?
        ORDER BY due_at ASC, updated_at DESC
        LIMIT ?;
        `,
        [query.learnerId, query.languageId, query.dueBefore ?? nowIso(), query.limit ?? 100],
      );
      return rows.map(mapReviewRow);
    } catch (error) {
      throw new RepositoryError('review', 'fetchDueItemsByLanguage', error);
    }
  }

  private async getById(id: string): Promise<ReviewItemRecord> {
    const rows = await this.db.select<ReviewItemRow>(
      `
      SELECT
        id, learner_id, language_id, node_id, content_item_id, state, due_at,
        interval_days, ease_factor, last_reviewed_at, last_result, strength,
        attempts_count, metadata_json, created_at, updated_at
      FROM review_items
      WHERE id = ?
      LIMIT 1;
      `,
      [id],
    );
    if (rows.length === 0) {
      throw new Error(`Review item not found: ${id}`);
    }
    return mapReviewRow(rows[0]);
  }
}
