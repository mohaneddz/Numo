# Numo — Feature State Audit (2026-08-26)

> **Updated 2026-08-30.** A later working session closed most of the punch list
> below. The master status table in Part 6 reflects the current state; the
> narrative in Parts 1-5 describes the app as it was on 2026-08-26 and is kept
> as the record of what was found, not as a description of the code today.

A full read-through of the app, page by page and layer by layer, classifying every feature by what the code actually does — not what the README or UI copy claims. Produced by directly reading source (not just grepping), with file:line evidence for every claim below. Supersedes `docs/backup/app_flow_audit_2026-03-26.md` for anything it contradicts.

## How to read this

Each feature/page/subsystem gets one status:

- **COMPLETE** — implemented, wired to real persistence/logic, no placeholder data in the normal path.
- **PARTIAL** — real for the common case, but with a genuine gap: a fallback that's fake, a sub-feature that's stubbed, a dataset that's too small, or an inconsistency worth knowing about.
- **DUMMY/MOCKED** — the surface exists and looks real, but the data or behavior behind it is hardcoded, fabricated, or a no-op.
- **STUB/PLANNED** — UI shell or interface exists; there is no real logic behind it, or it's architecturally present but never invoked.

Numo is considerably more built-out than its own README suggests: a real SQLite persistence layer, a real adaptive curriculum/spaced-repetition engine, and real local/cloud AI provider fallback (Groq cloud + local llama.cpp/whisper.cpp/Piper via Tauri). The gaps that exist are specific and identifiable, not "the whole app is a shell."

---

## Executive summary

**What's genuinely real and load-bearing:**
- SQLite persistence for the entire learning/progress domain (languages, profiles, curricula, review items, evidence, learning plan, notebook, content) — real schema, real migrations, real repositories, no mocked reads.
- The Learn flow end to end: session planning, 20+ exercise types with real deterministic + AI grading, a genuine SM-2-style mastery/spaced-repetition scheduler, real skill-graph-driven curriculum (30 themes, 90 concepts).
- Review's spaced-repetition scheduling and queue persistence.
- Chat, WebSearch, Immerse (video/audio/reading), Insights — all backed by real network calls or real computed data, not scaffolding.
- AI provider layer: Groq (cloud) with local llama.cpp/whisper.cpp/Piper fallback via real Tauri Rust commands, with genuine error-typed fallback routing.

**What's fake or incomplete, concretely:**
- **Settings page**: ~7 of 10 sections (Profile, Target Language, Appearance, Audio, Backup, Privacy, Accessibility) are hardcoded values that persist to a scratch `localStorage` key and affect nothing — including the entire dark/light theme selector, which is fully decorative.
- **Notifications page**: pure stub — static "no notifications" text, no model, no way to ever populate it.
- **References.tsx** (routed at `/library`): entirely hardcoded per-language reference content with fake "unlocked" flags; procedurally fabricates placeholder cards for any language not in its hand-authored list.
- **Script practice**: real drawing capture and real scoring heuristic, but the character/stroke-order dataset backing it has only **3 characters total** (你, あ, カ) — everything else scores on "did you draw enough points."
- **Curriculum seed data**: only Chinese is seeded, and only 14 of 39 work-items for Theme 1 of 30 — the offline fallback pack covers a sliver of one language.
- **Two parallel persistence systems**: SQLite for learning/progress data, plus a second uncoordinated `localStorage`-based layer for settings, AI config, caches, and reader state — with at least one leftover key still branded "Noema" (the app's former name).
- **Two overlapping full-data-wipe mechanisms** baked into normal SQLite boot (a migration that unconditionally `DELETE`s ~25 tables, plus a separate marker-gated `localStorage`+SQLite wipe) — both fire once per install but are risky to have layered rather than unified.
- **Orphaned architecture**: a fully-built two-stage generation/evaluation pipeline and background task queue exist in `src/runtime/` with real code but zero production callers — every actual AI call in the app bypasses them and goes direct.
- **`pnpm audit:buttons`** is referenced in `package.json` and the README three times; the script file does not exist anywhere in the repo or git history.
- **No app-UI localization or dark/light theming** despite Settings implying both exist.

---

## Part 1 — Pages, page by page

Ordered to match the sidebar/navigation flow.

### Login — `/login` · `src/pages/Login.tsx`
**Status: COMPLETE** (as a local profile gate — there is no authentication in the security sense).

"Login" means selecting or creating a row in the local SQLite `learner_profile` table — no password, email, cloud account, or session token anywhere in the app. Three real states handled: `ready` (redirects immediately), `unsupported_runtime` (SQLite requires the Tauri runtime; blocks with an explanation and `pnpm tauri dev` instructions when running in a plain browser), and `needs_profile`/`needs_selection` (create/select form, both wired to real `learner.createProfile`/`setActiveProfile` calls). `Login.test.tsx` asserts exact copy for all three states. A decorative WebGL background canvas runs behind the form; correctly cleaned up on unmount.

In practice, a fresh install auto-creates a profile named "Learner" on first boot (`ProfileSessionContext.tsx:92-103`), so the create-form path is mostly reached only after an explicit "Switch Profile."

### Home — `/` · `src/pages/Home.tsx` + `src/components/home/**`
**Status: COMPLETE** for every card actually rendered on the page.

Every visible card (`ContinueLearningCard`, `DailyGoalCard`, `FocusAreasCard`, `PathProgressCard`, `RecentlySavedCard`, `RecommendedSection`, `TodayPlanCard`, `DueReviewCard`, `GuideCard`) reads from real, persisted state via `useCurriculumState()` → SQLite. Notably, **every one of these cards carries an in-code comment documenting a specific prior bug where it showed fabricated data** — hardcoded "Conversational" level pills, an LLM-invented "+12%" metric, four fixed focus-area percentages, a progress bar dividing by a goal of 0. All of that has been replaced with real computed values; empty states are honest ("not enough data yet") rather than fabricated.

**Dead code**: `GreetingHero.tsx`, `EchoActionCard.tsx`, `RuntimeStatusCard.tsx`, `RecommendationCard.tsx` exist in `src/components/home/` but are not imported anywhere — orphaned components, not part of the live page. (`GreetingHero`'s link to `/profile?panel=rewards` would be a no-op even if mounted — Profile never reads that param.)

### Learn — `/learn`, `/learn/:moduleId`, `/learn/session` · `src/pages/Learn/**`
**Status: COMPLETE.** The most sophisticated, fully-wired flow in the app.

- **`LearnPage.tsx`** renders a real roadmap of themes/checkpoints/steps built deterministically from a 30-theme skill graph (`services/curriculum/checkpointPlan.ts`), backed by real persisted progression/mastery in SQLite. Replaced a prior fully-synthetic 21,000-step roadmap (documented in-code).
- **`ModuleDetail.tsx`** (theme detail, reached via an undiscoverable sidebar link) — previously a literal placeholder screen per its own doc-comment; now wired to the same real services.
- **`LearnSessionPage.tsx`** is the actual lesson runner: `planSession()` builds a mastery-aware task sequence mixing new-skill introduction with weak/due review, interleaved so production tasks don't cluster. Content resolution checks an in-memory cache → SQLite settings cache → bundled offline seed pack → live LLM generation, with strict validation that **drops** (not fakes) any task that fails validation. Every submitted answer writes a real `task_attempts` row, ingests evidence, updates skill mastery, and — on a miss — creates a real review-queue item.
- **20+ exercise components** (`components/exercises/learn/**`) each have a payload validator that actively rejects unusable content rather than manufacturing fallback data (comments document removing exactly this kind of fake-content behavior, e.g. auto-splitting words into fake "Group A"/"Group B"). Grading is deterministic (structural comparison) for closed-form types, hybrid (deterministic + AI) for free text, AI-only for explanation tasks. Speaking-repeat exercises do real mic capture + transcription, with typing as an explicit fallback only when the mic fails.
- **Spaced repetition** (`masteryStore.ts`) is a genuine SM-2-style variant — per-skill ease/interval/due-date, quality bands from score+hints+latency, EMA-based recognition/production mastery split, urgency-ranked weak/due selection feeding session planning.

No exercise type "always returns correct"; no TODO/FIXME found in this flow.

### Practice (Quick Practice) — `/practice/quick` · `src/pages/Practice/PracticeQuickPage.tsx`
**Status: PARTIAL.** A separate, older content pipeline (`src/lib/sessionEngine.ts`) from Learn's curriculum planner — AI-generated items with policy filtering, real deterministic grading (exact/partial/overlap matching by exercise type).

Concrete gaps:
- **On any generation failure**, it falls back to hardcoded, language-specific example sentences baked into the bundle (`zhFallbackItems`/`jaFallbackItems`/`defaultFallbackItems`) — real fallback content that can reach a user, not just a dev artifact.
- **Regenerate-on-failure** is weaker still: it just appends `" (refreshed)"` to the prompt and reverses the option order rather than generating anything new.
- **The "Speak" quick-exercise type is a literal mock**: `SpeakQuickExercise.tsx` is a plain textarea with placeholder text `"Type what you said... (microphone mock)"` — no audio recording at all, unlike Learn's real mic-based speak exercise.
- Unlike Learn, Quick Practice attempts are **not** written to `task_attempts` — only an aggregate signal is updated; wrong answers don't create review items.
- `src/components/practice/LessonBlock.tsx` and `ProgressBar.tsx` are fully built but never imported anywhere — dead code.

### Review — `/review`, `/review/session` · `src/pages/Review/**`
**Status: COMPLETE** for scheduling/queueing/persistence; **PARTIAL** for one card family's content generation.

`ReviewPage.tsx` shows real due/weak/mistake/cram counts from persisted `review_items`, explicitly does not generate synthetic cards when empty. `ReviewSession.tsx` builds queues from real items, adaptively selects among 12 review card types based on aggregate exercise signals, and grades via self-report, deterministic match, or AI-check-with-fallback depending on type. Grading writes a real SM-2-style patch back to the item and feeds outcomes back into Learn's shared skill-mastery store.

**Gap**: True/False-family cards (`tf`, `seen_unseen`, `tfj`) are generated with the correct answer **hardcoded to always be true** — no false-statement variant is ever produced, so the "False" branch of the UI, while fully built, is never functionally exercised.

### Immerse — `/immerse`, `/immerse/:contentId` · `src/pages/Immerse/**`
**Status: COMPLETE.** Real content throughout, not scaffolding.

Video/audio metadata resolves live via the YouTube Data API v3 (requires a user-configured key, with explicit missing/error/loading states — not silently faked). Captions come through a real Tauri command backed by `yt-dlp`. Reading covers/full text come from Open Library and Project Gutenberg via live fetches. EPUB rendering uses real `epubjs` pagination/highlighting; local plain-text books read from disk. In-reading translation calls the real LLM pipeline. Progress bars reflect real playback-derived records (previously fake, now fixed per in-code comments).

Minor decorative note: the audio waveform visualization is a hardcoded static array, not derived from actual audio.

### Speak — `/speak`, `/speak/session/:sessionId` · `src/pages/Speak/**`
**Status: PARTIAL.** Real, multi-tier STT/TTS/LLM pipeline with one fake-success failure mode.

Recording uses a genuine `MediaRecorder`/`AnalyserNode` implementation with a live level meter. Transcription and scoring run through Groq Whisper (primary) → local Piper/Whisper.cpp via Tauri (fallback) → LLM-scored `{accuracy, fluency, tip}` JSON — three real, working tiers. "Listen to native" TTS has its own two-tier fallback (local/remote TTS → browser Web Speech API).

Concrete gaps: prompts come from a tiny hardcoded 3-phrases-per-language table (`es`/`fr`/`de`/`zh`; everything else defaults to `es`), not from the curriculum. Worse, the **outermost failure path** (if the whole pipeline throws) fabricates a passing transcript equal to the target phrase itself and a generic "great job" score, explicitly clearing the error state — a real pipeline that silently reports fake success instead of surfacing failure to the user.

### Write — `/write`, `/write/editor/:draftId?` · `src/pages/Write/**`
**Status: PARTIAL.** LLM-backed grading with real persistence, but zero deterministic fallback if the LLM call fails.

The editor is a plain textarea; "Analyze & Review" sends the draft to the same Groq/local-LLM pipeline used elsewhere, asking for structured correction JSON, and persists both the draft and real evidence/SQL records on success. `src/services/aiFallback.ts` defines a deterministic (regex-based) writing-analysis fallback — but it is **unreferenced dead code**, never wired into `WriteEditor.tsx`. On failure, the UI shows an explicit "Analysis failed" message rather than degrading — an honest failure state, but a harder stop than the app's other AI-backed flows.

### Script Practice — `/script-practice` · `src/pages/ScriptPractice/**`
**Status: PARTIAL, with the content dataset effectively a STUB.** Gated to Chinese/Japanese only.

Drawing capture (`ScriptDrawingInput.tsx`, real SVG pointer-stroke recording) and scoring (`scriptScoringService.ts`, a genuine geometric heuristic combining stroke count/order/shape/position) are real, working code. But `src/data/scriptModels.ts` — the character/stroke-order dataset everything scores against — contains **exactly 3 characters** (你, あ, カ), each defined as 2–3 straight-line segments, not real stroke-order glyph data. Any other character has no model; the picker only ever offers these 3. Outside that set, scoring silently degrades to "did you draw a plausible number of points." The 5 practice modes (`watch`/`trace`/`guided_draw`/`free_draw`/`timed_recall_draw`) are thin wrappers around one shared canvas component with no real per-mode behavioral difference (e.g. "watch" doesn't play back a stroke animation).

### Notebook — `/notebook`, `/notebook/:itemId` · `src/pages/Notebook/**`
**Status: PARTIAL.** Core entry list/search/favorites/mastery is real and persisted; a few UI elements are decorative or dead.

Entries, search, favorites, tags, and mastery percentages are all backed by real persisted evidence. Concrete issues: a dead `useEffect` handler fires `alert('[Mock] Action ... invoked on Notebook page!')` for a URL query param (`?action=new`) that nothing in the app ever actually sets — unreachable in practice. The "Your Collections" sidebar (Daily Life / Trips & Travel / Restaurant Talk) is hardcoded static UI with no backing data model — clicking it goes nowhere meaningful. The hero promo banner image is decorative stock content. "Listen" on a notebook item redirects to Quick Practice rather than playing audio inline.

### Notebook Library — `/notebook/library` · `src/pages/Library.tsx` (exports `NotebookLibraryPage`)
**Status: COMPLETE.** A real content-approval workspace: loads live approval-queue and approved-content data via SQL-backed queries, supports approve/reject/manual-decision, revision history, and revert — all against real persisted data, no hardcoded content.

### Notebook Exercises — `/notebook/exercises` · `src/pages/Exercises/ExercisesPage.tsx`
**Status: COMPLETE, but built as an internal dev/QA tool, not a polished learner-facing page.** Real LLM-backed generation and real answer grading, with raw JSON debug panes exposed in the UI (input/template/result, with copy-to-clipboard) — functionally real, presentation clearly internal-facing.

### Insights — `/insights` · `src/pages/Insights.tsx`
**Status: COMPLETE.** Charts (via `recharts`) render real SQL-computed evidence data (weekly minutes, sessions by mode); explicit "not enough data yet" empty states rather than fabricated numbers. The test file specifically asserts the absence of old mock placeholder strings, confirming this was deliberately de-mocked. One real-but-slightly-incoherent choice: the pie chart mixes count metrics with a percentage metric in one series — a data-viz wrinkle, not fake data.

### Library (Reference Hub) — `/library` (and `/references` redirect) · `src/pages/References.tsx` (exports `LibrariesPage`)
**Status: DUMMY/MOCKED.** Note: per `docs/app/page-inventory.md` this file/route naming is intentional (not a bug) — `Library.tsx` owns `/notebook/library` and `References.tsx` owns `/library`, just confusingly named.

All reference content (characters/sounds/words per language) is a large hand-authored static object with hardcoded `unlocked: true/false` flags that never change based on real progress — no persistence, no unlock logic tied to actual learning state. For any language not in the hardcoded set, a generator fabricates placeholder cards with template strings like `"${symbol.toLowerCase()}"` as the reading and `"${languageName} core symbol"` as the meaning, with a fake `index % 4 !== 0` unlock rule. This is the single most fabricated page in the app.

### Chat — `/chat` · `src/pages/Chat.tsx`
**Status: COMPLETE.** Real backend, not scaffolding: builds a prompt including live "progression memory" pulled from real app state, calls the same Groq/local-LLM pipeline as everywhere else, parses strict JSON with a self-repair retry on malformed output. RTL rendering correctly triggers for Arabic target-language content. No hardcoded replies anywhere.

### Web Search — `/web-search` · `src/pages/WebSearch.tsx`
**Status: COMPLETE.** Genuinely multi-source: DuckDuckGo Instant Answer + Wikipedia (web search), YouTube RSS feed (video search), Wikimedia Commons (image search), iTunes Search API (podcasts) — all real live fetches (routed through a Rust proxy command under Tauri to dodge CORS, falling back to plain `fetch()` in browser dev), with real dedup/relevance scoring. No hardcoded results.

### Notifications — `/notifications` · `src/pages/Notifications/NotificationsPage.tsx`
**Status: STUB/PLANNED.** The entire page is 13 lines: a static "You have no new notifications" message. No state, no data source, no notification model anywhere in the app — nothing could ever populate this page as currently built, despite being correctly linked from the app shell's bell icon.

### Profile — `/profile` · `src/pages/Profile.tsx`
**Status: COMPLETE.** Loads a real 30-day dashboard (sessions, streaks, per-language summaries, script-writing stats) computed from persisted evidence, with an honest explicit empty-state object rather than fabricated numbers. Language management (add/remove/reorder/set difficulty) is a fully wired CRUD UI over real persisted state. "Switch Profile" correctly clears the session and redirects to Login.

### Settings — `/settings` · `src/pages/Settings.tsx`
**Status: PARTIAL, split roughly down the middle.** A 1,500-line file with 10 sections.

**Real and wired (COMPLETE):**
- **Storage** — real Tauri app-data-dir resolution; real books-folder picker/scan.
- **Models & AI runtime** — every local-path setting (LLM runner, Whisper, FFmpeg, Piper, voices) is backed by real Tauri path-validation and tool-detection commands, plus an actual round-trip test panel that exercises the real LLM/TTS/STT pipeline against the configured binaries.
- **AI (Groq API keys)** — live `fetch()` validation against Groq's actual chat/transcription/speech endpoints, with real quota/rate-limit detection.
- **Integrations** — YouTube API key validated live; immersion cache clearing is real.
- **Clear All Data** — a real, correctly-guarded destructive action: double-confirms, deletes every SQLite table, vacuums, clears local/session storage, redirects to login.
- One of three Desktop toggles (Keyboard Shortcuts) is real and consumed by `AppShell`.

**Hardcoded / inert (DUMMY):**
- **Profile section** — Display Name hardcoded to `"Alex"`, disconnected from the real active profile.
- **Target Language section** — Language/Dialect/Level are fixed selects (`"Spanish"`, `"Latin American"`, `"Intermediate"`), entirely disconnected from the real `LanguageContext` the rest of the app uses.
- **Appearance, Audio, Backup, Privacy, Accessibility** — every toggle/select here (including the entire Theme dropdown — `Midnight Signal` / `Deep Ocean` / `Forest Night` / `Light Mode`) writes to a scratch `localStorage` blob and is read by nothing else in the app. The app renders exactly one hardcoded dark theme regardless of this setting. A comment in the code (`Settings.tsx:359`) admits: `// In a real app we'd manage this state in a context or global store`.
- **Desktop** — "Start with System" and "Minimize to Tray" are the same kind of inert toggle.
- "Analytics" and "Crash Reports" toggles exist but there is no analytics or crash-reporting SDK anywhere in the app to gate.

### Language Setup — `/language-setup` · `src/pages/LanguageSetup.tsx`
**Status: COMPLETE.** Real language-picker grid backed by the language catalog and real repository writes; the per-language onboarding form (level, goals, timeframe, study days, session length, focus, pace, plus script-writing timing for CJK/RU/AR languages) is fully controlled and persists real settings, correctly chaining to the next language needing onboarding or to Language Welcome.

### Language Welcome — `/language-welcome` · `src/pages/LanguageWelcome.tsx`
**Status: COMPLETE.** A short, correctly-wired post-onboarding screen; per-language welcome copy is a small hardcoded set of 5 branches plus a generic fallback — by design for static onboarding copy, not a data-mocking concern. Writes a real "welcome seen" flag consumed by the app shell's onboarding gate.

---

## Part 2 — App shell, navigation & general UI

### App shell — `src/components/layout/**`
**Status: COMPLETE.** `AppShell.tsx` owns the redirect chain (language setup → onboarding → welcome → app), a real global keyboard-shortcut system (chord navigation, quick-nav, review shortcut, shortcuts-help modal), and route-driven page titles. `Sidebar.tsx` conditionally renders nav based on real onboarding state, with a real due-review badge and a "Today's Mission" card driven by real evidence (previously buggy — capped at 100% after 4 lifetime activities — now fixed, per in-code comment). `Titlebar.tsx` is a real custom titlebar (the window has `decorations: false`) wired to the real Tauri window API, degrading gracefully outside Tauri. `PageLayout.tsx` is pure presentational scaffolding. `DebugPanel.tsx` (dev-only, gated by a hardcoded `DEBUG = false` flag in `src/config/env.ts` — not env-var driven, inconsistent with the adjacent `DEV_MODE` pattern) is a read-only state inspector; its own header comment documents that it used to contain an LLM-based fake-data generator button, since removed.

### Shared UI components — `src/components/ui/`
**Status: PARTIAL.** Only 7 files — a narrow, purpose-built widget set (`DropdownSelect`, `LanguageSelector`, `LockedPageState`, `SpotlightCard`, `RemoteImage`, `CachedMediaImage`, `CardBackgroundImage`), each individually real and used, but **not** a general design-system component library. Most buttons/cards/inputs elsewhere in the app are hand-styled inline Tailwind markup rather than shared primitives.

### Theming — `src/index.css`
**Status: DUMMY for theme switching; COMPLETE for the single dark theme actually shipped.** Tailwind 4 CSS-first theming with one hardcoded dark palette. **No dark/light switching mechanism exists anywhere** — no `prefers-color-scheme`, no `data-theme` attribute, no toggle logic. Settings' Theme dropdown (see above) is purely decorative.

### Localization / RTL
**Status: STUB/PLANNED for app-UI localization; COMPLETE for the one place RTL is actually needed.** The Numo interface itself is English-only — no i18n library, no locale files, no UI-language switcher (this is a stated design choice per the README: English-first interface, target languages are what the learner studies). The only `dir="rtl"` usage in the codebase correctly flips direction for Arabic **target-language content** inside Chat, not for localizing Numo's own UI.

### Navigation indirection — `src/navigation/actionTemplates.ts`
**Status: COMPLETE**, with some unreferenced entries. A real semantic-action → route resolution layer, actively used by the app shell's notification/collection buttons. Several `TEMPLATE_PATH_MAP` entries (writing/notebook/echo-prefixed templates) have no corresponding entry in the action registry, so they're only reachable if some other, unconfirmed caller builds a raw template URL directly.

### Hooks — `src/hooks/`
**Status: COMPLETE.** All six hooks (`useAudioRecorder`, `useCardBackground`, `useCurriculumState`, `useGlossary`, `useImmersionSession`, `useLanguageProgression`) are real, non-trivial implementations with no mocked returns. Several carry doc-comments describing bugs they fixed (e.g. `useLanguageProgression` replacing a previously-hardcoded, unrepresentative plan; `useImmersionSession` noting the underlying save functions existed but were never called before this hook wired them up).

### Utilities — `src/lib/`, `src/utils/`
**Status: PARTIAL.** `src/lib/sessionEngine.ts` (Quick Practice's engine) and most of `src/utils/` (`webSearch.ts`, `tauriNet.ts`, `imageUtils.ts`, `flags.ts`, `seededRandom.ts`) are real, substantial, tested code. The one clear dummy artifact: `src/utils/saveDisk.ts`'s `saveToDummyDataFile()` is a self-documented stub that falls back to a browser-download click even inside Tauri (despite the real FS plugin being available and used elsewhere) — its only consumer is the dev-only `DebugPanel`'s export button.

---

## Part 3 — Persistence layer

### Architecture
**Status: PARTIAL overall** — real and non-trivial for the learning/progress domain, with structural issues worth knowing about.

`src/persistence/index.ts` initializes a SQLite database (`@tauri-apps/plugin-sql`, WAL mode, foreign keys on), runs versioned migrations, seeds curricula and a learning plan, and runs a one-time legacy `localStorage` import. It fails fast with `PersistenceUnavailableError` outside the Tauri runtime — there is no browser-only mode for real data.

**Two overlapping full-reset mechanisms exist simultaneously:**
1. Migration v4 (`six_pillar_mvp_reset_and_learning_schema`) adds new tables and then unconditionally issues ~25 `DELETE FROM` statements wiping nearly every prior table — a schema migration that doubles as a full data wipe, permanently baked into the migration chain (fires on any install replaying migrations 1→4).
2. `appDataReset.ts` independently wipes every non-schema table plus all of `localStorage`/`sessionStorage`, gated by its own `localStorage` marker (`numo.app_data_reset.english_base_v1`), on every `initializePersistence()` call until that marker is set.

Both are one-shot/idempotent individually, but their coexistence indicates at least two separate hard resets ("six pillar MVP," "English base") were shipped as permanent migration-time side effects rather than one-time maintenance scripts — anyone who had data before either reset lost it on upgrade, and both will fire again on any fresh install replaying the full migration chain.

**Legacy migration** (`legacyMigration.ts`) migrates three old `localStorage` keys (`numo_languages`, `numo_active_language`, and a `noema_app_data_v1` blob — note the old "Noema" branding) into SQLite, once. Since `appDataReset.ts` now wipes `localStorage` entirely, this migration's inputs are already gone for any post-reset install — it is effectively vestigial today, running its no-op path for all current/future users.

**Seeding**: `seeds.ts` idempotently seeds 4 minimal curricula (es/fr/de/zh). `learningSeeds.ts`, by contrast, **fully deletes and rebuilds the entire learning plan (7 units × 34 task templates per language) on every single app launch** — not incremental, not idempotency-gated like the curricula seed.

### Repositories — `src/persistence/repositories/`
No repository has a stubbed or "not implemented" method; every declared interface has a real SQL implementation. No dedicated unit tests exist for any repository (coverage is indirect, via service-level tests).

| Repository | Status | Note |
|---|---|---|
| `languagesRepo` | **COMPLETE** | Full CRUD, core to `LanguageContext` |
| `learningRepo` | **COMPLETE** | Drives the real Learn lesson UI |
| `learnerRepo` | **COMPLETE** | Gates the whole app via profile session |
| `evidenceRepo` | **COMPLETE** | Backbone of the evidence-driven learner model |
| `reviewRepo` | **COMPLETE** | Drives the SRS queue |
| `settingsRepo` | **COMPLETE** | Generic key-value store, used pervasively |
| `notebookRepo` | **PARTIAL** | `createItem`/`updateItem`/`listItems` load-bearing; `createCollection`/`listCollections` implemented but never called anywhere — "collections" are schema-complete but unreachable |
| `contentRepo` | **PARTIAL** | Core methods real and used via `integrationService`; `linkContentToNode` has no callers |
| `curriculumRepo` | **PARTIAL** | `getCurriculumByLanguageCode` load-bearing; `listCurriculumNodes`/`listCurriculumEdges` implemented but orphaned |

### Contexts — `src/contexts/`
- **`ProfileSessionContext`** — **COMPLETE.** Root gate for the app; auto-creates a default profile on first run so the "no profile" state is rarely actually seen.
- **`LanguageContext`** — **COMPLETE.** Real SQLite-backed language list, active language, and per-profile score preferences.
- **`LanguageJourneyContext`** — **COMPLETE.** Real SQLite-backed per-language onboarding/pace settings.
- **`AppDataContext`** — **PARTIAL.** Read path is fully SQLite-sourced (explicitly documented in-code as never reading from seeded/localStorage snapshots); write path is optimistic-local-then-persist, so a crash between the two can transiently leave UI state ahead of what's actually saved.
- **`RuntimeContext`** — **DUMMY relative to the SQLite system** — it's a real, functioning module, but background-task-mode state lives in its own separate `localStorage` key, entirely outside the repository/migration system the rest of persistence uses.

### A parallel, uncoordinated persistence layer
SQLite is the real source of truth for the **learning/progress domain only**. A substantial amount of other app state still lives directly in `localStorage`, with no migration path into SQLite: YouTube search cache, connectivity-mode preference, media/book/audio-artwork caches, chat preferences, the entire Settings blob and its action log, AI/API-key config (`src/config/aiConfig.ts` — still reads a `noema_settings_state_v1` key), keyboard-shortcut preference, a generic action log, and per-book reader position. None of these individually need to be in SQLite, but collectively they form a second, uncoordinated persistence system layered on top of the "real" one.

---

## Part 4 — Curriculum engine, runtime & AI providers

### Providers — `src/runtime/providers/`
**Status: COMPLETE.** Two real providers behind a common interface: **Groq** (cloud — real HTTPS calls for chat/transcription/speech, multi-key fallback, typed quota/rate-limit handling; the only cloud LLM/STT/TTS provider in the app — no OpenAI/Anthropic/ElevenLabs anywhere) and **LocalNativeProvider** (real Tauri `invoke()` calls into llama.cpp/whisper.cpp/Piper, with a clear precondition error when paths aren't configured). `ProviderRouter` does genuine ordered fallback and restricts to local-only providers in offline mode. Both are unit-tested.

### Generation/evaluation pipeline — `src/runtime/pipeline/`
**Status: STUB/PLANNED — real code, zero production callers.** `GenerationEvaluationPipeline` is a fully-built two-stage generate→evaluate flow with JSON-repair and threshold grading. Traced every call site: `runtimeKernel.enqueueGenerationNeed()`/`runGenerationPipeline()` are exposed to React via `RuntimeContext`, but nothing in the UI ever calls them. All real content generation in the app (task content, chat, grading) goes through a separate direct path (`completeWithEcho()`), bypassing this pipeline entirely. The module's own developer notes confirm this: "Extending next: … Plug curriculum and learner retrieval into `GenerationEvaluationPipeline`."

### Background task queue — `src/runtime/tasks/`
**Status: PARTIAL.** The queue mechanics themselves (priority ordering, concurrency-by-mode, heavy-surface throttling, foreground-suppression, retry, abort) are real, solid, production-quality code. But of the 9 task types it's designed to run, 2 (`content_generation`/`content_evaluation`) route to the orphaned pipeline above and are never enqueued, and the other 7 share one generic handler that returns a literal `{status: 'placeholder', note: 'Task scaffolding is ready; connect this task to domain adapters.'}` for anything that isn't a simple prompt payload — an honest, self-documenting stub, but unreachable today since nothing enqueues these task types at all.

### Curriculum service — `src/services/curriculum/`
**Status: COMPLETE.** The most mature subsystem in the app — a real, tested, adaptive curriculum engine: skill-graph derivation from 30 themes × 90 concepts with build-time correctness guards, a genuine SM-2-style mastery scheduler with recognition/production split and urgency-ranked weak-skill selection, a real "recognize → discriminate → assemble → produce" pedagogy ladder with per-script overrides, real content validation (rejects mixed-script distractors, duplicate options, placeholder group names, answer leakage, and more — explicitly replacing several documented real bugs), and real script detection for 23 languages.

### Engine service — `src/services/engine/`
**Status: COMPLETE, but a second parallel system.** A separate, older node-based mastery/progression model, still actively used (via `AppDataContext`) for review scheduling, evidence logging, and notebook/immersion progress — real deterministic scoring, real SQLite backing, no stubs. Runs alongside, and apparently not reconciled with, the skill-graph-based `curriculum/` system above: Learn/session-planning uses one, Review/evidence-logging uses the other.

### Exercises service — `src/services/exercises/`
**Status: PARTIAL.** Answer grading (`learningPlanService.ts` + `textNormalize.ts`) is real: Unicode-aware normalization, diacritic-insensitive partial credit, per-task-type deterministic scoring, AI grading with deterministic fallback on failure — genuinely not a stub. Content generation for exercises is real (same pipeline as Learn). Two real gaps: **script/stroke scoring** is a genuine heuristic gated to the same 3-character dataset noted in Script Practice above — everything else is point-count-only; and the **starter glossary** (`glossaryData.ts`) is a small hardcoded ~33-word dataset covering only German/Chinese/Japanese. `src/services/aiFallback.ts` (deterministic speaking/writing feedback fallbacks) is confirmed dead code — zero callers anywhere in the app.

### Backgrounds service — `src/services/backgrounds/`
**Status: COMPLETE.** Real multi-provider image search (Unsplash/Pexels/Pixabay, each gated on a configured API key, not faked when missing), a genuine multi-factor scoring heuristic, and real SQLite-backed local caching with a single bundled fallback image for offline/no-match cases.

### Curriculum seed data — `src/data/curriculumSeeds/`
**Status: PARTIAL, effectively STUB in practical coverage.** Only one file exists: `zh.json`. It contains 14 of the 39 work-items needed to fully cover just **Theme 1 of 30** for Chinese (confirmed unchanged from the last relevant commit) — no other language has any bundled seed data at all, and Theme 1's `script_recognition` skill has zero entries. The mechanism itself (cache-key-aligned seed lookup, fallback ordering: cache → seed pack → live generation) is correctly implemented; the data behind it is a small, single-language, single-theme sample.

### Seed generator — `scripts/generateCurriculumSeed.ts`
**Status: COMPLETE.** A genuinely production-quality CLI tool: resumable, batches through the same live content-generation/validation path the app itself uses (not a divergent implementation), real Groq rate-limit backoff parsing, multi-round retry for validation failures, incremental per-batch persistence so a crash loses minimal work. The tool works; it just hasn't been run enough yet.

### Static reference data — `src/data/main/`
**Status: COMPLETE.** 30 real themes and 90 real concepts across 12 categories — substantive curriculum-design data, not placeholders.

---

## Part 5 — System / platform

### Tauri configuration — `src-tauri/tauri.conf.json`, `Cargo.toml`, `capabilities/default.json`
**Status: COMPLETE for what's configured, standard-dev-defaults for what isn't.** Real icon set, real title/identifier, `decorations: false` correctly compensated by a custom titlebar. CSP is explicitly disabled (`security.csp: null`). No min-window-size/resizability/centering configured — left at Tauri defaults. Rust dependencies (`tauri-plugin-sql`, `-fs`, `-store`, `-http`, `-notification`, `-dialog`, `-opener`, `reqwest`, `base64`) are all genuinely used, not declared-and-unused. The single capability grants `sql:allow-execute` (raw SQL execution from the frontend) plus unscoped `fs:default`/`dialog:default` — broad for a single-window app, gated in practice only by Rust-side path-validation checks rather than a capability-level allowlist. The capability file's own description string still says **"Main window capability for the Noema desktop app"** — a rebrand leftover.

### Rust backend — `src-tauri/src/lib.rs`
**Status: COMPLETE.** A real, non-trivial backend, not Tauri boilerplate: local LLM (llama.cpp), local STT (whisper.cpp + ffmpeg), local TTS (Piper) via real subprocess spawning with temp-file cleanup; a real online/offline connectivity gate on network commands; real reqwest-based proxying (with URL-scheme validation) for text/image fetches and YouTube caption retrieval via `yt-dlp`. 4 real Rust unit tests cover connectivity gating, URL validation, temp-file cleanup, and path validation.

### Tests
**Status: PARTIAL.** 40 test files, but coverage is concentrated almost entirely in the curriculum/exercise/engine business-logic layer (masteryStore, checkpointPlan, sessionPlanner, reviewRules, exerciseCatalog, textNormalize, providers, etc. — all real, meaningful tests). Only 3 of ~25+ page components have any test (`Login`, `Profile`, `Insights`), and those run via static-HTML string assertions (`renderToStaticMarkup`), not interactive DOM testing — there's no `jsdom`/`@testing-library` in the project at all. Zero test coverage on the entire app shell, shared UI components, hooks, and navigation/config plumbing.

### `scripts/`
**Status: mixed, one confirmed broken reference.** `generateCurriculumSeed.ts` is real and complete (see above). `pnpm audit:buttons` is defined in `package.json` and mentioned three times in the README (features list, project-structure tree, available-scripts list) — **the file `scripts/audit-buttons.mjs` does not exist anywhere in the repository or git history.** Running the script would fail immediately.

### Rebrand leftovers ("Noema" → "Numo")
Confirmed cosmetic (non-functional) leftovers from an incomplete rename, across ~10 files: the Tauri capability description, a `localStorage` key for keyboard-shortcut preference (`noema.keyboard_shortcuts.enabled`), the AI-config settings key (`noema_settings_state_v1`), a custom preferences-updated event name (`noema:preferences-updated`), the legacy-migration source blob key (`noema_app_data_v1`), and references inside `youtubeService.ts`, `runtimeKernel.ts`, `legacyMigration.ts`, and a couple of test files.

### README accuracy
Cross-checked against all of the above: tech-stack claims are accurate; the English-first interface claim is accurate; Vitest coverage claims for Login/Profile/Insights/curriculum services are accurate as far as they go (but don't mention the much larger untested surface). Two confirmed inaccuracies: the `audit:buttons` script (referenced, doesn't exist) and the project-structure tree's `scripts/ # curriculum seed generation, button audit` line (only seed generation exists there). No `.env.example` exists anywhere, despite the README instructing new contributors to create `.env`/`.env.local`.

### Telemetry / analytics / crash reporting
**Confirmed: none exists.** No SDK in `package.json` or `Cargo.toml`, no such code in the Rust backend. The only related artifacts are two purely decorative Settings toggles ("Analytics," "Crash Reports") that, per the Settings findings above, control nothing.

---

## Part 6 — Master status table

| Area | Status | One-line reason |
|---|---|---|
| Login | COMPLETE | Real local-profile gate, no auth needed by design |
| Home | COMPLETE | All live cards are real; a few orphaned components exist unused |
| Learn (page/session/exercises) | COMPLETE | Real curriculum engine, real grading, real SRS |
| Practice (Quick) | PARTIAL | Real generation/grading and mistakes now queue for review; bundled fallback content still reachable |
| Review | COMPLETE | Real SRS core; true/false cards generate real false statements; queue health, forecast and leech detection surfaced |
| Immerse | COMPLETE (one caveat) | Real YouTube/caption/book fetching and rendering; see the CEFR-level note below |
| Speak | COMPLETE | Real 3-tier STT/TTS/LLM pipeline, honest failure states, plus a live subtitled conversation mode |
| Write | PARTIAL | Real LLM grading; no working deterministic fallback |
| Script Practice | COMPLETE | 596 Chinese and 248 Japanese characters with real stroke-order data; watch mode animates the strokes |
| Typing Trainer | COMPLETE | Per-script speed scoring, learner-vocabulary word source, IME and RTL support |
| Live Conversation | COMPLETE | Spoken turns with subtitles for both speakers and an audio-reactive companion |
| Command palette | COMPLETE | Ctrl+K over navigation, practice actions and saved words |
| Text Miner | COMPLETE | Reading coverage against the learner's own vocabulary, plus word mining |
| Error boundaries | COMPLETE | Root and per-page, so one bad page no longer blanks the window |
| Lint | COMPLETE | ESLint with hook-dependency and correctness rules; runs clean of errors |
| Notebook | PARTIAL | Real entries/search; dead mock alert; hardcoded collections sidebar |
| Notebook Library | COMPLETE | Real approval-queue workspace |
| Notebook Exercises | COMPLETE (dev-tool UX) | Real generation/grading, internal-facing presentation |
| Insights | COMPLETE | Real charted evidence data |
| Library (`/library`, References.tsx) | COMPLETE | Rebuilt on the stroke dataset, authored alphabet/pronunciation data, and the learner's own words |
| Chat | COMPLETE | Real LLM pipeline, no mocked replies |
| Web Search | COMPLETE | Real multi-source live search |
| Notifications | COMPLETE | Built from due reviews, streak risk, weak skills and today's plan |
| Profile | COMPLETE | Real dashboard + language management |
| Settings | COMPLETE | Every control does what it says: theme, autostart, tray, export, weekly backup, local crash log, and real audio device selection |
| Telemetry/analytics | none (and no longer claimed) | The Analytics and 'send crash reports' toggles are gone; the crash log is local only |
| Language Setup / Welcome | COMPLETE | Fully wired onboarding |
| App shell / nav / shortcuts | COMPLETE | Real, tested-adjacent chrome |
| Shared UI components | PARTIAL | Small real widget set, not a full design system |
| Theming | COMPLETE | Theme, font size, motion and contrast all applied from Settings |
| App-UI localization | STUB (by design) | English-only interface, RTL only for target-language content |
| Persistence (SQLite core) | COMPLETE | Reset marker moved into the database it guards; seeding is idempotent instead of rebuilt each boot |
| Persistence (parallel localStorage) | PARTIAL | Real but uncoordinated second state layer |
| AI providers (Groq + local) | COMPLETE | Real cloud + local fallback, well-tested |
| Generation/evaluation pipeline | STUB (orphaned) | Real code, never called in production |
| Background task queue | PARTIAL | Real queue mechanics; 7/9 task types are unreachable placeholders |
| Curriculum service | COMPLETE | Genuinely the strongest subsystem in the app |
| Engine service (legacy) | COMPLETE (duplicated) | Real, but a second unreconciled progression model |
| Exercises service | PARTIAL | Real grading/generation; stroke scoring and glossary data are thin |
| Backgrounds service | COMPLETE | Real multi-provider image pipeline |
| Curriculum seed data | STUB (coverage) | 14/39 items, 1 theme of 30, 1 language of many |
| Seed generator script | COMPLETE | Production-quality tooling, underused |
| Tauri/Rust backend | COMPLETE | Real, substantial, tested |
| Test coverage | PARTIAL | Deep on business logic, absent on UI/shell |
| `audit:buttons` script | COMPLETE | Script added; `seed:script-models` added alongside it |

---

### Every activity now feeds the learner model

Several surfaces were closed loops: they did their own work and told the rest of
the app nothing, so the streak, daily goal and activity charts only ever saw a
fraction of what a learner actually did.

- **Immersion** persisted position and saved phrases but logged no evidence, so
  an hour of video or reading left minutes-today at zero. Time is now banked in
  one-minute milestones, with the furthest counted position stored so a rewind
  cannot double-count.
- **Quick Practice** updated an aggregate signal and queued mistakes, but logged
  no evidence — a full drill session counted for nothing.
- **Chat** and the **live spoken conversation** logged nothing either.
- **Typing** was added as a closed loop and then wired in.

Two activities were also landing in the wrong bucket in the trend charts: Quick
Practice counted as nothing, and script practice counted as listening time when
drawing characters is writing. None of the additions inflate `lessonsCompleted`,
`writingPieces` or `speakingSessions`, which mean something more specific than
"time spent".

### Open question: CEFR levels on immersion video and audio

The reading catalog (`realReadingSeeds`) is genuinely real — Don Quijote,
Lazarillo de Tormes, La Regenta and so on, with correct authors and years,
linking to Project Gutenberg — and its hand-assigned CEFR levels describe those
actual works.

The video and audio entries are different. Their titles, subtitles, durations
and levels are scaffold: `searchCategory` queries YouTube by *category*
("Documentaries", "Short Films") and assigns results to catalog rows by index,
then overwrites the title, description and duration with the real video's. The
CEFR `level` is never overwritten — so once a real video resolves, it carries a
difficulty that nothing assessed.

That matters because `level` is not merely displayed: `ImmersePage` filters on
it and matches it against the learner's own level to recommend content. A
learner filtering to A2 gets videos whose difficulty was assigned to a
placeholder.

Left as-is rather than reworked, because the scaffold-plus-live-resolution
design looks deliberate and the fix is a product decision: either stop showing
and filtering on a level for category-resolved media, or derive one from
something real (caption complexity would be available — the app already fetches
transcripts).

## Part 7 — Prioritized punch list

Ranked roughly by how visible the gap is to an actual user and how much value closing it would add, highest first.

1. **Settings: wire up or remove the ~7 dummy sections.** Theme switching is the most visible — a user can select "Light Mode" and nothing happens. Profile/Target Language sections showing `"Alex"`/`"Spanish"` regardless of the real active profile/language is actively misleading.
2. **Notifications: either build a real model or remove the entry point.** Currently a dead end with no path to ever becoming useful without new work — the bell icon promises something that can't exist yet.
3. **Speak: fix the fake-success failure path.** Silently fabricating a transcript equal to the target phrase and reporting a passing score, with the error explicitly cleared, actively hides real pipeline failures from the user — worth surfacing an honest error state instead.
4. **Script Practice dataset**: 3 characters is not a usable feature for a Chinese/Japanese learner. This needs either real stroke-order data (e.g. from an existing open dataset) or the feature should be scoped down/labeled as early-access.
5. **Library (References.tsx) content**: replace the hardcoded reference cards and fake unlock flags with something tied to real progress, or reframe the page's purpose.
6. **Curriculum seed data coverage**: the generator tool works; running it further (more themes, more languages) is the highest-leverage way to make offline mode actually useful beyond a sliver of Chinese Theme 1.
7. **Persistence reset mechanisms**: consolidate the two overlapping full-wipe systems (migration v4's unconditional deletes + `appDataReset.ts`'s marker-gated wipe) into one, and make `learningSeeds.ts` idempotent instead of delete-and-rebuild on every boot.
8. **Write's dead fallback**: either wire `aiFallback.ts`'s deterministic writing-analysis into `WriteEditor.tsx` as a real fallback, or delete the unused module.
9. **Quick Practice's mock speak exercise**: bring it up to parity with Learn's real mic-based speak exercise, or remove it rather than shipping a labeled "(microphone mock)" placeholder.
10. **`audit:buttons` script**: either restore the missing file or remove the `package.json` script entry and the three README references to it.
11. **Orphaned runtime architecture**: the generation/evaluation pipeline and 7 of 9 background task types are real, tested-adjacent code with zero callers — either wire them into a real feature (the pipeline's own dev notes suggest `writing_feedback`/`weakness_extraction`/`recommendation_refresh` as intended next steps) or remove them to reduce surface area.
12. **Rebrand cleanup**: sweep the ~10 remaining "Noema" references (mostly `localStorage` keys and one capability description) for consistency — low risk, low effort, but they'll eventually confuse a future contributor.
13. **`.env.example`**: add one; the README currently asks contributors to configure `.env`/`.env.local` with no template.
