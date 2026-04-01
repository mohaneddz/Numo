import type {
  RuntimeBackgroundMode,
  RuntimeFailureSummary,
  RuntimePersistenceAdapter,
  RuntimeStatusSnapshot,
  RuntimeTask,
  RuntimeTaskEnqueueInput,
  RuntimeTaskPriority,
  RuntimeTaskType,
} from '../types';

export type RuntimeTaskHandler = (
  task: RuntimeTask,
  signal: AbortSignal,
) => Promise<unknown>;

interface BackgroundTaskManagerOptions {
  initialMode?: RuntimeBackgroundMode;
  heavySurfaces?: string[];
  maxRecentFailures?: number;
  persistenceAdapter?: RuntimePersistenceAdapter;
}

const DEFAULT_HEAVY_SURFACES = ['/chat', '/speak', '/write'];

function priorityWeight(priority: RuntimeTaskPriority): number {
  if (priority === 'critical') return 4;
  if (priority === 'high') return 3;
  if (priority === 'normal') return 2;
  return 1;
}

function now(): number {
  return Date.now();
}

function concurrencyForMode(mode: RuntimeBackgroundMode): number {
  if (mode === 'off') return 0;
  if (mode === 'light') return 1;
  return 2;
}

export class BackgroundTaskManager {
  private mode: RuntimeBackgroundMode;
  private tasks = new Map<string, RuntimeTask>();
  private queuedTaskIds: string[] = [];
  private runningTaskIds = new Set<string>();
  private controllers = new Map<string, AbortController>();
  private handlers = new Map<RuntimeTaskType, RuntimeTaskHandler>();
  private listeners = new Set<(status: RuntimeStatusSnapshot) => void>();
  private recentFailures: RuntimeFailureSummary[] = [];
  private foregroundSurface = '/';
  private foregroundInFlight = 0;
  private sequence = 0;
  private pumping = false;
  private pumpScheduled = false;
  private readonly heavySurfaces: string[];
  private readonly maxRecentFailures: number;
  private persistenceAdapter?: RuntimePersistenceAdapter;

  constructor(options: BackgroundTaskManagerOptions = {}) {
    this.mode = options.initialMode ?? 'active';
    this.heavySurfaces = options.heavySurfaces ?? DEFAULT_HEAVY_SURFACES;
    this.maxRecentFailures = options.maxRecentFailures ?? 20;
    this.persistenceAdapter = options.persistenceAdapter;
  }

  subscribe(listener: (status: RuntimeStatusSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  getStatus(): RuntimeStatusSnapshot {
    const queuedCount = this.queuedTaskIds.length;
    const running = Array.from(this.runningTaskIds)
      .map((id) => this.tasks.get(id))
      .filter((entry): entry is RuntimeTask => Boolean(entry))
      .map((entry) => ({
        id: entry.id,
        type: entry.type,
        priority: entry.priority,
        startedAt: entry.startedAt ?? entry.createdAt,
        attempt: entry.attempt,
      }));

    const baseConcurrency = concurrencyForMode(this.mode);
    const effectiveConcurrency = this.effectiveConcurrency();

    return {
      mode: this.mode,
      queuedCount,
      runningCount: this.runningTaskIds.size,
      taskCount: this.tasks.size,
      running,
      recentFailures: this.recentFailures,
      throttled: effectiveConcurrency < baseConcurrency,
      suppressedByForeground: this.foregroundInFlight > 0,
      foregroundSurface: this.foregroundSurface,
      foregroundInFlight: this.foregroundInFlight,
      lastUpdatedAt: now(),
    };
  }

  getTask(taskId: string): RuntimeTask | undefined {
    return this.tasks.get(taskId);
  }

  listTasks(): RuntimeTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  setMode(mode: RuntimeBackgroundMode): void {
    this.mode = mode;
    this.notify();
    this.schedulePump();
  }

  setForegroundSurface(surface: string): void {
    this.foregroundSurface = surface || '/';
    this.notify();
    this.schedulePump();
  }

  beginForegroundActivity(): () => void {
    this.foregroundInFlight += 1;
    this.notify();
    this.schedulePump();
    let closed = false;

    return () => {
      if (closed) return;
      closed = true;
      this.foregroundInFlight = Math.max(0, this.foregroundInFlight - 1);
      this.notify();
      this.schedulePump();
    };
  }

  registerHandler(type: RuntimeTaskType, handler: RuntimeTaskHandler): void {
    this.handlers.set(type, handler);
  }

  setPersistenceAdapter(adapter?: RuntimePersistenceAdapter): void {
    this.persistenceAdapter = adapter;
  }

  enqueue<TPayload>(input: RuntimeTaskEnqueueInput<TPayload>): RuntimeTask<TPayload> {
    const createdAt = now();
    const task: RuntimeTask<TPayload> = {
      id: `runtime-task-${createdAt}-${++this.sequence}`,
      type: input.type,
      status: 'queued',
      priority: input.priority ?? 'normal',
      origin: input.origin ?? 'background',
      payload: input.payload,
      createdAt,
      updatedAt: createdAt,
      attempt: 0,
      maxAttempts: Math.max(1, input.maxAttempts ?? 1),
      tags: input.tags ?? [],
    };

    this.tasks.set(task.id, task as RuntimeTask);
    this.queuedTaskIds.push(task.id);
    this.sortQueue();
    this.notify();
    this.persistTask(task as RuntimeTask);
    this.schedulePump();
    return task;
  }

  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
      return false;
    }

    if (task.status === 'queued') {
      this.queuedTaskIds = this.queuedTaskIds.filter((id) => id !== taskId);
      this.updateTask(task, {
        status: 'cancelled',
        finishedAt: now(),
      });
      this.notify();
      return true;
    }

    const controller = this.controllers.get(taskId);
    if (controller) {
      controller.abort();
      return true;
    }
    return false;
  }

  private effectiveConcurrency(): number {
    const base = concurrencyForMode(this.mode);
    if (base <= 0) return 0;

    if (this.foregroundInFlight > 0) {
      return 0;
    }

    if (this.isHeavySurface()) {
      return Math.max(0, base - 1);
    }

    return base;
  }

  private isHeavySurface(): boolean {
    return this.heavySurfaces.some((surface) => this.foregroundSurface.startsWith(surface));
  }

  private sortQueue(): void {
    this.queuedTaskIds.sort((left, right) => {
      const leftTask = this.tasks.get(left);
      const rightTask = this.tasks.get(right);
      if (!leftTask || !rightTask) return 0;

      const priorityDelta = priorityWeight(rightTask.priority) - priorityWeight(leftTask.priority);
      if (priorityDelta !== 0) return priorityDelta;
      return leftTask.createdAt - rightTask.createdAt;
    });
  }

  private schedulePump(): void {
    if (this.pumpScheduled) return;
    this.pumpScheduled = true;
    queueMicrotask(() => {
      this.pumpScheduled = false;
      void this.pump();
    });
  }

  private async pump(): Promise<void> {
    if (this.pumping) return;
    this.pumping = true;

    try {
      while (this.runningTaskIds.size < this.effectiveConcurrency()) {
        const nextId = this.queuedTaskIds.shift();
        if (!nextId) break;

        const task = this.tasks.get(nextId);
        if (!task || task.status !== 'queued') {
          continue;
        }

        this.startTask(task);
      }
    } finally {
      this.pumping = false;
    }
  }

  private startTask(task: RuntimeTask): void {
    const handler = this.handlers.get(task.type);
    if (!handler) {
      this.pushFailure({
        taskId: task.id,
        type: task.type,
        message: `No handler registered for task type "${task.type}".`,
        retryable: false,
        at: now(),
      });
      this.updateTask(task, {
        status: 'failed',
        error: `No handler registered for task type "${task.type}".`,
        finishedAt: now(),
      });
      this.notify();
      return;
    }

    const controller = new AbortController();
    this.controllers.set(task.id, controller);
    this.runningTaskIds.add(task.id);
    this.updateTask(task, {
      status: 'running',
      startedAt: now(),
      finishedAt: undefined,
      attempt: task.attempt + 1,
      error: undefined,
    });
    this.notify();

    void handler(task, controller.signal)
      .then((result) => {
        this.runningTaskIds.delete(task.id);
        this.controllers.delete(task.id);
        this.updateTask(task, {
          status: 'completed',
          result,
          finishedAt: now(),
        });
      })
      .catch((unknownError) => {
        this.runningTaskIds.delete(task.id);
        this.controllers.delete(task.id);

        const message = unknownError instanceof Error ? unknownError.message : 'Task failed.';
        const cancelled = controller.signal.aborted;
        if (cancelled) {
          this.updateTask(task, {
            status: 'cancelled',
            error: 'Task cancelled.',
            finishedAt: now(),
          });
          return;
        }

        const currentAttempt = this.tasks.get(task.id)?.attempt ?? task.attempt;
        const shouldRetry = currentAttempt < task.maxAttempts;
        if (shouldRetry) {
          this.updateTask(task, {
            status: 'queued',
            error: message,
            startedAt: undefined,
            finishedAt: undefined,
          });
          this.queuedTaskIds.push(task.id);
          this.sortQueue();
          return;
        }

        this.pushFailure({
          taskId: task.id,
          type: task.type,
          message,
          retryable: false,
          at: now(),
        });
        this.updateTask(task, {
          status: 'failed',
          error: message,
          finishedAt: now(),
        });
      })
      .finally(() => {
        this.notify();
        this.schedulePump();
      });
  }

  private updateTask(task: RuntimeTask, patch: Partial<RuntimeTask>): void {
    const current = this.tasks.get(task.id) ?? task;
    const next: RuntimeTask = {
      ...current,
      ...patch,
      updatedAt: now(),
    };
    this.tasks.set(task.id, next);
    this.persistTask(next);
  }

  private pushFailure(failure: RuntimeFailureSummary): void {
    this.recentFailures = [failure, ...this.recentFailures].slice(0, this.maxRecentFailures);
  }

  private persistTask(task: RuntimeTask): void {
    try {
      this.persistenceAdapter?.onTaskUpdated?.(task);
    } catch {
      // Persistence integration is optional and should not break runtime loop.
    }
  }

  private notify(): void {
    const snapshot = this.getStatus();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
