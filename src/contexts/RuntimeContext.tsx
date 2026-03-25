import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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

  const value = useMemo<RuntimeContextValue>(
    () => ({
      status,
      mode: status.mode,
      setMode: (mode) => runtimeKernel.setBackgroundMode(mode),
      setForegroundSurface: (surface) => runtimeKernel.setForegroundSurface(surface),
      enqueueTask: (input) => runtimeKernel.enqueueTask(input),
      enqueueGenerationNeed: (need, options) => runtimeKernel.enqueueGenerationNeed(need, options),
      cancelTask: (taskId) => runtimeKernel.cancelTask(taskId),
    }),
    [status],
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
