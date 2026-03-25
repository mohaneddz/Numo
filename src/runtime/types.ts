export type RuntimeBackgroundMode = 'off' | 'light' | 'active';

export type RuntimeTaskType =
  | 'content_generation'
  | 'content_evaluation'
  | 'writing_feedback'
  | 'pronunciation_analysis'
  | 'transcript_analysis'
  | 'weakness_extraction'
  | 'recommendation_refresh'
  | 'review_prep'
  | 'content_prep';

export const RUNTIME_TASK_TYPES: RuntimeTaskType[] = [
  'content_generation',
  'content_evaluation',
  'writing_feedback',
  'pronunciation_analysis',
  'transcript_analysis',
  'weakness_extraction',
  'recommendation_refresh',
  'review_prep',
  'content_prep',
];

export type RuntimeTaskPriority = 'low' | 'normal' | 'high' | 'critical';
export type RuntimeTaskStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';
export type RuntimeTaskOrigin = 'foreground' | 'background' | 'system';

export interface RuntimeTask<TPayload = unknown, TResult = unknown> {
  id: string;
  type: RuntimeTaskType;
  status: RuntimeTaskStatus;
  priority: RuntimeTaskPriority;
  origin: RuntimeTaskOrigin;
  payload?: TPayload;
  result?: TResult;
  error?: string;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  updatedAt: number;
  attempt: number;
  maxAttempts: number;
  tags: string[];
}

export interface RuntimeTaskEnqueueInput<TPayload = unknown> {
  type: RuntimeTaskType;
  priority?: RuntimeTaskPriority;
  origin?: RuntimeTaskOrigin;
  payload?: TPayload;
  maxAttempts?: number;
  tags?: string[];
}

export interface RunningTaskSummary {
  id: string;
  type: RuntimeTaskType;
  priority: RuntimeTaskPriority;
  startedAt: number;
  attempt: number;
}

export interface RuntimeFailureSummary {
  taskId: string;
  type: RuntimeTaskType;
  message: string;
  retryable: boolean;
  at: number;
}

export interface RuntimeStatusSnapshot {
  mode: RuntimeBackgroundMode;
  queuedCount: number;
  runningCount: number;
  taskCount: number;
  running: RunningTaskSummary[];
  recentFailures: RuntimeFailureSummary[];
  throttled: boolean;
  suppressedByForeground: boolean;
  foregroundSurface: string;
  foregroundInFlight: number;
  lastUpdatedAt: number;
}

export interface GenerationNeed {
  id: string;
  languageCode: string;
  contentType: string;
  objective: string;
  nodeIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface GenerationContextChunk {
  id: string;
  text: string;
  sourceType: 'curriculum' | 'learner' | 'content' | 'session' | 'manual';
}

export interface GenerationCandidate {
  id: string;
  text: string;
  model: string;
  providerId: string;
  createdAt: number;
}

export interface GenerationEvaluation {
  decision: 'accepted' | 'rejected';
  score: number;
  reason: string;
  raw: string;
}

export interface GenerationPipelineResult {
  need: GenerationNeed;
  context: GenerationContextChunk[];
  candidate: GenerationCandidate;
  evaluation: GenerationEvaluation;
  accepted: boolean;
  createdAt: number;
}

export interface ContentGenerationTaskPayload {
  need: GenerationNeed;
  context?: GenerationContextChunk[];
  acceptanceThreshold?: number;
}

export interface ContentEvaluationTaskPayload {
  need: GenerationNeed;
  context?: GenerationContextChunk[];
  candidateText: string;
  acceptanceThreshold?: number;
}

export interface PromptTaskPayload {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface RuntimePersistenceAdapter {
  onTaskUpdated?: (task: RuntimeTask) => Promise<void> | void;
  onGenerationPipelineResult?: (result: GenerationPipelineResult) => Promise<void> | void;
}
