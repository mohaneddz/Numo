import { type ProviderRouter } from '../providers/providerRouter';
import type {
  GenerationCandidate,
  GenerationContextChunk,
  GenerationNeed,
  GenerationPipelineResult,
  RuntimePersistenceAdapter,
} from '../types';

interface PipelineContextAdapter {
  gatherContext: (need: GenerationNeed) => Promise<GenerationContextChunk[]>;
}

interface GenerationPipelineOptions {
  providerRouter: ProviderRouter;
  contextAdapter?: PipelineContextAdapter;
  persistenceAdapter?: RuntimePersistenceAdapter;
}

interface GenerationRunInput {
  need: GenerationNeed;
  context?: GenerationContextChunk[];
  acceptanceThreshold?: number;
}

interface EvaluateCandidateInput {
  need: GenerationNeed;
  candidateText: string;
  context?: GenerationContextChunk[];
  acceptanceThreshold?: number;
}

interface ParsedEvaluation {
  decision: 'accepted' | 'rejected';
  score: number;
  reason: string;
}

function safeJsonParse(input: string): unknown | null {
  try {
    return JSON.parse(input);
  } catch {
    const jsonBlock = input.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonBlock) return null;
    try {
      return JSON.parse(jsonBlock);
    } catch {
      return null;
    }
  }
}

function parseEvaluation(raw: string): ParsedEvaluation {
  const parsed = safeJsonParse(raw) as Partial<ParsedEvaluation> | null;
  const decision = parsed?.decision === 'accepted' ? 'accepted' : 'rejected';
  const score = Number.isFinite(parsed?.score)
    ? Math.max(0, Math.min(100, Number(parsed?.score)))
    : 0;
  const reason = typeof parsed?.reason === 'string' && parsed.reason.trim().length > 0
    ? parsed.reason.trim()
    : 'Evaluator did not provide a structured reason.';

  return { decision, score, reason };
}

function createCandidate(text: string, providerId: string, model: string): GenerationCandidate {
  return {
    id: `candidate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    model,
    providerId,
    createdAt: Date.now(),
  };
}

export class GenerationEvaluationPipeline {
  private readonly providerRouter: ProviderRouter;
  private readonly contextAdapter?: PipelineContextAdapter;
  private persistenceAdapter?: RuntimePersistenceAdapter;

  constructor(options: GenerationPipelineOptions) {
    this.providerRouter = options.providerRouter;
    this.contextAdapter = options.contextAdapter;
    this.persistenceAdapter = options.persistenceAdapter;
  }

  setPersistenceAdapter(adapter?: RuntimePersistenceAdapter): void {
    this.persistenceAdapter = adapter;
  }

  async run(input: GenerationRunInput): Promise<GenerationPipelineResult> {
    const context = await this.resolveContext(input.need, input.context);
    const generated = await this.providerRouter.complete({
      messages: [
        {
          role: 'system',
          content:
            'You generate language-learning content candidates. Return content only without commentary.',
        },
        {
          role: 'user',
          content: JSON.stringify(
            {
              need: input.need,
              context,
              instructions: [
                'Generate one candidate content item that matches the need.',
                'Keep the response compact and learner-useful.',
              ],
            },
            null,
            2,
          ),
        },
      ],
      temperature: 0.6,
      maxTokens: 900,
    });

    const candidate = createCandidate(generated.text, generated.providerId, generated.model);
    const result = await this.evaluateCandidateInternal({
      need: input.need,
      candidateText: candidate.text,
      candidate,
      context,
      acceptanceThreshold: input.acceptanceThreshold,
      persist: false,
    });
    this.persist(result);
    return result;
  }

  async evaluateCandidate(input: EvaluateCandidateInput): Promise<GenerationPipelineResult> {
    const result = await this.evaluateCandidateInternal({
      ...input,
      persist: true,
    });
    return result;
  }

  private async evaluateCandidateInternal(
    input: EvaluateCandidateInput & { candidate?: GenerationCandidate; persist: boolean },
  ): Promise<GenerationPipelineResult> {
    const context = await this.resolveContext(input.need, input.context);
    const threshold = input.acceptanceThreshold ?? 70;

    const evaluationResponse = await this.providerRouter.complete({
      messages: [
        {
          role: 'system',
          content:
            'You are an evaluator for language-learning content quality. Respond with JSON only.',
        },
        {
          role: 'user',
          content: JSON.stringify(
            {
              need: input.need,
              context,
              candidate: input.candidateText,
              rules: [
                'Check curriculum alignment, language correctness, naturalness, and usefulness.',
                'Reject if quality is low, too generic, or weakly aligned.',
              ],
              responseShape: {
                decision: 'accepted | rejected',
                score: '0-100',
                reason: 'short explanation',
              },
            },
            null,
            2,
          ),
        },
      ],
      temperature: 0.1,
      maxTokens: 350,
      responseFormat: { type: 'json_object' },
    });

    const parsed = parseEvaluation(evaluationResponse.text);
    const accepted = parsed.decision === 'accepted' && parsed.score >= threshold;

    const result: GenerationPipelineResult = {
      need: input.need,
      context,
      candidate: input.candidate ?? createCandidate(input.candidateText, 'external', 'external'),
      evaluation: {
        decision: accepted ? 'accepted' : 'rejected',
        score: parsed.score,
        reason: parsed.reason,
        raw: evaluationResponse.text,
      },
      accepted,
      createdAt: Date.now(),
    };

    if (input.persist) {
      this.persist(result);
    }
    return result;
  }

  private async resolveContext(
    need: GenerationNeed,
    context?: GenerationContextChunk[],
  ): Promise<GenerationContextChunk[]> {
    if (context && context.length > 0) {
      return context;
    }
    if (this.contextAdapter) {
      return this.contextAdapter.gatherContext(need);
    }
    return [];
  }

  private persist(result: GenerationPipelineResult): void {
    try {
      this.persistenceAdapter?.onGenerationPipelineResult?.(result);
    } catch {
      // Persistence integration is optional.
    }
  }
}
