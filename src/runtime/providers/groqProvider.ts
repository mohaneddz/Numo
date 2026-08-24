import { getConfiguredGroqApiKeys, getEffectiveAiConfig } from '../../config/aiConfig';
import type { ApiQuotaSnapshot } from '../../types/ai';
import {
  ProviderCallError,
  type LlmGenerateRequest,
  type LlmGenerateResponse,
  type LlmProvider,
  type ProviderCapability,
  type SttProvider,
  type SttTranscribeRequest,
  type SttTranscribeResponse,
  type TtsProvider,
  type TtsSynthesizeRequest,
  type TtsSynthesizeResponse,
} from './types';

interface GroqErrorPayload {
  error?: {
    message?: string;
  };
}

interface GroqChatPayload {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface GroqTranscriptionPayload {
  text?: string;
}

let latestQuotaSnapshot: ApiQuotaSnapshot | null = null;

function captureQuotaHeaders(headers: Headers): void {
  const limitRequests = Number.parseInt(headers.get('x-ratelimit-limit-requests') || '0', 10);
  const remainingRequests = Number.parseInt(headers.get('x-ratelimit-remaining-requests') || '0', 10);
  const resetRequests = headers.get('x-ratelimit-reset-requests') || '';
  const limitTokens = Number.parseInt(headers.get('x-ratelimit-limit-tokens') || '0', 10);
  const remainingTokens = Number.parseInt(headers.get('x-ratelimit-remaining-tokens') || '0', 10);
  const resetTokens = headers.get('x-ratelimit-reset-tokens') || '';

  if (limitRequests <= 0 && limitTokens <= 0) {
    return;
  }

  latestQuotaSnapshot = {
    limitRequests: limitRequests > 0 ? limitRequests : undefined,
    remainingRequests: remainingRequests >= 0 ? remainingRequests : undefined,
    resetRequests: resetRequests || undefined,
    limitTokens: limitTokens > 0 ? limitTokens : undefined,
    remainingTokens: remainingTokens >= 0 ? remainingTokens : undefined,
    resetTokens: resetTokens || undefined,
    rawHeaders: {},
    updatedAt: Date.now(),
  };
}

async function parseErrorResponse(
  response: Response,
  providerId: string,
  modality: 'llm' | 'stt' | 'tts',
): Promise<ProviderCallError> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Ignore JSON parse failures and use fallback text.
  }

  const typed = payload as GroqErrorPayload;
  const message =
    typed.error?.message?.trim() ||
    `Groq request failed with status ${response.status}.`;

  const retryable = response.status === 408 || response.status === 429 || response.status >= 500;

  return new ProviderCallError({
    providerId,
    modality,
    message,
    code: `HTTP_${response.status}`,
    retryable,
  });
}

function ensureApiKey(providerId: string, modality: 'llm' | 'stt' | 'tts'): void {
  if (getConfiguredGroqApiKeys().length === 0) {
    throw new ProviderCallError({
      providerId,
      modality,
      message: 'Missing `VITE_GROQ_API_KEY` in environment.',
      code: 'NO_API_KEY',
      retryable: false,
    });
  }
}

async function fetchWithConfiguredKeys(
  request: (apiKey: string) => Promise<Response>,
): Promise<Response> {
  const keys = getConfiguredGroqApiKeys();
  let lastResponse: Response | null = null;
  let lastError: unknown;
  for (const apiKey of keys) {
    try {
      const response = await request(apiKey);
      if (response.ok) return response;
      lastResponse = response;
      const shouldTryAnother =
        response.status === 401 ||
        response.status === 403 ||
        response.status === 429 ||
        response.status >= 500;
      if (!shouldTryAnother) return response;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastResponse) return lastResponse;
  throw lastError instanceof Error ? lastError : new Error('Every configured Groq API key failed.');
}

export function getGroqQuotaSnapshot(): ApiQuotaSnapshot | null {
  return latestQuotaSnapshot;
}

export class GroqProvider implements LlmProvider, SttProvider, TtsProvider {
  id = 'groq';
  displayName = 'Groq';
  isLocal = false;

  listCapabilities(): ProviderCapability[] {
    const config = getEffectiveAiConfig();
    return [
      {
        modality: 'llm',
        model: config.models.chat,
        tags: ['chat', 'json', 'remote'],
      },
      {
        modality: 'stt',
        model: config.models.stt,
        tags: ['transcription', 'remote'],
      },
      {
        modality: 'tts',
        model: config.models.tts,
        tags: ['speech', 'remote'],
      },
    ];
  }

  async complete(request: LlmGenerateRequest): Promise<LlmGenerateResponse> {
    ensureApiKey(this.id, 'llm');
    const config = getEffectiveAiConfig();

    const endpoint = `${config.baseUrl}/chat/completions`;
    const model = request.model ?? config.models.chat;
    const payload: Record<string, unknown> = {
      model,
      messages: request.messages,
      temperature: request.temperature ?? 0.6,
      max_tokens: request.maxTokens ?? 500,
    };

    if (request.responseFormat) {
      payload.response_format = request.responseFormat;
    }

    const response = await fetchWithConfiguredKeys((apiKey) =>
      fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }),
    );
    captureQuotaHeaders(response.headers);

    if (!response.ok) {
      throw await parseErrorResponse(response, this.id, 'llm');
    }

    const data = (await response.json()) as GroqChatPayload;
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new ProviderCallError({
        providerId: this.id,
        modality: 'llm',
        message: 'Groq returned an empty chat response.',
        code: 'EMPTY_RESPONSE',
        retryable: false,
      });
    }

    return {
      text,
      model,
      providerId: this.id,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
      },
    };
  }

  async transcribe(request: SttTranscribeRequest): Promise<SttTranscribeResponse> {
    ensureApiKey(this.id, 'stt');
    const config = getEffectiveAiConfig();

    const endpoint = `${config.baseUrl}/audio/transcriptions`;
    const model = request.model ?? config.models.stt;
    const response = await fetchWithConfiguredKeys((apiKey) => {
      const formData = new FormData();
      formData.append('model', model);
      formData.append('file', request.audio, 'recording.webm');
      if (request.language) {
        formData.append('language', request.language);
      }
      return fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });
    });
    captureQuotaHeaders(response.headers);

    if (!response.ok) {
      throw await parseErrorResponse(response, this.id, 'stt');
    }

    const data = (await response.json()) as GroqTranscriptionPayload;
    return {
      text: data.text?.trim() ?? '',
      model,
      providerId: this.id,
    };
  }

  async synthesize(request: TtsSynthesizeRequest): Promise<TtsSynthesizeResponse> {
    ensureApiKey(this.id, 'tts');
    const config = getEffectiveAiConfig();

    const endpoint = `${config.baseUrl}/audio/speech`;
    const model = request.model ?? config.models.tts;
    // request.language is deliberately not sent: this endpoint derives the spoken
    // language from the voice and rejects unknown fields. The hint is still carried
    // on the request for providers that can act on it, such as local Piper.
    const payload = {
      model,
      voice: request.voice ?? config.models.ttsVoice,
      input: request.text,
      response_format: request.format ?? 'wav',
    };

    const response = await fetchWithConfiguredKeys((apiKey) =>
      fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }),
    );
    captureQuotaHeaders(response.headers);

    if (!response.ok) {
      throw await parseErrorResponse(response, this.id, 'tts');
    }

    return {
      audio: await response.blob(),
      model,
      providerId: this.id,
    };
  }
}
