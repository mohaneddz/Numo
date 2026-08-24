# Models and storage

The **Models & Storage** settings section controls connectivity and user-selected local resources.

## Connection mode

Numo defaults to **Online**.

- **Online** allows Groq AI, YouTube discovery and transcripts, public book catalogs, audio artwork lookup, and remote background providers. Cached media remains available normally. When multiple Groq keys are saved, retryable authentication, quota, and provider failures rotate to the next key.
- **Offline** prevents the runtime provider router from calling remote AI providers. Media services return cached metadata where available and do not start new remote discovery or downloads. AI, speech recognition, and speech synthesis require the configured local tools.

The toggle changes routing immediately; restarting the application is not required. The desktop backend also keeps its own connectivity flag, so proxy fetches and YouTube caption commands cannot bypass Offline mode.

## Online provider configuration

AI Providers stores one or more Groq keys together with the HTTPS base URL and the selected chat, speech-recognition, voice, and voice-persona model names. These values are read at request time, so changing a model does not require restarting Numo. Retryable authentication, quota, and provider errors rotate to the next saved key.

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

Each path can be selected with the native file/folder dialog and validated before use. Executables can also be detected from `PATH`. Directory validation includes a real write/delete probe, model files must be non-empty, and a Piper voice is rejected when its matching `.onnx.json` file is absent.

The runtime panel provides three real probes:

- Load the GGUF and generate a short local LLM response.
- Generate and play a local Piper WAV.
- Run a full Piper → FFmpeg → Whisper speech round trip.

Missing or incompatible local configuration produces an actionable error; Numo does not present synthetic AI or audio as a successful local-model result.

The Voices Folder is scanned for `.onnx` files. Only voices with their matching `.onnx.json` configuration are selectable as ready voices.

## Notes mirroring

When a Notes Folder is configured, new Notebook entries are written to both Markdown and JSON while the app database remains the source of truth. The **Sync** action mirrors all existing Notebook entries into the selected folder.

## Books

The existing Books Folder remains under Storage. EPUB and TXT files found there are indexed for Immersion → Readings and are read locally. Storage also shows the real operating-system app-data path rather than a placeholder path or fabricated size.
