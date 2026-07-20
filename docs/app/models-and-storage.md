# Models and storage

The **Models & Local Files** settings section controls connectivity and user-selected local resources.

## Connection mode

Numo defaults to **Online**.

- **Online** allows Groq AI, YouTube discovery and transcripts, public book catalogs, audio artwork lookup, and remote background providers. Cached media remains available normally. When multiple Groq keys are saved, retryable authentication, quota, and provider failures rotate to the next key.
- **Offline** prevents the runtime provider router from calling remote AI providers. Media services return cached metadata where available and do not start new remote discovery or downloads. AI, speech recognition, and speech synthesis require the configured local tools.

The toggle changes routing immediately; restarting the application is not required.

## Local model paths

| Setting | Expected resource | Used for |
| --- | --- | --- |
| LLM Runner | `llama-cli`/llama.cpp executable | Local text generation |
| Local LLM | `.gguf` file | Chat, explanations, generation, and evaluation |
| Whisper Runner | whisper.cpp executable | Local speech recognition |
| Whisper Model | whisper.cpp `.bin` model | Speech transcription |
| FFmpeg | FFmpeg executable | Conversion of browser microphone recordings to mono 16 kHz WAV |
| Piper Runner | Piper executable | Local text-to-speech |
| Active Voice Model | Piper `.onnx` model | Current local TTS voice |
| Voices Folder | Directory | Storage for Piper `.onnx` and matching `.onnx.json` voice files |
| Notes Folder | Directory | Markdown and JSON mirrors of Notebook entries |

Each path can be selected with the native file/folder dialog and checked before use. Missing local configuration produces an actionable error pointing back to this section; Numo does not present synthetic AI or audio as a successful local-model result.

## Notes mirroring

When a Notes Folder is configured, new Notebook entries are written to both Markdown and JSON while the app database remains the source of truth. The **Sync** action mirrors all existing Notebook entries into the selected folder.

## Books

The existing Books Folder remains under Storage. EPUB and TXT files found there are indexed for Immersion → Readings and are read locally.
