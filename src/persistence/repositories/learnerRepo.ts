import { RepositoryError } from '../errors';
import {
  makeId,
  nowIso,
  parseJsonArray,
  parseJsonObject,
  stringifyJson,
} from '../utils';
import type {
  LearnerNodeStateRecord,
  LearnerProfileRecord,
  LearnerRepository,
  ProgressAggregate,
  SqlDatabase,
  UpsertLearnerNodeStateInput,
  WeaknessClusterRecord,
} from '../types';

interface LearnerProfileRow {
  id: string;
  display_name: string;
  native_language_code: string;
  base_language_code: string;
  created_at: string;
  updated_at: string;
}

interface LearnerNodeStateRow {
  id: string;
  learner_id: string;
  language_id: string;
  node_id: string;
  mastery_score: number;
  confidence_score: number;
  exposure_count: number;
  success_count: number;
  failure_count: number;
  last_seen_at: string | null;
  next_review_at: string | null;
  forgetting_risk: number;
  recognition_score: number;
  production_score: number;
  listening_score: number;
  reading_score: number;
  writing_score: number;
  speaking_score: number;
  pronunciation_score: number;
  weak_tags_json: string;
  error_tags_json: string;
  manual_override_json: string;
  created_at: string;
  updated_at: string;
}

interface WeaknessClusterRow {
  id: string;
  learner_id: string;
  language_id: string;
  cluster_key: string;
  title: string;
  description: string | null;
  severity_score: number;
  hit_count: number;
  last_seen_at: string | null;
  related_node_ids_json: string;
  evidence_refs_json: string;
  tags_json: string;
  created_at: string;
  updated_at: string;
}

interface ProgressAggregateRow {
  node_count: number;
  avg_mastery_score: number | null;
  avg_confidence_score: number | null;
  avg_forgetting_risk: number | null;
}

function mapLearnerProfileRow(row: LearnerProfileRow): LearnerProfileRecord {
  return {
    id: row.id,
    displayName: row.display_name,
    nativeLanguageCode: row.native_language_code,
    baseLanguageCode: row.base_language_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLearnerNodeStateRow(row: LearnerNodeStateRow): LearnerNodeStateRecord {
  return {
    id: row.id,
    learnerId: row.learner_id,
    languageId: row.language_id,
    nodeId: row.node_id,
    masteryScore: row.mastery_score,
    confidenceScore: row.confidence_score,
    exposureCount: row.exposure_count,
    successCount: row.success_count,
    failureCount: row.failure_count,
    lastSeenAt: row.last_seen_at,
    nextReviewAt: row.next_review_at,
    forgettingRisk: row.forgetting_risk,
    recognitionScore: row.recognition_score,
    productionScore: row.production_score,
    listeningScore: row.listening_score,
    readingScore: row.reading_score,
    writingScore: row.writing_score,
    speakingScore: row.speaking_score,
    pronunciationScore: row.pronunciation_score,
    weakTags: parseJsonArray(row.weak_tags_json),
    errorTags: parseJsonArray(row.error_tags_json),
    manualOverride: parseJsonObject(row.manual_override_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWeaknessClusterRow(row: WeaknessClusterRow): WeaknessClusterRecord {
  return {
    id: row.id,
    learnerId: row.learner_id,
    languageId: row.language_id,
    clusterKey: row.cluster_key,
    title: row.title,
    description: row.description,
    severityScore: row.severity_score,
    hitCount: row.hit_count,
    lastSeenAt: row.last_seen_at,
    relatedNodeIds: parseJsonArray(row.related_node_ids_json),
    evidenceRefs: parseJsonArray(row.evidence_refs_json),
    tags: parseJsonArray(row.tags_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteLearnerRepository implements LearnerRepository {
  constructor(private readonly db: SqlDatabase) {}

  async ensureDefaultProfile(): Promise<LearnerProfileRecord> {
    try {
      const rows = await this.db.select<LearnerProfileRow>(
        `
        SELECT id, display_name, native_language_code, base_language_code, created_at, updated_at
        FROM learner_profile
        ORDER BY created_at ASC
        LIMIT 1;
        `,
      );
      if (rows.length > 0) {
        return mapLearnerProfileRow(rows[0]);
      }

      const timestamp = nowIso();
      const learnerId = makeId('learner');
      await this.db.execute(
        `
        INSERT INTO learner_profile (id, display_name, native_language_code, base_language_code, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?);
        `,
        [learnerId, 'Local Learner', 'en', 'en', timestamp, timestamp],
      );

      return {
        id: learnerId,
        displayName: 'Local Learner',
        nativeLanguageCode: 'en',
        baseLanguageCode: 'en',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    } catch (error) {
      throw new RepositoryError('learner', 'ensureDefaultProfile', error);
    }
  }

  async upsertLearnerNodeState(input: UpsertLearnerNodeStateInput): Promise<LearnerNodeStateRecord> {
    try {
      const timestamp = nowIso();
      await this.db.execute(
        `
        INSERT INTO learner_node_state (
          id, learner_id, language_id, node_id, mastery_score, confidence_score,
          exposure_count, success_count, failure_count, last_seen_at, next_review_at,
          forgetting_risk, recognition_score, production_score, listening_score,
          reading_score, writing_score, speaking_score, pronunciation_score,
          weak_tags_json, error_tags_json, manual_override_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(learner_id, language_id, node_id) DO UPDATE SET
          mastery_score = excluded.mastery_score,
          confidence_score = excluded.confidence_score,
          exposure_count = learner_node_state.exposure_count + excluded.exposure_count,
          success_count = learner_node_state.success_count + excluded.success_count,
          failure_count = learner_node_state.failure_count + excluded.failure_count,
          last_seen_at = excluded.last_seen_at,
          next_review_at = excluded.next_review_at,
          forgetting_risk = excluded.forgetting_risk,
          recognition_score = excluded.recognition_score,
          production_score = excluded.production_score,
          listening_score = excluded.listening_score,
          reading_score = excluded.reading_score,
          writing_score = excluded.writing_score,
          speaking_score = excluded.speaking_score,
          pronunciation_score = excluded.pronunciation_score,
          weak_tags_json = excluded.weak_tags_json,
          error_tags_json = excluded.error_tags_json,
          manual_override_json = excluded.manual_override_json,
          updated_at = excluded.updated_at;
        `,
        [
          makeId('lns'),
          input.learnerId,
          input.languageId,
          input.nodeId,
          input.masteryScore,
          input.confidenceScore,
          input.exposureDelta ?? 0,
          input.successDelta ?? 0,
          input.failureDelta ?? 0,
          input.lastSeenAt ?? null,
          input.nextReviewAt ?? null,
          input.forgettingRisk ?? 0,
          input.recognitionScore ?? 0,
          input.productionScore ?? 0,
          input.listeningScore ?? 0,
          input.readingScore ?? 0,
          input.writingScore ?? 0,
          input.speakingScore ?? 0,
          input.pronunciationScore ?? 0,
          stringifyJson(input.weakTags ?? []),
          stringifyJson(input.errorTags ?? []),
          stringifyJson(input.manualOverride ?? {}),
          timestamp,
          timestamp,
        ],
      );

      const rows = await this.db.select<LearnerNodeStateRow>(
        `
        SELECT
          id, learner_id, language_id, node_id, mastery_score, confidence_score,
          exposure_count, success_count, failure_count, last_seen_at, next_review_at,
          forgetting_risk, recognition_score, production_score, listening_score,
          reading_score, writing_score, speaking_score, pronunciation_score,
          weak_tags_json, error_tags_json, manual_override_json, created_at, updated_at
        FROM learner_node_state
        WHERE learner_id = ? AND language_id = ? AND node_id = ?
        LIMIT 1;
        `,
        [input.learnerId, input.languageId, input.nodeId],
      );
      return mapLearnerNodeStateRow(rows[0]);
    } catch (error) {
      throw new RepositoryError('learner', 'upsertLearnerNodeState', error);
    }
  }

  async getLearnerNodeState(
    learnerId: string,
    languageId: string,
    nodeId: string,
  ): Promise<LearnerNodeStateRecord | null> {
    try {
      const rows = await this.db.select<LearnerNodeStateRow>(
        `
        SELECT
          id, learner_id, language_id, node_id, mastery_score, confidence_score,
          exposure_count, success_count, failure_count, last_seen_at, next_review_at,
          forgetting_risk, recognition_score, production_score, listening_score,
          reading_score, writing_score, speaking_score, pronunciation_score,
          weak_tags_json, error_tags_json, manual_override_json, created_at, updated_at
        FROM learner_node_state
        WHERE learner_id = ? AND language_id = ? AND node_id = ?
        LIMIT 1;
        `,
        [learnerId, languageId, nodeId],
      );

      return rows.length > 0 ? mapLearnerNodeStateRow(rows[0]) : null;
    } catch (error) {
      throw new RepositoryError('learner', 'getLearnerNodeState', error);
    }
  }

  async listWeaknessClusters(learnerId: string, languageId: string): Promise<WeaknessClusterRecord[]> {
    try {
      const rows = await this.db.select<WeaknessClusterRow>(
        `
        SELECT
          id, learner_id, language_id, cluster_key, title, description,
          severity_score, hit_count, last_seen_at, related_node_ids_json,
          evidence_refs_json, tags_json, created_at, updated_at
        FROM weakness_clusters
        WHERE learner_id = ? AND language_id = ?
        ORDER BY severity_score DESC, hit_count DESC, updated_at DESC;
        `,
        [learnerId, languageId],
      );
      return rows.map(mapWeaknessClusterRow);
    } catch (error) {
      throw new RepositoryError('learner', 'listWeaknessClusters', error);
    }
  }

  async getProgressAggregate(learnerId: string, languageId: string): Promise<ProgressAggregate> {
    try {
      const rows = await this.db.select<ProgressAggregateRow>(
        `
        SELECT
          COUNT(*) AS node_count,
          AVG(mastery_score) AS avg_mastery_score,
          AVG(confidence_score) AS avg_confidence_score,
          AVG(forgetting_risk) AS avg_forgetting_risk
        FROM learner_node_state
        WHERE learner_id = ? AND language_id = ?;
        `,
        [learnerId, languageId],
      );

      const row = rows[0] ?? {
        node_count: 0,
        avg_mastery_score: 0,
        avg_confidence_score: 0,
        avg_forgetting_risk: 0,
      };

      return {
        learnerId,
        languageId,
        nodeCount: row.node_count,
        avgMasteryScore: row.avg_mastery_score ?? 0,
        avgConfidenceScore: row.avg_confidence_score ?? 0,
        avgForgettingRisk: row.avg_forgetting_risk ?? 0,
      };
    } catch (error) {
      throw new RepositoryError('learner', 'getProgressAggregate', error);
    }
  }
}
