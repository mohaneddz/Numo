import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  runtimeKernel,
  type GenerationNeed,
  type RuntimeBackgroundMode,
  type RuntimeStatusSnapshot,
  type RuntimeTask,
  type RuntimeTaskEnqueueInput,
} from '../runtime';

interface RuntimeContextValue {
  status: RuntimeStatusSnapshot;
  mode: RuntimeBackgroundMode;
  setMode: (mode: RuntimeBackgroundMode) => void;
  setForegroundSurface: (surface: string) => void;
  enqueueTask: <TPayload>(input: RuntimeTaskEnqueueInput<TPayload>) => RuntimeTask<TPayload>;
  enqueueGenerationNeed: (
    need: GenerationNeed,
    options?: { priority?: RuntimeTaskEnqueueInput<unknown>['priority']; threshold?: number },
  ) => RuntimeTask;
  cancelTask: (taskId: string) => boolean;
}

const RuntimeContext = createContext<RuntimeContextValue | undefined>(undefined);

export const RuntimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<RuntimeStatusSnapshot>(() => runtimeKernel.getStatus());

  useEffect(() => runtimeKernel.subscribe(setStatus), []);

  const setMode = useCallback((mode: RuntimeBackgroundMode) => {
    runtimeKernel.setBackgroundMode(mode);
  }, []);

  const setForegroundSurface = useCallback((surface: string) => {
    runtimeKernel.setForegroundSurface(surface);
  }, []);

  const enqueueTask = useCallback(<TPayload,>(input: RuntimeTaskEnqueueInput<TPayload>) => {
    return runtimeKernel.enqueueTask(input);
  }, []);

  const enqueueGenerationNeed = useCallback(
    (
      need: GenerationNeed,
      options?: { priority?: RuntimeTaskEnqueueInput<unknown>['priority']; threshold?: number },
    ) => runtimeKernel.enqueueGenerationNeed(need, options),
    [],
  );

  const cancelTask = useCallback((taskId: string) => runtimeKernel.cancelTask(taskId), []);

  const value = useMemo<RuntimeContextValue>(
    () => ({
      status,
      mode: status.mode,
      setMode,
      setForegroundSurface,
      enqueueTask,
      enqueueGenerationNeed,
      cancelTask,
    }),
    [status, setMode, setForegroundSurface, enqueueTask, enqueueGenerationNeed, cancelTask],
  );

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
};

export function useRuntime(): RuntimeContextValue {
  const context = useContext(RuntimeContext);
  if (!context) {
    throw new Error('useRuntime must be used within RuntimeProvider');
  }
  return context;
}
