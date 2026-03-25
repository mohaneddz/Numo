import { RepositoryError } from '../errors';
import { makeId, nowIso, parseJsonArray, parseJsonObject, stringifyJson } from '../utils';
import type { CreateEvidenceInput, EvidenceRecord, EvidenceRepository, SqlDatabase } from '../types';

interface EvidenceRow {
  id: string;
  learner_id: string;
  language_id: string;
  session_id: string | null;
  attempt_id: string | null;
  activity_type: string;
  node_ids_json: string;
  content_item_id: string | null;
  raw_input_text: string | null;
  raw_output_text: string | null;
  raw_input_ref: string | null;
  raw_output_ref: string | null;
  analysis_result_json: string;
  scores_json: string;
  confidence_estimate: number | null;
  time_taken_ms: number | null;
  hints_used: number | null;
  correction_count: number | null;
  transcription: string | null;
  pronunciation_notes: string | null;
  metadata_json: string;
  created_at: string;
}

function mapEvidenceRow(row: EvidenceRow): EvidenceRecord {
  return {
    id: row.id,
    learnerId: row.learner_id,
    languageId: row.language_id,
    sessionId: row.session_id,
    attemptId: row.attempt_id,
    activityType: row.activity_type,
    nodeIds: parseJsonArray(row.node_ids_json),
    contentItemId: row.content_item_id,
    rawInputText: row.raw_input_text,
    rawOutputText: row.raw_output_text,
    rawInputRef: row.raw_input_ref,
    rawOutputRef: row.raw_output_ref,
    analysisResult: parseJsonObject(row.analysis_result_json),
    scores: parseJsonObject(row.scores_json),
    confidenceEstimate: row.confidence_estimate,
    timeTakenMs: row.time_taken_ms,
    hintsUsed: row.hints_used,
    correctionCount: row.correction_count,
    transcription: row.transcription,
    pronunciationNotes: row.pronunciation_notes,
    metadata: parseJsonObject(row.metadata_json),
    createdAt: row.created_at,
  };
}

export class SqliteEvidenceRepository implements EvidenceRepository {
  constructor(private readonly db: SqlDatabase) {}

  async logEvidence(input: CreateEvidenceInput): Promise<EvidenceRecord> {
    try {
      const id = makeId('ev');
      const createdAt = input.createdAt ?? nowIso();
      await this.db.execute(
        `
        INSERT INTO evidence (
          id, learner_id, language_id, session_id, attempt_id, activity_type, node_ids_json,
          content_item_id, raw_input_text, raw_output_text, raw_input_ref, raw_output_ref,
          analysis_result_json, scores_json, confidence_estimate, time_taken_ms, hints_used,
          correction_count, transcription, pronunciation_notes, metadata_json, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          id,
          input.learnerId,
          input.languageId,
          input.sessionId ?? null,
          input.attemptId ?? null,
          input.activityType,
          stringifyJson(input.nodeIds ?? []),
          input.contentItemId ?? null,
          input.rawInputText ?? null,
          input.rawOutputText ?? null,
          input.rawInputRef ?? null,
          input.rawOutputRef ?? null,
          stringifyJson(input.analysisResult ?? {}),
          stringifyJson(input.scores ?? {}),
          input.confidenceEstimate ?? null,
          input.timeTakenMs ?? null,
          input.hintsUsed ?? null,
          input.correctionCount ?? null,
          input.transcription ?? null,
          input.pronunciationNotes ?? null,
          stringifyJson(input.metadata ?? {}),
          createdAt,
        ],
      );

      const rows = await this.db.select<EvidenceRow>(
        `
        SELECT
          id, learner_id, language_id, session_id, attempt_id, activity_type, node_ids_json,
          content_item_id, raw_input_text, raw_output_text, raw_input_ref, raw_output_ref,
          analysis_result_json, scores_json, confidence_estimate, time_taken_ms, hints_used,
          correction_count, transcription, pronunciation_notes, metadata_json, created_at
        FROM evidence
        WHERE id = ?
        LIMIT 1;
        `,
        [id],
      );
      return mapEvidenceRow(rows[0]);
    } catch (error) {
      throw new RepositoryError('evidence', 'logEvidence', error);
    }
  }

  async listEvidenceByLanguage(
    learnerId: string,
    languageId: string,
    limit = 50,
  ): Promise<EvidenceRecord[]> {
    try {
      const rows = await this.db.select<EvidenceRow>(
        `
        SELECT
          id, learner_id, language_id, session_id, attempt_id, activity_type, node_ids_json,
          content_item_id, raw_input_text, raw_output_text, raw_input_ref, raw_output_ref,
          analysis_result_json, scores_json, confidence_estimate, time_taken_ms, hints_used,
          correction_count, transcription, pronunciation_notes, metadata_json, created_at
        FROM evidence
        WHERE learner_id = ? AND language_id = ?
        ORDER BY created_at DESC
        LIMIT ?;
        `,
        [learnerId, languageId, limit],
      );
      return rows.map(mapEvidenceRow);
    } catch (error) {
      throw new RepositoryError('evidence', 'listEvidenceByLanguage', error);
    }
  }
}
