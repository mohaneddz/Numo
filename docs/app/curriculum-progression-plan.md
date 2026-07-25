# Curriculum and progression blueprint

This document is the target architecture for Numo's guided learning system. It turns the current Learning-page prototype, exercise registries, learner evidence, review queue, and content-generation services into one coherent curriculum for all supported languages.

It is a product and implementation contract. The current code does not implement every part yet.

Related documents:

- [Exercise system](exercise-system.md)
- [Learning roadmap UI](learning-roadmap.md)
- [Language onboarding](onboarding.md)
- [Models and storage](models-and-storage.md)

## Product guarantees

The finished system must guarantee that:

1. English is always the base and interface language.
2. Every selected learning language has an independent journey, progress state, review queue, cache, and generation buffer.
3. The learner follows the same understandable roadmap shape in every language, while the underlying content remains language-specific.
4. Progress reflects demonstrated ability, not XP, time spent, or the number of screens opened.
5. Recognition alone never counts as productive mastery.
6. Sound, script, grammar, vocabulary, reading, writing, interaction, and cultural usage are all represented where the language requires them.
7. Generated material is schema-validated and pedagogically checked before the learner sees it.
8. A session can always start from approved cached content, even if online generation fails.
9. Generated content is versioned. Regenerating future material never rewrites completed evidence.
10. Accessibility settings can change an activity recipe without making the learner's curriculum impossible to complete.

## Roadmap hierarchy

The existing 30 themes remain the learner-facing map:

1. Starter Survival
2. Greetings & Introductions
3. People & Identity
4. Questions & Requests
5. Daily Actions & Common Objects
6. Home & Daily Routine
7. Family & Relationships
8. Food & Drink
9. Shopping & Money
10. Time, Dates & Planning
11. Places & Directions
12. Travel & Transport
13. Health & Body
14. Weather & Nature
15. Technology & Digital Life
16. School & Learning
17. Work & Career
18. Social Life & Small Talk
19. Hobbies & Entertainment
20. Emotions, Preferences & Opinions
21. Describing People, Things & Situations
22. Past Events & Experiences
23. Future Plans & Intentions
24. Problems & Emergencies
25. Services & Administration
26. Culture & Traditions
27. Storytelling & Narration
28. Explaining, Comparing & Reasoning
29. Discussion, Persuasion & Nuance
30. Real-World Fluency

The hierarchy is:

```text
Language journey
└── 30 themes
    └── Everdark chapter
        └── 20 checkpoints
            └── 7 steps
                └── 5-12 exercise activities
```

### Everdark chapter meaning

The five dots are curriculum chapters, not five decorative difficulty labels.

| Chapter | Approximate ability | Main change |
| --- | --- | --- |
| 1. Entry | Pre-A1 to A1-like | High-frequency recognition, sound-form links, tightly guided use |
| 2. Functional | A1 to A2-like | Short interactions, controlled recall, common variations |
| 3. Independent | A2 to B1-like | Connected language, less scaffolding, real input |
| 4. Flexible | B1 to B2-like | Nuance, register, spontaneous production, denser input |
| 5. Everdark | B2+ expansion | Open-ended depth, specialization, maintenance, and new contexts |

These labels are alignment aids, not a claim of CEFR certification.

Chapter `N` owns the 20-checkpoint span beginning at dot `N`. Completing that span unlocks dot `N + 1`. Chapter 5 can generate additional numbered cycles without adding more dots, preserving Everdark's infinite-expansion purpose.

This creates 140 step slots per chapter. Slots are stable addresses; they are not all pre-authored records. A slot receives a generated or curated session only when it approaches the learner's active horizon.

### Stable address format

Every roadmap location needs a deterministic identity:

```text
{language}:{curriculumVersion}:{theme}:{chapter}:{checkpoint}:{step}
```

Example:

```text
es:v3:food_drink:2:07:4
```

Content revisions and learner attempts refer to this address. Content can be replaced without changing the slot or losing evidence.

## What the curriculum must cover

Themes provide context. Curriculum nodes provide teachable knowledge. Every checkpoint selects nodes from several of these domains:

| Domain | Examples |
| --- | --- |
| Communication | requesting help, refusing politely, clarifying, narrating |
| Vocabulary | words, multiword expressions, collocations, classifiers, word families |
| Grammar | form, meaning, use, word order, agreement, morphology |
| Sentence patterns | reusable constructions and transformations |
| Listening | phoneme contrasts, reduced forms, segmentation, speed, accent variation |
| Pronunciation | sounds, tones, stress, rhythm, intonation, connected speech |
| Reading | script decoding, orthographic patterns, inference, text organization |
| Writing | spelling, script production, sentence construction, extended composition |
| Script | graphemes, characters, radicals, stroke order, keyboard/input conventions |
| Pragmatics | politeness, formality, turn-taking, implication, natural responses |
| Culture | situational expectations, dialect/register choice, culture-specific references |

The existing `curriculum_nodes` types already cover these categories:

- `vocabulary_cluster`
- `grammar_concept`
- `phoneme_target`
- `script_target`
- `sentence_pattern`
- `communicative_task`
- `reading_pattern`
- `listening_pattern`
- `writing_target`
- `culture_context`

The graph edges already support prerequisites, reinforcement, related concepts, confusion pairs, units, domains, and capabilities. This graph should become the canonical curriculum; `learning_units`, `learning_lessons`, and task templates should become generated delivery projections over it rather than a second competing curriculum.

## The spiral model

A theme is not "finished vocabulary." It is revisited with more capable language.

For example, Food & Drink can progress as:

| Chapter | Example outcome |
| --- | --- |
| 1 | Recognize basic foods and make one simple order |
| 2 | Modify an order, ask prices, state preferences and restrictions |
| 3 | Follow a menu or recipe, resolve a problem, explain choices |
| 4 | Discuss cuisine, compare experiences, use appropriate register |
| 5 | Handle regional language, idiom, specialized topics, and authentic media |

Grammar and phonology are embedded in useful communication. They may have reference pages and focused repair sessions, but the roadmap should not become a sequence of isolated rule units.

## Checkpoint recipe

Each checkpoint has exactly seven visible steps. A step is a short session containing multiple activities, not one question.

| Step | Purpose | Typical evidence |
| --- | --- | --- |
| 1. Orient | Introduce meaning, sound, script, and the communication goal | low-stakes recognition |
| 2. Discriminate | Separate new forms from confusable forms | listening, reading, matching |
| 3. Build | Notice and construct the target pattern | ordering, cloze, grammar choice |
| 4. Retrieve | Recall without copying | typed recall, dictation, guided speech |
| 5. Understand | Use the target in connected context | dialogue, short reading/listening |
| 6. Produce | Express something new with decreasing support | speaking, writing, roleplay |
| 7. Checkpoint | Mixed transfer challenge and repair decision | unassisted, cross-modality evidence |

The seven purposes remain stable so the roadmap is understandable. The activities inside them are adaptive.

### Session composition

A normal step should contain:

- 1-2 retrieval warm-ups from due material
- 2-4 activities for the new target
- 1-3 contrast or transfer activities
- 1 short recap or exit check

The planner may shorten a step when mastery is already demonstrated or insert a repair activity after a meaningful error. It must not silently turn a seven-step checkpoint into four steps.

### Activity selection constraints

The planner chooses exercises using:

- target node type and modality
- learner level and onboarding goals
- recognition-versus-production gap
- known confusion pairs and weak tags
- script-writing preference
- microphone, audio, keyboard, and accessibility availability
- recent exercise repetition
- content and media readiness
- whether the evidence must be graded deterministically

At least one checkpoint activity must test unassisted retrieval. At least one must test contextual transfer. For sound-bearing targets, the checkpoint must include listening evidence; speaking evidence is required when microphone use is enabled and can be replaced by a non-microphone pronunciation-awareness route when it is not.

## Curriculum planning layers

The curriculum must be produced in four distinct layers.

### 1. Language profile

A versioned, reviewed profile defines facts the generator must not invent:

- writing system and input methods
- phoneme inventory and important allophones
- syllable/mora structure
- stress, tone, rhythm, and intonation behavior
- transliteration policy
- grammar inventory and prerequisite ordering
- politeness, register, dialect, and diglossia policy
- common learner errors for English speakers
- tokenizer and answer-normalization rules
- accepted spelling, punctuation, and pronunciation variants
- TTS/STT/forced-alignment support and limitations

### 2. Curriculum graph

The graph contains stable nodes, prerequisites, confusion links, capability links, level bands, and theme relevance. This is generated once per curriculum version, reviewed, and then treated as canonical.

### 3. Checkpoint blueprint

A blueprint selects objectives and evidence requirements for a roadmap slot. It records what must be taught and tested but does not yet contain every prompt.

### 4. Session content

Session content provides the actual examples, exercise payloads, accepted answers, distractors, audio, explanations, hints, and grading rubrics for one step.

Separating these layers prevents a model from changing the curriculum merely because it generated a new multiple-choice question.

## Language-specific coverage

All ten languages share the roadmap shape, evidence model, and exercise framework. They must not share a translated English curriculum.

### Chinese

- Define Mandarin variety and accent policy explicitly.
- Teach initials, finals, syllable segmentation, neutral tone, tone pairs, and contextual tone changes.
- Store numbered and marked pinyin, Hanzi, and token alignment separately.
- Introduce radicals/components as recognition aids without presenting false etymologies.
- Track character recognition, reading, typing, and handwriting separately.
- Cover classifiers, aspect, topic-comment structure, particles, result complements, and natural omission.

### Japanese

- Treat mora timing, long vowels, gemination, devoicing, and pitch-accent awareness separately from generic pronunciation.
- Track hiragana, katakana, kanji recognition, readings, typing, and handwriting independently.
- Represent furigana/token readings directly rather than generating them from display text at render time.
- Cover particles, counters, conjugation, ellipsis, register, politeness, and sentence-final behavior.

### Korean

- Teach Hangul through jamo composition, syllable blocks, batchim, and major sound-change rules.
- Keep romanization optional and temporary.
- Track reading, typing, and handwriting separately.
- Cover particles, verb endings, speech levels, honorifics, omission, and connective endings.

### Arabic

- Make the initial product policy explicit: Modern Standard Arabic, selected dialect, or a clearly labeled combination.
- Teach right-to-left handling, connected letter forms, diacritics, long/short vowels, emphatics, pharyngeals, and assimilation.
- Store vocalized and unvocalized forms as linked variants.
- Cover root-pattern awareness, gender/number agreement, broken plurals, register, and dialect differences without mixing them silently.

### Russian

- Teach Cyrillic recognition and typing early.
- Store lexical stress; never rely on ordinary spelling to infer pronunciation.
- Cover vowel reduction, palatalization, consonant devoicing/voicing, and difficult clusters.
- Spiral cases, agreement, motion verbs, and aspect through communicative uses.

### German

- Store noun gender and plural with the lexical entry.
- Cover vowel length, umlauts, `ch` variants, final devoicing, stress, and compounds.
- Spiral case, adjective endings, verb placement, separable verbs, and register.

### Spanish

- Select and label regional pronunciation/usage profiles while teaching broadly understood forms.
- Cover syllable stress, spelling-to-sound rules, taps/trills, common approximants, and connected speech.
- Spiral gender/agreement, object pronouns, past contrasts, mood, and regional address forms.

### French

- Treat spelling-to-sound mapping, silent letters, liaison, enchaînement, schwa, nasal vowels, and rhythm as first-class nodes.
- Do not grade pronunciation from orthographic similarity.
- Spiral gender, determiners, pronouns, tense/aspect, negation, register, and spoken-versus-written differences.

### Italian

- Track lexical stress when it is not predictable.
- Cover consonant length, open/closed vowels where useful, `gli/gn`, and connected speech.
- Spiral agreement, articles/prepositions, clitics, tense/aspect, mood, and register.

### Portuguese

- Choose and label Brazilian and/or European profiles; do not combine their sound systems accidentally.
- Cover nasal vowels/diphthongs, vowel reduction, `r/s` variation, stress, and connected speech.
- Spiral agreement, contractions, clitics, tense/aspect, mood, and personal infinitive.

## Learner model

### Evidence, not completion flags

Every graded activity creates evidence linked to:

- learner and language
- roadmap slot and session
- curriculum nodes
- exercise definition and version
- input/output modality
- assistance level
- answer and accepted-answer version
- correctness and partial-credit dimensions
- latency, hints, retries, replays, and corrections
- transcription and acoustic analysis where relevant
- content revision, model/provider, and evaluator version

The existing `evidence`, `task_attempts`, `learner_node_state`, `weakness_clusters`, `review_items`, and script-state tables are the correct base.

### Mastery dimensions

Node mastery is a vector:

- meaning recognition
- form recognition
- cued recall
- free production
- listening
- reading
- speaking
- pronunciation
- writing
- contextual transfer

`recognition_score` and `production_score` remain useful summaries. Unlocking uses the relevant dimensions, not only the summary.

### Evidence weight

Evidence weight is based on:

- exercise validity for the target
- deterministic versus model-based grading confidence
- amount of help
- whether the item was seen recently
- response latency
- prompt difficulty
- successful transfer to a new context
- audio/input quality

Examples:

- an unassisted typed recall has more production weight than a four-option choice;
- replaying audio is not failure, but reduces confidence that the first presentation was understood;
- STT agreement alone is weak pronunciation evidence;
- copying a sentence is exposure, not recall;
- correcting an error after a hint is useful learning evidence but not checkpoint mastery.

### Mastery states

| State | Meaning |
| --- | --- |
| Unseen | No trustworthy evidence |
| Exposed | Encountered but not recalled |
| Learning | Some success, still scaffold-dependent |
| Stable | Repeated success across time or contexts |
| Fragile | Previously stable but high forgetting risk or recent failures |
| Mastered | Strong, diverse, recent evidence including retrieval/transfer |

The current fixed linear deltas in `learnerRules.ts` should be replaced by evidence-weighted updates with uncertainty and time decay. Until then, scores must not be presented as precise proficiency measurements.

## Unlocking rules

XP is motivational only. It never unlocks curriculum.

A checkpoint unlocks when:

1. the previous checkpoint's seven steps are complete or legitimately skipped by placement;
2. required prerequisite nodes have sufficient stable evidence;
3. its content buffer has at least one approved session;
4. required device capabilities have an accessible alternative.

The next Everdark chapter unlocks when:

- all 20 checkpoints in the current span are complete or placed out;
- the chapter challenge is passed;
- required high-priority nodes meet mastery thresholds;
- there is evidence diversity, including retrieval and transfer;
- unresolved critical weaknesses have a repair path scheduled.

A recommended starting threshold is 70/100 for required node dimensions and 65/100 for the mixed chapter challenge, with confidence above a minimum evidence count. These values must be calibrated from telemetry rather than treated as permanent truths.

### Failure behavior

Failure does not permanently lock the path. The planner:

1. identifies the smallest weak node or confusion cluster;
2. schedules a short repair recipe;
3. changes the exercise or context;
4. retests after spacing;
5. allows another checkpoint attempt.

## Review and forgetting

Review is generated from nodes and evidence, not only saved flashcards.

The scheduler should:

- create review candidates after meaningful exposure;
- prioritize high-value weak nodes, recent mistakes, confusion pairs, and due material;
- interleave recognition and production;
- use a different surface form from the original lesson;
- include listening/speaking review for sound targets;
- retire repeatedly easy items while retaining occasional maintenance;
- avoid reviewing multiple near-identical siblings in one block unless contrast is intentional.

The current interval multiplier and ease-factor logic is a usable temporary scheduler. The target scheduler should estimate retrievability and stability per node and modality, with lapse handling and same-day relearning.

## Placement and prior knowledge

Onboarding level is a starting prior, not proof.

The placement flow should sample:

- high-frequency vocabulary and sentence patterns
- listening independently of reading
- reading/script independently of listening
- controlled production
- optional speaking/pronunciation
- grammar in context

It should stop adaptively when confidence is sufficient. Placement creates evidence with lower weight than normal delayed learning evidence and marks checkpoints as placed out, not falsely completed.

## Session planning algorithm

For each requested step:

1. Load journey settings, roadmap position, due review, node mastery, weak clusters, device capabilities, and recent activity.
2. Resolve the stable checkpoint blueprint.
3. Select required new nodes and at most one major repair focus.
4. Allocate activity slots across retrieval, input, form, output, and transfer.
5. Filter exercises by level, language profile, accessibility, and media readiness.
6. Penalize recently overused exercise types.
7. Select approved content variants.
8. Generate only missing variants.
9. Validate the complete session and freeze its revision.
10. Start immediately from cache and refill the future buffer in the background.

The planner must be deterministic for the same state snapshot and random seed. This makes bugs reproducible and tests meaningful.

## Content generation horizons

Generating every possible step for ten languages would be wasteful and impossible to quality-control. Numo needs three horizons.

### Installed foundation

Ship a small reviewed starter pack for every language:

- language profile
- canonical graph skeleton
- onboarding and placement items
- the first theme's first checkpoint
- core sound/script demonstrations
- deterministic fallback exercises

This guarantees a real offline first session.

### Ahead buffer

Maintain:

- the current step fully approved;
- the remaining steps in the current checkpoint fully approved;
- the next checkpoint fully approved;
- blueprint-only plans for the following two checkpoints.

When the learner completes a step, refill one step ahead. When the learner changes language or goal, preserve approved reusable content and invalidate only incompatible future plans.

### Real-time repair

Generate in real time only for:

- a weakness discovered during the current session;
- an exhausted variant pool;
- an open-ended response requiring feedback;
- a learner-requested explanation or alternate example.

Real-time generation must not block the primary Next action when an approved fallback exists.

## Generation pipeline

```text
Learner need
    ↓
Deterministic content specification
    ↓
Candidate generation
    ↓
Schema and language validation
    ↓
Answer/distractor validators
    ↓
Pedagogy and level evaluator
    ↓
Audio/script/media validators
    ↓
Approved immutable revision
    ↓
Session cache
```

### Content specification

The generator receives a structured specification, not a vague “make a lesson” prompt:

- language profile/version
- base language
- curriculum and node IDs
- communication outcome
- exact exercise definition
- learner band and relevant errors
- allowed vocabulary/grammar
- new-versus-known item budget
- target difficulty
- required answer and distractor constraints
- sound/script requirements
- prohibited content and duplicate hashes
- expected JSON schema

### Required validators

Every generated activity must pass:

- JSON/schema validity
- supported exercise type and payload version
- target/base language detection
- canonical script and normalization checks
- answer presence and accepted-variant checks
- exactly one valid answer when the exercise requires one
- distractor plausibility and non-equivalence
- no answer leakage in the instruction
- level, length, and new-item budget
- node and objective coverage
- duplicate/similarity checks
- explanation consistency
- safety and age-neutrality
- audio transcript alignment and language/voice match
- media availability and attribution where media is required

Model-based evaluation may add a quality score, but it cannot replace deterministic checks.

### Retry and rejection

- Repair malformed JSON once.
- Regenerate a failed candidate with explicit validator errors.
- Stop after a bounded number of attempts.
- Record every rejected candidate and reason.
- Fall back to an approved template or earlier content revision.
- Never pass an invalid candidate to a component and hope its UI validator repairs the pedagogy.

## Caching and versioning

Cache keys include:

```text
language profile version
curriculum version
roadmap slot
node set
exercise definition version
difficulty/accessibility profile
generator version
```

Audio, images, and content metadata use content hashes and separate asset records. Signed or temporary URLs are downloaded to the app cache when licensing allows. Cache records need size, last access, source, checksum, expiry, and provenance.

Completed session revisions are immutable. A newer curriculum can map old node evidence forward through explicit migration aliases.

## Online and offline behavior

Online mode:

- can use configured LLM, STT, TTS, embedding, media, and evaluation providers;
- fills the ahead buffer in background tasks;
- stores provider/model provenance.

Offline mode:

- uses the installed foundation and approved local cache;
- uses configured GGUF, Whisper, Piper, and local embeddings when available;
- never attempts hidden network fallbacks;
- disables exercises whose required local modality is unavailable and chooses an equivalent recipe;
- queues optional generation/analysis work for later synchronization.

Progress, review scheduling, deterministic grading, and roadmap navigation must always work offline.

## Data-model changes

Preserve the current tables and add or formalize:

| Record | Purpose |
| --- | --- |
| `language_profiles` | versioned linguistic facts and policies |
| `roadmap_slots` | stable theme/chapter/checkpoint/step addresses |
| `checkpoint_blueprints` | objectives, node set, and evidence requirements |
| `session_revisions` | immutable planned sessions |
| `exercise_instances` | payload, definition version, accepted answers, rubric |
| `node_mastery_dimensions` | per-node, per-modality estimates and uncertainty |
| `generation_jobs` | priority, horizon, dependencies, retries, state |
| `content_validation_results` | validator version, decision, reason, metrics |
| `audio_assets` | source, voice, locale, transcript, timings, cache and license |
| `pronunciation_targets` | phonemes, stress/tone/prosody, accepted variants |
| `curriculum_mappings` | migration from old nodes/slots to a new version |

Do not store large audio blobs or raw recordings directly in SQLite. Store managed file references, checksums, and retention policy.

## Metrics

Measure learning and system quality separately.

Learning:

- delayed retrieval success
- transfer success on unseen contexts
- recognition-production gap
- listening-reading gap
- pronunciation target improvement
- lapse rate and time to restabilize
- hints/replays/corrections over time
- chapter challenge outcomes

System:

- session-ready cache hit rate
- time to first activity
- generation acceptance/rejection rate by validator
- duplicate rate
- model/provider cost
- audio generation and analysis latency
- offline session availability
- fallback rate
- exercise component error rate

XP, streak, and minutes are engagement measures, not learning-quality evidence.

## Rollout plan

### Phase 0 — consolidate contracts

- Make this document and the exercise-system document canonical.
- Introduce versioned `ExerciseDefinition`, payload, grading, and evidence contracts.
- Stop treating catalog aliases as distinct implemented exercises.
- Add explicit content provenance and validator results.

### Phase 1 — canonical curriculum graph

- Build reviewed language profiles for all ten languages.
- Create shared communicative capability IDs and language-specific node graphs.
- Map all 30 themes to relevant nodes at each chapter.
- Add graph linting for missing prerequisites, cycles, and unreachable nodes.

### Phase 2 — roadmap persistence and planner

- Persist roadmap slots and checkpoint blueprints.
- Replace `LearnPage.tsx` dummy roadmap state with repository queries.
- Implement seven-step session recipes and evidence requirements.
- Make checkpoint and Everdark unlocks evidence-based.

### Phase 3 — generation and ahead buffer

- Replace broad prompts with typed content specifications.
- Add generation jobs, validators, immutable revisions, retries, and cache keys.
- Ship foundation packs and maintain the current-plus-next-checkpoint buffer.
- Add generation observability in the Notebook/Library management workspace.

### Phase 4 — sound foundation

- Implement the audio and pronunciation architecture in the exercise-system document.
- Add audio asset caching, locale/voice metadata, word and phoneme timings.
- Separate STT, forced alignment, acoustic pronunciation scoring, and LLM explanations.
- Implement listening and speaking alternatives for offline/accessibility modes.

### Phase 5 — exercise depth

- Harden existing deterministic components.
- Split catalog aliases into genuinely distinct exercise definitions.
- Add missing listening, speaking, conversation, reading, writing, script, and transfer components.
- Add component contract tests and golden generated payloads for every language.

### Phase 6 — adaptive mastery and review

- Replace linear mastery deltas with weighted evidence and decay.
- Add modality-aware review scheduling and confusion repair.
- Add placement, skip-ahead, and chapter challenge flows.
- Calibrate thresholds from test users and telemetry.

### Phase 7 — quality and scale

- Build reviewed regression sets for all languages.
- Add provider comparison, cost controls, cache maintenance, and curriculum migration tools.
- Add author/reviewer tools for correcting generated content without losing learner evidence.

## Definition of done

The curriculum system is ready for production when:

- every supported language has a reviewed versioned profile and reachable curriculum graph;
- every roadmap dot opens exactly 20 checkpoints and every checkpoint exactly 7 steps;
- a fresh online or offline user can start an approved first session;
- the current and next checkpoint are normally ready before they are requested;
- no invalid generated payload reaches an exercise component;
- every graded attempt produces traceable node evidence;
- recognition and production can diverge in the learner model;
- chapter unlocks depend on mastery and transfer, not XP;
- sound exercises use verified audio and do not pretend STT text is acoustic pronunciation scoring;
- all exercise definitions have schema, grading, accessibility, evidence, and test coverage;
- changing curriculum or content versions preserves completed evidence.

