import type {
  CreateEvidenceInput,
  CurriculumNodeRecord,
  EvidenceRecord,
  LearnerNodeStateRecord,
  PersistenceContext,
  ReviewItemRecord,
  WeaknessClusterRecord,
} from '../../persistence';

export type ReviewQueueMode = 'due-now' | 'weak' | 'mistakes' | 'cram';
export type EvidenceActivityType = 'review' | 'write' | 'speak' | 'learn';

export interface EngineContext {
  persistence: PersistenceContext;
  learnerId: string;
  languageId: string;
  languageCode: string;
  curriculumNodes: CurriculumNodeRecord[];
}

export interface EvidenceIngestionInput {
  activityType: EvidenceActivityType;
  sessionId?: string | null;
  attemptId?: string | null;
  contentItemId?: string | null;
  nodeIds?: string[];
  nodeKeys?: string[];
  rawInputText?: string | null;
  rawOutputText?: string | null;
  rawInputRef?: string | null;
  rawOutputRef?: string | null;
  analysisResult?: Record<string, unknown>;
  scores?: Record<string, unknown>;
  confidenceEstimate?: number | null;
  timeTakenMs?: number | null;
  hintsUsed?: number | null;
  correctionCount?: number | null;
  transcription?: string | null;
  pronunciationNotes?: string | null;
  weakTags?: string[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface EvidenceIngestionResult {
  evidence: EvidenceRecord;
  resolvedNodeIds: string[];
}

export interface LearnerUpdateResult {
  evidence: EvidenceRecord;
  updatedNodeStates: LearnerNodeStateRecord[];
  touchedWeaknesses: WeaknessClusterRecord[];
}

export interface EngineReviewItem {
  record: ReviewItemRecord;
  term: string;
  translation: string;
  type: 'word' | 'phrase' | 'grammar';
}

export type SubmitReviewResult = 'correct' | 'incorrect' | 'partial' | 'skipped';

export interface ReviewSubmissionResult {
  reviewItem: ReviewItemRecord;
  evidence: EvidenceRecord;
  updatedNodeStates: LearnerNodeStateRecord[];
}

export type RuntimeTaskPersistenceRecord = {
  id: string;
  type: string;
  status: string;
  priority: string;
  updatedAt: number;
  error?: string;
};

export type RuntimeGenerationPersistenceRecord = {
  needId: string;
  languageCode: string;
  accepted: boolean;
  score: number;
  reason: string;
  model: string;
  providerId: string;
  createdAt: number;
};

export type EvidenceCreateInput = CreateEvidenceInput;
