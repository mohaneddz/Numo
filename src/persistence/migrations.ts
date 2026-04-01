import { MigrationError } from './errors';
import { runInTransaction } from './db';
import type { SqlDatabase } from './types';

interface MigrationDefinition {
  version: number;
  name: string;
  statements: string[];
}

const NODE_TYPES_SQL = [
  'vocabulary_cluster',
  'grammar_concept',
  'phoneme_target',
  'script_target',
  'sentence_pattern',
  'communicative_task',
  'reading_pattern',
  'listening_pattern',
  'writing_target',
  'culture_context',
]
  .map((value) => `'${value}'`)
  .join(', ');

const EDGE_TYPES_SQL = [
  'prerequisite_of',
  'reinforced_by',
  'related_to',
  'commonly_confused_with',
  'belongs_to_domain',
  'belongs_to_unit',
  'supports_capability',
]
  .map((value) => `'${value}'`)
  .join(', ');

const REVIEW_STATES_SQL = ['pending', 'due', 'in_progress', 'completed', 'snoozed', 'archived']
  .map((value) => `'${value}'`)
  .join(', ');

const MIGRATIONS: MigrationDefinition[] = [
  {
    version: 1,
    name: 'initial_learning_engine_schema',
    statements: [
      `
      CREATE TABLE IF NOT EXISTS languages (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        flag TEXT,
        base_language_code TEXT NOT NULL DEFAULT 'en',
        is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS curricula (
        id TEXT PRIMARY KEY,
        language_id TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(language_id, version)
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS capabilities (
        id TEXT PRIMARY KEY,
        curriculum_id TEXT NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
        language_id TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        level_band TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(language_id, slug)
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS curriculum_nodes (
        id TEXT PRIMARY KEY,
        curriculum_id TEXT NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
        language_id TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        domain_key TEXT NOT NULL,
        unit_key TEXT NOT NULL,
        node_key TEXT NOT NULL,
        node_type TEXT NOT NULL CHECK (node_type IN (${NODE_TYPES_SQL})),
        title TEXT NOT NULL,
        description TEXT,
        level_band TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        tags_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(curriculum_id, node_key)
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS curriculum_edges (
        id TEXT PRIMARY KEY,
        curriculum_id TEXT NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
        language_id TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        from_node_id TEXT NOT NULL REFERENCES curriculum_nodes(id) ON DELETE CASCADE,
        to_node_id TEXT NOT NULL REFERENCES curriculum_nodes(id) ON DELETE CASCADE,
        edge_type TEXT NOT NULL CHECK (edge_type IN (${EDGE_TYPES_SQL})),
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        UNIQUE(curriculum_id, from_node_id, to_node_id, edge_type)
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS curriculum_node_capabilities (
        id TEXT PRIMARY KEY,
        curriculum_id TEXT NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
        node_id TEXT NOT NULL REFERENCES curriculum_nodes(id) ON DELETE CASCADE,
        capability_id TEXT NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        UNIQUE(node_id, capability_id)
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS learner_profile (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        native_language_code TEXT NOT NULL,
        base_language_code TEXT NOT NULL DEFAULT 'en',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS learner_language_state (
        id TEXT PRIMARY KEY,
        learner_id TEXT NOT NULL REFERENCES learner_profile(id) ON DELETE CASCADE,
        language_id TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        total_xp INTEGER NOT NULL DEFAULT 0,
        daily_goal_minutes INTEGER NOT NULL DEFAULT 30,
        today_minutes INTEGER NOT NULL DEFAULT 0,
        current_streak INTEGER NOT NULL DEFAULT 0,
        longest_streak INTEGER NOT NULL DEFAULT 0,
        last_activity_at TEXT,
        progress_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(learner_id, language_id)
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS learner_node_state (
        id TEXT PRIMARY KEY,
        learner_id TEXT NOT NULL REFERENCES learner_profile(id) ON DELETE CASCADE,
        language_id TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        node_id TEXT NOT NULL REFERENCES curriculum_nodes(id) ON DELETE CASCADE,
        mastery_score REAL NOT NULL DEFAULT 0,
        confidence_score REAL NOT NULL DEFAULT 0,
        exposure_count INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        last_seen_at TEXT,
        next_review_at TEXT,
        forgetting_risk REAL NOT NULL DEFAULT 0,
        recognition_score REAL NOT NULL DEFAULT 0,
        production_score REAL NOT NULL DEFAULT 0,
        listening_score REAL NOT NULL DEFAULT 0,
        reading_score REAL NOT NULL DEFAULT 0,
        writing_score REAL NOT NULL DEFAULT 0,
        speaking_score REAL NOT NULL DEFAULT 0,
        pronunciation_score REAL NOT NULL DEFAULT 0,
        weak_tags_json TEXT NOT NULL DEFAULT '[]',
        error_tags_json TEXT NOT NULL DEFAULT '[]',
        manual_override_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(learner_id, language_id, node_id)
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS weakness_clusters (
        id TEXT PRIMARY KEY,
        learner_id TEXT NOT NULL REFERENCES learner_profile(id) ON DELETE CASCADE,
        language_id TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        cluster_key TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        severity_score REAL NOT NULL DEFAULT 0,
        hit_count INTEGER NOT NULL DEFAULT 0,
        last_seen_at TEXT,
        related_node_ids_json TEXT NOT NULL DEFAULT '[]',
        evidence_refs_json TEXT NOT NULL DEFAULT '[]',
        tags_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(learner_id, language_id, cluster_key)
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        learner_id TEXT NOT NULL REFERENCES learner_profile(id) ON DELETE CASCADE,
        language_id TEXT REFERENCES languages(id) ON DELETE SET NULL,
        goal_type TEXT NOT NULL,
        title TEXT NOT NULL,
        target_value REAL,
        current_value REAL,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
        due_at TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        learner_id TEXT NOT NULL REFERENCES learner_profile(id) ON DELETE CASCADE,
        language_id TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        session_type TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration_ms INTEGER,
        context_json TEXT NOT NULL DEFAULT '{}'
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS attempts (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        learner_id TEXT NOT NULL REFERENCES learner_profile(id) ON DELETE CASCADE,
        language_id TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        node_id TEXT REFERENCES curriculum_nodes(id) ON DELETE SET NULL,
        activity_type TEXT NOT NULL,
        prompt_ref TEXT,
        response_ref TEXT,
        result_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS evidence (
        id TEXT PRIMARY KEY,
        learner_id TEXT NOT NULL REFERENCES learner_profile(id) ON DELETE CASCADE,
        language_id TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
        attempt_id TEXT REFERENCES attempts(id) ON DELETE SET NULL,
        activity_type TEXT NOT NULL,
        node_ids_json TEXT NOT NULL DEFAULT '[]',
        content_item_id TEXT REFERENCES content_items(id) ON DELETE SET NULL,
        raw_input_text TEXT,
        raw_output_text TEXT,
        raw_input_ref TEXT,
        raw_output_ref TEXT,
        analysis_result_json TEXT NOT NULL DEFAULT '{}',
        scores_json TEXT NOT NULL DEFAULT '{}',
        confidence_estimate REAL,
        time_taken_ms INTEGER,
        hints_used INTEGER,
        correction_count INTEGER,
        transcription TEXT,
        pronunciation_notes TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS review_items (
        id TEXT PRIMARY KEY,
        learner_id TEXT NOT NULL REFERENCES learner_profile(id) ON DELETE CASCADE,
        language_id TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        node_id TEXT REFERENCES curriculum_nodes(id) ON DELETE SET NULL,
        content_item_id TEXT REFERENCES content_items(id) ON DELETE SET NULL,
        state TEXT NOT NULL CHECK (state IN (${REVIEW_STATES_SQL})),
        due_at TEXT NOT NULL,
        interval_days INTEGER NOT NULL DEFAULT 1,
        ease_factor REAL NOT NULL DEFAULT 2.3,
        last_reviewed_at TEXT,
        last_result TEXT CHECK (last_result IN ('correct', 'incorrect', 'partial', 'skipped')),
        strength TEXT,
        attempts_count INTEGER NOT NULL DEFAULT 0,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS content_items (
        id TEXT PRIMARY KEY,
        language_id TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        content_type TEXT NOT NULL,
        modality TEXT,
        title TEXT NOT NULL,
        summary TEXT,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'evaluated', 'approved', 'active', 'archived', 'superseded')),
        approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'manual')),
        difficulty_band TEXT,
        source_type TEXT NOT NULL,
        source_refs_json TEXT NOT NULL DEFAULT '[]',
        quality_score REAL,
        generation_version TEXT,
        estimated_duration_sec INTEGER,
        tags_json TEXT NOT NULL DEFAULT '[]',
        metadata_json TEXT NOT NULL DEFAULT '{}',
        active_revision_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS content_revisions (
        id TEXT PRIMARY KEY,
        content_item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
        parent_revision_id TEXT REFERENCES content_revisions(id) ON DELETE SET NULL,
        revision_number INTEGER NOT NULL,
        payload_json TEXT NOT NULL DEFAULT '{}',
        created_by TEXT NOT NULL,
        created_by_system INTEGER NOT NULL DEFAULT 1 CHECK (created_by_system IN (0, 1)),
        reason_note TEXT,
        is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
        created_at TEXT NOT NULL,
        UNIQUE(content_item_id, revision_number)
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS content_node_links (
        id TEXT PRIMARY KEY,
        content_item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
        node_id TEXT NOT NULL REFERENCES curriculum_nodes(id) ON DELETE CASCADE,
        language_id TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        relation_type TEXT NOT NULL DEFAULT 'covers',
        coverage_weight REAL NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        UNIQUE(content_item_id, node_id, relation_type)
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS content_usage (
        id TEXT PRIMARY KEY,
        content_item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
        learner_id TEXT NOT NULL REFERENCES learner_profile(id) ON DELETE CASCADE,
        language_id TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
        usage_type TEXT NOT NULL,
        used_at TEXT NOT NULL,
        outcome_json TEXT NOT NULL DEFAULT '{}'
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'system',
        updated_at TEXT NOT NULL
      );
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_curricula_language_version ON curricula(language_id, version);
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_curriculum_nodes_curriculum_type ON curriculum_nodes(curriculum_id, node_type);
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_curriculum_edges_from_to ON curriculum_edges(curriculum_id, from_node_id, to_node_id);
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_learner_node_state_lookup ON learner_node_state(learner_id, language_id, node_id);
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_review_items_due ON review_items(language_id, due_at, state);
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_content_revisions_history ON content_revisions(content_item_id, revision_number);
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_evidence_language_created ON evidence(language_id, created_at);
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_sessions_language_started ON sessions(language_id, started_at);
      `,
      `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_review_items_unique_node
      ON review_items(learner_id, language_id, node_id)
      WHERE node_id IS NOT NULL;
      `,
      `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_review_items_unique_content
      ON review_items(learner_id, language_id, content_item_id)
      WHERE content_item_id IS NOT NULL;
      `,
    ],
  },
  {
    version: 2,
    name: 'inst4_content_progress_script_foundation',
    statements: [
      `
      CREATE TABLE IF NOT EXISTS generation_candidates (
        id TEXT PRIMARY KEY,
        language_id TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        need_id TEXT NOT NULL,
        need_content_type TEXT NOT NULL,
        need_objective TEXT NOT NULL,
        need_node_ids_json TEXT NOT NULL DEFAULT '[]',
        need_metadata_json TEXT NOT NULL DEFAULT '{}',
        context_json TEXT NOT NULL DEFAULT '[]',
        candidate_text TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        model TEXT NOT NULL,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'manual')),
        content_item_id TEXT REFERENCES content_items(id) ON DELETE SET NULL
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS generation_evaluations (
        id TEXT PRIMARY KEY,
        candidate_id TEXT NOT NULL REFERENCES generation_candidates(id) ON DELETE CASCADE,
        decision TEXT NOT NULL CHECK (decision IN ('accepted', 'rejected')),
        score REAL NOT NULL,
        reason TEXT NOT NULL,
        raw_payload TEXT NOT NULL,
        acceptance_threshold REAL,
        created_at TEXT NOT NULL
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS content_approval_events (
        id TEXT PRIMARY KEY,
        candidate_id TEXT REFERENCES generation_candidates(id) ON DELETE SET NULL,
        content_item_id TEXT REFERENCES content_items(id) ON DELETE CASCADE,
        decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'manual', 'reverted', 'redo', 'edited')),
        actor_id TEXT NOT NULL,
        reason TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS learner_script_state (
        id TEXT PRIMARY KEY,
        learner_id TEXT NOT NULL REFERENCES learner_profile(id) ON DELETE CASCADE,
        language_id TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        node_id TEXT NOT NULL REFERENCES curriculum_nodes(id) ON DELETE CASCADE,
        script_key TEXT NOT NULL,
        attempts_count INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        completion_score REAL NOT NULL DEFAULT 0,
        recall_score REAL NOT NULL DEFAULT 0,
        trace_score REAL NOT NULL DEFAULT 0,
        guided_score REAL NOT NULL DEFAULT 0,
        free_score REAL NOT NULL DEFAULT 0,
        timed_score REAL NOT NULL DEFAULT 0,
        last_attempt_at TEXT,
        weak_components_json TEXT NOT NULL DEFAULT '[]',
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(learner_id, language_id, node_id, script_key)
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS script_practice_attempts (
        id TEXT PRIMARY KEY,
        learner_id TEXT NOT NULL REFERENCES learner_profile(id) ON DELETE CASCADE,
        language_id TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        node_id TEXT NOT NULL REFERENCES curriculum_nodes(id) ON DELETE CASCADE,
        script_key TEXT NOT NULL,
        mode TEXT NOT NULL CHECK (mode IN ('watch', 'trace', 'guided_draw', 'free_draw', 'timed_recall_draw')),
        stroke_data_ref TEXT,
        stroke_data_json TEXT NOT NULL DEFAULT '{}',
        completion_ratio REAL,
        duration_ms INTEGER,
        success INTEGER NOT NULL CHECK (success IN (0, 1)),
        feedback_json TEXT NOT NULL DEFAULT '{}',
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_generation_candidates_language_created
      ON generation_candidates(language_id, created_at DESC);
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_generation_evaluations_candidate_created
      ON generation_evaluations(candidate_id, created_at DESC);
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_content_approval_events_content_created
      ON content_approval_events(content_item_id, created_at DESC);
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_learner_script_state_lookup
      ON learner_script_state(learner_id, language_id, node_id);
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_script_practice_attempts_lookup
      ON script_practice_attempts(learner_id, language_id, node_id, created_at DESC);
      `,
    ],
  },
  {
    version: 3,
    name: 'background_image_pipeline',
    statements: [
      `
      CREATE TABLE IF NOT EXISTS background_image_assets (
        id TEXT PRIMARY KEY,
        source_key TEXT NOT NULL UNIQUE,
        provider TEXT NOT NULL,
        provider_image_id TEXT NOT NULL,
        image_url TEXT NOT NULL,
        download_url TEXT NOT NULL,
        page_url TEXT NOT NULL,
        photographer_name TEXT NOT NULL,
        photographer_url TEXT,
        attribution_text TEXT NOT NULL,
        dominant_color TEXT,
        tags_json TEXT NOT NULL DEFAULT '[]',
        width INTEGER NOT NULL DEFAULT 0,
        height INTEGER NOT NULL DEFAULT 0,
        local_relative_path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_checked_at TEXT
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS background_image_mappings (
        item_key TEXT PRIMARY KEY,
        item_type TEXT NOT NULL,
        language_code TEXT,
        query_used TEXT,
        provider TEXT,
        asset_id TEXT REFERENCES background_image_assets(id) ON DELETE SET NULL,
        semantic_input_json TEXT NOT NULL DEFAULT '{}',
        scoring_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_refreshed_at TEXT
      );
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_background_mappings_language_type
      ON background_image_mappings(language_code, item_type);
      `,
      `
      CREATE INDEX IF NOT EXISTS idx_background_assets_provider
      ON background_image_assets(provider, provider_image_id);
      `,
    ],
  },
];

export async function runMigrations(db: SqlDatabase): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  type AppliedMigrationRow = { version: number };
  const appliedRows = await db.select<AppliedMigrationRow>('SELECT version FROM schema_migrations;');
  const appliedSet = new Set(appliedRows.map((row) => row.version));

  for (const migration of MIGRATIONS) {
    if (appliedSet.has(migration.version)) {
      continue;
    }

    try {
      await runInTransaction(db, async () => {
        for (const statement of migration.statements) {
          await db.execute(statement);
        }

        await db.execute(
          'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);',
          [migration.version, migration.name, new Date().toISOString()],
        );
      });
    } catch (error) {
      throw new MigrationError(migration.version, migration.name, error);
    }
  }
}
