import type { ReviewItemRecord } from '../../persistence';
import { nowIso } from '../../persistence/utils';
import type {
  EngineContext,
  EngineReviewItem,
  EvidenceIngestionInput,
  ReviewQueueMode,
  ReviewSubmissionResult,
  SubmitReviewResult,
} from './types';
import { nextReviewPatch } from './reviewRules';
import { EvidenceService } from './evidenceService';
import { LearnerStateService } from './learnerStateService';

function metadataView(record: ReviewItemRecord): {
  term: string;
  translation: string;
  type: 'word' | 'phrase' | 'grammar';
} {
  const metadata = record.metadata as Record<string, unknown>;
  const typeRaw = metadata.type;
  const type = typeRaw === 'grammar' ? 'grammar' : typeRaw === 'phrase' ? 'phrase' : 'word';
  return {
    term: String(metadata.term ?? 'Review Item'),
    translation: String(metadata.translation ?? 'No translation'),
    type,
  };
}

function toEngineReviewItem(record: ReviewItemRecord): EngineReviewItem {
  const view = metadataView(record);
  return {
    record,
    term: view.term,
    translation: view.translation,
    type: view.type,
  };
}

export class ReviewService {
  private readonly evidenceService: EvidenceService;
  private readonly learnerStateService: LearnerStateService;

  constructor(private readonly engine: EngineContext) {
    this.evidenceService = new EvidenceService(engine);
    this.learnerStateService = new LearnerStateService(engine);
  }

  async getQueue(mode: ReviewQueueMode): Promise<EngineReviewItem[]> {
    const allItems = await this.engine.persistence.repositories.review.listItemsByLanguage(
      this.engine.learnerId,
      this.engine.languageId,
      300,
    );

    const now = new Date();
    const due = allItems.filter((item) => new Date(item.dueAt) <= now && (item.state === 'due' || item.state === 'pending'));

    if (mode === 'due-now') {
      return due.map(toEngineReviewItem);
    }
    if (mode === 'weak') {
      const weak = allItems.filter((item) => ['weak', 'needs work', 'critical'].includes(String(item.strength ?? '')));
      return weak.map(toEngineReviewItem);
    }
    if (mode === 'mistakes') {
      const mistakes = allItems.filter((item) => item.lastResult === 'incorrect');
      return mistakes.map(toEngineReviewItem);
    }
    return [...allItems]
      .sort((a, b) => a.easeFactor - b.easeFactor)
      .slice(0, 15)
      .map(toEngineReviewItem);
  }

  async submitResult(
    reviewItemId: string,
    result: SubmitReviewResult,
    extras?: { answer?: string; weakTags?: string[] },
  ): Promise<ReviewSubmissionResult | null> {
    const allItems = await this.engine.persistence.repositories.review.listItemsByLanguage(
      this.engine.learnerId,
      this.engine.languageId,
      500,
    );
    const current = allItems.find((item) => item.id === reviewItemId);
    if (!current) return null;

    const patch = nextReviewPatch(current, result);
    const updatedReview = await this.engine.persistence.repositories.review.updateReviewItem({
      id: current.id,
      state: 'pending',
      dueAt: patch.dueAt,
      intervalDays: patch.intervalDays,
      easeFactor: patch.easeFactor,
      lastReviewedAt: nowIso(),
      lastResult: result,
      attemptsCount: patch.attemptsCount,
      strength: patch.strength,
      metadata: current.metadata,
    });

    const view = metadataView(current);
    const evidenceInput: EvidenceIngestionInput = {
      activityType: 'review_result',
      nodeIds: current.nodeId ? [current.nodeId] : undefined,
      rawInputText: extras?.answer ?? null,
      rawOutputText: view.translation,
      scores: {
        correctness: result === 'correct' ? 92 : result === 'partial' ? 60 : 20,
      },
      analysisResult: { result },
      weakTags: extras?.weakTags ?? (result === 'incorrect' ? ['review_accuracy'] : []),
      metadata: {
        reviewItemId: current.id,
        term: view.term,
        translation: view.translation,
      },
    };

    const { evidence } = await this.evidenceService.ingest(evidenceInput);
    const learnerUpdate = await this.learnerStateService.applyEvidence(evidence);

    return {
      reviewItem: updatedReview,
      evidence,
      updatedNodeStates: learnerUpdate.updatedNodeStates,
    };
  }
}
