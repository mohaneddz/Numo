import { RepositoryError } from '../errors';
import {
  makeId,
  nowIso,
  parseJsonArray,
  parseJsonObject,
} from '../utils';
import type {
  CreateTaskAttemptInput,
  LearningLessonRecord,
  LearningRepository,
  LearningUnitRecord,
  LessonObjectiveRecord,
  LessonTaskTemplateRecord,
  SqlDatabase,
  TaskAttemptRecord,
} from '../types';

interface UnitRow {
  id: string;
  language_id: string;
  unit_key: string;
  title: string;
  description: string;
  level_band: LearningUnitRecord['levelBand'];
  order_index: number;
  created_at: string;
  updated_at: string;
}

interface LessonRow {
  id: string;
  language_id: string;
  unit_id: string;
  lesson_key: string;
  title: string;
  description: string;
  communication_goal: string;
  level_band: LearningLessonRecord['levelBand'];
  order_index: number;
  estimated_duration_min: number;
  created_at: string;
  updated_at: string;
}

interface ObjectiveRow {
  id: string;
  language_id: string;
  unit_id: string;
  lesson_id: string;
  objective_key: string;
  title: string;
  practical_goal: string;
  vocabulary_focus_json: string;
  grammar_focus_json: string;
  pronunciation_focus_json: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

interface TaskTemplateRow {
  id: string;
  language_id: string;
  unit_id: string;
  lesson_id: string;
  objective_id: string;
  task_type: string;
  difficulty: LessonTaskTemplateRecord['difficulty'];
  instruction: string;
  prompt_template: string;
  answer_template: string;
  distractors_json: string;
  metadata_json: string;
  order_index: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface TaskAttemptRow {
  id: string;
  learner_id: string;
  language_id: string;
  unit_id: string | null;
  lesson_id: string | null;
  objective_id: string | null;
  task_template_id: string | null;
  task_type: string;
  prompt_text: string;
  expected_answer: string;
  learner_answer: string;
  is_correct: number;
  score: number;
  evaluation_json: string;
  duration_ms: number | null;
  created_at: string;
}

function mapUnit(row: UnitRow): LearningUnitRecord {
  return {
    id: row.id,
    languageId: row.language_id,
    unitKey: row.unit_key,
    title: row.title,
    description: row.description,
    levelBand: row.level_band,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLesson(row: LessonRow): LearningLessonRecord {
  return {
    id: row.id,
    languageId: row.language_id,
    unitId: row.unit_id,
    lessonKey: row.lesson_key,
    title: row.title,
    description: row.description,
    communicationGoal: row.communication_goal,
    levelBand: row.level_band,
    orderIndex: row.order_index,
    estimatedDurationMin: row.estimated_duration_min,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapObjective(row: ObjectiveRow): LessonObjectiveRecord {
  return {
    id: row.id,
    languageId: row.language_id,
    unitId: row.unit_id,
    lessonId: row.lesson_id,
    objectiveKey: row.objective_key,
    title: row.title,
    practicalGoal: row.practical_goal,
    vocabularyFocus: parseJsonArray(row.vocabulary_focus_json),
    grammarFocus: parseJsonArray(row.grammar_focus_json),
    pronunciationFocus: parseJsonArray(row.pronunciation_focus_json),
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTemplate(row: TaskTemplateRow): LessonTaskTemplateRecord {
  return {
    id: row.id,
    languageId: row.language_id,
    unitId: row.unit_id,
    lessonId: row.lesson_id,
    objectiveId: row.objective_id,
    taskType: row.task_type,
    difficulty: row.difficulty,
    instruction: row.instruction,
    promptTemplate: row.prompt_template,
    answerTemplate: row.answer_template,
    distractors: parseJsonArray(row.distractors_json),
    metadata: parseJsonObject(row.metadata_json),
    orderIndex: row.order_index,
    active: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAttempt(row: TaskAttemptRow): TaskAttemptRecord {
  return {
    id: row.id,
    learnerId: row.learner_id,
    languageId: row.language_id,
    unitId: row.unit_id,
    lessonId: row.lesson_id,
    objectiveId: row.objective_id,
    taskTemplateId: row.task_template_id,
    taskType: row.task_type,
    promptText: row.prompt_text,
    expectedAnswer: row.expected_answer,
    learnerAnswer: row.learner_answer,
    isCorrect: row.is_correct === 1,
    score: row.score,
    evaluation: parseJsonObject(row.evaluation_json),
    durationMs: row.duration_ms,
    createdAt: row.created_at,
  };
}

export class SqliteLearningRepository implements LearningRepository {
  constructor(private readonly db: SqlDatabase) {}

  async listUnitsByLanguage(languageId: string): Promise<LearningUnitRecord[]> {
    try {
      const rows = await this.db.select<UnitRow>(
        `
        SELECT id, language_id, unit_key, title, description, level_band, order_index, created_at, updated_at
        FROM learning_units
        WHERE language_id = ?
        ORDER BY order_index ASC, created_at ASC;
        `,
        [languageId],
      );
      return rows.map(mapUnit);
    } catch (error) {
      throw new RepositoryError('learning', 'listUnitsByLanguage', error);
    }
  }

  async listLessonsByUnit(unitId: string): Promise<LearningLessonRecord[]> {
    try {
      const rows = await this.db.select<LessonRow>(
        `
        SELECT id, language_id, unit_id, lesson_key, title, description, communication_goal, level_band,
               order_index, estimated_duration_min, created_at, updated_at
        FROM learning_lessons
        WHERE unit_id = ?
        ORDER BY order_index ASC, created_at ASC;
        `,
        [unitId],
      );
      return rows.map(mapLesson);
    } catch (error) {
      throw new RepositoryError('learning', 'listLessonsByUnit', error);
    }
  }

  async listObjectivesByLesson(lessonId: string): Promise<LessonObjectiveRecord[]> {
    try {
      const rows = await this.db.select<ObjectiveRow>(
        `
        SELECT id, language_id, unit_id, lesson_id, objective_key, title, practical_goal,
               vocabulary_focus_json, grammar_focus_json, pronunciation_focus_json, order_index, created_at, updated_at
        FROM lesson_objectives
        WHERE lesson_id = ?
        ORDER BY order_index ASC, created_at ASC;
        `,
        [lessonId],
      );
      return rows.map(mapObjective);
    } catch (error) {
      throw new RepositoryError('learning', 'listObjectivesByLesson', error);
    }
  }

  async listTaskTemplatesByObjective(objectiveId: string): Promise<LessonTaskTemplateRecord[]> {
    try {
      const rows = await this.db.select<TaskTemplateRow>(
        `
        SELECT id, language_id, unit_id, lesson_id, objective_id, task_type, difficulty, instruction,
               prompt_template, answer_template, distractors_json, metadata_json, order_index, is_active, created_at, updated_at
        FROM lesson_task_templates
        WHERE objective_id = ? AND is_active = 1
        ORDER BY order_index ASC, created_at ASC;
        `,
        [objectiveId],
      );
      return rows.map(mapTemplate);
    } catch (error) {
      throw new RepositoryError('learning', 'listTaskTemplatesByObjective', error);
    }
  }

  async createTaskAttempt(input: CreateTaskAttemptInput): Promise<TaskAttemptRecord> {
    try {
      const id = makeId('taskattempt');
      const createdAt = input.createdAt ?? nowIso();
      await this.db.execute(
        `
        INSERT INTO task_attempts (
          id, learner_id, language_id, unit_id, lesson_id, objective_id, task_template_id, task_type,
          prompt_text, expected_answer, learner_answer, is_correct, score, evaluation_json, duration_ms, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          id,
          input.learnerId,
          input.languageId,
          input.unitId ?? null,
          input.lessonId ?? null,
          input.objectiveId ?? null,
          input.taskTemplateId ?? null,
          input.taskType,
          input.promptText,
          input.expectedAnswer,
          input.learnerAnswer,
          input.isCorrect ? 1 : 0,
          input.score,
          JSON.stringify(input.evaluation ?? {}),
          input.durationMs ?? null,
          createdAt,
        ],
      );
      const rows = await this.db.select<TaskAttemptRow>(
        `
        SELECT id, learner_id, language_id, unit_id, lesson_id, objective_id, task_template_id, task_type,
               prompt_text, expected_answer, learner_answer, is_correct, score, evaluation_json, duration_ms, created_at
        FROM task_attempts
        WHERE id = ?
        LIMIT 1;
        `,
        [id],
      );
      return mapAttempt(rows[0]);
    } catch (error) {
      throw new RepositoryError('learning', 'createTaskAttempt', error);
    }
  }
}
