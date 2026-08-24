# Page inventory

This is the working inventory for the main Numo surfaces. It is intended to keep product language, route ownership, and implementation ownership aligned during the overhaul.

| Product page | Current route | Main source | Primary responsibility |
| --- | --- | --- | --- |
| Home | `/` | `src/pages/Home.tsx` | Daily plan, momentum, and next actions |
| Learning | `/learn` | `src/pages/Learn/LearnPage.tsx` | Guided learning modules |
| Review | `/review` | `src/pages/Review/ReviewPage.tsx` | Due review and recall entry point |
| Immersion | `/immerse` | `src/pages/Immerse/ImmersePage.tsx` | Authentic content and mining |
| Speaking | `/speak` | `src/pages/Speak/SpeakPage.tsx` | Speaking practice entry point |
| Writing | `/write` | `src/pages/Write/WritePage.tsx` | Writing practice and drafts |
| Notebook | `/notebook` | `src/pages/Notebook/NotebookPage.tsx` | Saved learner language |
| Notebook detail | `/notebook/:itemId` | `src/pages/Notebook/NotebookDetail.tsx` | One saved item |
| Notebook Library | `/notebook/library` | `src/pages/Library.tsx` (`NotebookLibraryPage`) | Approval and management workspace |
| Notebook Exercises | `/notebook/exercises` | `src/pages/Exercises/ExercisesPage.tsx` | Exercise generation and selection |
| Insights | `/insights` | `src/pages/Insights.tsx` | Progress and learning evidence |
| Libraries | `/library` | `src/pages/References.tsx` (`LibrariesPage`) | Reference catalogs for the active language |
| Chat | `/chat` | `src/pages/Chat.tsx` | Target-language conversation with word-level pronunciation and English meaning |
| Settings | `/settings` | `src/pages/Settings.tsx` | Preferences and configuration |

## Supporting flows

These are not top-level sidebar pages, but they are important parts of the page system:

- Learning sessions: `/learn/session`
- Review sessions: `/review/session`
- Speaking sessions: `/speak/session/:sessionId`
- Writing editor: `/write/editor/:draftId?`
- Immersion content detail: `/immerse/:contentId` or its current detail route configuration
- Quick practice: `/practice/quick`
- Script practice: `/script-practice`
- Profile: `/profile`
- Notifications: `/notifications`
- Language setup and welcome: `/language-setup`, `/language-welcome`

## Page ownership rule

Top-level pages own their task-specific content and actions. The shell owns only global concerns: navigation, page title metadata, active language, shortcuts, notifications, profile access, the visual background, and the scroll container. This separation makes it possible to redesign a page without changing the application's global frame.
