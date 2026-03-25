import { RepositoryError } from './errors';
import { makeId, nowIso, stringifyJson } from './utils';
import type { PersistenceContext } from './types';

const LEGACY_MIGRATION_KEY = 'legacy_migration_v1_done';
const ACTIVE_LANGUAGE_KEY = 'active_language_code';
const DEFAULT_LEARNER_KEY = 'default_learner_id';
const LEGACY_UNMAPPED_KEY = 'legacy_unmapped_v1';

const LANGUAGES_STORAGE_KEY = 'numo_languages';
const ACTIVE_LANGUAGE_STORAGE_KEY = 'numo_active_language';
const APP_DATA_STORAGE_KEY = 'noema_app_data_v1';

interface LegacyLanguage {
  code: string;
  name?: string;
  flag?: string;
  progress?: {
    dailyGoalMinutes?: number;
    currentStreak?: number;
    longestStreak?: number;
    todayMinutes?: number;
    totalXP?: number;
  };
}

interface LegacyReviewItem {
  id?: string;
  dueDate?: string;
  nextDueAt?: string;
  intervalDays?: number;
  ease?: number;
  attempts?: number;
  lastReviewed?: string;
  lastResult?: 'correct' | 'incorrect';
  strength?: string;
  sourceNotebookId?: string;
  origin?: string;
  term?: string;
  translation?: string;
  type?: string;
}

interface LegacyNotebookEntry {
  id?: string;
  term?: string;
  translation?: string;
  type?: string;
  context?: string;
  notes?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  mastery?: number;
  source?: string;
  favorited?: boolean;
}

interface LegacyWritingDraft {
  id?: string;
  promptId?: string;
  title?: string;
  content?: string;
  corrections?: number;
  createdAt?: string;
  updatedAt?: string;
  wordCount?: number;
  analysis?: unknown;
  lastAnalyzedAt?: string;
}

interface LegacySpeakingRun {
  id?: string;
  sessionId?: string;
  recordedAt?: string;
  transcript?: string;
  accuracy?: number;
  fluency?: number;
  tip?: string;
  feedbackSource?: string;
}

interface LegacyAppData {
  reviewItems?: LegacyReviewItem[];
  notebookEntries?: LegacyNotebookEntry[];
  writingDrafts?: LegacyWritingDraft[];
  speakingRuns?: LegacySpeakingRun[];
  immersionProgress?: unknown;
  schemaVersion?: number;
  [key: string]: unknown;
}

function safeParseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function safeIso(value: string | undefined | null, fallback: string | null): string | null {
  if (!value) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T08:00:00.000Z`;
  }
  return value;
}

function normalizeReviewState(dueAt: string): 'pending' | 'due' {
  return dueAt <= nowIso() ? 'due' : 'pending';
}

function stableLegacyId(prefix: string, value: string | undefined, fallbackPrefix: string): string {
  if (value && value.trim().length > 0) {
    return `${prefix}_${value}`;
  }
  return makeId(fallbackPrefix);
}

async function getLanguageIdByCode(context: PersistenceContext, code: string): Promise<string | null> {
  const language = await context.repositories.languages.getLanguageByCode(code);
  return language?.id ?? null;
}

async function importLegacyLanguages(
  context: PersistenceContext,
  learnerId: string,
): Promise<{ activeLanguageCode: string | null; rawLanguages: LegacyLanguage[] | null }> {
  const rawLanguages = safeParseJson<LegacyLanguage[]>(localStorage.getItem(LANGUAGES_STORAGE_KEY));
  if (rawLanguages && Array.isArray(rawLanguages)) {
    for (const language of rawLanguages) {
      if (!language?.code) continue;
      const saved = await context.repositories.languages.upsertLanguage({
        code: language.code,
        name: language.name ?? language.code.toUpperCase(),
        flag: language.flag ?? null,
      });

      if (language.progress) {
        await context.db.execute(
          `
          INSERT INTO learner_language_state (
            id, learner_id, language_id, total_xp, daily_goal_minutes, today_minutes,
            current_streak, longest_streak, last_activity_at, progress_json, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(learner_id, language_id) DO UPDATE SET
            total_xp = excluded.total_xp,
            daily_goal_minutes = excluded.daily_goal_minutes,
            today_minutes = excluded.today_minutes,
            current_streak = excluded.current_streak,
            longest_streak = excluded.longest_streak,
            last_activity_at = excluded.last_activity_at,
            progress_json = excluded.progress_json,
            updated_at = excluded.updated_at;
          `,
          [
            makeId('lls'),
            learnerId,
            saved.id,
            language.progress.totalXP ?? 0,
            language.progress.dailyGoalMinutes ?? 30,
            language.progress.todayMinutes ?? 0,
            language.progress.currentStreak ?? 0,
            language.progress.longestStreak ?? 0,
            nowIso(),
            stringifyJson(language.progress),
            nowIso(),
            nowIso(),
          ],
        );
      }
    }
  }

  const activeLanguageCode =
    localStorage.getItem(ACTIVE_LANGUAGE_STORAGE_KEY) ??
    rawLanguages?.find((item) => item?.code)?.code ??
    null;

  if (activeLanguageCode) {
    await context.repositories.languages.setActiveLanguage(activeLanguageCode);
    await context.repositories.settings.setJson(ACTIVE_LANGUAGE_KEY, activeLanguageCode, 'legacy_migration');
  }

  return { activeLanguageCode, rawLanguages };
}

async function importLegacyReviewItems(
  context: PersistenceContext,
  learnerId: string,
  languageId: string,
  reviewItems: LegacyReviewItem[],
): Promise<void> {
  for (const item of reviewItems) {
    const dueAt = safeIso(item.nextDueAt ?? item.dueDate, nowIso()) ?? nowIso();
    const id = stableLegacyId('legacy_review', item.id, 'legacy_review');
    await context.db.execute(
      `
      INSERT OR IGNORE INTO review_items (
        id, learner_id, language_id, node_id, content_item_id, state, due_at,
        interval_days, ease_factor, last_reviewed_at, last_result, strength,
        attempts_count, metadata_json, created_at, updated_at
      )
      VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        id,
        learnerId,
        languageId,
        normalizeReviewState(dueAt),
        dueAt,
        item.intervalDays ?? 1,
        item.ease ?? 2.3,
        safeIso(item.lastReviewed, null),
        item.lastResult ?? null,
        item.strength ?? null,
        item.attempts ?? 0,
        stringifyJson({
          legacySourceNotebookId: item.sourceNotebookId ?? null,
          legacyOrigin: item.origin ?? null,
          term: item.term ?? null,
          translation: item.translation ?? null,
          type: item.type ?? null,
        }),
        nowIso(),
        nowIso(),
      ],
    );
  }
}

async function importLegacyNotebookEntries(
  context: PersistenceContext,
  languageId: string,
  notebookEntries: LegacyNotebookEntry[],
): Promise<void> {
  for (const entry of notebookEntries) {
    const entryId = stableLegacyId('legacy_note', entry.id, 'legacy_note');
    const revisionId = `${entryId}_rev_1`;
    const createdAt = safeIso(entry.createdAt, nowIso()) ?? nowIso();
    const updatedAt = safeIso(entry.updatedAt, createdAt) ?? createdAt;

    await context.db.execute(
      `
      INSERT OR IGNORE INTO content_items (
        id, language_id, content_type, modality, title, summary, status, approval_status,
        difficulty_band, source_type, source_refs_json, quality_score, generation_version,
        estimated_duration_sec, tags_json, metadata_json, active_revision_id, created_at, updated_at
      )
      VALUES (?, ?, ?, 'text', ?, ?, 'active', 'manual', NULL, 'legacy_notebook', '[]', NULL, 'legacy_v1', NULL, ?, ?, ?, ?, ?);
      `,
      [
        entryId,
        languageId,
        `notebook_${entry.type ?? 'entry'}`,
        entry.term ?? 'Legacy Notebook Entry',
        entry.translation ?? null,
        stringifyJson(entry.tags ?? []),
        stringifyJson({
          context: entry.context ?? null,
          notes: entry.notes ?? null,
          mastery: entry.mastery ?? null,
          source: entry.source ?? null,
          favorited: entry.favorited ?? false,
          legacyCreatedAt: createdAt,
          legacyUpdatedAt: updatedAt,
        }),
        revisionId,
        createdAt,
        updatedAt,
      ],
    );

    await context.db.execute(
      `
      INSERT OR IGNORE INTO content_revisions (
        id, content_item_id, parent_revision_id, revision_number, payload_json, created_by,
        created_by_system, reason_note, is_active, created_at
      )
      VALUES (?, ?, NULL, 1, ?, 'legacy_migration', 1, 'Imported from noema_app_data_v1', 1, ?);
      `,
      [
        revisionId,
        entryId,
        stringifyJson({
          term: entry.term ?? '',
          translation: entry.translation ?? '',
          type: entry.type ?? 'entry',
          context: entry.context ?? null,
          notes: entry.notes ?? null,
          tags: entry.tags ?? [],
        }),
        createdAt,
      ],
    );
  }
}

async function importLegacyWritingDrafts(
  context: PersistenceContext,
  languageId: string,
  drafts: LegacyWritingDraft[],
): Promise<void> {
  for (const draft of drafts) {
    const contentId = stableLegacyId('legacy_draft', draft.id, 'legacy_draft');
    const revisionId = `${contentId}_rev_1`;
    const createdAt = safeIso(draft.createdAt, nowIso()) ?? nowIso();
    const updatedAt = safeIso(draft.updatedAt, createdAt) ?? createdAt;

    await context.db.execute(
      `
      INSERT OR IGNORE INTO content_items (
        id, language_id, content_type, modality, title, summary, status, approval_status,
        difficulty_band, source_type, source_refs_json, quality_score, generation_version,
        estimated_duration_sec, tags_json, metadata_json, active_revision_id, created_at, updated_at
      )
      VALUES (?, ?, 'writing_draft', 'writing', ?, NULL, 'draft', 'manual', NULL, 'legacy_writing_draft', '[]', NULL, 'legacy_v1', NULL, '[]', ?, ?, ?, ?);
      `,
      [
        contentId,
        languageId,
        draft.title ?? 'Legacy Draft',
        stringifyJson({
          promptId: draft.promptId ?? null,
          corrections: draft.corrections ?? 0,
          wordCount: draft.wordCount ?? null,
          analysis: draft.analysis ?? null,
          lastAnalyzedAt: draft.lastAnalyzedAt ?? null,
        }),
        revisionId,
        createdAt,
        updatedAt,
      ],
    );

    await context.db.execute(
      `
      INSERT OR IGNORE INTO content_revisions (
        id, content_item_id, parent_revision_id, revision_number, payload_json, created_by,
        created_by_system, reason_note, is_active, created_at
      )
      VALUES (?, ?, NULL, 1, ?, 'legacy_migration', 1, 'Imported from noema_app_data_v1', 1, ?);
      `,
      [
        revisionId,
        contentId,
        stringifyJson({
          title: draft.title ?? 'Legacy Draft',
          content: draft.content ?? '',
          promptId: draft.promptId ?? null,
          corrections: draft.corrections ?? 0,
          wordCount: draft.wordCount ?? null,
          analysis: draft.analysis ?? null,
          lastAnalyzedAt: draft.lastAnalyzedAt ?? null,
        }),
        createdAt,
      ],
    );
  }
}

async function importLegacySpeakingRuns(
  context: PersistenceContext,
  learnerId: string,
  languageId: string,
  runs: LegacySpeakingRun[],
): Promise<void> {
  for (const run of runs) {
    const evidenceId = stableLegacyId('legacy_speaking', run.id, 'legacy_speaking');
    const createdAt = safeIso(run.recordedAt, nowIso()) ?? nowIso();

    await context.db.execute(
      `
      INSERT OR IGNORE INTO evidence (
        id, learner_id, language_id, session_id, attempt_id, activity_type, node_ids_json,
        content_item_id, raw_input_text, raw_output_text, raw_input_ref, raw_output_ref,
        analysis_result_json, scores_json, confidence_estimate, time_taken_ms, hints_used,
        correction_count, transcription, pronunciation_notes, metadata_json, created_at
      )
      VALUES (?, ?, ?, NULL, NULL, 'speaking', '[]', NULL, NULL, ?, NULL, NULL, '{}', ?, ?, NULL, NULL, NULL, ?, ?, ?, ?);
      `,
      [
        evidenceId,
        learnerId,
        languageId,
        run.tip ?? null,
        stringifyJson({
          accuracy: run.accuracy ?? null,
          fluency: run.fluency ?? null,
        }),
        run.accuracy != null ? Math.max(0, Math.min(1, run.accuracy / 100)) : null,
        run.transcript ?? null,
        run.tip ?? null,
        stringifyJson({
          legacySessionId: run.sessionId ?? null,
          feedbackSource: run.feedbackSource ?? null,
          recordedAt: run.recordedAt ?? null,
        }),
        createdAt,
      ],
    );
  }
}

export async function runLegacyMigrationIfNeeded(context: PersistenceContext): Promise<void> {
  try {
    const migrationDone = await context.repositories.settings.getJson<boolean>(LEGACY_MIGRATION_KEY);
    if (migrationDone === true) {
      return;
    }

    const learner = await context.repositories.learner.ensureDefaultProfile();
    await context.repositories.settings.setJson(DEFAULT_LEARNER_KEY, learner.id, 'system');

    const { activeLanguageCode, rawLanguages } = await importLegacyLanguages(context, learner.id);
    const appData = safeParseJson<LegacyAppData>(localStorage.getItem(APP_DATA_STORAGE_KEY));

    const resolvedLanguageCode =
      activeLanguageCode ?? rawLanguages?.find((language) => language.code)?.code ?? 'es';
    const resolvedLanguageId =
      (await getLanguageIdByCode(context, resolvedLanguageCode)) ??
      (await getLanguageIdByCode(context, 'es'));

    if (appData && resolvedLanguageId) {
      await importLegacyReviewItems(
        context,
        learner.id,
        resolvedLanguageId,
        Array.isArray(appData.reviewItems) ? appData.reviewItems : [],
      );

      await importLegacyNotebookEntries(
        context,
        resolvedLanguageId,
        Array.isArray(appData.notebookEntries) ? appData.notebookEntries : [],
      );

      await importLegacyWritingDrafts(
        context,
        resolvedLanguageId,
        Array.isArray(appData.writingDrafts) ? appData.writingDrafts : [],
      );

      await importLegacySpeakingRuns(
        context,
        learner.id,
        resolvedLanguageId,
        Array.isArray(appData.speakingRuns) ? appData.speakingRuns : [],
      );

      const rest = { ...appData };
      delete rest.reviewItems;
      delete rest.notebookEntries;
      delete rest.writingDrafts;
      delete rest.speakingRuns;
      await context.repositories.settings.setJson(
        LEGACY_UNMAPPED_KEY,
        {
          immersionProgress: appData.immersionProgress ?? null,
          other: rest,
          importedAt: nowIso(),
        },
        'legacy_migration',
      );
    }

    await context.repositories.settings.setJson(LEGACY_MIGRATION_KEY, true, 'legacy_migration');
  } catch (error) {
    throw new RepositoryError('legacyMigration', 'runLegacyMigrationIfNeeded', error);
  }
}
