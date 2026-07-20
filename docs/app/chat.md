# Chat

Chat is the conversational practice surface at `/chat`. It uses the learner's currently active learning language and accepts messages written naturally in English or in that target language.

The page uses one full-width conversation surface. Messages scroll independently while the composer remains anchored to the bottom. New Chat and Chat Settings are available in the top-right page actions. The composer stays focused on writing and sending.

## Chat settings

The top-right Settings action opens a conversation-specific modal; it does not navigate to application Settings. Preferences are persisted locally and include:

- Assistant mode/style.
- Chat font size.
- Brief, balanced, or detailed response length.
- Visibility of target-language text.
- Visibility of word-level pronunciation/spelling.
- Visibility of the complete English meaning.
- Progression memory.
- Notebook retrieval.

Progression memory retrieves a compact snapshot of the active language's real onboarding level, goal, focus, preferred difficulty, study schedule, XP, streak, daily minutes, review counts, speaking attempts, and writing activity. Notebook retrieval optionally adds a small recent set of learner-saved terms. Both are assembled locally for each request. If progression memory is disabled, none of this learner state is included in the AI prompt.

## Assistant response format

Every Echo response has three visible layers:

1. A concise, natural response in the active learning language.
2. A pronunciation guide directly below every displayed word.
3. A separate English meaning for the complete response.

Pronunciation follows the writing system:

- Chinese uses Hanyu Pinyin with tone marks.
- Japanese uses Hepburn romanization.
- Korean uses Revised Romanization.
- Russian and Arabic use readable Latin transliteration.
- Latin-script languages use an English-readable phonetic guide rather than a word translation.

The AI returns a structured JSON response. The app validates that the target text, English meaning, word list, and pronunciation for each real word are present. Malformed or incomplete responses receive one automatic repair attempt before the request is shown as failed.

Changing the active learning language clears the visible conversation so replies and pronunciation data from different languages are not mixed in one thread.
