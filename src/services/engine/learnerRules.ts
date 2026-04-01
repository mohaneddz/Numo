import type { EvidenceRecord, LearnerNodeStateRecord } from '../../persistence';

export interface LearnerRuleOutput {
  masteryScore: number;
  confidenceScore: number;
  forgettingRisk: number;
  recognitionScore: number;
  productionScore: number;
  listeningScore: number;
  readingScore: number;
  writingScore: number;
  speakingScore: number;
  pronunciationScore: number;
  successDelta: number;
  failureDelta: number;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function scoreNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function inferResultQuality(evidence: EvidenceRecord): number {
  const correctness = scoreNumber((evidence.scores as Record<string, unknown>).correctness);
  if (correctness !== null) return clamp(correctness, 0, 100);

  const accuracy = scoreNumber((evidence.scores as Record<string, unknown>).accuracy);
  if (accuracy !== null) return clamp(accuracy, 0, 100);

  if (evidence.activityType === 'review') {
    const result = String((evidence.analysisResult as Record<string, unknown>).result ?? '').toLowerCase();
    if (result === 'correct') return 90;
    if (result === 'incorrect') return 20;
    if (result === 'partial') return 55;
  }
  return 50;
}

export function applyLearnerRule(
  previous: LearnerNodeStateRecord | null,
  evidence: EvidenceRecord,
): LearnerRuleOutput {
  const quality = inferResultQuality(evidence);
  const qualityCentered = (quality - 50) / 10;
  const isSuccess = quality >= 60;
  const weight = evidence.activityType === 'review' ? 1.1 : 0.9;
  const masteryBase = previous?.masteryScore ?? 35;
  const confidenceBase = previous?.confidenceScore ?? 30;
  const forgettingBase = previous?.forgettingRisk ?? 55;

  const masteryDelta = qualityCentered * weight;
  const confidenceDelta = qualityCentered * 0.8;
  const forgettingDelta = -qualityCentered * 1.3;

  const recognitionDelta = evidence.activityType === 'review' || evidence.activityType === 'learn' ? qualityCentered : 0;
  const productionDelta = evidence.activityType === 'write' || evidence.activityType === 'speak' ? qualityCentered : 0;
  const speakingDelta = evidence.activityType === 'speak' ? qualityCentered * 1.2 : 0;
  const writingDelta = evidence.activityType === 'write' ? qualityCentered * 1.2 : 0;
  const pronunciationDelta = evidence.activityType === 'speak'
    ? ((scoreNumber((evidence.scores as Record<string, unknown>).pronunciation) ?? quality) - 50) / 10
    : 0;

  return {
    masteryScore: clamp(masteryBase + masteryDelta),
    confidenceScore: clamp(confidenceBase + confidenceDelta),
    forgettingRisk: clamp(forgettingBase + forgettingDelta),
    recognitionScore: clamp((previous?.recognitionScore ?? 35) + recognitionDelta),
    productionScore: clamp((previous?.productionScore ?? 30) + productionDelta),
    listeningScore: clamp((previous?.listeningScore ?? 30) + (evidence.activityType === 'learn' ? qualityCentered * 0.6 : 0)),
    readingScore: clamp((previous?.readingScore ?? 30) + (evidence.activityType === 'learn' ? qualityCentered * 0.6 : 0)),
    writingScore: clamp((previous?.writingScore ?? 30) + writingDelta),
    speakingScore: clamp((previous?.speakingScore ?? 30) + speakingDelta),
    pronunciationScore: clamp((previous?.pronunciationScore ?? 30) + pronunciationDelta),
    successDelta: isSuccess ? 1 : 0,
    failureDelta: isSuccess ? 0 : 1,
  };
}
