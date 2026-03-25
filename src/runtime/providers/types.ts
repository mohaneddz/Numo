import type { VoicePersona } from '../../types/ai';

export type ProviderModality = 'llm' | 'stt' | 'tts' | 'embedding';

export interface ModelIdentity {
  providerId: string;
  model: string;
  modality: ProviderModality;
  isLocal: boolean;
}

export interface ProviderCapability {
  modality: ProviderModality;
  model: string;
  tags: string[];
}

export class ProviderCallError extends Error {
  providerId: string;
  modality: ProviderModality;
  code: string;
  retryable: boolean;
  cause?: unknown;

  constructor(params: {
    providerId: string;
    modality: ProviderModality;
    message: string;
    code: string;
    retryable: boolean;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = 'ProviderCallError';
    this.providerId = params.providerId;
    this.modality = params.modality;
    this.code = params.code;
    this.retryable = params.retryable;
    this.cause = params.cause;
  }
}

export class AggregateProviderError extends Error {
  modality: ProviderModality;
  errors: ProviderCallError[];

  constructor(modality: ProviderModality, errors: ProviderCallError[]) {
    super(
      errors.length > 0
        ? errors.map((entry) => `${entry.providerId}: ${entry.message}`).join(' | ')
        : `No provider available for modality: ${modality}.`,
    );
    this.name = 'AggregateProviderError';
    this.modality = modality;
    this.errors = errors;
  }
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmGenerateRequest {
  messages: LlmMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: { type: string };
}

export interface LlmGenerateResponse {
  text: string;
  model: string;
  providerId: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface SttTranscribeRequest {
  audio: Blob;
  language?: string;
  model?: string;
}

export interface SttTranscribeResponse {
  text: string;
  model: string;
  providerId: string;
}

export interface TtsSynthesizeRequest {
  text: string;
  voice?: VoicePersona;
  language?: string;
  model?: string;
  format?: 'mp3' | 'wav';
}

export interface TtsSynthesizeResponse {
  audio: Blob;
  model: string;
  providerId: string;
}

export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
}

export interface EmbeddingResponse {
  vectors: number[][];
  model: string;
  providerId: string;
}

export interface RuntimeProviderBase {
  id: string;
  displayName: string;
  isLocal: boolean;
  listCapabilities: () => ProviderCapability[];
}

export interface LlmProvider extends RuntimeProviderBase {
  complete: (request: LlmGenerateRequest) => Promise<LlmGenerateResponse>;
}

export interface SttProvider extends RuntimeProviderBase {
  transcribe: (request: SttTranscribeRequest) => Promise<SttTranscribeResponse>;
}

export interface TtsProvider extends RuntimeProviderBase {
  synthesize: (request: TtsSynthesizeRequest) => Promise<TtsSynthesizeResponse>;
}

export interface EmbeddingProvider extends RuntimeProviderBase {
  embed: (request: EmbeddingRequest) => Promise<EmbeddingResponse>;
}

export interface ProviderSelectionOptions {
  preferredProviderId?: string;
  allowFallback?: boolean;
  onProviderError?: (error: ProviderCallError) => void;
}
