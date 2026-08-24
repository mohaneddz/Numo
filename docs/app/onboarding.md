# Language onboarding

Numo is English-first. English is the fixed application and base language; it is not offered as a language to learn.

## First-run flow

1. Numo creates its local learner profile automatically with English as both the native and base application language.
2. The first visible question asks which languages the learner wants to learn.
3. The learner selects one or more languages from the supported catalog.
4. Numo collects a learning profile for each selected language.
5. Once the active language has a completed profile, the normal learning surfaces become available.

The initial catalog contains:

- Chinese
- German
- Spanish
- Italian
- Russian
- French
- Japanese
- Korean
- Portuguese
- Arabic

## Per-language learning profile

Each selected language stores its own answers because ability, goals, and available time may differ between languages:

- Current level
- Main skill focus
- Daily intensity
- Preferred difficulty pace
- Primary goal
- Target timeframe
- Study days per week
- Typical session duration
- Script-writing timing for languages that use a non-Latin script

These answers are inputs for curriculum generation, workload sizing, milestone planning, recommendations, and later statistics. They are preferences and planning data, not evidence of mastery.

## Empty-language behavior

An empty learning-language list is a supported application state.

- With no selected language, the sidebar exposes Settings only.
- Attempts to open another application page redirect to language selection.
- Language selection itself remains available as the onboarding surface.
- Removing the final language immediately restores this state.
- Re-adding a language requires its onboarding profile before normal learning pages reopen.

Settings remains available so the learner can configure the app or add a language at any time.

## Persistence reset

The English-first overhaul includes a one-time reset identified by `numo.app_data_reset.english_base_v1`.

On the first launch of this version, Numo:

1. Preserves the SQLite schema migration history.
2. Deletes all application records from every other Numo table.
3. Clears Numo's local and session web storage.
4. Recreates only required catalog/schema scaffolding.
5. Creates a fresh local learner profile with English as the base language.

The reset intentionally removes previous profiles, selected languages, progress, notebook data, reviews, generated content, settings, and cached application state.
