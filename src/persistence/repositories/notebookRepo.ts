import { RepositoryError } from '../errors';
import {
  makeId,
  nowIso,
  parseJsonArray,
  stringifyJson,
} from '../utils';
import type {
  CreateNotebookCollectionInput,
  CreateNotebookItemInput,
  NotebookCollectionRecord,
  NotebookItemRecord,
  NotebookRepository,
  SqlDatabase,
  UpdateNotebookItemInput,
} from '../types';

interface CollectionRow {
  id: string;
  learner_id: string;
  language_id: string;
  title: string;
  description: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

interface ItemRow {
  id: string;
  learner_id: string;
  language_id: string;
  collection_id: string | null;
  term: string;
  translation: string | null;
  item_kind: NotebookItemRecord['itemKind'];
  context: string | null;
  notes: string | null;
  personal_hint: string | null;
  personal_example: string | null;
  tags_json: string;
  source: string;
  source_ref: string | null;
  mastery: number;
  favorited: number;
  is_difficult: number;
  is_important: number;
  flashcard_enabled: number;
  created_at: string;
  updated_at: string;
}

function mapCollection(row: CollectionRow): NotebookCollectionRecord {
  return {
    id: row.id,
    learnerId: row.learner_id,
    languageId: row.language_id,
    title: row.title,
    description: row.description,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapItem(row: ItemRow): NotebookItemRecord {
  return {
    id: row.id,
    learnerId: row.learner_id,
    languageId: row.language_id,
    collectionId: row.collection_id,
    term: row.term,
    translation: row.translation,
    itemKind: row.item_kind,
    context: row.context,
    notes: row.notes,
    personalHint: row.personal_hint,
    personalExample: row.personal_example,
    tags: parseJsonArray(row.tags_json),
    source: row.source,
    sourceRef: row.source_ref,
    mastery: row.mastery,
    favorited: row.favorited === 1,
    isDifficult: row.is_difficult === 1,
    isImportant: row.is_important === 1,
    flashcardEnabled: row.flashcard_enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteNotebookRepository implements NotebookRepository {
  constructor(private readonly db: SqlDatabase) {}

  async createCollection(input: CreateNotebookCollectionInput): Promise<NotebookCollectionRecord> {
    try {
      const id = makeId('nbcol');
      const ts = nowIso();
      await this.db.execute(
        `
        INSERT INTO notebook_collections (
          id, learner_id, language_id, title, description, color, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          id,
          input.learnerId,
          input.languageId,
          input.title.trim(),
          input.description ?? null,
          input.color ?? null,
          ts,
          ts,
        ],
      );
      const rows = await this.db.select<CollectionRow>(
        `
        SELECT id, learner_id, language_id, title, description, color, created_at, updated_at
        FROM notebook_collections
        WHERE id = ?
        LIMIT 1;
        `,
        [id],
      );
      return mapCollection(rows[0]);
    } catch (error) {
      throw new RepositoryError('notebook', 'createCollection', error);
    }
  }

  async listCollections(learnerId: string, languageId: string): Promise<NotebookCollectionRecord[]> {
    try {
      const rows = await this.db.select<CollectionRow>(
        `
        SELECT id, learner_id, language_id, title, description, color, created_at, updated_at
        FROM notebook_collections
        WHERE learner_id = ? AND language_id = ?
        ORDER BY updated_at DESC, created_at DESC;
        `,
        [learnerId, languageId],
      );
      return rows.map(mapCollection);
    } catch (error) {
      throw new RepositoryError('notebook', 'listCollections', error);
    }
  }

  async createItem(input: CreateNotebookItemInput): Promise<NotebookItemRecord> {
    try {
      const id = makeId('nbitem');
      const ts = nowIso();
      await this.db.execute(
        `
        INSERT INTO notebook_items (
          id, learner_id, language_id, collection_id, term, translation, item_kind, context, notes,
          personal_hint, personal_example, tags_json, source, source_ref, mastery, favorited,
          is_difficult, is_important, flashcard_enabled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          id,
          input.learnerId,
          input.languageId,
          input.collectionId ?? null,
          input.term.trim(),
          input.translation ?? null,
          input.itemKind,
          input.context ?? null,
          input.notes ?? null,
          input.personalHint ?? null,
          input.personalExample ?? null,
          stringifyJson(input.tags ?? []),
          input.source ?? 'manual',
          input.sourceRef ?? null,
          input.mastery ?? 0,
          input.favorited ? 1 : 0,
          input.isDifficult ? 1 : 0,
          input.isImportant ? 1 : 0,
          input.flashcardEnabled === false ? 0 : 1,
          ts,
          ts,
        ],
      );
      return this.getById(id);
    } catch (error) {
      throw new RepositoryError('notebook', 'createItem', error);
    }
  }

  async updateItem(input: UpdateNotebookItemInput): Promise<NotebookItemRecord> {
    try {
      const current = await this.getById(input.id);
      await this.db.execute(
        `
        UPDATE notebook_items
        SET
          collection_id = ?,
          term = ?,
          translation = ?,
          item_kind = ?,
          context = ?,
          notes = ?,
          personal_hint = ?,
          personal_example = ?,
          tags_json = ?,
          mastery = ?,
          favorited = ?,
          is_difficult = ?,
          is_important = ?,
          flashcard_enabled = ?,
          updated_at = ?
        WHERE id = ?;
        `,
        [
          input.collectionId === undefined ? current.collectionId : input.collectionId,
          input.term ?? current.term,
          input.translation === undefined ? current.translation : input.translation,
          input.itemKind ?? current.itemKind,
          input.context === undefined ? current.context : input.context,
          input.notes === undefined ? current.notes : input.notes,
          input.personalHint === undefined ? current.personalHint : input.personalHint,
          input.personalExample === undefined ? current.personalExample : input.personalExample,
          stringifyJson(input.tags ?? current.tags),
          input.mastery ?? current.mastery,
          input.favorited === undefined ? Number(current.favorited) : (input.favorited ? 1 : 0),
          input.isDifficult === undefined ? Number(current.isDifficult) : (input.isDifficult ? 1 : 0),
          input.isImportant === undefined ? Number(current.isImportant) : (input.isImportant ? 1 : 0),
          input.flashcardEnabled === undefined ? Number(current.flashcardEnabled) : (input.flashcardEnabled ? 1 : 0),
          nowIso(),
          input.id,
        ],
      );
      return this.getById(input.id);
    } catch (error) {
      throw new RepositoryError('notebook', 'updateItem', error);
    }
  }

  async listItems(learnerId: string, languageId: string, limit = 500): Promise<NotebookItemRecord[]> {
    try {
      const rows = await this.db.select<ItemRow>(
        `
        SELECT id, learner_id, language_id, collection_id, term, translation, item_kind, context, notes,
               personal_hint, personal_example, tags_json, source, source_ref, mastery, favorited,
               is_difficult, is_important, flashcard_enabled, created_at, updated_at
        FROM notebook_items
        WHERE learner_id = ? AND language_id = ?
        ORDER BY updated_at DESC, created_at DESC
        LIMIT ?;
        `,
        [learnerId, languageId, limit],
      );
      return rows.map(mapItem);
    } catch (error) {
      throw new RepositoryError('notebook', 'listItems', error);
    }
  }

  private async getById(id: string): Promise<NotebookItemRecord> {
    const rows = await this.db.select<ItemRow>(
      `
      SELECT id, learner_id, language_id, collection_id, term, translation, item_kind, context, notes,
             personal_hint, personal_example, tags_json, source, source_ref, mastery, favorited,
             is_difficult, is_important, flashcard_enabled, created_at, updated_at
      FROM notebook_items
      WHERE id = ?
      LIMIT 1;
      `,
      [id],
    );
    if (rows.length === 0) {
      throw new Error(`Notebook item not found: ${id}`);
    }
    return mapItem(rows[0]);
  }
}
