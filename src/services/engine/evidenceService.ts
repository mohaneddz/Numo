import type { EngineContext, EvidenceIngestionInput, EvidenceIngestionResult } from './types';
import { resolveNodeIds } from './nodeResolver';

export class EvidenceService {
  constructor(private readonly engine: EngineContext) {}

  async ingest(input: EvidenceIngestionInput): Promise<EvidenceIngestionResult> {
    const resolved = resolveNodeIds({
      nodes: this.engine.curriculumNodes,
      explicitNodeIds: input.nodeIds,
      explicitNodeKeys: input.nodeKeys,
      languageCode: this.engine.languageCode,
      activityType: input.activityType,
    });

    const evidence = await this.engine.persistence.repositories.evidence.logEvidence({
      learnerId: this.engine.learnerId,
      languageId: this.engine.languageId,
      sessionId: input.sessionId ?? null,
      attemptId: input.attemptId ?? null,
      activityType: input.activityType,
      nodeIds: resolved.nodeIds,
      contentItemId: input.contentItemId ?? null,
      rawInputText: input.rawInputText ?? null,
      rawOutputText: input.rawOutputText ?? null,
      rawInputRef: input.rawInputRef ?? null,
      rawOutputRef: input.rawOutputRef ?? null,
      analysisResult: input.analysisResult ?? {},
      scores: input.scores ?? {},
      confidenceEstimate: input.confidenceEstimate ?? null,
      timeTakenMs: input.timeTakenMs ?? null,
      hintsUsed: input.hintsUsed ?? null,
      correctionCount: input.correctionCount ?? null,
      transcription: input.transcription ?? null,
      pronunciationNotes: input.pronunciationNotes ?? null,
      metadata: {
        ...(input.metadata ?? {}),
        weakTags: input.weakTags ?? [],
        nodeResolutionSource: resolved.source,
        ingestedAt: new Date().toISOString(),
      },
      createdAt: input.createdAt,
    });

    return {
      evidence,
      resolvedNodeIds: resolved.nodeIds,
    };
  }
}
