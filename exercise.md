# Exercise System Documentation

This document describes the **current exercise system** in this codebase: components, registries, runtime flow, and AI prompts used to generate or evaluate exercise content.

## 1. High-Level Architecture

Exercises are split by domain and resolved through registries:

- `src/components/exercises/learn/registry.tsx`
- `src/components/exercises/quick/registry.tsx`
- `src/components/exercises/review/registry.tsx`
- `src/components/exercises/script/registry.tsx`
- `src/components/exercises/speak/registry.tsx`
- `src/components/exercises/write/registry.tsx`

Each registry entry defines:

- `component`: the React component to render
- `validate` / `validatePayload`: payload guard before rendering
- `grading`: `'deterministic' | 'ai' | 'hybrid'`

Invalid payloads are blocked and shown with `UnsupportedExerciseCard`.

Validation coverage is tested in:

- `src/components/exercises/exerciseRegistries.test.ts`

## 2. Shared Exercise Components

- `src/components/exercises/shared/UnsupportedExerciseCard.tsx`
  - Generic error card when exercise payload/type is invalid.
- `src/components/exercises/shared/HintSection.tsx`
  - Toggleable hint display from `distractors`/hint arrays.
- `src/components/exercises/shared/types.ts`
  - Defines `ExerciseGradingStrategy`, `ExerciseDraft`, and `EMPTY_DRAFT`.

## 3. Learn Exercises

### 3.1 Learn Base Components

- `base/OptionSelectExercise.tsx`
  - Multiple-choice style selection; emits `selectedOption`.
- `base/TextEntryExercise.tsx`
  - Free-text answer; emits `answerText`.
- `base/PairMatchExercise.tsx`
  - Left/right matching; emits `mapping` object.
- `base/TokenOrderExercise.tsx`
  - Build sentence from tokens; emits `orderedTokens`.
- `base/GroupSortExercise.tsx`
  - Assign items to groups; emits `assignment` map.

### 3.2 Learn Task Components (20 task types)

Task types come from `src/types/learningPlan.ts` (`LESSON_TASK_TYPES`) and are all mapped in `learnExerciseRegistry`.

- Pair match:
  - `match_word_meaning` -> `MatchWordMeaningExercise` -> `PairMatchExercise`
  - `match_sentence_translation` -> `MatchSentenceTranslationExercise` -> `PairMatchExercise`
- Group sort:
  - `group_words_topic` -> `GroupWordsTopicExercise` -> `GroupSortExercise`
- Option select:
  - `identify_context_meaning` -> `IdentifyContextMeaningExercise`
  - `choose_response` -> `ChooseResponseExercise`
  - `choose_verb_form` -> `ChooseVerbFormExercise`
  - `identify_sounds` -> `IdentifySoundsExercise`
  - `listen_choose_written` -> `ListenChooseWrittenExercise`
- Token order:
  - `reorder_sentence` -> `ReorderSentenceExercise`
  - `build_from_chunks` -> `BuildFromChunksExercise`
- Text entry:
  - `replace_synonym`
  - `fill_missing_word`
  - `finish_sentence_starter`
  - `complete_dialogue`
  - `read_answer_questions`
  - `transform_statement_question`
  - `correct_grammar`
  - `compare_structures`
  - `listen_repeat`
  - `explain_pronunciation_rule`

All payload normalization/repair happens in `src/components/exercises/learn/registry.tsx`.

### 3.3 Learn Runtime Page

- `src/pages/Learn/LearnSessionPage.tsx`
  - Loads runtime tasks via `createLessonSessionRuntime(...)`
  - Builds fallback payload from task prompt/answer/distractors
  - Resolves component via `resolveLearnExercise(...)`
  - Submits attempt via `submitLearnTaskAttempt(...)`

## 4. Quick Exercises

### 4.1 Quick Components

- `mcq` -> `McqQuickExercise`
- `translate` -> `TranslateQuickExercise` (uses `QuickTextAreaExercise`)
- `speak` -> `SpeakQuickExercise` (uses `QuickTextAreaExercise`)
- `match` -> `MatchQuickExercise`

Registry: `src/components/exercises/quick/registry.tsx`

### 4.2 Quick Runtime Pages

- `src/pages/Practice/PracticeQuickPage.tsx`
  - Generates session (4 items) through `generateSession(...)`
  - Refreshes one item through `regenerateExercise(...)`
- `src/pages/Exercises/ExercisesPage.tsx`
  - DEV infinite mode; generates one item repeatedly via `generateInfiniteExercise(...)`

## 5. Review Exercises

### 5.1 Review Components

- `reveal` -> `RevealReviewExercise`
- `multiple` -> `MultipleReviewExercise`
- `write` -> `WriteReviewExercise`
- `build` -> `BuildReviewExercise`
- `tf` -> `TrueFalseReviewExercise`
- `tfj` -> `TrueFalseJustifyReviewExercise`

Registry: `src/components/exercises/review/registry.tsx`

### 5.2 Review Runtime Page

- `src/pages/Review/ReviewSession.tsx`
  - Builds review cards from persisted queue (`startReviewSession(mode).queue`)
  - Uses `fromItem(...)` to derive card types and prompts
  - Uses AI checks only for `write` and `tfj` validators

## 6. Script Exercises

### 6.1 Script Components

All modes render `ScriptCanvasExercise` + mode note:

- `watch` -> `WatchScriptExercise`
- `trace` -> `TraceScriptExercise`
- `guided_draw` -> `GuidedDrawScriptExercise`
- `free_draw` -> `FreeDrawScriptExercise`
- `timed_recall_draw` -> `TimedRecallDrawScriptExercise`

Registry: `src/components/exercises/script/registry.tsx`

### 6.2 Script Runtime Page

- `src/pages/ScriptPractice/ScriptPracticePage.tsx`
  - Enabled for `zh` and `ja`
  - Stores stroke capture payload and logs attempt
  - Current scoring intentionally deferred (capture/state focused)

## 7. Speak Exercises

### 7.1 Speak Components

- `guided_repeat` -> `GuidedRepeatSpeakExercise`

Registry: `src/components/exercises/speak/registry.tsx`

### 7.2 Speak Runtime Page

- `src/pages/Speak/SpeakSession.tsx`
  - Selects prompt from `SPEAKING_PROMPTS` by language and session hash
  - Records audio, transcribes speech, requests AI pronunciation feedback
  - Logs attempt and stores transcript/feedback

## 8. Write Exercises

### 8.1 Write Components

- `draft_composition` -> `DraftCompositionExercise`
- `correction_review` -> `CorrectionReviewExercise`

Registry: `src/components/exercises/write/registry.tsx`

### 8.2 Write Runtime Page

- `src/pages/Write/WriteEditor.tsx`
  - User writes free-form text
  - On analysis, sends text to AI for correction list
  - Displays correction panel and logs writing attempt

## 9. AI Prompts Used (Current)

## 9.1 Quick Session Generation (`src/lib/sessionEngine.ts`)

### A) `generateSession(...)` prompt

```text
You are generating language-learning practice data.
Create content for language code "{languageCode}" ({languageName}) and mode "{mode}".
Source context is "{source}".

Return ONLY a valid JSON object with this exact shape:
{
  "practiceItems": [
    {
      "id": "string",
      "type": "mcq|translate|speak|match",
      "prompt": "string",
      "answer": "string",
      "options": ["string", "string", "string", "string"], // required only for mcq
      "pairs": [{"left":"string","right":"string"}] // required only for match
    }
  ]
}

Rules:
- Generate exactly 4 items.
- Include exactly 1 item of type "match" with 4-6 pairs.
- Every prompt/question/instruction MUST be written in English.
- All prompts and answers must be relevant to {languageName}.
- Do not default to Spanish unless the language is Spanish.
- Keep each prompt short and practical.
- For mcq items, provide 4 options and ensure answer matches one option exactly.
- For match items, put placeholder answer as "Pair matching" and provide clear, unique pairs.
- Output JSON only.
```

### B) `regenerateExercise(...)` prompt

```text
You are regenerating a single language-learning exercise.
Language code: "{languageCode}" ({languageName})
Mode: "{mode}"
Source context: "{source}"
Required type: "{currentItem.type}"

Current exercise (must be replaced with a different one):
{JSON.stringify(currentItem)}

Return ONLY a valid JSON object with this exact shape:
{
  "practiceItems": [
    {
      "id": "string",
      "type": "mcq|translate|speak|match",
      "prompt": "string",
      "answer": "string",
      "options": ["string", "string", "string", "string"],
      "pairs": [{"left":"string","right":"string"}]
    }
  ]
}

Rules:
- Return exactly 1 item.
- The item MUST be type "{currentItem.type}".
- The prompt/question/instruction MUST be written in English.
- The prompt and content MUST be meaningfully different from the current exercise.
- If type is "mcq", include 4 options and make answer match one option exactly.
- If type is "match", include 4-6 pairs and set answer to "Pair matching".
- Output JSON only.
```

### C) `generateInfiniteExercise(...)` prompt

```text
You are generating a single language-learning quick exercise.
Language code: "{languageCode}" ({languageName})
Mode: "{mode}"
Source context: "{source}"
{conceptText}

Return ONLY a valid JSON object with this exact shape:
{
  "practiceItems": [
    {
      "id": "string",
      "type": "mcq|translate|speak|match",
      "prompt": "string",
      "answer": "string",
      "options": ["string", "string", "string", "string"],
      "pairs": [{"left":"string","right":"string"}]
    }
  ]
}

Rules:
- Generate exactly 1 item.
- {requiredTypeText}
- The prompt/question/instruction MUST be written in English.
- Keep prompt practical, short, and unambiguous.
- For "mcq", include exactly 4 options and ensure answer matches one option exactly.
- For "match", include 4-6 clear pairs and set answer to "Pair matching".
- Do not default to Spanish unless the language is Spanish.
- Output JSON only.
```

## 9.2 Learn Runtime Generation + Grading (`src/services/learningPlanService.ts`)

### A) Generate runtime task variants

```text
Language code: {languageCode}
Generate runtime task variants from this template list.
Return JSON only:
{"tasks":[{"templateId":"...","prompt":"...","answer":"...","instruction":"...","distractors":["..."],"payload":{},"gradingMode":"deterministic|ai|hybrid"}]}

Templates:
{JSON.stringify(payload)}

Rules:
- Keep one output per input templateId.
- Respect task intent and taskType.
- Keep prompts practical and short.
- "payload" is optional and must contain task-specific exercise data.
- "gradingMode" is optional.
- The "instruction" field MUST exclusively be in English.
- Use language-specific examples for {languageCode}.
```

### B) AI grading prompt for open-ended learn tasks

```text
Grade a learner task submission.
Task type: {taskType}
Expected answer: {expectedAnswer}
Learner answer: {learnerAnswer}
Payload: {JSON.stringify(payload)}
Structured response: {JSON.stringify(structuredResponse)}

Return JSON only:
{"isCorrect": boolean, "score": number, "feedback": "string"}
```

## 9.3 Review AI Checks (`src/pages/Review/ReviewSession.tsx`)

### A) `write` validation

```text
Expected: {expected}
Answer: {user}
Return JSON: {"correct": boolean, "reason": string}
```

### B) `tfj` validation

```text
Expected bool: {expectedBool}
User bool: {userBool}
User reason: {reason}
Reference: {expectedReason}
Return JSON: {"correct": boolean, "reason": string}
```

## 9.4 Speak Pronunciation Feedback (`src/pages/Speak/SpeakSession.tsx`)

```text
The learner language is: "{activeLanguage.name}" ({activeLanguage.code})
Target phrase: "{selectedPrompt.target}"
The user actually said: "{text}"
Evaluate their pronunciation accuracy and fluency (0-100%).
Provide a short helpful tip in English and one corrective cue.
Format your response as JSON: {"accuracy": number, "fluency": number, "tip": "string"}
```

## 9.5 Write Analysis Prompt (`src/pages/Write/WriteEditor.tsx`)

```text
Analyze the following {activeLanguage.name} text for grammar, spelling, and style errors.
Provide a list of corrections. For each correction, include:
- original: the problematic part
- corrected: the fixed part (if same as original, type is "correct")
- type: "grammar", "spelling", "correct", or "style"
- explanation: a short helpful tip in English.

Text: "{text}"

Format your response as a JSON array of objects:
[{"original": "...", "corrected": "...", "type": "...", "explanation": "..."}]
```

## 10. Fallback Behavior

Fallbacks are implemented throughout:

- Quick generation fallback session/item in `src/lib/sessionEngine.ts`
- Learn runtime falls back to template-based tasks in `src/services/learningPlanService.ts`
- Review AI checks (`write`, `tfj`) fallback to deterministic heuristics on parse/API failure
- Speak and Write pages include fallback feedback/results when AI parsing fails

## 11. Notes on Current State

- Registry test asserts coverage for all current exercise types.
- Learn tasks are strongly typed by `TaskType` and must resolve through payload normalization.
- Review queue is DB-backed; no synthetic review cards are created when queue is empty.
- Script practice currently captures interactions; full stroke-order/shape scoring is deferred.
