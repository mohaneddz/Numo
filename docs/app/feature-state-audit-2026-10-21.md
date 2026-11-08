# Numo — What's Left (2026-10-21)

A re-audit of the punch list in `feature-state-audit-2026-08-26.md`, verified against
the code as it stands today rather than against that document's own claims.
Supersedes that file's Part 6 status table and Part 7 punch list.

## Health check, run not assumed

| Gate | Result |
|---|---|
| `pnpm test` | **519 tests across 70 files, all passing** |
| `tsc --noEmit` | **clean** |
| `cargo test` (src-tauri) | **5 passing** |
| `pnpm lint` | **fails** — 1 error, 79 warnings |
| `TODO`/`FIXME`/`HACK`/`XXX` in source | none |
| Mock/fabricated data in a normal path | none found |
| Unpushed work | none; `main` level with `origin/main` |

## Closed since August

Verified gone, not just claimed gone: the dummy Settings sections, the dead
Notifications entry point, the speaking grader's fabricated passing score, the
3-character script dataset (now 596 Chinese + 248 Japanese with real stroke
data), the hardcoded reference hub, the duplicated reset paths, the Notebook's
mock alert, the missing `.env.example`, and the `audit:buttons` script. Two
punch-list items were closed by deletion rather than wiring: `aiFallback.ts`
(Write's deterministic fallback) and six orphaned components. The remaining
"Noema" strings are the legacy-migration storage key and its import labels,
which have to keep the old name to find the old data — not leftovers.

Quick Practice's "(microphone mock)" speak exercise is now a real one:
`SpeakQuickExercise.tsx` records, transcribes through `transcribeSpeech`, and
falls back to typing with an honest message when the mic or provider fails.

---

## What's actually left, ranked

### 1. Offline content is a sliver of what the app promises — L

`src/data/curriculumSeeds/zh.json` holds **14 entries, Chinese only**, covering
5 skills of theme 1 at difficulty `d1`. The graph defines **30 themes**
(`src/data/main/defaultThemes.json`) across **10 offered languages**
(`src/data/languageCatalog.ts`).

Everything outside that sliver needs a live Groq key. The app bills itself as
local-first, and the progression plan's own "Installed foundation" horizon
promises "a real offline first session" per language. Today that holds for one
language and part of one theme.

The generator is production-quality and underused — `pnpm seed:curriculum` is
the highest-leverage command in the repo. This is content work, not code work.

### 2. `pnpm lint` fails the gate — S for the error

`src/services/mining/textMining.ts:46` splits on a **literal non-breaking
space** inside a character class. The intent is right (split on NBSP too); the
character just needs to be the ` ` escape instead of itself, and
`no-irregular-whitespace` stops firing.

Behind that error sit 79 warnings, which the August table did not mention:

| Rule | Count |
|---|---|
| `react-hooks/set-state-in-effect` | 48 |
| `react-hooks/exhaustive-deps` | 12 |
| `react-hooks/purity` | 10 |
| `typescript-eslint/no-explicit-any` | 7 |
| others | 2 |

The 48 `set-state-in-effect` warnings are the interesting ones — that pattern
caused three real stale-closure bugs when the lint was first added (`b3e0ca1`).

### 3. The generation pipeline is still orphaned — M

Verified by grep: **nothing outside `RuntimeContext`'s own definition calls
`enqueueTask` or `enqueueGenerationNeed`.** No page, no service.

So `runtime/pipeline/generationEvaluationPipeline.ts` is real, tested-adjacent
code with zero callers, and 7 of the 9 `RUNTIME_TASK_TYPES` fall through to
`runtimeKernel.ts:149`, which returns `status: 'placeholder'` with the note
"Task scaffolding is ready; connect this task to domain adapters."

Two ways out, both fine, but the current state is the worst of them: wire
`writing_feedback`, `weakness_extraction` and `recommendation_refresh` into the
features that want them, or delete the pipeline and shrink the surface.

### 4. Immersion filters video on a CEFR level nothing measured — S–M

Still true. `youtubeService.ts` resolves a catalog row to a real video and
overwrites `title`, `channel`, `description` and `durationSeconds` from the
snippet — but never `level`. `ImmersePage` both displays and *filters* on that
field and matches it against the learner's level to recommend content.

A learner filtering to A2 gets videos whose difficulty was assigned to a
placeholder row. The reading catalog is exempt: its levels describe real works.

It is a product decision, not a bug to patch blindly: either stop filtering
category-resolved media by level, or derive one from the captions the app
already fetches.

### 5. Write needs a cloud key to do anything — M

Deleting `aiFallback.ts` closed the "dead module" finding and left the gap it
was meant to fill. The failure path is now honest — draft preserved, clear
message pointing at provider settings — but on a local-first app, the writing
feature is cloud-only.

### 6. Two parallel time systems, now both correct, still both there — M

`minutesByDate` in the progression store and the per-evidence durations are two
accounting systems for the same quantity. September's fixes made every activity
write to both instead of reconciling them. Also still present: `total_xp`,
`current_streak` and `today_minutes` on the language row — written only by the
legacy migration, read by nothing since Chat stopped reading them. Vestigial
columns invite the next bug. **S** to drop.

### 7. localStorage runs alongside SQLite, uncoordinated — M

Unchanged from August. A second state layer with no defined ownership boundary
against the database.

### 8. The progression plan's phases 3–7 are the real roadmap — L each

`curriculum-progression-plan.md` is a 723-line blueprint. Phases 0–2 are
substantially built (contracts, graph, persisted roadmap, planner). What is not:

- typed content specifications replacing broad prompts, and the ahead buffer
  (current + next checkpoint ready before requested)
- the sound foundation: audio caching, voice metadata, word/phoneme timings,
  and separating STT from forced alignment from acoustic pronunciation scoring
  (today STT text stands in for pronunciation assessment)
- exercise depth: splitting catalog aliases into distinct definitions, the
  missing listening/conversation/transfer components, golden payloads per
  language
- weighted evidence and decay in place of linear mastery deltas; placement and
  skip-ahead flows
- reviewed regression sets per language, author tooling, cost controls

Its own "Definition of done" is the honest scorecard, and most lines are unmet.

### 9. Housekeeping — S

- Eight page screenshots were committed in `3cba5f8` and nothing references
  them; only `screenshots/cover.avif` appears in the README.
- Still `0.1.0` with **no git tag** — there has never been a release.
- `languageProfile.ts` covers 24 languages at the *script* level (scripts,
  spacelessness, romanization). That is not the "reviewed language profile"
  Phase 1 asks for, which the plan spells out per language in its
  "Language-specific coverage" section.

---

## Where the README stands

Honest, and unusually so. Its "Current Status" section already volunteers the
three biggest gaps — partial Chinese seeding, alphabets only for non-Latin
scripts, and the unwired pipeline. The claims about typing, script practice,
live conversation, the text miner, backups and the reference hub all check out
against code. Nothing in it needs walking back.
