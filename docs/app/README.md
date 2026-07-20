# Numo App Guide

Numo is a desktop-first language-learning application built with Tauri, React, TypeScript, and Vite. It helps a learner move through a language journey: learn new material, practice it in several modes, save useful language, review it over time, and use authentic content to reinforce understanding.

The application is English-first: English is the interface and base language, while the learner chooses one or more separate learning languages. See [Language onboarding](onboarding.md) for the current first-run flow and navigation rules.

The current Learning-page direction is documented in [Learning roadmap UI](learning-roadmap.md).
The conversational response contract is documented in [Chat](chat.md).
Online/offline routing and local model paths are documented in [Models and storage](models-and-storage.md).

Numo is local-first in its interaction model. The application shell, language selection, learner profile, progress state, notebook entries, review queue, settings, and much of the learning data are managed inside the app. AI and external content services are used where the feature requires generation, search, media, or richer feedback.

## Product structure

The primary layout is:

```text
Tauri titlebar
└── Application shell
    ├── Sidebar navigation
    └── Main area
        ├── Page header and tools bar
        └── Scrollable page content
            ├── Main content column
            └── Optional supporting sidebar
```

The sidebar is the learner's global map. The content area is the active workspace. The tools bar contains page-level actions and shared controls such as language selection, shortcuts, notifications, profile, settings, and contextual actions. A page should keep global navigation in the shell and keep feature-specific actions in its own tools bar or content area.

## Main sections

| Section | Route | Purpose |
| --- | --- | --- |
| Home | `/` | Shows daily momentum, the current language journey, and the next useful learning actions. |
| Learning | `/learn` | Presents guided modules and learning missions. Learning sessions contain the interactive exercises used to build new knowledge. |
| Review | `/review` | Provides scheduled recall and flash-card review. Review sessions adapt the question flow to the learner's due material and evidence. |
| Immersion | `/immerse` | Lets the learner work with stories, dialogues, clips, and other content while mining useful language from context. |
| Speaking | `/speak` | Provides guided pronunciation and speaking practice, including recorded attempts and feedback-oriented exercises. |
| Writing | `/write` | Provides structured writing practice, prompts, drafts, corrections, and review of writing attempts. |
| Notebook | `/notebook` | Stores words, phrases, notes, context, favorites, and collections for later review. Notebook also contains the former Library and Exercises workspaces as internal sections. |
| Insights | `/insights` | Summarizes learning evidence, progress, review activity, and consistency trends. |
| Libraries | `/library` | The former References workspace: a browsable catalog of character, sound, word, grammar, and language reference material. |
| Chat | `/chat` | Offers a conversational practice surface with Echo. |
| Settings | `/settings` | Controls application preferences, language configuration, keyboard shortcuts, integrations, and validation tools. |

## Notebook sections

Notebook is the single destination for saved and exploratory language material:

- **Notebook** (`/notebook`) is the learner-owned collection of saved words, phrases, and notes.
- **Library** (`/notebook/library`) is the content approval and management workspace that was previously exposed as the Library page.
- **Exercises** (`/notebook/exercises`) is the exercise generator and continuous exercise-selection workspace that was previously a development-only page.

These are navigated with the Notebook section navigation. They are related workspaces, not separate top-level sidebar destinations.

## Shared page anatomy

Most pages should follow this structure:

1. The shell renders the page title and short description in the top header.
2. The page tools bar exposes the page's primary actions and the shared settings affordance.
3. The page content uses a narrow, default, or wide width according to the task.
4. Complex pages use a main column plus an optional supporting sidebar.
5. Detail or session flows remain reachable from the parent page and provide a clear route back.

Shared layout primitives live in `src/components/layout/PageLayout.tsx`:

- `PageContent`
- `PageActions`
- `PageSection`
- `PageMainSidebarLayout`
- `PageMainColumn`
- `PageSidebar`

The global shell lives in `src/components/layout/AppShell.tsx`, the global navigation lives in `src/components/layout/Sidebar.tsx`, and the desktop window controls live in `src/components/layout/Titlebar.tsx`.

## Route and naming notes

- User-facing names are nouns or clear activity names: Learning, Review, Immersion, Speaking, Writing, Notebook, Insights, Libraries, Chat, and Settings.
- The route names remain short and stable for deep links and keyboard shortcuts.
- `/references` redirects to `/library` for compatibility with older links.
- `/exercises` redirects to `/notebook/exercises` for compatibility with the former development route.
- The current source filenames are not always identical to the product name. For example, the Libraries page is still implemented in `src/pages/References.tsx` because it is the former References page, while the previous Library workspace remains in `src/pages/Library.tsx` under the Notebook route. Their component names are `LibrariesPage` and `NotebookLibraryPage`.

## Important implementation contexts

- `LanguageContext` owns the active language selection.
- `LanguageJourneyContext` and `CurriculumContext` support onboarding, progression, and curriculum state.
- `AppDataContext` exposes learner-owned data such as notebook entries and review-related counts.
- `RuntimeContext` coordinates foreground surfaces and runtime behavior.
- Persistence and repositories live under `src/persistence`.
- Learning, exercise, integration, background, and provider services live under `src/services`.

This document describes the current product surface. It should be updated whenever a top-level section, route, shell responsibility, or page ownership changes.
