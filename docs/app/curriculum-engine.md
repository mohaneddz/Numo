# Curriculum engine

How Numo decides what a learner practises next. This describes what is implemented
in `src/services/curriculum/`, not a plan. The target model the engine is working
towards is in [Curriculum and progression blueprint](curriculum-progression-plan.md).

## Why it exists

`defaultThemes.json` lists 30 themes with 120 `embeddedConceptFocus` tokens, and
`conceptCatalog.json` lists 90 concepts in 12 categories. The two files shared **no
identifiers**, so nothing in the app could say which topics a learner knew. The only
per-learner signal was `exercise_signals_v2`, a single global aggregate per language
— one success streak, one latency average, one hint count covering everything the
learner had ever done. That cannot answer "what is this learner weak at", so the
"curriculum" was a single LLM call that invented recommendations and progress
percentages into an in-memory store.

## The pieces

| Module | Responsibility |
| --- | --- |
| `skillGraph.ts` | Turns the 120 theme focus tokens into addressable **skills**, each with a kind (`sound`, `script`, `vocabulary`, `grammar`, `function`, `discourse`) and a catalog category. Weaves script skills into the early themes of non-Latin languages. |
| `masteryStore.ts` | One record per skill: EWMA mastery, separate recognition and production scores, SM-2 scheduling, streaks, lapses, hint rate. Cached in memory, writes coalesced. |
| `progressionStore.ts` | The persisted facts: current theme, unlocked theme, Everdark level per theme, completed step ids, checkpoint scores, minutes by date. |
| `checkpointPlan.ts` | Builds the roadmap. Checkpoint count comes from each theme's own `coreSessionRange` and deepens with Everdark level. Step ids are stable so completion survives a reload. |
| `exerciseLadder.ts` | Maps (skill kind, mastery, required modality) to a concrete exercise type, climbing `recognize → discriminate → assemble → produce`. |
| `sessionPlanner.ts` | Composes a session: which skills, in which order, with which exercise types. |
| `languageProfile.ts` | Script, spacing and romanization facts per language. |
| `contentValidation.ts` | Rejects unusable generated content before it is cached or shown. |
| `taskContentService.ts` | Generates task wording in batches, caches variants, prefetches ahead. |
| `recommendationService.ts` | Derives Home's recommendations and guide copy from the same state. |

## The split that makes it fast

Deciding **what** to practise is pure, synchronous and deterministic — it runs in
well under a millisecond with no network involved. Only the **wording** of each task
needs a model call, and that is cached per `(language, skill, exercise type,
difficulty)` with several variants, requested one session at a time rather than one
task at a time, and prefetched for the next step while the current one is being
worked through. A repeated drill is served from cache instantly without being
word-for-word identical.

## How a session is composed

1. The step names its focus skills; earlier themes supply the review pool.
2. `REVIEW_SHARE` decides the split — 20% review on a rule step, 70% on a review step,
   always leaving at least one slot for the step's own skills.
3. Review slots are filled by weakness first, then by scheduled-due skills.
4. Each slot picks an exercise type from the ladder. A skill never attempted starts on
   the bottom rung regardless of anything else. If recognition has run more than 15
   points ahead of production, selection is pushed one rung up to close the gap.
5. Listening and speaking steps are restricted to exercise types that actually use
   audio and the microphone.
6. Tasks are ordered to open with a warm-up and spread free-production work evenly.

Each blueprint carries a `rationale` string, which the session screen shows to the
learner, so the adaptation is visible rather than hidden.

## Evidence in, adaptation out

- A **Learn** answer records a `SkillOutcome` against the drilled skill, carrying
  correctness, score, modality, latency and whether hints were used.
- Hints cost score (`hintService.hintPenalty`) so an assisted answer does not read as
  unaided mastery, and they shorten the skill's next interval.
- A wrong Learn answer creates a **review item tagged with that skill**; grading it in
  Review credits the same skill, so both loops share one learner model.
- Attribution is optional throughout. Items mined from immersion or added by hand have
  no skill behind them and deliberately do not touch mastery — guessing one would put
  invented evidence into the model.

## What the engine will not do

- It will not report a number it has not measured. Focus areas only list categories the
  learner has actually practised; immersion shows "In progress" rather than a
  percentage when the player never reported a total length.
- It will not show content that failed validation. A short session of correct tasks is
  preferred to a full one containing a task whose answer is visible in its prompt.
- It will not fabricate coverage. Exercise-type variety comes from the learner's own
  skills, not from appending fixed sample tasks.

## Tests

`curriculumPipeline.test.ts` covers the offline half end to end: a new learner reaches
a playable first task, every step of every checkpoint plans successfully for Spanish
and for Japanese, Chinese and Russian, completing a checkpoint unlocks the next, a
repeatedly-missed skill is pulled back into a later theme as review, and streak and
minute accounting match recorded sessions.
