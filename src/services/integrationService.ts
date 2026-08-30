
import { isTauri } from '@tauri-apps/api/core';
import { initializePersistence } from '../persistence';
import { makeId, nowIso, stringifyJson, toSqlBool } from '../persistence/utils';
import type {
  ContentRevisionRecord,
  CreateEvidenceInput,
  DueReviewQuery,
  ReviewItemRecord,
  SqlDatabase,
  UpsertLearnerNodeStateInput,
} from '../persistence/types';
import type { ReviewItem } from '../data/types';
import type { GenerationPipelineResult, RuntimeTask } from '../runtime';

export type ContentApprovalDecision = 'approved' | 'rejected' | 'manual';

export interface ApprovalQueueItem {
  candidateId: string;
  languageCode: string;
  objective: string;
  contentType: string;
  candidateText: string;
  score: number;
  decision: 'accepted' | 'rejected';
  status: 'pending' | 'approved' | 'rejected' | 'manual';
  createdAt: string;
  contentItemId: string | null;
}

export interface LibraryApprovedItem {
  contentItemId: string;
  languageCode: string;
  title: string;
  summary: string;
  contentType: string;
  approvalStatus: string;
  updatedAt: string;
  activeRevisionId: string | null;
  estimatedDurationSec: number | null;
  difficultyBand: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface InsightWeakness {
  title: string;
  severity: number;
  hitCount: number;
}

export interface InsightsSnapshot {
  languageCode: string;
  generatedAt: string;
  totalStudyMinutes: number;
  wordsLearned: number;
  lessonsCompleted: number;
  reviewAccuracy: number;
  speakingSessions: number;
  writingPieces: number;
  avgSessionMinutes: number;
  dueNowCount: number;
  overdueCount: number;
  unstableCount: number;
  readingScore: number;
  listeningScore: number;
  speakingScore: number;
  writingScore: number;
  pronunciationScore: number;
  recognitionScore: number;
  productionScore: number;
  weeklyActivity: Array<{ day: string; minutes: number }>;
  pronunciationTrend: Array<{ session: string; score: number }>;
  recentEvents: Array<{ title: string; tag: string; time: string }>;
  weaknessClusters: InsightWeakness[];
  scriptProgress: number;
  dataState: MonitoringDataState;
  modalityDataState: MonitoringDataState;
  scriptDataState: MonitoringDataState;
}

export type MonitoringDataState = 'ready' | 'low_data' | 'empty' | 'not_applicable';

export interface MonitoringTrendPoint {
  date: string;
  evidenceCount: number;
  reviewPressure: number;
  readingMinutes: number;
  listeningMinutes: number;
  speakingMinutes: number;
  writingMinutes: number;
}

export interface LanguageProgressSummary {
  languageCode: string;
  languageName: string;
  isActive: boolean;
  dataState: MonitoringDataState;
  stageLabel: string;
  dueNowCount: number;
  overdueCount: number;
  reviewPressure: number;
  recentEvidenceCount: number;
  recentGain: number;
  weakAreas: string[];
  scores: {
    reading: number;
    listening: number;
    speaking: number;
    writing: number;
    pronunciation: number;
    recognition: number;
    production: number;
  };
}

export interface StrengthWeaknessSummary {
  dataState: MonitoringDataState;
  strongestModes: string[];
  weakestModes: string[];
  topWeaknessClusters: InsightWeakness[];
  pronunciationFlag: 'stable' | 'needs_work' | 'not_enough_data';
  scriptWeaknessSummary: string;
}

export interface CapabilityStatusSummary {
  languageCode: string;
  capabilitySlug: string;
  title: string;
  levelBand: string | null;
  status: 'unlocked' | 'partial' | 'blocked';
  coverage: number;
}

export interface ScriptProgressSummary {
  languageCode: string;
  dataState: MonitoringDataState;
  introducedCharacters: number;
  traceSuccessRate: number;
  freeDrawSuccessRate: number;
  weakScriptKeys: string[];
  recentPracticeCount: number;
  recognitionVsWritingGap: number;
}

export interface ProfileDashboardSnapshot {
  generatedAt: string;
  rangeDays: number;
  dataState: MonitoringDataState;
  profileOverview: {
    learnerId: string;
    displayName: string;
    nativeLanguageCode: string;
    baseLanguageCode: string;
    activeLanguageCodes: string[];
    totalStudySessions: number;
    recentActivityMinutes: number;
    currentStreak: number;
    longestStreak: number;
    suggestedFocus: string;
  };
  languageSummaries: LanguageProgressSummary[];
  goals: Array<{
    id: string;
    languageCode: string | null;
    title: string;
    goalType: string;
    status: string;
    targetValue: number | null;
    currentValue: number | null;
    dueAt: string | null;
  }>;
  strengthsWeaknesses: StrengthWeaknessSummary;
  capabilities: CapabilityStatusSummary[];
  activityTrends: MonitoringTrendPoint[];
  scriptWriting: ScriptProgressSummary[];
}

export interface ScriptPracticeAttemptInput {
  languageCode: string;
  scriptKey: string;
  mode: 'watch' | 'trace' | 'guided_draw' | 'free_draw' | 'timed_recall_draw';
  completionRatio: number;
  durationMs: number;
  success: boolean;
  strokeData?: Record<string, unknown>;
}

interface DbLanguageRow {
  id: string;
  code: string;
}

interface CandidateRow {
  candidate_id: string;
  language_code: string;
  need_objective: string;
  need_content_type: string;
  candidate_text: string;
  eval_score: number;
  eval_decision: 'accepted' | 'rejected';
  status: 'pending' | 'approved' | 'rejected' | 'manual';
  created_at: string;
  content_item_id: string | null;
}

interface ApprovedContentRow {
  id: string;
  language_code: string;
  title: string;
  summary: string | null;
  content_type: string;
  approval_status: string;
  updated_at: string;
  active_revision_id: string | null;
  estimated_duration_sec: number | null;
  difficulty_band: string | null;
  tags_json: string;
  metadata_json: string;
}

interface LessonActivityInput {
  languageCode: string;
  lessonId: string;
  lessonTitle: string;
  lessonStatus: string;
  durationLabel: string;
}

interface ProfileGoalRow {
  id: string;
  language_code: string | null;
  goal_type: string;
  title: string;
  target_value: number | null;
  current_value: number | null;
  status: string;
  due_at: string | null;
}

interface LearnerLanguageStateRow {
  language_id: string;
  code: string;
  name: string;
  current_streak: number;
  longest_streak: number;
  today_minutes: number;
  total_xp: number;
}

interface ModeScoreRow {
  reading_score: number | null;
  listening_score: number | null;
  speaking_score: number | null;
  writing_score: number | null;
  pronunciation_score: number | null;
  recognition_score: number | null;
  production_score: number | null;
  avg_mastery_score: number | null;
  unstable_count: number;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

function resolveDataState(count: number, lowDataThreshold = 5): MonitoringDataState {
  if (count <= 0) return 'empty';
  if (count < lowDataThreshold) return 'low_data';
  return 'ready';
}

function stageLabelFromMastery(score: number): string {
  if (score >= 80) return 'Advanced';
  if (score >= 60) return 'Developing';
  if (score >= 35) return 'Foundational';
  return 'Just Started';
}

function parseDurationMinutes(duration: string): number {
  const parsed = Number.parseInt(duration, 10);
  return Number.isFinite(parsed) ? Math.max(1, parsed) : 5;
}

function dayLabel(dateIso: string): string {
  const day = new Date(dateIso).getDay();
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day] ?? 'Mon';
}

function relativeTimeLabel(dateIso: string): string {
  const deltaMs = Date.now() - new Date(dateIso).getTime();
  const minutes = Math.max(1, Math.round(deltaMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days <= 1) return 'Yesterday';
  return `${days}d ago`;
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
}

function mapReviewItemFromRecord(record: ReviewItemRecord, fallbackTerm: string): ReviewItem {
  const metadata = (record.metadata ?? {}) as Record<string, unknown>;
  const term = String(metadata.term ?? fallbackTerm);
  const translation = metadata.translation == null ? '' : String(metadata.translation);
  const typeRaw = metadata.type;
  const type: ReviewItem['type'] = typeRaw === 'grammar' ? 'grammar' : typeRaw === 'phrase' ? 'phrase' : 'word';
  return {
    id: record.id,
    origin: 'legacy',
    term,
    translation,
    type,
    attempts: record.attemptsCount,
    strength: (record.strength as ReviewItem['strength']) ?? 'needs work',
    dueDate: record.dueAt.slice(0, 10),
    nextDueAt: record.dueAt,
    intervalDays: record.intervalDays,
    ease: record.easeFactor,
    lastResult: record.lastResult === 'correct' ? 'correct' : 'incorrect',
  };
}

export class IntegrationService {
  private persistedContext = initializePersistence().catch(() => null);

  private async withPersistence<T>(action: (context: NonNullable<Awaited<typeof this.persistedContext>>) => Promise<T>, fallback: T): Promise<T> {
    if (!isTauri()) {
      return fallback;
    }

    const context = await this.persistedContext;
    if (!context) {
      return fallback;
    }

    try {
      return await action(context);
    } catch {
      return fallback;
    }
  }

  private async getLanguageRow(db: SqlDatabase, languageCode: string): Promise<DbLanguageRow | null> {
    const rows = await db.select<DbLanguageRow>('SELECT id, code FROM languages WHERE code = ? LIMIT 1;', [languageCode]);
    return rows[0] ?? null;
  }

  private async ensureLearnerAndLanguage(context: NonNullable<Awaited<typeof this.persistedContext>>, languageCode: string): Promise<{ learnerId: string; languageId: string } | null> {
    const language = await this.getLanguageRow(context.db, languageCode);
    if (!language) return null;
    const learner = await context.repositories.learner.getActiveProfile();
    if (!learner) return null;
    return { learnerId: learner.id, languageId: language.id };
  }

  private async selectNodeId(context: NonNullable<Awaited<typeof this.persistedContext>>, languageCode: string, seed = ''): Promise<string | null> {
    const bundle = await context.repositories.curriculum.getCurriculumByLanguageCode(languageCode);
    if (!bundle || bundle.nodes.length === 0) {
      return null;
    }
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
      hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
    }
    const selected = bundle.nodes[hash % bundle.nodes.length];
    return selected?.id ?? bundle.nodes[0].id;
  }

  private async applyLearnerDelta(
    context: NonNullable<Awaited<typeof this.persistedContext>>,
    input: {
      learnerId: string;
      languageId: string;
      nodeId: string;
      masteryDelta: number;
      confidenceDelta: number;
      modality: 'reading' | 'listening' | 'writing' | 'speaking' | 'pronunciation' | 'recognition' | 'production';
      weakTags: string[];
      errorTags: string[];
      success: boolean;
    },
  ): Promise<void> {
    const current = await context.repositories.learner.getLearnerNodeState(input.learnerId, input.languageId, input.nodeId);
    const now = nowIso();
    const nextMastery = clampPercent((current?.masteryScore ?? 35) + input.masteryDelta);
    const nextConfidence = clampPercent((current?.confidenceScore ?? 30) + input.confidenceDelta);

    const scores = {
      recognitionScore: current?.recognitionScore ?? 40,
      productionScore: current?.productionScore ?? 35,
      listeningScore: current?.listeningScore ?? 35,
      readingScore: current?.readingScore ?? 35,
      writingScore: current?.writingScore ?? 30,
      speakingScore: current?.speakingScore ?? 30,
      pronunciationScore: current?.pronunciationScore ?? 30,
    };

    if (input.modality === 'recognition') scores.recognitionScore = clampPercent(scores.recognitionScore + input.masteryDelta);
    if (input.modality === 'production') scores.productionScore = clampPercent(scores.productionScore + input.masteryDelta);
    if (input.modality === 'listening') scores.listeningScore = clampPercent(scores.listeningScore + input.masteryDelta);
    if (input.modality === 'reading') scores.readingScore = clampPercent(scores.readingScore + input.masteryDelta);
    if (input.modality === 'writing') scores.writingScore = clampPercent(scores.writingScore + input.masteryDelta);
    if (input.modality === 'speaking') scores.speakingScore = clampPercent(scores.speakingScore + input.masteryDelta);
    if (input.modality === 'pronunciation') scores.pronunciationScore = clampPercent(scores.pronunciationScore + input.masteryDelta);

    const upsert: UpsertLearnerNodeStateInput = {
      learnerId: input.learnerId,
      languageId: input.languageId,
      nodeId: input.nodeId,
      masteryScore: nextMastery,
      confidenceScore: nextConfidence,
      exposureDelta: 1,
      successDelta: input.success ? 1 : 0,
      failureDelta: input.success ? 0 : 1,
      forgettingRisk: clampPercent((current?.forgettingRisk ?? 45) + (input.success ? -4 : 9)),
      lastSeenAt: now,
      nextReviewAt: new Date(Date.now() + (input.success ? 4 : 1) * 24 * 60 * 60 * 1000).toISOString(),
      weakTags: Array.from(new Set([...(current?.weakTags ?? []), ...input.weakTags])).slice(0, 10),
      errorTags: Array.from(new Set([...(current?.errorTags ?? []), ...input.errorTags])).slice(0, 10),
      ...scores,
    };

    await context.repositories.learner.upsertLearnerNodeState(upsert);
  }

  private async upsertWeaknessCluster(
    context: NonNullable<Awaited<typeof this.persistedContext>>,
    input: {
      learnerId: string;
      languageId: string;
      clusterKey: string;
      title: string;
      description: string;
      severityDelta: number;
      relatedNodeIds: string[];
      evidenceRef: string;
      tags: string[];
    },
  ): Promise<void> {
    const now = nowIso();
    await context.db.execute(
      `
      INSERT INTO weakness_clusters (
        id, learner_id, language_id, cluster_key, title, description, severity_score, hit_count,
        last_seen_at, related_node_ids_json, evidence_refs_json, tags_json, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(learner_id, language_id, cluster_key) DO UPDATE SET
        severity_score = weakness_clusters.severity_score + excluded.severity_score,
        hit_count = weakness_clusters.hit_count + 1,
        last_seen_at = excluded.last_seen_at,
        related_node_ids_json = excluded.related_node_ids_json,
        evidence_refs_json = excluded.evidence_refs_json,
        tags_json = excluded.tags_json,
        updated_at = excluded.updated_at;
      `,
      [
        makeId('wkc'),
        input.learnerId,
        input.languageId,
        input.clusterKey,
        input.title,
        input.description,
        input.severityDelta,
        now,
        stringifyJson(input.relatedNodeIds),
        stringifyJson([input.evidenceRef]),
        stringifyJson(input.tags),
        now,
        now,
      ],
    );
  }

  private async createOrUpdateReviewItem(
    context: NonNullable<Awaited<typeof this.persistedContext>>,
    input: {
      learnerId: string;
      languageId: string;
      nodeId: string;
      result: 'correct' | 'incorrect';
    },
  ): Promise<void> {
    const rows = await context.db.select<{ id: string; interval_days: number; ease_factor: number; attempts_count: number }>(
      'SELECT id, interval_days, ease_factor, attempts_count FROM review_items WHERE learner_id = ? AND language_id = ? AND node_id = ? LIMIT 1;',
      [input.learnerId, input.languageId, input.nodeId],
    );

    const now = new Date();
    if (rows.length === 0) {
      await context.repositories.review.createReviewItem({
        learnerId: input.learnerId,
        languageId: input.languageId,
        nodeId: input.nodeId,
        state: 'due',
        dueAt: now.toISOString(),
        intervalDays: 1,
        easeFactor: 2.3,
        lastReviewedAt: now.toISOString(),
        lastResult: input.result,
        attemptsCount: 1,
        strength: input.result === 'correct' ? 'needs work' : 'weak',
      });
      return;
    }

    const current = rows[0];
    const nextEase = input.result === 'correct' ? Math.min(3, current.ease_factor + 0.1) : Math.max(1.3, current.ease_factor - 0.2);
    const nextInterval = input.result === 'correct' ? Math.max(1, Math.round(current.interval_days * nextEase)) : 1;
    const nextDue = new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000).toISOString();

    await context.repositories.review.updateReviewItem({
      id: current.id,
      state: 'due',
      dueAt: nextDue,
      intervalDays: nextInterval,
      easeFactor: nextEase,
      lastReviewedAt: now.toISOString(),
      lastResult: input.result,
      attemptsCount: current.attempts_count + 1,
      strength: input.result === 'correct' ? 'solid' : 'weak',
    });
  }

  async recordRuntimeTask(task: RuntimeTask): Promise<void> {
    await this.withPersistence(
      async (context) => {
        await context.repositories.settings.setJson(`runtime_task_${task.id}`, task, 'runtime');
      },
      undefined,
    );
  }

  async persistGenerationResult(result: GenerationPipelineResult): Promise<void> {
    await this.withPersistence(
      async (context) => {
        const language = await this.getLanguageRow(context.db, result.need.languageCode);
        if (!language) {
          return;
        }

        const existing = await context.db.select<{ id: string }>('SELECT id FROM generation_candidates WHERE id = ? LIMIT 1;', [result.candidate.id]);
        if (existing.length === 0) {
          await context.db.execute(
            `
            INSERT INTO generation_candidates (
              id, language_id, need_id, need_content_type, need_objective, need_node_ids_json,
              need_metadata_json, context_json, candidate_text, provider_id, model, created_at, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            `,
            [
              result.candidate.id,
              language.id,
              result.need.id,
              result.need.contentType,
              result.need.objective,
              stringifyJson(result.need.nodeIds ?? []),
              stringifyJson(result.need.metadata ?? {}),
              stringifyJson(result.context),
              result.candidate.text,
              result.candidate.providerId,
              result.candidate.model,
              new Date(result.candidate.createdAt).toISOString(),
              'pending',
            ],
          );
        }

        const evaluationId = `${result.candidate.id}-eval-${result.createdAt}`;
        await context.db.execute(
          `
          INSERT OR REPLACE INTO generation_evaluations (
            id, candidate_id, decision, score, reason, raw_payload, acceptance_threshold, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);
          `,
          [
            evaluationId,
            result.candidate.id,
            result.evaluation.decision,
            result.evaluation.score,
            result.evaluation.reason,
            result.evaluation.raw,
            null,
            new Date(result.createdAt).toISOString(),
          ],
        );
      },
      undefined,
    );
  }

  async listApprovalQueue(languageCode: string): Promise<ApprovalQueueItem[]> {
    return this.withPersistence(
      async (context) => {
        const rows = await context.db.select<CandidateRow>(
          `
          SELECT
            gc.id AS candidate_id,
            l.code AS language_code,
            gc.need_objective,
            gc.need_content_type,
            gc.candidate_text,
            COALESCE(ge.score, 0) AS eval_score,
            COALESCE(ge.decision, 'rejected') AS eval_decision,
            gc.status,
            gc.created_at,
            gc.content_item_id
          FROM generation_candidates gc
          JOIN languages l ON l.id = gc.language_id
          LEFT JOIN generation_evaluations ge
            ON ge.candidate_id = gc.id
          WHERE l.code = ?
          ORDER BY gc.created_at DESC
          LIMIT 100;
          `,
          [languageCode],
        );

        return rows.map((row) => ({
          candidateId: row.candidate_id,
          languageCode: row.language_code,
          objective: row.need_objective,
          contentType: row.need_content_type,
          candidateText: row.candidate_text,
          score: row.eval_score,
          decision: row.eval_decision,
          status: row.status,
          createdAt: row.created_at,
          contentItemId: row.content_item_id,
        }));
      },
      [],
    );
  }

  async decideCandidate(input: { candidateId: string; decision: ContentApprovalDecision; actorId: string; reason?: string }): Promise<void> {
    await this.withPersistence(
      async (context) => {
        const rows = await context.db.select<{ id: string; language_id: string; need_content_type: string; need_objective: string; candidate_text: string; status: string; content_item_id: string | null }>(
          'SELECT id, language_id, need_content_type, need_objective, candidate_text, status, content_item_id FROM generation_candidates WHERE id = ? LIMIT 1;',
          [input.candidateId],
        );
        const candidate = rows[0];
        if (!candidate) {
          return;
        }

        let contentItemId = candidate.content_item_id;
        if (input.decision === 'approved' && !contentItemId) {
          const languageRows = await context.db.select<{ code: string }>('SELECT code FROM languages WHERE id = ? LIMIT 1;', [candidate.language_id]);
          const languageCode = languageRows[0]?.code ?? 'es';

          const created = await context.repositories.content.createContentItem({
            languageId: candidate.language_id,
            contentType: candidate.need_content_type,
            modality: 'mixed',
            title: candidate.need_objective,
            summary: candidate.candidate_text.slice(0, 160),
            status: 'approved',
            approvalStatus: 'approved',
            sourceType: 'runtime_generation',
            sourceRefs: [candidate.id],
            qualityScore: null,
            metadata: { languageCode },
          });

          await context.repositories.content.appendRevision({
            contentItemId: created.id,
            payload: { body: candidate.candidate_text },
            createdBy: input.actorId,
            createdBySystem: false,
            reasonNote: input.reason ?? 'Approved generated candidate',
            setActive: true,
          });

          contentItemId = created.id;
        }

        await context.db.execute(
          'UPDATE generation_candidates SET status = ?, content_item_id = ? WHERE id = ?;',
          [input.decision, contentItemId, input.candidateId],
        );

        await context.db.execute(
          `
          INSERT INTO content_approval_events (
            id, candidate_id, content_item_id, decision, actor_id, reason, metadata_json, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);
          `,
          [
            makeId('cae'),
            input.candidateId,
            contentItemId,
            input.decision,
            input.actorId,
            input.reason ?? null,
            stringifyJson({ previousStatus: candidate.status }),
            nowIso(),
          ],
        );

        if (contentItemId) {
          await context.db.execute(
            'UPDATE content_items SET approval_status = ?, status = ?, updated_at = ? WHERE id = ?;',
            [input.decision === 'approved' ? 'approved' : input.decision, input.decision === 'approved' ? 'active' : 'evaluated', nowIso(), contentItemId],
          );
        }
      },
      undefined,
    );
  }

  async listApprovedContent(languageCode: string): Promise<LibraryApprovedItem[]> {
    return this.withPersistence(
      async (context) => {
        const rows = await context.db.select<ApprovedContentRow>(
          `
          SELECT
            c.id,
            l.code AS language_code,
            c.title,
            c.summary,
            c.content_type,
            c.approval_status,
            c.updated_at,
            c.active_revision_id,
            c.estimated_duration_sec,
            c.difficulty_band,
            c.tags_json,
            c.metadata_json
          FROM content_items c
          JOIN languages l ON l.id = c.language_id
          WHERE l.code = ?
            AND c.approval_status IN ('approved', 'manual')
          ORDER BY c.updated_at DESC
          LIMIT 100;
          `,
          [languageCode],
        );

        return rows.map((row) => ({
          contentItemId: row.id,
          languageCode: row.language_code,
          title: row.title,
          summary: row.summary ?? '',
          contentType: row.content_type,
          approvalStatus: row.approval_status,
          updatedAt: row.updated_at,
          activeRevisionId: row.active_revision_id,
          estimatedDurationSec: row.estimated_duration_sec,
          difficultyBand: row.difficulty_band,
          tags: parseJsonArray(row.tags_json),
          metadata: parseJsonObject(row.metadata_json),
        }));
      },
      [],
    );
  }

  async getContentRevisionHistory(contentItemId: string): Promise<ContentRevisionRecord[]> {
    return this.withPersistence(
      async (context) => context.repositories.content.getRevisionHistory(contentItemId),
      [],
    );
  }

  async revertContentRevision(input: { contentItemId: string; revisionId: string; actorId: string; reason?: string }): Promise<void> {
    await this.withPersistence(
      async (context) => {
        const revisions = await context.repositories.content.getRevisionHistory(input.contentItemId);
        const target = revisions.find((entry) => entry.id === input.revisionId);
        if (!target) return;

        await context.db.execute('UPDATE content_revisions SET is_active = 0 WHERE content_item_id = ?;', [input.contentItemId]);
        await context.db.execute('UPDATE content_revisions SET is_active = 1 WHERE id = ?;', [input.revisionId]);
        await context.db.execute('UPDATE content_items SET active_revision_id = ?, updated_at = ? WHERE id = ?;', [input.revisionId, nowIso(), input.contentItemId]);

        await context.db.execute(
          `
          INSERT INTO content_approval_events (
            id, candidate_id, content_item_id, decision, actor_id, reason, metadata_json, created_at
          )
          VALUES (?, NULL, ?, 'reverted', ?, ?, ?, ?);
          `,
          [makeId('cae'), input.contentItemId, input.actorId, input.reason ?? 'Reverted revision', stringifyJson({ revisionId: target.id }), nowIso()],
        );
      },
      undefined,
    );
  }

  async manualEditContent(input: { contentItemId: string; body: string; actorId: string; reason?: string }): Promise<void> {
    await this.withPersistence(
      async (context) => {
        const revision = await context.repositories.content.appendRevision({
          contentItemId: input.contentItemId,
          payload: { body: input.body },
          createdBy: input.actorId,
          createdBySystem: false,
          reasonNote: input.reason ?? 'Manual edit',
          setActive: true,
        });

        await context.db.execute(
          `
          INSERT INTO content_approval_events (
            id, candidate_id, content_item_id, decision, actor_id, reason, metadata_json, created_at
          )
          VALUES (?, NULL, ?, 'edited', ?, ?, ?, ?);
          `,
          [makeId('cae'), input.contentItemId, input.actorId, input.reason ?? null, stringifyJson({ revisionId: revision.id }), nowIso()],
        );
      },
      undefined,
    );
  }

  async redoContentFromActive(input: { contentItemId: string; actorId: string; reason?: string }): Promise<void> {
    await this.withPersistence(
      async (context) => {
        const active = await context.repositories.content.getActiveRevision(input.contentItemId);
        const nextBody = `${String(active?.payload.body ?? '')}\n\n[Redo ${new Date().toISOString()}]`;
        const revision = await context.repositories.content.appendRevision({
          contentItemId: input.contentItemId,
          payload: { body: nextBody },
          createdBy: input.actorId,
          createdBySystem: false,
          reasonNote: input.reason ?? 'Redo from active revision',
          setActive: true,
        });

        await context.db.execute(
          `
          INSERT INTO content_approval_events (
            id, candidate_id, content_item_id, decision, actor_id, reason, metadata_json, created_at
          )
          VALUES (?, NULL, ?, 'redo', ?, ?, ?, ?);
          `,
          [makeId('cae'), input.contentItemId, input.actorId, input.reason ?? null, stringifyJson({ revisionId: revision.id }), nowIso()],
        );
      },
      undefined,
    );
  }

  async fetchDueReviewCards(languageCode: string): Promise<ReviewItem[]> {
    return this.withPersistence(
      async (context) => {
        const ids = await this.ensureLearnerAndLanguage(context, languageCode);
        if (!ids) return [];

        const query: DueReviewQuery = {
          learnerId: ids.learnerId,
          languageId: ids.languageId,
          dueBefore: nowIso(),
          limit: 24,
        };

        const due = await context.repositories.review.fetchDueItemsByLanguage(query);
        if (due.length === 0) return [];

        const nodeTitles = new Map<string, string>();
        const nodeIds = due.map((item) => item.nodeId).filter((value): value is string => Boolean(value));
        if (nodeIds.length > 0) {
          const placeholders = nodeIds.map(() => '?').join(', ');
          const rows = await context.db.select<{ id: string; title: string }>(
            `SELECT id, title FROM curriculum_nodes WHERE id IN (${placeholders});`,
            nodeIds,
          );
          rows.forEach((row) => nodeTitles.set(row.id, row.title));
        }

        return due.map((item) => {
          const term = item.nodeId ? nodeTitles.get(item.nodeId) ?? 'Curriculum item' : 'Content item';
          return mapReviewItemFromRecord(item, term);
        });
      },
      [],
    );
  }

  async logReviewOutcome(input: { languageCode: string; term: string; translation: string; result: 'correct' | 'incorrect' }): Promise<void> {
    await this.withPersistence(
      async (context) => {
        const ids = await this.ensureLearnerAndLanguage(context, input.languageCode);
        if (!ids) return;

        const nodeId = await this.selectNodeId(context, input.languageCode, input.term);
        if (!nodeId) return;

        const evidence = await context.repositories.evidence.logEvidence({
          learnerId: ids.learnerId,
          languageId: ids.languageId,
          activityType: 'review_submission',
          nodeIds: [nodeId],
          rawInputText: input.term,
          rawOutputText: input.translation,
          analysisResult: { result: input.result },
          scores: { correctness: input.result === 'correct' ? 100 : 25 },
          confidenceEstimate: input.result === 'correct' ? 0.75 : 0.35,
          metadata: { source: 'review_session' },
        });

        await this.applyLearnerDelta(context, {
          learnerId: ids.learnerId,
          languageId: ids.languageId,
          nodeId,
          masteryDelta: input.result === 'correct' ? 6 : -5,
          confidenceDelta: input.result === 'correct' ? 5 : -4,
          modality: 'recognition',
          weakTags: input.result === 'correct' ? [] : ['review_memory'],
          errorTags: input.result === 'correct' ? [] : ['review_incorrect'],
          success: input.result === 'correct',
        });

        await this.createOrUpdateReviewItem(context, {
          learnerId: ids.learnerId,
          languageId: ids.languageId,
          nodeId,
          result: input.result,
        });

        if (input.result === 'incorrect') {
          await this.upsertWeaknessCluster(context, {
            learnerId: ids.learnerId,
            languageId: ids.languageId,
            clusterKey: 'review-memory',
            title: 'Review Memory Drift',
            description: 'Recent review answers show unstable recall.',
            severityDelta: 6,
            relatedNodeIds: [nodeId],
            evidenceRef: evidence.id,
            tags: ['review', 'memory'],
          });
        }
      },
      undefined,
    );
  }

  async logWriteAttempt(input: { languageCode: string; text: string; corrections: number; hasAnalysis: boolean }): Promise<void> {
    await this.withPersistence(
      async (context) => {
        const ids = await this.ensureLearnerAndLanguage(context, input.languageCode);
        if (!ids) return;

        const nodeId = await this.selectNodeId(context, input.languageCode, input.text.slice(0, 32));
        if (!nodeId) return;

        const correctionScore = Math.max(0, 100 - input.corrections * 12);
        const evidenceInput: CreateEvidenceInput = {
          learnerId: ids.learnerId,
          languageId: ids.languageId,
          activityType: 'writing_submission',
          nodeIds: [nodeId],
          rawInputText: input.text,
          analysisResult: {
            hasAnalysis: input.hasAnalysis,
            correctionCount: input.corrections,
          },
          scores: {
            writingQuality: correctionScore,
            production: correctionScore,
          },
          correctionCount: input.corrections,
          confidenceEstimate: correctionScore / 100,
          metadata: { source: 'write_editor' },
        };

        const evidence = await context.repositories.evidence.logEvidence(evidenceInput);

        const success = correctionScore >= 65;
        await this.applyLearnerDelta(context, {
          learnerId: ids.learnerId,
          languageId: ids.languageId,
          nodeId,
          masteryDelta: success ? 5 : -3,
          confidenceDelta: success ? 4 : -2,
          modality: 'writing',
          weakTags: success ? [] : ['writing_accuracy'],
          errorTags: success ? [] : ['grammar'],
          success,
        });

        if (!success) {
          await this.upsertWeaknessCluster(context, {
            learnerId: ids.learnerId,
            languageId: ids.languageId,
            clusterKey: 'writing-accuracy',
            title: 'Writing Accuracy',
            description: 'Grammar and production stability need reinforcement.',
            severityDelta: 5,
            relatedNodeIds: [nodeId],
            evidenceRef: evidence.id,
            tags: ['writing', 'grammar', 'production'],
          });
        }
      },
      undefined,
    );
  }

  async logSpeakAttempt(input: { languageCode: string; transcript: string; accuracy: number; fluency: number; tip: string }): Promise<void> {
    await this.withPersistence(
      async (context) => {
        const ids = await this.ensureLearnerAndLanguage(context, input.languageCode);
        if (!ids) return;

        const nodeId = await this.selectNodeId(context, input.languageCode, input.transcript.slice(0, 32));
        if (!nodeId) return;

        const evidence = await context.repositories.evidence.logEvidence({
          learnerId: ids.learnerId,
          languageId: ids.languageId,
          activityType: 'speaking_attempt',
          nodeIds: [nodeId],
          rawOutputText: input.transcript,
          transcription: input.transcript,
          pronunciationNotes: input.tip,
          analysisResult: {
            tip: input.tip,
          },
          scores: {
            accuracy: clampPercent(input.accuracy),
            fluency: clampPercent(input.fluency),
            pronunciation: clampPercent((input.accuracy + input.fluency) / 2),
          },
          confidenceEstimate: clampPercent((input.accuracy + input.fluency) / 2) / 100,
          metadata: { source: 'speak_session' },
        });

        const success = (input.accuracy + input.fluency) / 2 >= 68;
        await this.applyLearnerDelta(context, {
          learnerId: ids.learnerId,
          languageId: ids.languageId,
          nodeId,
          masteryDelta: success ? 5 : -4,
          confidenceDelta: success ? 4 : -3,
          modality: 'pronunciation',
          weakTags: success ? [] : ['pronunciation_control'],
          errorTags: success ? [] : ['speaking_accuracy'],
          success,
        });

        if (!success) {
          await this.upsertWeaknessCluster(context, {
            learnerId: ids.learnerId,
            languageId: ids.languageId,
            clusterKey: 'pronunciation-repair',
            title: 'Pronunciation Repair',
            description: 'Speaking evidence indicates unstable pronunciation control.',
            severityDelta: 7,
            relatedNodeIds: [nodeId],
            evidenceRef: evidence.id,
            tags: ['speaking', 'pronunciation'],
          });
        }
      },
      undefined,
    );
  }

  async logLearnInteraction(input: LessonActivityInput): Promise<void> {
    await this.withPersistence(
      async (context) => {
        const ids = await this.ensureLearnerAndLanguage(context, input.languageCode);
        if (!ids) return;

        const nodeId = await this.selectNodeId(context, input.languageCode, input.lessonId);
        if (!nodeId) return;

        const minutes = parseDurationMinutes(input.durationLabel);
        const completionScore = input.lessonStatus === 'completed' ? 90 : 65;
        const evidence = await context.repositories.evidence.logEvidence({
          learnerId: ids.learnerId,
          languageId: ids.languageId,
          activityType: 'learn_lesson',
          nodeIds: [nodeId],
          rawInputText: input.lessonTitle,
          analysisResult: { lessonStatus: input.lessonStatus },
          scores: { completion: completionScore },
          timeTakenMs: minutes * 60 * 1000,
          confidenceEstimate: completionScore / 100,
          metadata: { lessonId: input.lessonId, source: 'learn_module' },
        });

        await this.applyLearnerDelta(context, {
          learnerId: ids.learnerId,
          languageId: ids.languageId,
          nodeId,
          masteryDelta: completionScore >= 80 ? 4 : 2,
          confidenceDelta: completionScore >= 80 ? 3 : 1,
          modality: 'reading',
          weakTags: [],
          errorTags: [],
          success: true,
        });

        await this.createOrUpdateReviewItem(context, {
          learnerId: ids.learnerId,
          languageId: ids.languageId,
          nodeId,
          result: completionScore >= 80 ? 'correct' : 'incorrect',
        });

        await context.db.execute(
          `
          INSERT INTO content_usage (
            id, content_item_id, learner_id, language_id, session_id, usage_type, used_at, outcome_json
          )
          VALUES (?, NULL, ?, ?, NULL, 'lesson_interaction', ?, ?);
          `,
          [makeId('usage'), ids.learnerId, ids.languageId, nowIso(), stringifyJson({ evidenceId: evidence.id, lessonId: input.lessonId })],
        );
      },
      undefined,
    );
  }

  async logScriptPracticeAttempt(input: ScriptPracticeAttemptInput): Promise<void> {
    await this.withPersistence(
      async (context) => {
        const ids = await this.ensureLearnerAndLanguage(context, input.languageCode);
        if (!ids) return;
        const nodeId = await this.selectNodeId(context, input.languageCode, input.scriptKey);
        if (!nodeId) return;

        const now = nowIso();
        const attemptId = makeId('spa');
        await context.db.execute(
          `
          INSERT INTO script_practice_attempts (
            id, learner_id, language_id, node_id, script_key, mode, stroke_data_ref, stroke_data_json,
            completion_ratio, duration_ms, success, feedback_json, metadata_json, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?);
          `,
          [
            attemptId,
            ids.learnerId,
            ids.languageId,
            nodeId,
            input.scriptKey,
            input.mode,
            stringifyJson(input.strokeData ?? {}),
            clampPercent(input.completionRatio),
            input.durationMs,
            toSqlBool(input.success),
            stringifyJson({ captureOnly: true }),
            stringifyJson({ source: 'script_practice_v1' }),
            now,
          ],
        );

        const rows = await context.db.select<{
          id: string;
          attempts_count: number;
          success_count: number;
          failure_count: number;
          completion_score: number;
          recall_score: number;
          trace_score: number;
          guided_score: number;
          free_score: number;
          timed_score: number;
        }>(
          `
          SELECT id, attempts_count, success_count, failure_count, completion_score, recall_score,
                 trace_score, guided_score, free_score, timed_score
          FROM learner_script_state
          WHERE learner_id = ? AND language_id = ? AND node_id = ? AND script_key = ?
          LIMIT 1;
          `,
          [ids.learnerId, ids.languageId, nodeId, input.scriptKey],
        );

        const current = rows[0];
        const nextAttempts = (current?.attempts_count ?? 0) + 1;
        const nextSuccess = (current?.success_count ?? 0) + (input.success ? 1 : 0);
        const nextFailure = (current?.failure_count ?? 0) + (input.success ? 0 : 1);
        const nextCompletion = clampPercent(((current?.completion_score ?? 0) * (nextAttempts - 1) + clampPercent(input.completionRatio)) / nextAttempts);

        const scoreByMode = {
          recall: current?.recall_score ?? 0,
          trace: current?.trace_score ?? 0,
          guided: current?.guided_score ?? 0,
          free: current?.free_score ?? 0,
          timed: current?.timed_score ?? 0,
        };

        if (input.mode === 'trace') scoreByMode.trace = nextCompletion;
        if (input.mode === 'guided_draw') scoreByMode.guided = nextCompletion;
        if (input.mode === 'free_draw') scoreByMode.free = nextCompletion;
        if (input.mode === 'timed_recall_draw') scoreByMode.timed = nextCompletion;
        if (input.mode === 'watch') scoreByMode.recall = nextCompletion;

        await context.db.execute(
          `
          INSERT INTO learner_script_state (
            id, learner_id, language_id, node_id, script_key, attempts_count, success_count, failure_count,
            completion_score, recall_score, trace_score, guided_score, free_score, timed_score,
            last_attempt_at, weak_components_json, metadata_json, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(learner_id, language_id, node_id, script_key) DO UPDATE SET
            attempts_count = excluded.attempts_count,
            success_count = excluded.success_count,
            failure_count = excluded.failure_count,
            completion_score = excluded.completion_score,
            recall_score = excluded.recall_score,
            trace_score = excluded.trace_score,
            guided_score = excluded.guided_score,
            free_score = excluded.free_score,
            timed_score = excluded.timed_score,
            last_attempt_at = excluded.last_attempt_at,
            metadata_json = excluded.metadata_json,
            updated_at = excluded.updated_at;
          `,
          [
            current?.id ?? makeId('lss'),
            ids.learnerId,
            ids.languageId,
            nodeId,
            input.scriptKey,
            nextAttempts,
            nextSuccess,
            nextFailure,
            nextCompletion,
            scoreByMode.recall,
            scoreByMode.trace,
            scoreByMode.guided,
            scoreByMode.free,
            scoreByMode.timed,
            now,
            stringifyJson([]),
            stringifyJson({ v: 1 }),
            now,
            now,
          ],
        );

        await context.repositories.evidence.logEvidence({
          learnerId: ids.learnerId,
          languageId: ids.languageId,
          activityType: 'script_practice_attempt',
          nodeIds: [nodeId],
          scores: { completion: nextCompletion },
          confidenceEstimate: nextCompletion / 100,
          metadata: {
            mode: input.mode,
            scriptKey: input.scriptKey,
            scriptAttemptId: attemptId,
          },
        });
      },
      undefined,
    );
  }

  /**
   * Records a completed typing run as study activity.
   *
   * Without this the trainer was a closed loop: it stored its own history and
   * nothing else in the app knew the learner had practised, so a typing session
   * counted toward no streak, goal, or activity total.
   */
  async logTypingRun(input: {
    languageCode: string;
    wpm: number;
    accuracy: number;
    elapsedSeconds: number;
    mode: string;
    charactersTyped: number;
  }): Promise<void> {
    await this.withPersistence(
      async (context) => {
        const ids = await this.ensureLearnerAndLanguage(context, input.languageCode);
        if (!ids) return;
        const nodeId = await this.selectNodeId(context, input.languageCode, `typing-${input.mode}`);
        if (!nodeId) return;

        await context.repositories.evidence.logEvidence({
          learnerId: ids.learnerId,
          languageId: ids.languageId,
          activityType: 'typing_run',
          nodeIds: [nodeId],
          scores: { accuracy: clampPercent(input.accuracy) },
          confidenceEstimate: clampPercent(input.accuracy) / 100,
          metadata: {
            wpm: input.wpm,
            elapsedSeconds: input.elapsedSeconds,
            mode: input.mode,
            charactersTyped: input.charactersTyped,
          },
        });
      },
      undefined,
    );
  }

  /**
   * Records a conversation turn as study activity.
   *
   * Chat was a closed loop like the typing trainer was: the learner could
   * practise for twenty minutes and no streak, goal or activity total moved.
   */
  async logChatTurn(input: {
    languageCode: string;
    learnerText: string;
    replyText: string;
    /** Spoken practice rather than typed, so the two can be told apart later. */
    spoken?: boolean;
  }): Promise<void> {
    await this.withPersistence(
      async (context) => {
        const ids = await this.ensureLearnerAndLanguage(context, input.languageCode);
        if (!ids) return;
        const nodeId = await this.selectNodeId(context, input.languageCode, input.learnerText);
        if (!nodeId) return;

        await context.repositories.evidence.logEvidence({
          learnerId: ids.learnerId,
          languageId: ids.languageId,
          activityType: input.spoken ? 'spoken_chat_turn' : 'chat_turn',
          nodeIds: [nodeId],
          rawInputText: input.learnerText,
          rawOutputText: input.replyText,
          // A conversation turn is participation, not a graded answer, so it
          // carries no correctness score to avoid inventing one.
          scores: {},
          metadata: { characters: input.learnerText.length, spoken: Boolean(input.spoken) },
        });
      },
      undefined,
    );
  }

  /**
   * Records a Quick Practice answer as study activity.
   *
   * Quick Practice updated an aggregate signal and, on a miss, queued a review
   * item — but logged no evidence, so a full drill session moved no streak,
   * goal or activity total.
   */
  async logQuickPracticeAttempt(input: {
    languageCode: string;
    prompt: string;
    expectedAnswer: string;
    correct: boolean;
    exerciseType: string;
  }): Promise<void> {
    await this.withPersistence(
      async (context) => {
        const ids = await this.ensureLearnerAndLanguage(context, input.languageCode);
        if (!ids) return;
        const nodeId = await this.selectNodeId(context, input.languageCode, input.prompt);
        if (!nodeId) return;

        await context.repositories.evidence.logEvidence({
          learnerId: ids.learnerId,
          languageId: ids.languageId,
          activityType: 'quick_practice_attempt',
          nodeIds: [nodeId],
          rawInputText: input.prompt,
          rawOutputText: input.expectedAnswer,
          scores: { correctness: input.correct ? 100 : 25 },
          confidenceEstimate: input.correct ? 0.7 : 0.3,
          analysisResult: { result: input.correct ? 'correct' : 'incorrect' },
          metadata: { exerciseType: input.exerciseType },
        });
      },
      undefined,
    );
  }

  /**
   * Records time spent on immersion content as study activity.
   *
   * Immersion persisted position and saved phrases but logged no evidence, so
   * an hour of video or reading left the learner's minutes for the day at
   * zero — the longest activity in the app counted for nothing.
   */
  async logImmersionProgress(input: {
    languageCode: string;
    contentId: string;
    seconds: number;
    completed: boolean;
  }): Promise<void> {
    if (input.seconds <= 0) return;
    await this.withPersistence(
      async (context) => {
        const ids = await this.ensureLearnerAndLanguage(context, input.languageCode);
        if (!ids) return;
        const nodeId = await this.selectNodeId(context, input.languageCode, input.contentId);
        if (!nodeId) return;

        await context.repositories.evidence.logEvidence({
          learnerId: ids.learnerId,
          languageId: ids.languageId,
          activityType: 'immersion_progress',
          nodeIds: [nodeId],
          // Time spent listening or reading is not a graded answer, so it
          // carries no correctness score.
          scores: { seconds: input.seconds },
          metadata: { contentId: input.contentId, completed: input.completed },
        });
      },
      undefined,
    );
  }

  private async queryLanguageMonitoring(
    context: NonNullable<Awaited<typeof this.persistedContext>>,
    input: { learnerId: string; languageId: string; languageCode: string; languageName: string; isActive: boolean; rangeDays: number },
  ): Promise<{
    summary: LanguageProgressSummary;
    weaknessClusters: InsightWeakness[];
    trends: MonitoringTrendPoint[];
    script: ScriptProgressSummary;
    lessonsCompleted: number;
    speakingSessions: number;
    writingPieces: number;
    totalStudyMinutes: number;
    avgSessionMinutes: number;
    reviewAccuracy: number;
    recentEvents: Array<{ title: string; tag: string; time: string }>;
  }> {
    const sinceIso = new Date(Date.now() - input.rangeDays * 24 * 60 * 60 * 1000).toISOString();
    const evidence = await context.repositories.evidence.listEvidenceByLanguage(input.learnerId, input.languageId, 500);
    const withinRange = evidence.filter((item) => item.createdAt >= sinceIso);

    const reviewRows = await context.db.select<{ due_count: number; overdue_count: number }>(
      `
      SELECT
        SUM(CASE WHEN state IN ('pending', 'due') THEN 1 ELSE 0 END) AS due_count,
        SUM(CASE WHEN state IN ('pending', 'due') AND due_at < ? THEN 1 ELSE 0 END) AS overdue_count
      FROM review_items
      WHERE learner_id = ? AND language_id = ?;
      `,
      [nowIso(), input.learnerId, input.languageId],
    );

    const modeRows = await context.db.select<ModeScoreRow>(
      `
      SELECT
        AVG(reading_score) AS reading_score,
        AVG(listening_score) AS listening_score,
        AVG(speaking_score) AS speaking_score,
        AVG(writing_score) AS writing_score,
        AVG(pronunciation_score) AS pronunciation_score,
        AVG(recognition_score) AS recognition_score,
        AVG(production_score) AS production_score,
        AVG(mastery_score) AS avg_mastery_score,
        SUM(CASE WHEN forgetting_risk >= 65 THEN 1 ELSE 0 END) AS unstable_count
      FROM learner_node_state
      WHERE learner_id = ? AND language_id = ?;
      `,
      [input.learnerId, input.languageId],
    );

    const weaknessClusters = (await context.repositories.learner.listWeaknessClusters(input.learnerId, input.languageId))
      .slice(0, 5)
      .map((cluster) => ({
        title: cluster.title,
        severity: clampPercent(cluster.severityScore),
        hitCount: cluster.hitCount,
      }));

    const trendByDay = new Map<string, MonitoringTrendPoint>();
    let totalMinutes = 0;
    let reviewCorrect = 0;
    let reviewTotal = 0;
    let speakingSessions = 0;
    let writingPieces = 0;
    let lessonsCompleted = 0;

    for (const item of withinRange) {
      const dayKey = item.createdAt.slice(0, 10);
      const minutes = Math.max(1, Math.round((item.timeTakenMs ?? 180000) / 60000));
      totalMinutes += minutes;

      const entry = trendByDay.get(dayKey) ?? {
        date: dayKey,
        evidenceCount: 0,
        reviewPressure: 0,
        readingMinutes: 0,
        listeningMinutes: 0,
        speakingMinutes: 0,
        writingMinutes: 0,
      };
      entry.evidenceCount += 1;
      if (item.activityType.includes('review')) {
        entry.reviewPressure += 1;
        reviewTotal += 1;
        if (Number(item.scores.correctness ?? 0) >= 70) reviewCorrect += 1;
      } else if (item.activityType.includes('speak')) {
        entry.speakingMinutes += minutes;
        speakingSessions += 1;
      } else if (item.activityType.includes('write')) {
        entry.writingMinutes += minutes;
        writingPieces += 1;
      } else if (item.activityType.includes('chat')) {
        // Conversation practice is production time, but a chat turn is not a
        // recorded speaking attempt, so it does not inflate that count.
        entry.speakingMinutes += minutes;
      } else if (item.activityType.includes('script_practice')) {
        // Drawing characters is writing practice; it was falling through to
        // the listening bucket.
        entry.writingMinutes += minutes;
      } else if (item.activityType.includes('typing')) {
        // Time at the keyboard is writing time, but a speed run is not a piece
        // of writing, so it does not count toward writingPieces.
        entry.writingMinutes += minutes;
      } else if (item.activityType.includes('immersion')) {
        entry.listeningMinutes += minutes;
      } else if (item.activityType.includes('quick_practice')) {
        // Drill time is study time, but a drill item is not a lesson, so it
        // does not inflate the lessons-completed count.
        entry.readingMinutes += minutes;
      } else if (item.activityType.includes('learn')) {
        entry.readingMinutes += minutes;
        lessonsCompleted += 1;
      } else {
        entry.listeningMinutes += minutes;
      }
      trendByDay.set(dayKey, entry);
    }

    const mode = modeRows[0];
    const review = reviewRows[0];
    const modalityCount = mode ? 1 : 0;
    const dataState = resolveDataState(withinRange.length);
    const scores = {
      reading: clampPercent(Number(mode?.reading_score ?? 0)),
      listening: clampPercent(Number(mode?.listening_score ?? 0)),
      speaking: clampPercent(Number(mode?.speaking_score ?? 0)),
      writing: clampPercent(Number(mode?.writing_score ?? 0)),
      pronunciation: clampPercent(Number(mode?.pronunciation_score ?? 0)),
      recognition: clampPercent(Number(mode?.recognition_score ?? 0)),
      production: clampPercent(Number(mode?.production_score ?? 0)),
    };

    const weakAreas = weaknessClusters.map((item) => item.title).slice(0, 3);
    if (weakAreas.length === 0 && dataState !== 'ready') {
      weakAreas.push('Not enough data yet');
    }

    const scriptRows = await context.db.select<{
      script_key: string;
      completion_score: number;
      trace_score: number;
      free_score: number;
      attempts_count: number;
      failure_count: number;
      recall_score: number;
    }>(
      `
      SELECT script_key, completion_score, trace_score, free_score, attempts_count, failure_count, recall_score
      FROM learner_script_state
      WHERE learner_id = ? AND language_id = ?
      ORDER BY attempts_count DESC, updated_at DESC;
      `,
      [input.learnerId, input.languageId],
    );

    const scriptDataState: MonitoringDataState =
      input.languageCode === 'zh' || input.languageCode === 'ja'
        ? resolveDataState(scriptRows.length)
        : 'not_applicable';
    const avgTrace = scriptRows.length > 0 ? clampPercent(scriptRows.reduce((acc, row) => acc + Number(row.trace_score ?? 0), 0) / scriptRows.length) : 0;
    const avgFree = scriptRows.length > 0 ? clampPercent(scriptRows.reduce((acc, row) => acc + Number(row.free_score ?? 0), 0) / scriptRows.length) : 0;
    const avgRecall = scriptRows.length > 0 ? clampPercent(scriptRows.reduce((acc, row) => acc + Number(row.recall_score ?? 0), 0) / scriptRows.length) : 0;
    const weakScriptKeys = scriptRows
      .filter((row) => Number(row.failure_count ?? 0) > 0 || Number(row.completion_score ?? 0) < 55)
      .map((row) => row.script_key)
      .slice(0, 5);

    const trends = Array.from(trendByDay.values()).sort((a, b) => a.date.localeCompare(b.date));
    const reviewPressure = Number(review?.due_count ?? 0) + Number(review?.overdue_count ?? 0);
    const recentEvents = withinRange.slice(0, 4).map((item) => ({
      title: item.activityType.replace(/_/g, ' '),
      tag: item.activityType.split('_')[0],
      time: relativeTimeLabel(item.createdAt),
    }));

    return {
      summary: {
        languageCode: input.languageCode,
        languageName: input.languageName,
        isActive: input.isActive,
        dataState: modalityCount > 0 ? dataState : 'empty',
        stageLabel: stageLabelFromMastery(Number(mode?.avg_mastery_score ?? 0)),
        dueNowCount: Number(review?.due_count ?? 0),
        overdueCount: Number(review?.overdue_count ?? 0),
        reviewPressure,
        recentEvidenceCount: withinRange.length,
        recentGain: clampPercent(
          Number(mode?.avg_mastery_score ?? 0) -
            Math.max(0, Number(mode?.avg_mastery_score ?? 0) - Math.min(15, withinRange.length * 2)),
        ),
        weakAreas,
        scores,
      },
      weaknessClusters,
      trends,
      script: {
        languageCode: input.languageCode,
        dataState: scriptDataState,
        introducedCharacters: scriptRows.length,
        traceSuccessRate: avgTrace,
        freeDrawSuccessRate: avgFree,
        weakScriptKeys,
        recentPracticeCount: scriptRows.reduce((acc, row) => acc + Number(row.attempts_count ?? 0), 0),
        recognitionVsWritingGap: clampPercent(Math.max(0, scores.recognition - avgRecall)),
      },
      lessonsCompleted,
      speakingSessions,
      writingPieces,
      totalStudyMinutes: totalMinutes,
      avgSessionMinutes: withinRange.length > 0 ? Math.max(1, Math.round(totalMinutes / withinRange.length)) : 0,
      reviewAccuracy: reviewTotal > 0 ? Math.round((reviewCorrect / reviewTotal) * 100) : 0,
      recentEvents,
    };
  }

  async queryProfileDashboard(input?: { rangeDays?: number; includeAllLanguages?: boolean }): Promise<ProfileDashboardSnapshot> {
    const rangeDays = input?.rangeDays ?? 30;
    const includeAllLanguages = input?.includeAllLanguages ?? true;
    const fallback: ProfileDashboardSnapshot = {
      generatedAt: nowIso(),
      rangeDays,
      dataState: 'empty',
      profileOverview: {
        learnerId: '',
        displayName: 'Local Learner',
        nativeLanguageCode: 'en',
        baseLanguageCode: 'en',
        activeLanguageCodes: [],
        totalStudySessions: 0,
        recentActivityMinutes: 0,
        currentStreak: 0,
        longestStreak: 0,
        suggestedFocus: 'Complete one short session to start building your profile.',
      },
      languageSummaries: [],
      goals: [],
      strengthsWeaknesses: {
        dataState: 'empty',
        strongestModes: [],
        weakestModes: [],
        topWeaknessClusters: [],
        pronunciationFlag: 'not_enough_data',
        scriptWeaknessSummary: 'Not enough data yet',
      },
      capabilities: [],
      activityTrends: [],
      scriptWriting: [],
    };

    return this.withPersistence(async (context) => {
      const learner = await context.repositories.learner.getActiveProfile();
      if (!learner) {
        return fallback;
      }
      const activeLanguage = await context.repositories.languages.getActiveLanguage();
      const allLanguages = await context.repositories.languages.listLanguages();
      const languages = includeAllLanguages
        ? allLanguages
        : allLanguages.filter((item) => item.code === activeLanguage?.code);

      const languageStateRows = await context.db.select<LearnerLanguageStateRow>(
        `
        SELECT ls.language_id, l.code, l.name, ls.current_streak, ls.longest_streak, ls.today_minutes, ls.total_xp
        FROM learner_language_state ls
        JOIN languages l ON l.id = ls.language_id
        WHERE ls.learner_id = ?;
        `,
        [learner.id],
      );
      const languageStateByCode = new Map(languageStateRows.map((row) => [row.code, row]));

      const languageOutputs = await Promise.all(
        languages.map(async (language) => {
          const ids = await this.ensureLearnerAndLanguage(context, language.code);
          if (!ids) return null;
          return this.queryLanguageMonitoring(context, {
            learnerId: ids.learnerId,
            languageId: ids.languageId,
            languageCode: language.code,
            languageName: language.name,
            isActive: language.code === activeLanguage?.code,
            rangeDays,
          });
        }),
      );
      const nonNullOutputs = languageOutputs.filter((item): item is NonNullable<typeof item> => item !== null);

      const languageSummaries = nonNullOutputs
        .map((item) => item.summary)
        .sort((a, b) => Number(b.isActive) - Number(a.isActive) || b.recentEvidenceCount - a.recentEvidenceCount);

      const aggregatedWeakness = nonNullOutputs.flatMap((item) => item.weaknessClusters);
      const strongestModes = ['reading', 'listening', 'speaking', 'writing', 'pronunciation', 'recognition', 'production']
        .map((key) => ({
          key,
          score:
            languageSummaries.reduce((acc, summary) => {
              return acc + summary.scores[key as keyof LanguageProgressSummary['scores']];
            }, 0) / Math.max(1, languageSummaries.length),
        }))
        .sort((a, b) => b.score - a.score);

      const goals = await context.db.select<ProfileGoalRow>(
        `
        SELECT g.id, l.code AS language_code, g.goal_type, g.title, g.target_value, g.current_value, g.status, g.due_at
        FROM goals g
        LEFT JOIN languages l ON l.id = g.language_id
        WHERE g.learner_id = ?
        ORDER BY g.updated_at DESC
        LIMIT 20;
        `,
        [learner.id],
      );

      const capabilitySummaries: CapabilityStatusSummary[] = [];
      for (const language of languages) {
        const ids = await this.ensureLearnerAndLanguage(context, language.code);
        if (!ids) continue;
        const bundle = await context.repositories.curriculum.getCurriculumByLanguageCode(language.code);
        if (!bundle) continue;
        const nodeStateRows = await context.repositories.learner.listLearnerNodeStates(ids.learnerId, ids.languageId, 1200);
        const nodeById = new Map(nodeStateRows.map((row) => [row.nodeId, row]));
        const capabilityLinksById = new Map<string, string[]>();
        for (const link of bundle.nodeCapabilityLinks) {
          const existing = capabilityLinksById.get(link.capabilityId) ?? [];
          existing.push(link.nodeId);
          capabilityLinksById.set(link.capabilityId, existing);
        }

        for (const capability of bundle.capabilities) {
          const nodes = capabilityLinksById.get(capability.id) ?? [];
          const covered = nodes.filter((nodeId) => (nodeById.get(nodeId)?.masteryScore ?? 0) >= 70).length;
          const coverage = nodes.length > 0 ? clampPercent((covered / nodes.length) * 100) : 0;
          capabilitySummaries.push({
            languageCode: language.code,
            capabilitySlug: capability.slug,
            title: capability.title,
            levelBand: capability.levelBand,
            status: coverage >= 75 ? 'unlocked' : coverage >= 30 ? 'partial' : 'blocked',
            coverage,
          });
        }
      }

      const totalSessions = nonNullOutputs.reduce((acc, item) => acc + item.lessonsCompleted + item.speakingSessions + item.writingPieces, 0);
      const totalRecentMinutes = nonNullOutputs.reduce((acc, item) => acc + item.totalStudyMinutes, 0);
      const activeState = activeLanguage ? languageStateByCode.get(activeLanguage.code) : null;
      const weakestLanguage = languageSummaries.slice().sort((a, b) => b.overdueCount - a.overdueCount || a.scores.recognition - b.scores.recognition)[0];
      const suggestedFocus = weakestLanguage
        ? `${weakestLanguage.languageName}: prioritize ${weakestLanguage.weakAreas[0] ?? 'due review'}`
        : 'Complete one short session to start building your profile.';

      return {
        generatedAt: nowIso(),
        rangeDays,
        dataState: resolveDataState(languageSummaries.reduce((acc, row) => acc + row.recentEvidenceCount, 0)),
        profileOverview: {
          learnerId: learner.id,
          displayName: learner.displayName,
          nativeLanguageCode: learner.nativeLanguageCode,
          baseLanguageCode: learner.baseLanguageCode,
          activeLanguageCodes: languageSummaries.filter((item) => item.recentEvidenceCount > 0 || item.isActive).map((item) => item.languageCode),
          totalStudySessions: totalSessions,
          recentActivityMinutes: totalRecentMinutes,
          currentStreak: Number(activeState?.current_streak ?? 0),
          longestStreak: Number(activeState?.longest_streak ?? 0),
          suggestedFocus,
        },
        languageSummaries,
        goals: goals.map((goal) => ({
          id: goal.id,
          languageCode: goal.language_code,
          title: goal.title,
          goalType: goal.goal_type,
          status: goal.status,
          targetValue: goal.target_value,
          currentValue: goal.current_value,
          dueAt: goal.due_at,
        })),
        strengthsWeaknesses: {
          dataState: resolveDataState(languageSummaries.reduce((acc, row) => acc + row.recentEvidenceCount, 0)),
          strongestModes: strongestModes.slice(0, 2).map((item) => item.key),
          weakestModes: strongestModes.slice(-2).map((item) => item.key),
          topWeaknessClusters: aggregatedWeakness.sort((a, b) => b.severity - a.severity).slice(0, 5),
          pronunciationFlag:
            languageSummaries.length === 0
              ? 'not_enough_data'
              : languageSummaries.some((summary) => summary.scores.pronunciation < 55)
                ? 'needs_work'
                : 'stable',
          scriptWeaknessSummary:
            nonNullOutputs.some((item) => item.script.dataState !== 'not_applicable' && item.script.weakScriptKeys.length > 0)
              ? nonNullOutputs
                  .filter((item) => item.script.weakScriptKeys.length > 0)
                  .map((item) => `${item.script.languageCode}: ${item.script.weakScriptKeys.slice(0, 2).join(', ')}`)
                  .join(' | ')
              : 'No major script-writing weaknesses yet',
        },
        capabilities: capabilitySummaries.sort((a, b) => b.coverage - a.coverage),
        activityTrends: nonNullOutputs.flatMap((item) => item.trends).sort((a, b) => a.date.localeCompare(b.date)),
        scriptWriting: nonNullOutputs.map((item) => item.script),
      };
    }, fallback);
  }

  async queryInsights(languageCode: string, rangeDays = 90): Promise<InsightsSnapshot> {
    const fallback: InsightsSnapshot = {
      languageCode,
      generatedAt: nowIso(),
      totalStudyMinutes: 0,
      wordsLearned: 0,
      lessonsCompleted: 0,
      reviewAccuracy: 0,
      speakingSessions: 0,
      writingPieces: 0,
      avgSessionMinutes: 0,
      dueNowCount: 0,
      overdueCount: 0,
      unstableCount: 0,
      readingScore: 0,
      listeningScore: 0,
      speakingScore: 0,
      writingScore: 0,
      pronunciationScore: 0,
      recognitionScore: 0,
      productionScore: 0,
      weeklyActivity: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => ({ day, minutes: 0 })),
      pronunciationTrend: [],
      recentEvents: [],
      weaknessClusters: [],
      scriptProgress: 0,
      dataState: 'empty',
      modalityDataState: 'empty',
      scriptDataState: 'not_applicable',
    };

    return this.withPersistence(async (context) => {
      const languageRows = await context.repositories.languages.listLanguages();
      const language = languageRows.find((row) => row.code === languageCode);
      const ids = await this.ensureLearnerAndLanguage(context, languageCode);
      if (!ids || !language) return fallback;

      const profile = await this.queryProfileDashboard({ rangeDays, includeAllLanguages: true });
      const summary = profile.languageSummaries.find((item) => item.languageCode === languageCode);
      const scriptSummary = profile.scriptWriting.find((item) => item.languageCode === languageCode);
      const monitoring = await this.queryLanguageMonitoring(context, {
        learnerId: ids.learnerId,
        languageId: ids.languageId,
        languageCode,
        languageName: language.name,
        isActive: language.isActive,
        rangeDays,
      });

      const pronunciationTrend = monitoring.trends
        .filter((entry) => entry.speakingMinutes > 0)
        .slice(-10)
        .map((_, index) => ({
          session: `S${index + 1}`,
          score: clampPercent(summary?.scores.pronunciation ?? 0),
        }));

      const weeklyMap = new Map<string, number>([
        ['Sun', 0], ['Mon', 0], ['Tue', 0], ['Wed', 0], ['Thu', 0], ['Fri', 0], ['Sat', 0],
      ]);
      for (const trend of monitoring.trends) {
        const day = dayLabel(`${trend.date}T00:00:00.000Z`);
        const minutes = trend.readingMinutes + trend.listeningMinutes + trend.speakingMinutes + trend.writingMinutes;
        weeklyMap.set(day, (weeklyMap.get(day) ?? 0) + minutes);
      }
      const weeklyActivity = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => ({ day, minutes: weeklyMap.get(day) ?? 0 }));

      return {
        languageCode,
        generatedAt: nowIso(),
        totalStudyMinutes: monitoring.totalStudyMinutes,
        wordsLearned: Math.max(0, Math.round((summary?.recentEvidenceCount ?? 0) * 1.5)),
        lessonsCompleted: monitoring.lessonsCompleted,
        reviewAccuracy: monitoring.reviewAccuracy,
        speakingSessions: monitoring.speakingSessions,
        writingPieces: monitoring.writingPieces,
        avgSessionMinutes: monitoring.avgSessionMinutes,
        dueNowCount: summary?.dueNowCount ?? 0,
        overdueCount: summary?.overdueCount ?? 0,
        unstableCount: Math.max(0, Math.round((summary?.reviewPressure ?? 0) / 2)),
        readingScore: summary?.scores.reading ?? 0,
        listeningScore: summary?.scores.listening ?? 0,
        speakingScore: summary?.scores.speaking ?? 0,
        writingScore: summary?.scores.writing ?? 0,
        pronunciationScore: summary?.scores.pronunciation ?? 0,
        recognitionScore: summary?.scores.recognition ?? 0,
        productionScore: summary?.scores.production ?? 0,
        weeklyActivity,
        pronunciationTrend,
        recentEvents: monitoring.recentEvents,
        weaknessClusters: monitoring.weaknessClusters,
        scriptProgress: scriptSummary?.traceSuccessRate ?? 0,
        dataState: summary?.dataState ?? 'empty',
        modalityDataState: summary?.dataState ?? 'empty',
        scriptDataState: scriptSummary?.dataState ?? 'not_applicable',
      };
    }, fallback);
  }
}

export const integrationService = new IntegrationService();
