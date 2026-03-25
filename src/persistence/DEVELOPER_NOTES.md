# Persistence Layer Notes

## Purpose
This module provides the SQLite-backed source-of-truth layer for:
- languages and curricula
- learner state
- evidence
- review queue primitives
- content metadata + revisions
- settings

## Entry Point
Use `initializePersistence()` from `src/persistence/index.ts`.

```ts
import { initializePersistence } from './persistence';

const persistence = await initializePersistence();
const languages = await persistence.repositories.languages.listLanguages();
```

## Behavior
- Fails fast outside Tauri runtime via `PersistenceUnavailableError`.
- Runs schema migrations once (`schema_migrations`).
- Seeds minimal curricula packs (`es`, `fr`, `de`, `zh`) idempotently.
- Runs one-time legacy import from localStorage and marks completion with `settings.legacy_migration_v1_done`.

## Migration Markers / Settings Keys
- `legacy_migration_v1_done`
- `default_learner_id`
- `active_language_code`
- `legacy_unmapped_v1`

## Scope Boundaries
- This layer does not rewire pages or contexts directly.
- Consumers should integrate incrementally through repository interfaces.
