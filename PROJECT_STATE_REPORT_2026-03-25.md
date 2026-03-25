# Noema Project State Report

Date: 2026-03-25
Repo: `d:\Programming\Tauri\Projects\noema`

## 1. Executive Summary

This project is a large **UI-first language-learning desktop app scaffold** built with React + Vite + Tauri.

What is solid now:
- App shell, routing, styling system, and page-level UI coverage are extensive.
- The app builds successfully (`npm run build`) and Rust side type-checks (`cargo check`).
- Core local state/persistence exists for languages, review queue, notebook items, drafts, and some preferences.
- AI integration to Groq exists with fallback behavior.

What is not finished:
- A large portion of user actions route to a **template simulation page** instead of real features.
- Many pages are powered by generated/demo data rather than live data pipelines.
- No automated tests, no lint script, and no production hardening.
- Tauri config currently disables web security and has no CSP.

Overall state: **advanced prototype / pre-production**.

## 2. Repository Snapshot

### 2.1 Current Working Tree

- Git status: `58` changed files total
- Modified tracked files: `44`
- Untracked files: `14`
- This is a heavily in-progress, non-clean tree.

### 2.2 File Inventory

- `src` files: `71`
- `src` TypeScript/TSX files: `69`
- `src-tauri` files: `30`
- `public` files: `9`
- App routes defined: `20` (`src/App.tsx`)

### 2.3 Build/Check Status

- `npm run build`: passes
- `cargo check` in `src-tauri`: passes
- Build warning: one JS bundle is large (~1.05 MB minified), chunk-splitting not optimized yet.

## 3. Stack and Architecture

### 3.1 Frontend

- React 18 + TypeScript + Vite 6
- Tailwind CSS v4 plugin (`@tailwindcss/vite`)
- Framer Motion
- Recharts
- React Router

### 3.2 Desktop Runtime

- Tauri v2 (`src-tauri`)
- Custom Rust commands for network proxy fetch

### 3.3 Context Layers

- `LanguageContext`: active language, catalog, ordering, persistence to localStorage
- `AppDataContext`: review scheduling, notebook, immersion progress, writing drafts
- `CurriculumContext`: cards/focus areas/mission data (currently seeded + debug-updated)

## 4. What Is Included and Working

### 4.1 App Structure

- Full shell with sidebar, route-level page meta, shortcuts, shared layout components.
- 20 routed pages including Home, Learn, Review, Immerse, Speak, Write, Notebook, Insights, Library, References, Chat, Web Search, Settings.

### 4.2 State and Persistence (Local)

- Language selection/add/remove/reorder persisted in localStorage.
- App data state persisted with schema versioning (`noema_app_data_v1`).
- Keyboard shortcut preference persisted and broadcast via event.
- Settings page persists a configurable settings map + action log.

### 4.3 AI + Speech Integration

- Chat completion endpoint integration (`completeWithEcho`) with mode profiles.
- Speech-to-text integration (`transcribeSpeech`) via Groq API.
- Text-to-speech integration (`synthesizeSpeech`) via Groq API.
- Rate-limit header capture in AI provider.
- Fallback responses when API key is missing.

### 4.4 Tauri Backend Capabilities

- `proxy_fetch_text` command for remote text fetch.
- `proxy_fetch_data_url` command for remote binary image -> data URL conversion.
- URL protocol validation (`http/https` only).

## 5. What Is Template/Simulated

This codebase has an intentional template-routing system:

- Route: `/templates/:templateId/:entityId?`
- Registry: `src/navigation/actionTemplates.ts`
- Simulation page: `src/pages/templates/TemplateActionPage.tsx`
- Template page text explicitly says it is for not-yet-finalized flows.

Observed scope:
- `53` `templateId` references across pages/components.
- Most secondary actions (quick actions, advanced actions, many toolbar buttons, detail actions) are placeholders.

Practical implication:
- Main page navigation works.
- Many CTA buttons do not execute real domain logic; they route to simulation with query params.

## 6. Fake/Generated/Demo Data Inventory

### 6.1 Seed Data Modules

Static seed datasets are extensive:
- `src/data/learner.ts`
- `src/data/lessons.ts`
- `src/data/immersion.ts`
- `src/data/vocabulary.ts`
- `src/data/library.ts`
- `src/data/analytics.ts`

### 6.2 Runtime Data Expansion in Context

`AppDataContext` amplifies seeded data substantially:
- Adds **96 generated notebook entries** with tags including `generated`/`dummy`.
- Adds **40 generated writing drafts**.
- Builds review items from notebook entries.

### 6.3 Page-Level Synthetic Expansion

Several pages generate larger fake lists from seed arrays:
- Library page: expands to 84 generated items.
- Speak page: expands to 52 generated sessions.
- Write page: expands prompts + drafts for large UI lists.
- Immerse page: expands to 64 content cards.

### 6.4 Explicit Dummy/Fake Markers

- `ReviewSession` appends `dummy` flashcard set to real queue.
- `Immerse/ContentDetail` uses `fakeTranscript`.
- `References` auto-generates synthetic language packs when language-specific packs are absent.
- `SpeakSession` has fallback synthetic transcript/feedback behavior.

## 7. What Is Missing (Functional Gaps)

### 7.1 Real Feature Completion

Missing or incomplete domain behaviors:
- Many actions are template redirects, not implemented business flows.
- No server-backed user accounts, auth, or sync.
- No durable backend DB integration.
- No ingestion pipeline for real curriculum/content feeds.
- No real collection CRUD backend in Library.

### 7.2 Data/State Wiring Gaps

- Several pages use synthetic local arrays instead of context state.
- `aiFallback.ts` exists but is not used anywhere.
- Some feature results are not persisted even though context methods exist.
- Debug panel export writes downloadable files, not robust app-local storage.

### 7.3 Quality Engineering Gaps

- No tests (`test/spec` files not found).
- No lint script in `package.json`.
- README still default Tauri template, not project-specific docs.
- No CI evidence in repo.

### 7.4 Product/UX Gaps

- Many insights/stats are static demo analytics.
- Some flows use hardcoded prompts/phrases rather than language-aware dynamic content.
- One navigation action in SpeakSession uses `window.location.assign('/speak')` instead of router navigation.

## 8. Security and Hardening Risks

### 8.1 Tauri Web Security

Current Tauri window args include `--disable-web-security`, and CSP is `null`.

Impact:
- This is acceptable only for controlled local prototyping.
- It is unsafe for production distribution without strict threat review.

### 8.2 Debug Exposure

- `DEBUG` is hardcoded `true` in `src/config/env.ts`.
- Debug panel is always rendered in current build.

### 8.3 Storage and Export

- Settings and app data are all localStorage-based.
- File writes rely on browser-like download fallback (`saveToDummyDataFile`) because `@tauri-apps/plugin-fs` is not installed.

## 9. Assets and Local Runtime Payloads

### 9.1 UI Assets

- Custom font and mascot/image assets are present under `public/`.

### 9.2 Local Model/Binary Artifacts

- Large local model files exist under `src-tauri/weights` (~1.24 GB + ~0.60 GB).
- Native runtime DLL/EXE binaries are present under `src-tauri/lib`.
- These indicate local/offline experimentation paths, but they are not integrated into frontend product flows yet.

## 10. Feature-by-Feature Status

- Home: Mostly UI + template actions; basic contextual cards work.
- Learn: Rich UI scaffolding; many mission/lesson actions route to templates.
- Review: Strong local review mechanics; mixed with dummy card set.
- Immerse: Strong UI + filtering; detail transcript currently fake.
- Speak: Recorder/transcribe flow works with fallback; catalog mostly synthetic.
- Write: Editor with AI analysis + fallback; heavy use of generated prompt/draft data.
- Notebook: Best-connected to real local state (AppDataContext).
- Insights: Visually complete analytics dashboard; metrics largely seeded/static.
- Library: Large synthetic dataset and many template actions.
- References: Large structured dataset for key languages + generated fallback packs.
- Chat: Functional AI chat (with fallback if no key).
- Web Search: Functional multi-source search abstraction.
- Settings: Functional local settings persistence; no backend profile sync.

## 11. Concrete Evidence Pointers

- Template simulation statement: `src/pages/templates/TemplateActionPage.tsx`
- Template registry: `src/navigation/actionTemplates.ts`
- Debug always on: `src/config/env.ts`
- Dummy/generated notebook+draft seeding: `src/contexts/AppDataContext.tsx`
- Review dummy cards: `src/pages/Review/ReviewSession.tsx`
- Fake immersion transcript: `src/pages/Immerse/ContentDetail.tsx`
- Generated references fallback: `src/pages/References.tsx`
- Generated library items: `src/pages/Library.tsx`
- AI mock fallback path: `src/services/aiProvider.ts`
- Unused fallback service: `src/services/aiFallback.ts`
- Tauri insecure flags: `src-tauri/tauri.conf.json`
- Proxy fetch commands: `src-tauri/src/lib.rs`
- save-to-disk fallback note: `src/utils/saveDisk.ts`

## 12. Recommended Priority Order (Next Work)

1. Replace top user-facing template routes with real handlers (start with Home/Learn/Review quick actions).
2. Remove or gate synthetic list expansion on production flag; use context-backed data everywhere.
3. Wire real persistence for drafts/analysis/speaking runs consistently across pages.
4. Harden Tauri security config (`disable-web-security` off, non-null CSP).
5. Add baseline test coverage (unit for scheduling and utilities, smoke tests for main routes).
6. Add lint + CI checks and update README to real architecture docs.
7. Introduce chunk-splitting and performance budgeting for main JS bundle.

---

If you want, I can generate a second report that is strictly a **production-readiness checklist** with pass/fail status per item and estimated effort per fix.
