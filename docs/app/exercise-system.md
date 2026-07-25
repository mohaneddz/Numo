# Exercise system

This document audits the current exercise implementation and defines the complete target exercise framework. It replaces the missing root-level `exercise.md` referenced by an older Codex conversation.

The curriculum and progression model is defined in [Curriculum and progression blueprint](curriculum-progression-plan.md).

## Current implementation audit

Numo currently exposes 60 user-facing catalog entries in `src/services/exercises/exerciseCatalog.ts`. Those entries adapt to six engine domains plus a conceptual conversation domain.

The registries currently contain:

| Registry | Registered internal types | Actual specialized surface |
| --- | ---: | --- |
| Learn | 34 | 20 named six-line wrappers over 5 reusable choice, pair, group, order, and text bases |
| Quick | 16 | 4 substantial components plus speaking/translation wrappers over one text-area base |
| Review | 12 | 6 components |
| Script | 5 | 5 thin mode wrappers over one canvas system |
| Speak | 1 | Guided repeat |
| Write | 2 | Draft and correction review |

These counts are not 70 distinct pedagogical exercises. Several registrations are aliases or payload variations over the same component.

### Current learn types

Implemented learn registrations:

- word/meaning and sentence/translation matching
- grouping words by topic
- synonym replacement
- meaning in context
- sentence reordering
- missing-word completion
- finishing a sentence starter
- building from chunks
- completing dialogue
- reading and answering
- choosing a response or verb form
- statement-to-question transformation
- grammar correction and structure comparison
- listen/repeat, identify sounds, listen/choose
- pronunciation-rule explanation
- greeting response
- single-slot fill
- image/word and sound/word recognition
- character/reading matching
- radical/component identification
- missing/wrong character tasks
- tone-pair identification
- kana confusion
- particle and classifier choice
- okurigana fill

Payload validators currently ensure minimal shape such as two options, two pairs, tokens, groups, or text. They are good UI guards, but they do not prove linguistic or pedagogical correctness.

Most named learn files are labels around the five base interactions. This reuse is useful, but different catalog names do not yet imply different mechanics, grading, hint behavior, or evidence.

### Current quick types

- multiple choice
- translation/text response
- speaking response
- matching
- image-to-word and word-to-image
- sound-to-word and sound-to-image
- phrase assembly
- single cloze
- greeting/context selection
- Hanzi/Pinyin, Kanji reading, radical, and kana-choice aliases

Quick generation lives in `src/lib/sessionEngine.ts`, with JSON parsing, normalization, basic validation, policy filtering, media hydration, regeneration, infinite generation, and deterministic fallbacks.

### Current review types

- reveal and flash recall
- multiple choice
- typed response
- build from a bank
- true/false
- true/false with justification
- delayed recall
- seen/unseen
- confusion-pair choice
- radical recall
- reading/dictation recall

The adaptive review service can prioritize confusion pairs, recognition/production gaps, hover translations, and script trace-versus-recall gaps. The scheduler itself still uses a simple interval/ease multiplier.

### Current script types

- watch stroke order
- trace
- guided draw
- free draw
- timed recall draw

Script attempts already have separate completion, trace, guided, free, timed, and recall scores. Current progression gating incorrectly treats only Chinese and Japanese as script languages in one hook; Korean, Russian, and Arabic also require explicit script/orthography planning even if their handwriting recipe differs.

### Current speaking and sound behavior

Only `guided_repeat` is a real speaking registration. The catalog's Read Aloud, Shadowing, Picture Response, and Open Spoken Answer all map to that same component.

The current speaking flow:

1. records WebM audio;
2. sends it to STT;
3. asks an LLM to infer pronunciation and fluency from the target phrase and transcription;
4. stores the resulting scores and tip;
5. uses a generic fallback score when analysis fails.

This is not acoustic pronunciation assessment. STT output can support intelligibility evidence, but an LLM comparing text cannot reliably hear segmental errors, stress, tone, timing, rhythm, or intonation. Generic fallback scores must never become mastery evidence.

The current recorder does provide a live level meter. The displayed post-recording waveform is decorative rather than derived from the recording.

### Current writing behavior

- `draft_composition`
- `correction_review`

Guided sentence, short composition, and free composition catalog entries all map to `draft_composition`. Conversation entries also map to the writing draft component and therefore are not implemented conversations yet.

### Current generation behavior

`learningPlanService.ts` generates variants from persisted lesson templates and can add synthetic coverage. It has explicit extra seeds only for Chinese and Japanese. Generic fallback seeds contain English exercise content, so they are development fallbacks rather than a complete ten-language curriculum.

`curriculumGenerator.ts` generates dashboard recommendations, focus percentages, and a daily mission. Despite its name, it does not generate the durable curriculum graph or roadmap.

### Current prompt and evaluator audit

The older `exercise.md` was intended to document prompts as well as components. The active prompt surfaces are:

| Surface | Source | Current contract | Main gap |
| --- | --- | --- | --- |
| Quick session generation | `src/lib/sessionEngine.ts`, `aiGenerateItems` | requests 1 or 6 beginner-safe items from an allowed type union; English instructions; target markers; basic Chinese/Japanese notes | one broad schema covers incompatible types; only shallow language guidance |
| Notebook exercise draft | `src/lib/sessionEngine.ts`, `generateExerciseDraft` | requests one catalog-adapted object from a generated template; retries validation up to three times | template/validator quality varies by adapter; fallback can look valid without being pedagogically valid |
| Learn runtime variants | `src/services/learningPlanService.ts`, `generateVariants` | rewrites persisted task templates and requests prompt, answer, distractors, payload, and grading mode | no full language profile, node contract, accepted variants, or validator-error repair loop |
| Learn grading | `src/services/learningPlanService.ts`, `evaluateWithAi` | sends task type, expected answer, learner answer, payload, and structured response; asks for correctness, score, and feedback | no explicit rubric, dimension scores, evaluator confidence, or language facts |
| Review free response | `src/pages/Review/ReviewSession.tsx`, `aiCheck` and `aiCheckTfj` | compares expected and user text or justification and asks for a Boolean decision | no level/context, accepted variants, deterministic precheck contract, or confidence |
| Speaking feedback | `src/pages/Speak/SpeakSession.tsx`, `processSpeech` | asks an LLM for pronunciation/fluency scores from target text and STT text | no acoustic input; cannot support pronunciation scoring |
| Writing correction | `src/pages/Write/WriteEditor.tsx`, `handleReview` | requests grammar, spelling, correctness, and style corrections as a JSON array | no prompt goal, learner level, dialect, rubric, severity, confidence, or false-positive guard |

These prompts should be replaced by versioned prompt builders that accept typed specifications and return typed evaluator results. Prompt strings should not live inside page components.

The target prompt stack is:

1. a stable system contract for the exercise or evaluator family;
2. a reviewed language-profile excerpt;
3. a typed curriculum/content specification;
4. a learner-state excerpt containing only relevant evidence;
5. a strict response schema;
6. deterministic validator errors on repair attempts.

Prompt versions, provider/model identity, input hashes, output hashes, validator versions, and decisions must be stored with generated content or evaluation evidence. Raw private learner text follows the app's retention settings.

### Current source map

| Responsibility | Current source |
| --- | --- |
| User-facing catalog and adapters | `src/services/exercises/exerciseCatalog.ts` |
| Learn task types | `src/types/learningPlan.ts` |
| Learn registry and payload normalization | `src/components/exercises/learn/registry.tsx` |
| Quick registry | `src/components/exercises/quick/registry.tsx` |
| Review registry | `src/components/exercises/review/registry.tsx` |
| Script registry | `src/components/exercises/script/registry.tsx` |
| Speak registry | `src/components/exercises/speak/registry.tsx` |
| Write registry | `src/components/exercises/write/registry.tsx` |
| Quick generation and exercise drafts | `src/lib/sessionEngine.ts` |
| Learn template generation and grading | `src/services/learningPlanService.ts` |
| Exercise level/difficulty policy | `src/services/exercises/exercisePolicy.ts` |
| Adaptive review selection | `src/services/exercises/adaptiveReviewService.ts` |
| Image search and cache | `src/services/exercises/exerciseMediaService.ts` |
| Interaction signals | `src/services/exercises/exerciseSignalsService.ts` |
| Script scoring | `src/services/exercises/scriptScoringService.ts` |
| Evidence/mastery updates | `src/services/engine/learnerRules.ts` |
| Review scheduling | `src/services/engine/reviewRules.ts` |
| Speech recording | `src/hooks/useAudioRecorder.ts` |
| STT/TTS routing | `src/services/aiProvider.ts` and `src/runtime/providers` |

### Current catalog by category

| Category | User-facing entries |
| --- | --- |
| Selection | Multiple Choice, True/False, Best Response, Image Choice, Audio Choice |
| Matching | Matching, Word/Meaning, Sentence/Translation, Audio/Text, Image/Word |
| Sorting | Topic, Grammar, Meaning, Register |
| Ordering | Phrase Assembly, Sentence Reordering, Dialogue Ordering |
| Completion | Fill in the Blank, Cloze Passage, Finish Sentence, Complete Dialogue |
| Transformation | Synonym, Statement/Question, Form Change, Grammar Correction, Paraphrase |
| Translation | To target language, to English |
| Recall | Reveal, Typed Recall, Build Recall, Dictation Recall |
| Reading | Read and Answer, Meaning in Context, Main Idea, Detail Finding |
| Listening | Listen and Choose, Listen and Type, Sound Identification, Pronunciation Rule |
| Speaking | Guided Repeat, Read Aloud, Shadowing, Picture Response, Open Answer |
| Writing | Guided Sentence, Short Composition, Free Composition |
| Conversation | Roleplay, Branching Dialogue, Goal-Based Chat |
| Script | Stroke Order, Trace, Guided Draw, Free Draw, Timed Recall |
| Review | Mixed, Weak Point, Timed, Cumulative |

## Required exercise contract

Every exercise must be registered as a versioned definition:

```ts
interface ExerciseDefinition<TPayload, TAnswer, TResult> {
  key: string;
  version: number;
  title: string;
  domains: CurriculumNodeType[];
  inputModalities: Modality[];
  responseModalities: Modality[];
  levelRange: LevelRange;
  evidenceCapabilities: EvidenceCapability[];
  payloadSchema: Schema<TPayload>;
  answerSchema: Schema<TAnswer>;
  resultSchema: Schema<TResult>;
  grading: GradingContract;
  generation: GenerationContract;
  accessibility: AccessibilityContract;
  media: MediaRequirements;
}
```

The definition must answer:

- what knowledge it can validly test;
- whether it produces recognition, retrieval, production, listening, pronunciation, script, or transfer evidence;
- which hints reduce evidence weight;
- how partial credit is calculated;
- which answer variants are accepted;
- which provider/device capabilities it needs;
- how it behaves offline;
- how its payload is generated and validated;
- what accessible alternative preserves the learning objective.

UI components render valid payloads. They should not be responsible for inventing missing distractors, generic categories, or linguistically valid answers.

## Grading families

### Deterministic

Use when the answer space is closed:

- choice
- pair matching
- sorting
- ordering
- exact script trace against geometry
- constrained cloze

Normalization must be language-specific. It may handle case, Unicode normalization, punctuation, whitespace, optional diacritics, accepted orthographic variants, and equivalent tokenization. It must not turn genuinely different forms into the same answer.

### Rule-based partial credit

Use for structured responses:

- multi-slot cloze
- dictation
- sentence building
- script drawing
- pronunciation target coverage

Return dimension-level results, not one unexplained percentage.

### Model-evaluated

Use for meaning and quality where deterministic grading is insufficient:

- open speaking
- free writing
- roleplay outcome
- explanation
- paraphrase

The evaluator receives a rubric, curriculum nodes, accepted semantic outcomes, learner level, and response. A second schema validator checks its result. Model confidence limits how strongly evidence updates mastery.

### Hybrid

Run deterministic checks first, then use a model only for unresolved semantic equivalence or useful feedback. The deterministic result remains visible in provenance.

## Complete target catalog

The following catalog includes the current activities and the missing components needed for a complete curriculum.

### Sound and phonological awareness

- hear and choose a word
- audio-to-image
- audio-to-text matching
- minimal-pair discrimination
- odd-sound-out
- same/different sound judgment
- phoneme-in-word location
- syllable or mora counting
- stress-position choice
- tone identification and tone-pair identification
- intonation/function matching
- sound-to-spelling choice
- spelling-to-sound choice
- reduced-form recognition
- word-boundary segmentation
- accent/voice variation recognition
- speech-in-noise recognition
- speed-ramp listening
- listen and order
- listen and complete
- full and partial dictation
- errorful transcript correction

### Speaking and pronunciation

- guided repeat
- backward build-up
- minimal-pair production
- sound-in-word production
- read aloud
- sentence imitation
- shadowing with adjustable delay
- rhythm/stress imitation
- tone-contour imitation
- substitution drill
- transformation drill
- picture naming
- picture description
- timed response
- open spoken answer
- information-gap response
- story retell
- roleplay
- conversational repair
- self-comparison between attempts

These require distinct payloads and feedback; they must not all alias Guided Repeat.

### Vocabulary and lexical use

- word/meaning and image/word matching
- semantic grouping
- register grouping
- category odd-one-out
- collocation matching
- word-family construction
- synonym/antonym contrast
- classifier/counter/article pairing
- lexical gender and plural pairing
- context-sensitive meaning
- choose the natural word
- word-to-definition recall
- definition-to-word recall
- spelling recall
- personal sentence use

### Grammar and sentence patterns

- form choice
- single and multi-slot cloze
- sentence ordering
- chunk construction
- agreement repair
- error detection
- grammar correction
- statement/question/negative transformation
- tense/aspect/mood transformation
- substitution table
- compare two structures
- meaning-to-form choice
- form-to-meaning choice
- paraphrase
- constrained sentence generation
- grammaticality judgment with correction

### Reading

- script/grapheme recognition
- word segmentation
- sentence-to-translation matching
- title or main-idea choice
- detail location
- sequence events
- reference resolution
- meaning from context
- inference
- tone/register identification
- summary choice
- summary writing
- read-and-answer
- timed skimming
- scanning for a goal
- graded-reader passage with optional glosses

### Writing and orthography

- copy with noticing
- type from audio
- type from transliteration
- spelling repair
- diacritic insertion
- punctuation and spacing repair
- guided sentence
- sentence expansion
- sentence combining
- dialogue completion
- short message/form/email
- description
- narration
- opinion with reasons
- constrained composition
- free composition
- correction classification
- revise from feedback
- rewrite for register

### Script and character production

- watch stroke order
- identify component/radical/jamo
- character-to-reading and reading-to-character
- choose a missing or incorrect character
- assemble components
- trace
- guided draw
- free draw
- timed recall draw
- discriminate confusable forms
- handwriting-to-character recognition check
- keyboard/input-method task

Script recipes differ by language. Chinese and Japanese need character geometry and readings; Korean needs jamo/block construction; Arabic needs connected forms and directionality; Russian needs Cyrillic recognition, typing, and optional handwriting.

### Conversation and pragmatics

- best response
- dialogue ordering
- dialogue completion
- branching dialogue
- roleplay with an outcome
- information gap
- clarify or repair misunderstanding
- polite request/refusal
- register conversion
- turn-taking timing
- goal-based chat
- scenario simulation
- oral checkpoint interview

Conversation state must track scenario facts, learner goal, accepted outcomes, covered nodes, corrections, and whether the learner completed the communicative task.

### Review and metacognition

- reveal with self-rating
- delayed typed recall
- mixed-modality recall
- confusion-pair contrast
- cumulative checkpoint review
- weak-node repair
- mistake correction
- explain the distinction
- confidence-before-answer
- choose-next-focus

Self-rating may schedule review, but only an actual response supplies mastery evidence.

## Exercise progression

An exercise type has a scaffolding ladder:

```text
exposure
→ recognition
→ constrained construction
→ cued recall
→ free recall
→ contextual transfer
```

The same target should move up the ladder as evidence stabilizes. Repeating harder vocabulary in the same multiple-choice component is not genuine progression.

Example for a sentence pattern:

1. hear and select its meaning;
2. order its chunks;
3. fill one meaningful slot;
4. transform a related sentence;
5. say or write a new sentence;
6. use it to complete a real-world goal.

## Sound architecture

Sound is a core learning domain, not a TTS button added to text.

### Separate the four jobs

| Job | Purpose | It must not be used as |
| --- | --- | --- |
| TTS or recorded reference audio | provide a listening model | proof of learner pronunciation |
| STT | transcribe likely words and estimate intelligibility | phoneme-level acoustic scoring |
| Forced alignment/acoustic analysis | align audio and inspect sounds/timing | semantic evaluation |
| LLM feedback | explain measured errors in useful English | the source of invented acoustic scores |

### Audio asset model

Every reference audio asset needs:

- content hash and local cache path
- source/provider and model
- language, locale, dialect, and register
- voice/speaker ID and broad voice metadata
- exact transcript and normalized tokens
- token time ranges
- phoneme or syllable/mora time ranges when available
- sample rate, channels, codec, and duration
- speaking rate and style
- license/provenance
- validator version and quality result

The target phrase, translation, transliteration, pronunciation representation, and audio are separate aligned fields. Never overload one string with all four.

### Reference audio policy

- Prefer reviewed human audio for canonical sound lessons when licensing permits.
- Use high-quality language-appropriate TTS for generated variants.
- Generate and cache normal-speed and slow pedagogical versions; do not create “slow” audio only by crudely stretching playback.
- Include controlled voice and accent variation after the learner has a stable initial model.
- Browser `speechSynthesis` is a preview fallback, not approved graded reference audio.
- Reject silent, clipped, wrong-language, badly normalized, or transcript-mismatched assets.

### Recording pipeline

```text
Microphone permission
→ device/sample check
→ mono recording
→ silence/noise/clipping validation
→ VAD and trimming
→ normalized analysis WAV
→ STT
→ forced alignment
→ phoneme/syllable/prosody metrics
→ language-specific scorer
→ learner-facing feedback
→ evidence and optional retained recording
```

The UI should show real waveform or level data derived from the recording. Recording retention is opt-in and configurable; scores and compact features can remain after raw audio is deleted.

### Pronunciation target model

Each target stores:

- canonical display text
- normalized text
- pronunciation units: phoneme, syllable, mora, or tone-bearing syllable
- accepted regional variants
- lexical stress or tone
- phrase-level rhythm and intonation target
- known English-speaker confusions
- severity and intelligibility impact
- prerequisite sound targets

### Scoring

A speaking result should expose dimensions such as:

- completeness
- intelligibility
- segmental accuracy
- stress/tone accuracy
- rhythm/timing
- intonation/prosody
- fluency

Weights are exercise- and language-specific. A Chinese tone drill weighs tone heavily; a conversational roleplay weighs intelligibility and task completion more heavily.

Do not record a score when audio quality is insufficient. Ask for a new recording and explain why.

### Feedback

Feedback should:

1. identify one or two high-impact differences;
2. show the exact word/syllable/phoneme span;
3. compare learner and target audio;
4. provide an articulatory, rhythm, stress, or tone cue;
5. offer a smaller retry unit;
6. retest inside the original phrase.

Avoid false precision. If only transcription is available, say that the phrase was understood and label the result as intelligibility feedback.

### Language-specific sound treatment

- Chinese: tone contours, tone pairs, neutral tone, contextual changes, initials/finals.
- Japanese: mora timing, long vowels, gemination, devoicing, pitch-accent awareness.
- Korean: batchim, tenseness/aspiration, liaison, assimilation, major sound changes.
- Arabic: vowel length, emphatics, pharyngeals, gemination, dialect-specific targets.
- Russian: lexical stress, reduction, palatalization, voicing, clusters.
- German: vowel length, umlauts, `ch`, `r` variants, final devoicing.
- Spanish: taps/trills, stress, approximants, regional `s/ll/y/c/z` variation.
- French: vowel contrasts, nasal vowels, liaison, enchaînement, schwa, rhythm.
- Italian: consonant length, stress, vowel contrasts, connected speech.
- Portuguese: nasalization, vowel reduction, stress, regional `r/s`, connected speech.

### Sound accessibility and offline behavior

- Captions/transcripts can support instructions but must not be visible during a pure listening test unless requested as a hint.
- A no-microphone route can test auditory discrimination and pronunciation knowledge without pretending it tested speech.
- Offline mode uses cached audio and local Piper/Whisper when configured.
- If local acoustic scoring is unavailable, store the attempt as transcription/intelligibility evidence only.
- Hearing and speech accessibility preferences alter completion requirements and are recorded as accommodations, not failures.

## Generation contracts by exercise

Generated payloads should contain:

- stable exercise definition key/version
- curriculum and node IDs
- English instruction
- target-language stimulus
- answer specification and accepted variants
- distractors with an error rationale
- hint ladder
- explanation
- difficulty features
- media references
- grading rubric
- evidence mapping

Distractors must be generated from plausible confusion classes:

- same semantic field
- morphology/agreement error
- phonological confusion
- script confusion
- word-order error
- register/pragmatic mismatch

Random unrelated words are not useful distractors.

## Component quality requirements

Every component must:

- use pointer cursors and clear hover/focus/pressed/disabled states;
- support keyboard completion without hidden mouse-only actions;
- announce instructions, feedback, and state changes accessibly;
- never reveal an answer through layout or option length;
- lock submission while grading and prevent duplicate evidence;
- preserve the learner answer after feedback;
- expose replay, speed, and transcript hints only when allowed;
- return a typed result and evidence payload;
- survive invalid content by rejecting the session item, not fabricating UI data;
- work at the app's supported widths and fullscreen/session modes.

## Testing strategy

### Contract tests

For every definition:

- valid payload renders;
- malformed payload is rejected;
- accepted answers normalize correctly;
- distractors do not normalize to the answer;
- grading emits the expected dimensions;
- evidence maps only to relevant nodes;
- accessibility alternatives preserve objective coverage.

### Language golden sets

Maintain reviewed fixtures for every language covering:

- Unicode and punctuation
- tokenization
- accepted variants
- script direction and composition
- characteristic grammar
- common confusion pairs
- pronunciation representation
- audio transcript alignment

### Sound tests

- silence, clipping, noise, and too-short recording
- correct and deliberately incorrect target productions
- accent/voice variation
- slow and normal reference audio
- token and phoneme timing sanity
- STT disagreement versus acoustic match
- provider failure and offline fallback
- no fabricated score when analysis is unavailable

### Generation tests

- schema/property tests for all exercise definitions
- duplicate and answer-leak detection
- exactly-one-answer checks
- language and script validation
- difficulty/new-item budget
- deterministic replay by seed
- rejected candidate persistence
- approved-cache behavior under provider outage

## Implementation order

1. Add the versioned exercise definition and result contracts.
2. Turn current catalog aliases into explicit statuses: implemented, shared-surface, planned.
3. Move payload repair out of UI registries and into validators.
4. Harden deterministic grading and language-specific normalization.
5. Build the audio asset, recording-quality, and pronunciation-target models.
6. Replace transcript-only pronunciation scores with scoped intelligibility evidence, then add acoustic scoring.
7. Implement distinct Read Aloud, Shadowing, Minimal Pair, Dictation, and Open Spoken Answer components.
8. Implement real branching conversation and roleplay state.
9. Expand reading, writing, and script components.
10. Add all-language golden sets and generated-payload test suites.

## Immediate gaps to resolve

- The catalog reports planned speaking/conversation experiences as though they are implemented.
- STT-plus-LLM scores are presented as pronunciation scores.
- fallback speaking scores create false evidence.
- only Chinese and Japanese receive special generated learn seeds.
- the script unlock hook omits Korean, Arabic, and Russian.
- generic fallback exercises contain English target content.
- component validators repair structural payloads but cannot validate linguistic truth.
- catalog aliases collapse distinct evidence types onto the same implementation.
- generated content has insufficient per-exercise validator coverage.
- audio metadata, timing, quality, and cache provenance are not modeled.

These gaps should be addressed before increasing generated curriculum volume. More generated content would otherwise multiply unreliable evidence and hard-to-debug learner states.
