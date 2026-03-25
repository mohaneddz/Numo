import {
  AggregateProviderError,
  ProviderCallError,
  type EmbeddingProvider,
  type EmbeddingRequest,
  type EmbeddingResponse,
  type LlmGenerateRequest,
  type LlmGenerateResponse,
  type LlmProvider,
  type ProviderCapability,
  type ProviderModality,
  type ProviderSelectionOptions,
  type RuntimeProviderBase,
  type SttProvider,
  type SttTranscribeRequest,
  type SttTranscribeResponse,
  type TtsProvider,
  type TtsSynthesizeRequest,
  type TtsSynthesizeResponse,
} from './types';

type ModalityProviderMap = {
  llm: LlmProvider;
  stt: SttProvider;
  tts: TtsProvider;
  embedding: EmbeddingProvider;
};

type RegistrationOptions = {
  primaryFor?: ProviderModality[];
};

function asProviderError(
  unknownError: unknown,
  providerId: string,
  modality: ProviderModality,
): ProviderCallError {
  if (unknownError instanceof ProviderCallError) {
    return unknownError;
  }

  const message = unknownError instanceof Error ? unknownError.message : 'Unknown provider failure.';
  return new ProviderCallError({
    providerId,
    modality,
    message,
    code: 'UNKNOWN',
    retryable: false,
    cause: unknownError,
  });
}

export class ProviderRouter {
  private llmProviders = new Map<string, LlmProvider>();
  private sttProviders = new Map<string, SttProvider>();
  private ttsProviders = new Map<string, TtsProvider>();
  private embeddingProviders = new Map<string, EmbeddingProvider>();
  private primaryProvider: Partial<Record<ProviderModality, string>> = {};

  registerLlmProvider(provider: LlmProvider, options?: RegistrationOptions): void {
    this.llmProviders.set(provider.id, provider);
    if (options?.primaryFor?.includes('llm')) {
      this.primaryProvider.llm = provider.id;
    }
  }

  registerSttProvider(provider: SttProvider, options?: RegistrationOptions): void {
    this.sttProviders.set(provider.id, provider);
    if (options?.primaryFor?.includes('stt')) {
      this.primaryProvider.stt = provider.id;
    }
  }

  registerTtsProvider(provider: TtsProvider, options?: RegistrationOptions): void {
    this.ttsProviders.set(provider.id, provider);
    if (options?.primaryFor?.includes('tts')) {
      this.primaryProvider.tts = provider.id;
    }
  }

  registerEmbeddingProvider(provider: EmbeddingProvider, options?: RegistrationOptions): void {
    this.embeddingProviders.set(provider.id, provider);
    if (options?.primaryFor?.includes('embedding')) {
      this.primaryProvider.embedding = provider.id;
    }
  }

  listCapabilities(modality?: ProviderModality): ProviderCapability[] {
    const collect = (providers: Map<string, RuntimeProviderBase>): ProviderCapability[] =>
      Array.from(providers.values()).flatMap((provider) => provider.listCapabilities());

    if (!modality) {
      return [
        ...collect(this.llmProviders),
        ...collect(this.sttProviders),
        ...collect(this.ttsProviders),
        ...collect(this.embeddingProviders),
      ];
    }

    if (modality === 'llm') return collect(this.llmProviders);
    if (modality === 'stt') return collect(this.sttProviders);
    if (modality === 'tts') return collect(this.ttsProviders);
    return collect(this.embeddingProviders);
  }

  async complete(
    request: LlmGenerateRequest,
    options?: ProviderSelectionOptions,
  ): Promise<LlmGenerateResponse> {
    return this.callWithFallback('llm', request, options, (provider) => provider.complete(request));
  }

  async transcribe(
    request: SttTranscribeRequest,
    options?: ProviderSelectionOptions,
  ): Promise<SttTranscribeResponse> {
    return this.callWithFallback('stt', request, options, (provider) => provider.transcribe(request));
  }

  async synthesize(
    request: TtsSynthesizeRequest,
    options?: ProviderSelectionOptions,
  ): Promise<TtsSynthesizeResponse> {
    return this.callWithFallback('tts', request, options, (provider) => provider.synthesize(request));
  }

  async embed(
    request: EmbeddingRequest,
    options?: ProviderSelectionOptions,
  ): Promise<EmbeddingResponse> {
    return this.callWithFallback('embedding', request, options, (provider) => provider.embed(request));
  }

  private providersForModality<TModality extends ProviderModality>(
    modality: TModality,
  ): Map<string, ModalityProviderMap[TModality]> {
    if (modality === 'llm') return this.llmProviders as Map<string, ModalityProviderMap[TModality]>;
    if (modality === 'stt') return this.sttProviders as Map<string, ModalityProviderMap[TModality]>;
    if (modality === 'tts') return this.ttsProviders as Map<string, ModalityProviderMap[TModality]>;
    return this.embeddingProviders as Map<string, ModalityProviderMap[TModality]>;
  }

  private orderedProviderIds(
    modality: ProviderModality,
    availableIds: string[],
    options?: ProviderSelectionOptions,
  ): string[] {
    const preferred = options?.preferredProviderId;
    const primary = this.primaryProvider[modality];
    const order: string[] = [];
    const push = (id: string | undefined) => {
      if (!id || !availableIds.includes(id) || order.includes(id)) {
        return;
      }
      order.push(id);
    };

    push(preferred);
    push(primary);
    availableIds.forEach((id) => push(id));

    if (options?.allowFallback === false) {
      return order.slice(0, 1);
    }

    return order;
  }

  private async callWithFallback<TModality extends ProviderModality, TResult>(
    modality: TModality,
    request: unknown,
    options: ProviderSelectionOptions | undefined,
    operation: (provider: ModalityProviderMap[TModality]) => Promise<TResult>,
  ): Promise<TResult> {
    const providers = this.providersForModality(modality);
    const providerIds = this.orderedProviderIds(modality, Array.from(providers.keys()), options);
    if (providerIds.length === 0) {
      throw new AggregateProviderError(modality, []);
    }

    const errors: ProviderCallError[] = [];
    for (const providerId of providerIds) {
      const provider = providers.get(providerId);
      if (!provider) continue;

      try {
        return await operation(provider);
      } catch (unknownError) {
        void request;
        const providerError = asProviderError(unknownError, providerId, modality);
        errors.push(providerError);
        options?.onProviderError?.(providerError);
      }
    }

    throw new AggregateProviderError(modality, errors);
  }
}
