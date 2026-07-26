import { invoke } from '@tauri-apps/api/core';
import { readLocalRuntimeSettings } from '../../services/localRuntimeSettings';
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

function unavailable(modality: 'llm' | 'stt' | 'tts', message: string): ProviderCallError {
  return new ProviderCallError({
    providerId: 'local-native',
    modality,
    message,
    code: 'LOCAL_RESOURCE_NOT_CONFIGURED',
    retryable: false,
  });
}

function buildPrompt(messages: LlmGenerateRequest['messages']): string {
  return messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n\n')
    .concat('\n\nASSISTANT:');
}

export class LocalNativeProvider implements LlmProvider, SttProvider, TtsProvider {
  id = 'local-native';
  displayName = 'Local Models';
  isLocal = true;

  listCapabilities(): ProviderCapability[] {
    const paths = readLocalRuntimeSettings().paths;
    return [
      { modality: 'llm', model: paths.llmModel || 'Unconfigured GGUF', tags: ['local', 'offline', 'llama.cpp'] },
      { modality: 'stt', model: paths.whisperModel || 'Unconfigured Whisper', tags: ['local', 'offline'] },
      { modality: 'tts', model: paths.piperVoiceModel || 'Unconfigured Piper voice', tags: ['local', 'offline'] },
    ];
  }

  async complete(request: LlmGenerateRequest): Promise<LlmGenerateResponse> {
    const paths = readLocalRuntimeSettings().paths;
    if (!paths.llmExecutable || !paths.llmModel) {
      throw unavailable('llm', 'Choose llama.cpp and a GGUF model in Settings → Models & Storage.');
    }
    const text = await invoke<string>('run_local_llm', {
      executablePath: paths.llmExecutable,
      modelPath: paths.llmModel,
      prompt: buildPrompt(request.messages),
      maxTokens: request.maxTokens ?? 700,
      temperature: request.temperature ?? 0.4,
    });
    return { text: text.trim(), model: paths.llmModel, providerId: this.id };
  }

  async transcribe(request: SttTranscribeRequest): Promise<SttTranscribeResponse> {
    const paths = readLocalRuntimeSettings().paths;
    if (!paths.whisperExecutable || !paths.whisperModel || !paths.ffmpegExecutable) {
      throw unavailable('stt', 'Choose Whisper, its model, and FFmpeg in Settings → Models & Storage.');
    }
    const audioBytes = Array.from(new Uint8Array(await request.audio.arrayBuffer()));
    const text = await invoke<string>('run_local_stt', {
      executablePath: paths.whisperExecutable,
      modelPath: paths.whisperModel,
      ffmpegPath: paths.ffmpegExecutable,
      audioBytes,
      language: request.language || 'auto',
    });
    return { text: text.trim(), model: paths.whisperModel, providerId: this.id };
  }

  async synthesize(request: TtsSynthesizeRequest): Promise<TtsSynthesizeResponse> {
    const paths = readLocalRuntimeSettings().paths;
    if (!paths.piperExecutable || !paths.piperVoiceModel) {
      throw unavailable('tts', 'Choose Piper and an ONNX voice in Settings → Models & Storage.');
    }
    const bytes = await invoke<number[]>('run_local_tts', {
      executablePath: paths.piperExecutable,
      voiceModelPath: paths.piperVoiceModel,
      text: request.text,
      // Piper voice models are language-specific; the hint lets the backend pick a
      // matching voice when several are configured.
      language: request.language ?? null,
    });
    return {
      audio: new Blob([Uint8Array.from(bytes)], { type: 'audio/wav' }),
      model: paths.piperVoiceModel,
      providerId: this.id,
    };
  }
}
