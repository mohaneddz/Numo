export const CURRICULUM_NODE_TYPES = [
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
] as const;

export type CurriculumNodeType = (typeof CURRICULUM_NODE_TYPES)[number];

export const CURRICULUM_EDGE_TYPES = [
  'prerequisite_of',
  'reinforced_by',
  'related_to',
  'commonly_confused_with',
  'belongs_to_domain',
  'belongs_to_unit',
  'supports_capability',
] as const;

export type CurriculumEdgeType = (typeof CURRICULUM_EDGE_TYPES)[number];

export const REVIEW_ITEM_STATES = [
  'pending',
  'due',
  'in_progress',
  'completed',
  'snoozed',
  'archived',
] as const;

export type ReviewItemState = (typeof REVIEW_ITEM_STATES)[number];

export const REVIEW_ITEM_SOURCES = [
  'notebook',
  'learn_mistake',
  'weak_node',
  'legacy_unit',
  'immerse_phrase',
  'write_correction',
  'speak_pronunciation',
] as const;

export type ReviewItemSource = (typeof REVIEW_ITEM_SOURCES)[number];

export const REVIEW_CONTENT_DOMAINS = [
  'vocabulary',
  'grammar',
  'pronunciation',
  'sentence',
  'communication',
] as const;

export type ReviewContentDomain = (typeof REVIEW_CONTENT_DOMAINS)[number];

export interface SqlDatabase {
  execute(query: string, bindValues?: unknown[]): Promise<unknown>;
  select<T>(query: string, bindValues?: unknown[]): Promise<T[]>;
}

export interface LanguageRecord {
  id: string;
  code: string;
  name: string;
  flag: string | null;
  baseLanguageCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumRecord {
  id: string;
  languageId: string;
  version: number;
  title: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CapabilityRecord {
  id: string;
  curriculumId: string;
  languageId: string;
  slug: string;
  title: string;
  description: string | null;
  levelBand: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumNodeRecord {
  id: string;
  curriculumId: string;
  languageId: string;
  domainKey: string;
  unitKey: string;
  nodeKey: string;
  nodeType: CurriculumNodeType;
  title: string;
  description: string | null;
  levelBand: string | null;
  metadata: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumEdgeRecord {
  id: string;
  curriculumId: string;
  languageId: string;
  fromNodeId: string;
  toNodeId: string;
  edgeType: CurriculumEdgeType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface NodeCapabilityLinkRecord {
  id: string;
  curriculumId: string;
  nodeId: string;
  capabilityId: string;
  createdAt: string;
}

export interface CurriculumBundle {
  curriculum: CurriculumRecord;
  capabilities: CapabilityRecord[];
  nodes: CurriculumNodeRecord[];
  edges: CurriculumEdgeRecord[];
  nodeCapabilityLinks: NodeCapabilityLinkRecord[];
}

export interface LearnerProfileRecord {
  id: string;
  displayName: string;
  nativeLanguageCode: string;
  baseLanguageCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLearnerProfileInput {
  displayName: string;
  nativeLanguageCode: string;
  baseLanguageCode?: string;
}

export interface LearnerNodeStateRecord {
  id: string;
  learnerId: string;
  languageId: string;
  nodeId: string;
  masteryScore: number;
  confidenceScore: number;
  exposureCount: number;
  successCount: number;
  failureCount: number;
  lastSeenAt: string | null;
  nextReviewAt: string | null;
  forgettingRisk: number;
  recognitionScore: number;
  productionScore: number;
  listeningScore: number;
  readingScore: number;
  writingScore: number;
  speakingScore: number;
  pronunciationScore: number;
  weakTags: string[];
  errorTags: string[];
  manualOverride: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertLearnerNodeStateInput {
  learnerId: string;
  languageId: string;
  nodeId: string;
  masteryScore: number;
  confidenceScore: number;
  exposureDelta?: number;
  successDelta?: number;
  failureDelta?: number;
  lastSeenAt?: string | null;
  nextReviewAt?: string | null;
  forgettingRisk?: number;
  recognitionScore?: number;
  productionScore?: number;
  listeningScore?: number;
  readingScore?: number;
  writingScore?: number;
  speakingScore?: number;
  pronunciationScore?: number;
  weakTags?: string[];
  errorTags?: string[];
  manualOverride?: Record<string, unknown>;
}

export interface WeaknessClusterRecord {
  id: string;
  learnerId: string;
  languageId: string;
  clusterKey: string;
  title: string;
  description: string | null;
  severityScore: number;
  hitCount: number;
  lastSeenAt: string | null;
  relatedNodeIds: string[];
  evidenceRefs: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpsertWeaknessClusterInput {
  learnerId: string;
  languageId: string;
  clusterKey: string;
  title: string;
  description?: string | null;
  severityDelta?: number;
  hitDelta?: number;
  lastSeenAt?: string | null;
  relatedNodeIds?: string[];
  evidenceRefs?: string[];
  tags?: string[];
}

export interface EvidenceRecord {
  id: string;
  learnerId: string;
  languageId: string;
  sessionId: string | null;
  attemptId: string | null;
  activityType: string;
  nodeIds: string[];
  contentItemId: string | null;
  rawInputText: string | null;
  rawOutputText: string | null;
  rawInputRef: string | null;
  rawOutputRef: string | null;
  analysisResult: Record<string, unknown>;
  scores: Record<string, unknown>;
  confidenceEstimate: number | null;
  timeTakenMs: number | null;
  hintsUsed: number | null;
  correctionCount: number | null;
  transcription: string | null;
  pronunciationNotes: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CreateEvidenceInput {
  learnerId: string;
  languageId: string;
  sessionId?: string | null;
  attemptId?: string | null;
  activityType: string;
  nodeIds?: string[];
  contentItemId?: string | null;
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
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface ReviewItemRecord {
  id: string;
  learnerId: string;
  languageId: string;
  nodeId: string | null;
  contentItemId: string | null;
  source?: ReviewItemSource;
  sourceRef?: string | null;
  contentDomain?: ReviewContentDomain;
  state: ReviewItemState;
  dueAt: string;
  intervalDays: number;
  easeFactor: number;
  lastReviewedAt: string | null;
  lastResult: 'correct' | 'incorrect' | 'partial' | 'skipped' | null;
  strength: string | null;
  attemptsCount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewItemInput {
  learnerId: string;
  languageId: string;
  nodeId?: string | null;
  contentItemId?: string | null;
  source?: ReviewItemSource;
  sourceRef?: string | null;
  contentDomain?: ReviewContentDomain;
  state?: ReviewItemState;
  dueAt: string;
  intervalDays?: number;
  easeFactor?: number;
  lastReviewedAt?: string | null;
  lastResult?: 'correct' | 'incorrect' | 'partial' | 'skipped' | null;
  strength?: string | null;
  attemptsCount?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateReviewItemInput {
  id: string;
  source?: ReviewItemSource;
  sourceRef?: string | null;
  contentDomain?: ReviewContentDomain;
  state?: ReviewItemState;
  dueAt?: string;
  intervalDays?: number;
  easeFactor?: number;
  lastReviewedAt?: string | null;
  lastResult?: 'correct' | 'incorrect' | 'partial' | 'skipped' | null;
  strength?: string | null;
  attemptsCount?: number;
  metadata?: Record<string, unknown>;
}

export interface DueReviewQuery {
  languageId: string;
  learnerId: string;
  dueBefore?: string;
  limit?: number;
}

export interface ContentItemRecord {
  id: string;
  languageId: string;
  contentType: string;
  modality: string | null;
  title: string;
  summary: string | null;
  status: 'draft' | 'evaluated' | 'approved' | 'active' | 'archived' | 'superseded';
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'manual';
  difficultyBand: string | null;
  sourceType: string;
  sourceRefs: string[];
  qualityScore: number | null;
  generationVersion: string | null;
  estimatedDurationSec: number | null;
  tags: string[];
  metadata: Record<string, unknown>;
  activeRevisionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContentItemInput {
  languageId: string;
  contentType: string;
  modality?: string | null;
  title: string;
  summary?: string | null;
  status?: ContentItemRecord['status'];
  approvalStatus?: ContentItemRecord['approvalStatus'];
  difficultyBand?: string | null;
  sourceType: string;
  sourceRefs?: string[];
  qualityScore?: number | null;
  generationVersion?: string | null;
  estimatedDurationSec?: number | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ContentRevisionRecord {
  id: string;
  contentItemId: string;
  parentRevisionId: string | null;
  revisionNumber: number;
  payload: Record<string, unknown>;
  createdBy: string;
  createdBySystem: boolean;
  reasonNote: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AppendContentRevisionInput {
  contentItemId: string;
  payload: Record<string, unknown>;
  createdBy: string;
  createdBySystem: boolean;
  reasonNote?: string | null;
  setActive?: boolean;
}

export interface SettingRecord {
  key: string;
  value: unknown;
  source: string;
  updatedAt: string;
}

export interface ProgressAggregate {
  learnerId: string;
  languageId: string;
  nodeCount: number;
  avgMasteryScore: number;
  avgConfidenceScore: number;
  avgForgettingRisk: number;
}

export interface LearningUnitRecord {
  id: string;
  languageId: string;
  unitKey: string;
  title: string;
  description: string;
  levelBand: 'beginner' | 'intermediate' | 'advanced';
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface LearningLessonRecord {
  id: string;
  languageId: string;
  unitId: string;
  lessonKey: string;
  title: string;
  description: string;
  communicationGoal: string;
  levelBand: 'beginner' | 'intermediate' | 'advanced';
  orderIndex: number;
  estimatedDurationMin: number;
  createdAt: string;
  updatedAt: string;
}

export interface LessonObjectiveRecord {
  id: string;
  languageId: string;
  unitId: string;
  lessonId: string;
  objectiveKey: string;
  title: string;
  practicalGoal: string;
  vocabularyFocus: string[];
  grammarFocus: string[];
  pronunciationFocus: string[];
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface LessonTaskTemplateRecord {
  id: string;
  languageId: string;
  unitId: string;
  lessonId: string;
  objectiveId: string;
  taskType: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instruction: string;
  promptTemplate: string;
  answerTemplate: string;
  distractors: string[];
  metadata: Record<string, unknown>;
  orderIndex: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskAttemptInput {
  learnerId: string;
  languageId: string;
  unitId: string | null;
  lessonId: string | null;
  objectiveId: string | null;
  taskTemplateId: string | null;
  taskType: string;
  promptText: string;
  expectedAnswer: string;
  learnerAnswer: string;
  isCorrect: boolean;
  score: number;
  evaluation: Record<string, unknown>;
  durationMs?: number | null;
  createdAt?: string;
}

export interface TaskAttemptRecord extends Omit<CreateTaskAttemptInput, 'createdAt'> {
  id: string;
  createdAt: string;
}

export interface NotebookCollectionRecord {
  id: string;
  learnerId: string;
  languageId: string;
  title: string;
  description: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotebookItemRecord {
  id: string;
  learnerId: string;
  languageId: string;
  collectionId: string | null;
  term: string;
  translation: string | null;
  itemKind: 'word' | 'phrase' | 'sentence' | 'grammar' | 'pronunciation' | 'translation' | 'mistake';
  context: string | null;
  notes: string | null;
  personalHint: string | null;
  personalExample: string | null;
  tags: string[];
  source: string;
  sourceRef: string | null;
  mastery: number;
  favorited: boolean;
  isDifficult: boolean;
  isImportant: boolean;
  flashcardEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotebookCollectionInput {
  learnerId: string;
  languageId: string;
  title: string;
  description?: string | null;
  color?: string | null;
}

export interface CreateNotebookItemInput {
  learnerId: string;
  languageId: string;
  collectionId?: string | null;
  term: string;
  translation?: string | null;
  itemKind: NotebookItemRecord['itemKind'];
  context?: string | null;
  notes?: string | null;
  personalHint?: string | null;
  personalExample?: string | null;
  tags?: string[];
  source?: string;
  sourceRef?: string | null;
  mastery?: number;
  favorited?: boolean;
  isDifficult?: boolean;
  isImportant?: boolean;
  flashcardEnabled?: boolean;
}

export interface UpdateNotebookItemInput {
  id: string;
  collectionId?: string | null;
  term?: string;
  translation?: string | null;
  itemKind?: NotebookItemRecord['itemKind'];
  context?: string | null;
  notes?: string | null;
  personalHint?: string | null;
  personalExample?: string | null;
  tags?: string[];
  favorited?: boolean;
  isDifficult?: boolean;
  isImportant?: boolean;
  flashcardEnabled?: boolean;
  mastery?: number;
}

export interface PersistenceContext {
  db: SqlDatabase;
  repositories: {
    languages: LanguagesRepository;
    curriculum: CurriculumRepository;
    learning: LearningRepository;
    learner: LearnerRepository;
    evidence: EvidenceRepository;
    review: ReviewRepository;
    content: ContentRepository;
    notebook: NotebookRepository;
    settings: SettingsRepository;
  };
}

export interface LanguagesRepository {
  upsertLanguage(input: { code: string; name: string; flag?: string | null; baseLanguageCode?: string }): Promise<LanguageRecord>;
  listLanguages(): Promise<LanguageRecord[]>;
  getLanguageByCode(code: string): Promise<LanguageRecord | null>;
  getActiveLanguage(): Promise<LanguageRecord | null>;
  setActiveLanguage(code: string): Promise<void>;
}

export interface CurriculumRepository {
  getCurriculumByLanguageCode(languageCode: string, version?: number): Promise<CurriculumBundle | null>;
  listCurriculumNodes(curriculumId: string): Promise<CurriculumNodeRecord[]>;
  listCurriculumEdges(curriculumId: string): Promise<CurriculumEdgeRecord[]>;
}

export interface LearningRepository {
  listUnitsByLanguage(languageId: string): Promise<LearningUnitRecord[]>;
  listLessonsByUnit(unitId: string): Promise<LearningLessonRecord[]>;
  listObjectivesByLesson(lessonId: string): Promise<LessonObjectiveRecord[]>;
  listTaskTemplatesByObjective(objectiveId: string): Promise<LessonTaskTemplateRecord[]>;
  createTaskAttempt(input: CreateTaskAttemptInput): Promise<TaskAttemptRecord>;
}

export interface LearnerRepository {
  ensureDefaultProfile(): Promise<LearnerProfileRecord>;
  listProfiles(): Promise<LearnerProfileRecord[]>;
  getProfileById(id: string): Promise<LearnerProfileRecord | null>;
  createProfile(input: CreateLearnerProfileInput): Promise<LearnerProfileRecord>;
  getActiveProfile(): Promise<LearnerProfileRecord | null>;
  setActiveProfile(profileId: string): Promise<void>;
  clearActiveProfile(): Promise<void>;
  upsertLearnerNodeState(input: UpsertLearnerNodeStateInput): Promise<LearnerNodeStateRecord>;
  getLearnerNodeState(learnerId: string, languageId: string, nodeId: string): Promise<LearnerNodeStateRecord | null>;
  listLearnerNodeStates(learnerId: string, languageId: string, limit?: number): Promise<LearnerNodeStateRecord[]>;
  upsertWeaknessCluster(input: UpsertWeaknessClusterInput): Promise<WeaknessClusterRecord>;
  listWeaknessClusters(learnerId: string, languageId: string): Promise<WeaknessClusterRecord[]>;
  getProgressAggregate(learnerId: string, languageId: string): Promise<ProgressAggregate>;
}

export interface EvidenceRepository {
  logEvidence(input: CreateEvidenceInput): Promise<EvidenceRecord>;
  listEvidenceByLanguage(learnerId: string, languageId: string, limit?: number): Promise<EvidenceRecord[]>;
}

export interface ReviewRepository {
  createReviewItem(input: CreateReviewItemInput): Promise<ReviewItemRecord>;
  updateReviewItem(input: UpdateReviewItemInput): Promise<ReviewItemRecord>;
  fetchDueItemsByLanguage(query: DueReviewQuery): Promise<ReviewItemRecord[]>;
  listItemsByLanguage(learnerId: string, languageId: string, limit?: number): Promise<ReviewItemRecord[]>;
}

export interface ContentRepository {
  createContentItem(input: CreateContentItemInput): Promise<ContentItemRecord>;
  appendRevision(input: AppendContentRevisionInput): Promise<ContentRevisionRecord>;
  getRevisionHistory(contentItemId: string): Promise<ContentRevisionRecord[]>;
  getActiveRevision(contentItemId: string): Promise<ContentRevisionRecord | null>;
  linkContentToNode(input: { contentItemId: string; nodeId: string; languageId: string; relationType?: string; coverageWeight?: number }): Promise<void>;
}

export interface NotebookRepository {
  createCollection(input: CreateNotebookCollectionInput): Promise<NotebookCollectionRecord>;
  listCollections(learnerId: string, languageId: string): Promise<NotebookCollectionRecord[]>;
  createItem(input: CreateNotebookItemInput): Promise<NotebookItemRecord>;
  updateItem(input: UpdateNotebookItemInput): Promise<NotebookItemRecord>;
  listItems(learnerId: string, languageId: string, limit?: number): Promise<NotebookItemRecord[]>;
}

export interface SettingsRepository {
  getJson<T>(key: string): Promise<T | null>;
  setJson<T>(key: string, value: T, source?: string): Promise<SettingRecord>;
}
