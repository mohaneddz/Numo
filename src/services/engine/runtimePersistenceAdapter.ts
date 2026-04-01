import type { GenerationPipelineResult, RuntimePersistenceAdapter, RuntimeTask } from '../../runtime/types';
import type { PersistenceContext } from '../../persistence';

async function appendJsonList<T>(
  context: PersistenceContext,
  key: string,
  entry: T,
  maxSize: number,
): Promise<void> {
  const current = await context.repositories.settings.getJson<T[]>(key);
  const next = [entry, ...(current ?? [])].slice(0, maxSize);
  await context.repositories.settings.setJson(key, next, 'runtime');
}

export function createRuntimePersistenceAdapter(
  context: PersistenceContext,
): RuntimePersistenceAdapter {
  return {
    async onTaskUpdated(task: RuntimeTask): Promise<void> {
      await appendJsonList(
        context,
        'runtime_tasks_recent',
        {
          id: task.id,
          type: task.type,
          status: task.status,
          priority: task.priority,
          updatedAt: task.updatedAt,
          error: task.error,
        },
        80,
      );
    },
    async onGenerationPipelineResult(result: GenerationPipelineResult): Promise<void> {
      await appendJsonList(
        context,
        'runtime_generation_recent',
        {
          needId: result.need.id,
          languageCode: result.need.languageCode,
          accepted: result.accepted,
          score: result.evaluation.score,
          reason: result.evaluation.reason,
          providerId: result.candidate.providerId,
          model: result.candidate.model,
          createdAt: result.createdAt,
        },
        40,
      );
    },
  };
}
