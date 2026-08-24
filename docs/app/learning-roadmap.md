# Learning roadmap UI

The Learning page is currently a visual prototype for the future generated curriculum experience.

## Structure

The page uses three regions inside the standard application shell:

1. A theme selector at the top of the main content.
2. A vertically scrolling roadmap beneath the selector.
3. A sticky learning tools panel on the right.

## Theme selector

The selector reads the 30 themes from `src/data/main/defaultThemes.json`. A learner can browse with previous/next controls or open the native theme list directly.

Each selected theme displays:

- Theme number out of 30
- SVG theme icon and centered title
- Short curriculum description
- Everdark level controls

Everdark is the repeatable expansion layer defined by the theme catalog. The page displays five level dots without an additional text badge. Each unlocked dot selects its corresponding level and resets the roadmap to that level's current checkpoint. Only level 1 is initially reachable; later levels remain locked until the preceding curriculum is complete.

## Roadmap

The roadmap is deliberately similar to a game-like language path:

- Twenty checkpoints between each Everdark level
- Seven guided steps inside every checkpoint
- 140 total steps in every level
- A connected vertical, slightly zig-zagged path
- Lesson-level progress indicators
- Locked, available, and future completed states

Session types currently include:

- Rules
- Vocabulary
- Practice exercises
- Listening
- Speaking
- Checkpoints

Session titles are derived from each theme's `embeddedConceptFocus` values. The activity content, completion state, generation, and unlocking behavior remain placeholders until the curriculum-generation system is implemented.

## Learning tools panel

The right panel shows:

- Current theme and core-path progress
- Selected checkpoint, time, XP, and its seven-step breakdown
- Estimated duration and XP
- Start/resume action
- Level totals for checkpoints, steps, time, and steps per checkpoint
- Session-type distribution
- The requirement for unlocking the next level

The panel contains no development labels, prototype notices, language badges, or decorative concept tags. It is intended to remain a practical contextual control surface while the roadmap stays focused on orientation and progression.

## Implementation boundary

The current UI model lives in `src/pages/Learn/LearnPage.tsx`. It intentionally does not query generated lesson records yet. Selecting an available checkpoint currently opens the existing `/learn/session` flow; curriculum generation and persisted checkpoint progress will be connected later.

The next implementation phase should preserve this UI contract while replacing dummy lessons with generated, persisted curriculum data. The canonical target model is defined in [Curriculum and progression blueprint](curriculum-progression-plan.md), and exercise behavior is defined in [Exercise system](exercise-system.md).
