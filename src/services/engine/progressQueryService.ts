import type { EvidenceRecord } from '../../persistence';
import type { EngineContext } from './types';

export interface CoreInsightsMetrics {
  dueCount: number;
  overdueCount: number;
  recentEvidenceCount: number;
  avgMasteryScore: number;
  avgConfidenceScore: number;
  weakClusters: Array<{ key: string; severity: number; hits: number }>;
  speakingTrend: number[];
  writingTrend: number[];
}

function recentScores(
  evidence: EvidenceRecord[],
  activityType: 'speak' | 'write',
): number[] {
  return evidence
    .filter((entry) => entry.activityType === activityType)
    .slice(0, 10)
    .map((entry) => Number((entry.scores as Record<string, unknown>).correctness ?? (entry.scores as Record<string, unknown>).accuracy ?? 50));
}

export class ProgressQueryService {
  constructor(private readonly engine: EngineContext) {}

  async getCoreMetrics(): Promise<CoreInsightsMetrics> {
    const [due, allReview, aggregate, weakClusters, evidence] = await Promise.all([
      this.engine.persistence.repositories.review.fetchDueItemsByLanguage({
        learnerId: this.engine.learnerId,
        languageId: this.engine.languageId,
      }),
      this.engine.persistence.repositories.review.listItemsByLanguage(
        this.engine.learnerId,
        this.engine.languageId,
        500,
      ),
      this.engine.persistence.repositories.learner.getProgressAggregate(
        this.engine.learnerId,
        this.engine.languageId,
      ),
      this.engine.persistence.repositories.learner.listWeaknessClusters(
        this.engine.learnerId,
        this.engine.languageId,
      ),
      this.engine.persistence.repositories.evidence.listEvidenceByLanguage(
        this.engine.learnerId,
        this.engine.languageId,
        200,
      ),
    ]);

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    return {
      dueCount: due.length,
      overdueCount: allReview.filter((entry) => new Date(entry.dueAt).getTime() < now).length,
      recentEvidenceCount: evidence.filter((entry) => new Date(entry.createdAt).getTime() >= sevenDaysAgo).length,
      avgMasteryScore: aggregate.avgMasteryScore,
      avgConfidenceScore: aggregate.avgConfidenceScore,
      weakClusters: weakClusters.slice(0, 5).map((cluster) => ({
        key: cluster.clusterKey,
        severity: cluster.severityScore,
        hits: cluster.hitCount,
      })),
      speakingTrend: recentScores(evidence, 'speak'),
      writingTrend: recentScores(evidence, 'write'),
    };
  }
}
