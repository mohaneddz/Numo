import type { EvidenceRecord, LearnerNodeStateRecord, WeaknessClusterRecord } from '../../persistence';
import type { EngineContext, LearnerUpdateResult } from './types';
import { applyLearnerRule } from './learnerRules';

function toWeakTags(evidence: EvidenceRecord): string[] {
  const metadata = evidence.metadata as Record<string, unknown>;
  const weakTags = metadata.weakTags;
  if (Array.isArray(weakTags)) {
    return weakTags.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
  }
  return [];
}

function nextReviewAt(qualityBand: number): string {
  const now = new Date();
  const days = qualityBand >= 80 ? 7 : qualityBand >= 60 ? 3 : 1;
  now.setDate(now.getDate() + days);
  return now.toISOString();
}

export class LearnerStateService {
  constructor(private readonly engine: EngineContext) {}

  async applyEvidence(evidence: EvidenceRecord): Promise<LearnerUpdateResult> {
    const updatedNodeStates: LearnerNodeStateRecord[] = [];
    const touchedWeaknesses: WeaknessClusterRecord[] = [];
    const weakTags = toWeakTags(evidence);
    const quality = Number((evidence.scores as Record<string, unknown>).correctness ?? 50);

    for (const nodeId of evidence.nodeIds) {
      const previous = await this.engine.persistence.repositories.learner.getLearnerNodeState(
        this.engine.learnerId,
        this.engine.languageId,
        nodeId,
      );
      const next = applyLearnerRule(previous, evidence);

      const state = await this.engine.persistence.repositories.learner.upsertLearnerNodeState({
        learnerId: this.engine.learnerId,
        languageId: this.engine.languageId,
        nodeId,
        masteryScore: next.masteryScore,
        confidenceScore: next.confidenceScore,
        exposureDelta: 1,
        successDelta: next.successDelta,
        failureDelta: next.failureDelta,
        lastSeenAt: evidence.createdAt,
        nextReviewAt: nextReviewAt(quality),
        forgettingRisk: next.forgettingRisk,
        recognitionScore: next.recognitionScore,
        productionScore: next.productionScore,
        listeningScore: next.listeningScore,
        readingScore: next.readingScore,
        writingScore: next.writingScore,
        speakingScore: next.speakingScore,
        pronunciationScore: next.pronunciationScore,
        weakTags,
        errorTags: weakTags,
      });
      updatedNodeStates.push(state);
    }

    if (weakTags.length > 0) {
      for (const tag of weakTags) {
        const cluster = await this.engine.persistence.repositories.learner.upsertWeaknessCluster({
          learnerId: this.engine.learnerId,
          languageId: this.engine.languageId,
          clusterKey: tag,
          title: `Weakness: ${tag}`,
          description: `Auto-tracked weakness from ${evidence.activityType}`,
          severityDelta: quality < 60 ? 8 : -2,
          hitDelta: quality < 60 ? 1 : 0,
          lastSeenAt: evidence.createdAt,
          relatedNodeIds: evidence.nodeIds,
          evidenceRefs: [evidence.id],
          tags: [tag, evidence.activityType],
        });
        touchedWeaknesses.push(cluster);
      }
    }

    return {
      evidence,
      updatedNodeStates,
      touchedWeaknesses,
    };
  }
}
