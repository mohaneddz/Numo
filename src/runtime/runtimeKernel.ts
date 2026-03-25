import {
  GenerationEvaluationPipeline,
} from './pipeline/generationEvaluationPipeline';
import { GroqProvider } from './providers/groqProvider';
import { LocalFallbackProvider } from './providers/localFallbackProvider';
import { ProviderRouter } from './providers/providerRouter';
import type {
  LlmGenerateRequest,
  LlmGenerateResponse,
  ProviderSelectionOptions,
  SttTranscribeRequest,
  SttTranscribeResponse,
  TtsSynthesizeRequest,
  TtsSynthesizeResponse,
} from './providers/types';
import { BackgroundTaskManager } from './tasks/backgroundTaskManager';
import {
  RUNTIME_TASK_TYPES,
  type ContentEvaluationTaskPayload,
  type ContentGenerationTaskPayload,
  type GenerationNeed,
  type GenerationPipelineResult,
  type PromptTaskPayload,
  type RuntimeBackgroundMode,
  type RuntimePersistenceAdapter,
  type RuntimeStatusSnapshot,
  type RuntimeTask,
  type RuntimeTaskEnqueueInput,
} from './types';

const RUNTIME_MODE_STORAGE_KEY = 'noema_runtime_mode_v1';

function readSavedMode(): RuntimeBackgroundMode {
  if (typeof window === 'undefined') {
    return 'active';
  }

  const value = window.localStorage.getItem(RUNTIME_MODE_STORAGE_KEY);
  if (value === 'off' || value === 'light' || value === 'active') {
    return value;
  }
  return 'active';
}

function saveMode(mode: RuntimeBackgroundMode): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(RUNTIME_MODE_STORAGE_KEY, mode);
}

function isPromptPayload(value: unknown): value is PromptTaskPayload {
  const typed = value as PromptTaskPayload;
  return typeof typed?.prompt === 'string';
}

function isContentGenerationPayload(value: unknown): value is ContentGenerationTaskPayload {
  const typed = value as ContentGenerationTaskPayload;
  return Boolean(typed?.need?.id && typed?.need?.objective);
}

function isContentEvaluationPayload(value: unknown): value is ContentEvaluationTaskPayload {
  const typed = value as ContentEvaluationTaskPayload;
  return Boolean(typed?.need?.id && typed?.candidateText);
}

export class RuntimeKernel {
  readonly providers: ProviderRouter;
  readonly background: BackgroundTaskManager;
  readonly generationPipeline: GenerationEvaluationPipeline;

  constructor(options?: { persistenceAdapter?: RuntimePersistenceAdapter }) {
    const persistenceAdapter = options?.persistenceAdapter;
    this.providers = new ProviderRouter();
    this.background = new BackgroundTaskManager({
      initialMode: readSavedMode(),
      persistenceAdapter,
    });
    this.generationPipeline = new GenerationEvaluationPipeline({
      providerRouter: this.providers,
      persistenceAdapter,
    });

    this.registerProviders();
    this.registerTaskHandlers();
  }

  private registerProviders(): void {
    const groqProvider = new GroqProvider();
    const localFallback = new LocalFallbackProvider();

    this.providers.registerLlmProvider(groqProvider, { primaryFor: ['llm'] });
    this.providers.registerSttProvider(groqProvider, { primaryFor: ['stt'] });
    this.providers.registerTtsProvider(groqProvider, { primaryFor: ['tts'] });

    this.providers.registerLlmProvider(localFallback);
    this.providers.registerSttProvider(localFallback);
    this.providers.registerTtsProvider(localFallback);
  }

  private registerTaskHandlers(): void {
    this.background.registerHandler('content_generation', async (task) => {
      if (!isContentGenerationPayload(task.payload)) {
        throw new Error('content_generation task requires a valid `need` payload.');
      }
      return this.generationPipeline.run({
        need: task.payload.need,
        context: task.payload.context,
        acceptanceThreshold: task.payload.acceptanceThreshold,
      });
    });

    this.background.registerHandler('content_evaluation', async (task) => {
      if (!isContentEvaluationPayload(task.payload)) {
        throw new Error('content_evaluation task requires `need` and `candidateText`.');
      }
      return this.generationPipeline.evaluateCandidate({
        need: task.payload.need,
        context: task.payload.context,
        candidateText: task.payload.candidateText,
        acceptanceThreshold: task.payload.acceptanceThreshold,
      });
    });

    const promptDrivenTypes = RUNTIME_TASK_TYPES.filter(
      (type) => type !== 'content_generation' && type !== 'content_evaluation',
    );
    promptDrivenTypes.forEach((type) => {
      this.background.registerHandler(type, async (task) => {
        if (!isPromptPayload(task.payload)) {
          return {
            taskType: type,
            status: 'placeholder',
            note: 'Task scaffolding is ready; connect this task to domain adapters.',
          };
        }

        const response = await this.providers.complete({
          messages: [
            {
              role: 'system',
              content:
                'You are a runtime task worker. Return concise, structured output for internal processing.',
            },
            { role: 'user', content: task.payload.prompt },
          ],
          model: task.payload.model,
          maxTokens: task.payload.maxTokens ?? 500,
          temperature: task.payload.temperature ?? 0.2,
        });

        return {
          taskType: type,
          response: response.text,
          providerId: response.providerId,
          model: response.model,
        };
      });
    });
  }

  subscribe(listener: (status: RuntimeStatusSnapshot) => void): () => void {
    return this.background.subscribe(listener);
  }

  getStatus(): RuntimeStatusSnapshot {
    return this.background.getStatus();
  }

  setBackgroundMode(mode: RuntimeBackgroundMode): void {
    this.background.setMode(mode);
    saveMode(mode);
  }

  setForegroundSurface(surface: string): void {
    this.background.setForegroundSurface(surface);
  }

  enqueueTask<TPayload>(input: RuntimeTaskEnqueueInput<TPayload>): RuntimeTask<TPayload> {
    return this.background.enqueue(input);
  }

  cancelTask(taskId: string): boolean {
    return this.background.cancelTask(taskId);
  }

  enqueueGenerationNeed(
    need: GenerationNeed,
    options?: { priority?: RuntimeTaskEnqueueInput['priority']; threshold?: number },
  ): RuntimeTask<ContentGenerationTaskPayload> {
    return this.enqueueTask<ContentGenerationTaskPayload>({
      type: 'content_generation',
      priority: options?.priority ?? 'normal',
      payload: {
        need,
        acceptanceThreshold: options?.threshold,
      },
    });
  }

  async runGenerationPipeline(input: ContentGenerationTaskPayload): Promise<GenerationPipelineResult> {
    return this.generationPipeline.run({
      need: input.need,
      context: input.context,
      acceptanceThreshold: input.acceptanceThreshold,
    });
  }

  async completeWithForegroundTracking(
    request: LlmGenerateRequest,
    options?: ProviderSelectionOptions,
  ): Promise<LlmGenerateResponse> {
    return this.runForegroundTask(() => this.providers.complete(request, options));
  }

  async transcribeWithForegroundTracking(
    request: SttTranscribeRequest,
    options?: ProviderSelectionOptions,
  ): Promise<SttTranscribeResponse> {
    return this.runForegroundTask(() => this.providers.transcribe(request, options));
  }

  async synthesizeWithForegroundTracking(
    request: TtsSynthesizeRequest,
    options?: ProviderSelectionOptions,
  ): Promise<TtsSynthesizeResponse> {
    return this.runForegroundTask(() => this.providers.synthesize(request, options));
  }

  async runForegroundTask<T>(operation: () => Promise<T>): Promise<T> {
    const end = this.background.beginForegroundActivity();
    try {
      return await operation();
    } finally {
      end();
    }
  }
}

export const runtimeKernel = new RuntimeKernel();
