# Runtime Layer Notes

## What this layer owns
- Provider abstraction and fallback routing (`src/runtime/providers`)
- Background queue + scheduler + resource-aware throttling (`src/runtime/tasks`)
- Generation/evaluation orchestration scaffold (`src/runtime/pipeline`)
- Runtime kernel facade used by UI/services (`src/runtime/runtimeKernel.ts`)
- React runtime state exposure (`src/contexts/RuntimeContext.tsx`)

## Integration boundaries
- Persistence is adapter-driven via `RuntimePersistenceAdapter` in `src/runtime/types.ts`.
- No SQLite schema assumptions are embedded in runtime code.
- Curriculum/learner/content modules can feed context into generation using adapters later.
- Pages should consume runtime state via `useRuntime()` and enqueue jobs without owning queue logic.

## Current policy defaults
- Modes:
  - `off`: no background concurrency
  - `light`: max 1 concurrent task
  - `active`: max 2 concurrent tasks
- Heavy surfaces: `/chat`, `/speak`, `/write`
- Foreground model calls suppress new background task starts until the foreground call completes.
- On heavy surfaces, background concurrency is reduced by one slot when no foreground call is active.

## Extending next
1. Add persistence adapter implementation to sync task + pipeline outputs into SQLite/files.
2. Plug curriculum and learner retrieval into `GenerationEvaluationPipeline` context adapter.
3. Register richer handlers for `writing_feedback`, `weakness_extraction`, and `recommendation_refresh` with structured payload contracts.
