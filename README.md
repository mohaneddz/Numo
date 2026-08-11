<h1 style="font-family: Arial, sans-serif; font-size: 36px; color: #6BC3FF; display: flex; align-items: center; gap: 12px; border-bottom: 3px solid #6BC3FF; padding-bottom: 8px;">
  <img src="src-tauri/icons/128x128.png" alt="Numo Icon" style="height: 55px; width: 55px; object-fit: contain; border-radius: 8px;">
  Numo — Language Learning Desktop App
</h1>

Numo is a Duolingo-style language-learning desktop app built with **Tauri, React, TypeScript, and
Vite**. It's structured around a real curriculum engine — a skill graph, per-skill mastery model,
roadmap, session planner, and content generation pipeline — not a static set of flashcards. The app
is English-first (English is the interface language) while the learner picks one or more target
languages to study; current content development is focused on Chinese (character/script practice,
Pinyin-aware prompts, vocabulary pairs).

---

## Tech Used

![Tauri](https://img.shields.io/badge/Tauri-24C8DB?style=for-the-badge&logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust)

---

## Features

- **Curriculum engine** — a skill graph with a per-skill mastery model, a persisted learner
  roadmap, and a session planner that builds each lesson from real checkpoint steps
  (`src/services/curriculum`, `src/services/engine`, `src/services/exercises`)
- **Learn / Practice / Review / Write / Speak / Immerse / Script Practice** — separate, fully built
  page groups under `src/pages`, each with its own workflow rather than a single generic exercise
  screen
- **Notebook** — saves words, phrases, and notes for later review, plus internal Library
  (content approval) and Exercises (generator) workspaces
- **Immersion** — authentic content (stories, dialogues, clips, e-books via `epubjs`) with language
  mining from context, and progress persistence
- **Offline curriculum seed generator** — a bundled fallback content pack so lessons work without a
  live connection before falling back to AI generation; Chinese vocabulary seeding is in progress
  (partial coverage as of the last content commit)
- **Text-to-speech** — target-language-aware speech synthesis for prompts and content
- **Insights** — progress and learning-evidence charts via `recharts` (streaks, review activity,
  consistency trends)
- **Chat** — target-language conversation practice with word-level pronunciation and English
  meaning
- **Libraries** — a browsable reference catalog (characters, sounds, words, grammar) for the active
  language
- Automated tests with Vitest, including coverage for Login, Profile, Insights, and curriculum
  services; a custom `pnpm audit:buttons` script audits UI buttons

---

## Project Structure

```text
src/
|-- pages/            # Home, Learn, Review, Immerse, Speak, Write, Notebook, Insights,
|                      # Libraries, Chat, Settings, Login, Profile, LanguageSetup/Welcome
|-- services/
|   |-- curriculum/    # skill graph, mastery, roadmap, session planning
|   |-- engine/        # curriculum runtime engine
|   `-- exercises/     # exercise generation and validation
|-- runtime/
|   |-- pipeline/      # content pipeline
|   |-- providers/     # AI/content providers (online + offline fallback)
|   `-- tasks/         # background task handling
|-- persistence/
|   `-- repositories/  # local data persistence
|-- components/layout/ # AppShell, Sidebar, Titlebar, PageLayout primitives
`-- App.tsx            # routes and application shell

src-tauri/              # Tauri backend (Rust)
scripts/                 # curriculum seed generation, button audit
docs/app/                # living product docs (page inventory, curriculum engine, exercise
                          # system, chat contract, models & storage, onboarding)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Rust toolchain
- Tauri system dependencies for your operating system
- A `.env` / `.env.local` with API keys for live curriculum generation and TTS providers (optional
  — the app falls back to the bundled offline seed pack when live services aren't configured)

### Install and run

```bash
pnpm install
pnpm tauri dev
```

### Available Scripts

```bash
pnpm dev                 # Start Vite
pnpm build                # Type-check and build frontend assets
pnpm preview               # Preview the production frontend build
pnpm tauri dev              # Run the desktop app
pnpm test                    # Run the Vitest suite
pnpm seed:curriculum          # Regenerate the offline curriculum seed pack
pnpm audit:buttons             # Audit UI buttons across the app
```

---

## Current Status

Actively developed (`0.1.0`, no tagged release yet). The curriculum engine, page set, and core
learning loop are functional. Chinese vocabulary seeding for the offline curriculum pack is
partial (roughly a third of core pairs seeded so far, per the latest content commit) — the rest
currently rely on live AI generation. See `docs/app/README.md` for the full product/architecture
guide and `docs/app/curriculum-engine.md` / `docs/app/exercise-system.md` for implementation detail.
