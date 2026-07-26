use base64::{engine::general_purpose::STANDARD, Engine as _};
use reqwest::header::CONTENT_TYPE;
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::State;

struct ConnectivityState {
    online: AtomicBool,
}

impl ConnectivityState {
    fn new() -> Self {
        Self {
            online: AtomicBool::new(true),
        }
    }

    fn require_online(&self) -> Result<(), String> {
        if self.online.load(Ordering::SeqCst) {
            Ok(())
        } else {
            Err("Network access is disabled while Numo is in offline mode.".to_string())
        }
    }
}

struct TemporaryFiles(Vec<PathBuf>);

impl TemporaryFiles {
    fn new(paths: Vec<PathBuf>) -> Self {
        Self(paths)
    }
}

impl Drop for TemporaryFiles {
    fn drop(&mut self) {
        for path in &self.0 {
            let _ = fs::remove_file(path);
        }
    }
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn set_connectivity_mode(online: bool, state: State<'_, ConnectivityState>) {
    state.online.store(online, Ordering::SeqCst);
}

fn require_file(path: &str, label: &str, extensions: &[&str]) -> Result<PathBuf, String> {
    let resolved = PathBuf::from(path);
    if !resolved.is_file() {
        return Err(format!("{} does not exist or is not a file.", label));
    }
    if !extensions.is_empty() {
        let extension = resolved
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();
        if !extensions.iter().any(|allowed| extension == *allowed) {
            return Err(format!(
                "{} must be a .{} file.",
                label,
                extensions.join(" or .")
            ));
        }
    }
    Ok(resolved)
}

fn temporary_path(label: &str, extension: &str) -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    std::env::temp_dir().join(format!(
        "numo-{}-{}-{}.{}",
        label,
        std::process::id(),
        nonce,
        extension
    ))
}

fn command_failure(label: &str, output: &std::process::Output) -> String {
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    if stderr.is_empty() {
        format!("{} exited with status {}.", label, output.status)
    } else {
        format!("{} failed: {}", label, stderr)
    }
}

#[tauri::command]
fn validate_local_path(
    path: String,
    kind: String,
    extensions: Vec<String>,
) -> Result<String, String> {
    let resolved = PathBuf::from(&path);
    let valid = if kind == "directory" {
        resolved.is_dir()
    } else {
        resolved.is_file()
    };
    if !valid {
        return Err(format!("Selected {} does not exist.", kind));
    }
    if kind == "directory" {
        let probe = resolved.join(format!(".numo-write-test-{}", std::process::id()));
        fs::write(&probe, b"numo")
            .map_err(|error| format!("Selected directory is not writable: {}", error))?;
        fs::remove_file(&probe)
            .map_err(|error| format!("Could not clean up the directory write test: {}", error))?;
    }
    if kind == "file" {
        let size = fs::metadata(&resolved)
            .map_err(|error| format!("Could not inspect selected file: {}", error))?
            .len();
        if size == 0 {
            return Err("Selected file is empty.".to_string());
        }
        let actual = resolved
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();
        if !extensions.is_empty()
            && !extensions
                .iter()
                .any(|value| value.to_ascii_lowercase() == actual)
        {
            return Err(format!("Expected one of: .{}.", extensions.join(", .")));
        }
        if actual == "onnx" {
            let config = PathBuf::from(format!("{}.json", resolved.to_string_lossy()));
            if !config.is_file() {
                return Err(format!(
                    "Piper voice configuration is missing: {}",
                    config.to_string_lossy()
                ));
            }
        }
    }
    Ok(resolved.to_string_lossy().to_string())
}

#[tauri::command]
fn detect_local_tool(candidates: Vec<String>) -> Result<String, String> {
    let path_value = std::env::var_os("PATH").unwrap_or_default();
    let directories = std::env::split_paths(&path_value).collect::<Vec<_>>();
    #[cfg(windows)]
    let suffixes = ["", ".exe", ".cmd", ".bat"];
    #[cfg(not(windows))]
    let suffixes = [""];

    for candidate in candidates {
        let direct = PathBuf::from(&candidate);
        if direct.is_file() {
            return Ok(direct.to_string_lossy().to_string());
        }
        for directory in &directories {
            for suffix in &suffixes {
                let filename = if candidate.to_ascii_lowercase().ends_with(*suffix) {
                    candidate.clone()
                } else {
                    format!("{}{}", candidate, *suffix)
                };
                let path = directory.join(filename);
                if path.is_file() {
                    return Ok(path.to_string_lossy().to_string());
                }
            }
        }
    }
    Err("No compatible executable was found on PATH.".to_string())
}

#[tauri::command]
async fn run_local_llm(
    executable_path: String,
    model_path: String,
    prompt: String,
    max_tokens: u32,
    temperature: f32,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let executable = require_file(&executable_path, "llama.cpp executable", &[])?;
        let model = require_file(&model_path, "LLM model", &["gguf"])?;
        let prompt_path = temporary_path("llm-prompt", "txt");
        let _temporary_files = TemporaryFiles::new(vec![prompt_path.clone()]);
        fs::write(&prompt_path, prompt.as_bytes())
            .map_err(|error| format!("Could not create the local prompt: {}", error))?;

        let output = Command::new(executable)
            .arg("-m")
            .arg(model)
            .arg("-f")
            .arg(&prompt_path)
            .arg("-n")
            .arg(max_tokens.clamp(16, 8192).to_string())
            .arg("--temp")
            .arg(
                if temperature.is_finite() {
                    temperature.clamp(0.0, 2.0)
                } else {
                    0.5
                }
                .to_string(),
            )
            .arg("--no-display-prompt")
            .output()
            .map_err(|error| format!("Could not start llama.cpp: {}", error));
        let output = output?;
        if !output.status.success() {
            return Err(command_failure("llama.cpp", &output));
        }
        let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if text.is_empty() {
            return Err("The local LLM returned an empty response.".to_string());
        }
        Ok(text)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn run_local_stt(
    executable_path: String,
    model_path: String,
    ffmpeg_path: String,
    audio_bytes: Vec<u8>,
    language: String,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let whisper = require_file(&executable_path, "Whisper executable", &[])?;
        let model = require_file(&model_path, "Whisper model", &["bin"])?;
        let ffmpeg = require_file(&ffmpeg_path, "FFmpeg executable", &[])?;
        if audio_bytes.is_empty() {
            return Err("The recording is empty.".to_string());
        }

        let input_path = temporary_path("speech-input", "webm");
        let wav_path = temporary_path("speech-16khz", "wav");
        let output_prefix = temporary_path("speech-transcript", "result");
        let transcript_path = PathBuf::from(format!("{}.txt", output_prefix.to_string_lossy()));
        let _temporary_files = TemporaryFiles::new(vec![
            input_path.clone(),
            wav_path.clone(),
            transcript_path.clone(),
        ]);
        fs::write(&input_path, audio_bytes)
            .map_err(|error| format!("Could not stage the recording: {}", error))?;

        let conversion = Command::new(ffmpeg)
            .arg("-y")
            .arg("-i")
            .arg(&input_path)
            .args(["-ar", "16000", "-ac", "1"])
            .arg(&wav_path)
            .output()
            .map_err(|error| format!("Could not start FFmpeg: {}", error))?;
        if !conversion.status.success() {
            return Err(command_failure("FFmpeg", &conversion));
        }

        let mut command = Command::new(whisper);
        command
            .arg("-m")
            .arg(model)
            .arg("-f")
            .arg(&wav_path)
            .arg("-otxt")
            .arg("-of")
            .arg(&output_prefix);
        if !language.trim().is_empty() && language != "auto" {
            command.arg("-l").arg(language);
        }
        let output = command
            .output()
            .map_err(|error| format!("Could not start Whisper: {}", error))?;
        if !output.status.success() {
            return Err(command_failure("Whisper", &output));
        }
        let text = fs::read_to_string(&transcript_path)
            .map_err(|error| format!("Could not read the Whisper transcript: {}", error));
        let text = text?.trim().to_string();
        if text.is_empty() {
            return Err("Whisper returned an empty transcript.".to_string());
        }
        Ok(text)
    })
    .await
    .map_err(|error| error.to_string())?
}

/// Finds a Piper voice model for `language` alongside `configured`.
///
/// Piper voices are named like `es_ES-sharvard-medium.onnx`, so a language is
/// matched by the file-name prefix. Returns `None` when nothing matches, leaving
/// the caller on its configured voice.
fn resolve_voice_for_language(configured: &Path, language: &str) -> Option<PathBuf> {
    let code = language.split('-').next()?.to_lowercase();
    if code.is_empty() {
        return None;
    }

    let configured_name = configured.file_name()?.to_string_lossy().to_lowercase();
    if configured_name.starts_with(&format!("{}_", code)) || configured_name.starts_with(&format!("{}-", code)) {
        return None; // Already the right language.
    }

    let directory = configured.parent()?;
    let entries = std::fs::read_dir(directory).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|value| value.to_str()) != Some("onnx") {
            continue;
        }
        let name = path.file_name()?.to_string_lossy().to_lowercase();
        if !(name.starts_with(&format!("{}_", code)) || name.starts_with(&format!("{}-", code))) {
            continue;
        }
        // A voice is only usable with its JSON config beside it.
        let config = PathBuf::from(format!("{}.json", path.to_string_lossy()));
        if config.is_file() {
            return Some(path);
        }
    }
    None
}

/// Synthesizes speech with a local Piper voice.
///
/// `language` is the language of the text, when the caller knows it. Piper voice
/// models are per-language, so if a sibling model carrying that language tag sits
/// next to the configured voice it is used instead — otherwise a Japanese prompt
/// gets read aloud by an English voice. Falls back to the configured voice
/// whenever no such model is present.
#[tauri::command]
async fn run_local_tts(
    executable_path: String,
    voice_model_path: String,
    text: String,
    language: Option<String>,
) -> Result<Vec<u8>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let piper = require_file(&executable_path, "Piper executable", &[])?;
        let configured_voice = require_file(&voice_model_path, "Piper voice model", &["onnx"])?;
        let voice = language
            .as_deref()
            .and_then(|code| resolve_voice_for_language(&configured_voice, code))
            .unwrap_or(configured_voice);
        let voice_config = PathBuf::from(format!("{}.json", voice.to_string_lossy()));
        if !voice_config.is_file() {
            return Err(format!(
                "Piper voice configuration is missing: {}",
                voice_config.to_string_lossy()
            ));
        }
        if text.trim().is_empty() {
            return Err("Text to synthesize is empty.".to_string());
        }
        let output_path = temporary_path("piper-speech", "wav");
        let _temporary_files = TemporaryFiles::new(vec![output_path.clone()]);
        let mut child = Command::new(piper)
            .arg("--model")
            .arg(voice)
            .arg("--output_file")
            .arg(&output_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|error| format!("Could not start Piper: {}", error))?;
        child
            .stdin
            .as_mut()
            .ok_or_else(|| "Could not open Piper input.".to_string())?
            .write_all(text.as_bytes())
            .map_err(|error| format!("Could not send text to Piper: {}", error))?;
        let output = child
            .wait_with_output()
            .map_err(|error| format!("Could not wait for Piper: {}", error))?;
        if !output.status.success() {
            return Err(command_failure("Piper", &output));
        }
        let audio = fs::read(&output_path)
            .map_err(|error| format!("Could not read Piper audio: {}", error));
        audio
    })
    .await
    .map_err(|error| error.to_string())?
}

fn validate_remote_url(url: &str) -> Result<(), String> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("Only http/https URLs are allowed.".to_string());
    }
    Ok(())
}

#[tauri::command]
async fn proxy_fetch_text(
    url: String,
    state: State<'_, ConnectivityState>,
) -> Result<String, String> {
    state.require_online()?;
    validate_remote_url(&url)?;

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(25))
        .build()
        .map_err(|error| error.to_string())?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|error| error.to_string())?;

    response.text().await.map_err(|error| error.to_string())
}

#[tauri::command]
async fn proxy_fetch_data_url(
    url: String,
    state: State<'_, ConnectivityState>,
) -> Result<String, String> {
    state.require_online()?;
    validate_remote_url(&url)?;

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|error| error.to_string())?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|error| error.to_string())?;

    let content_type = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|header| header.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();

    let bytes = response.bytes().await.map_err(|error| error.to_string())?;
    let encoded = STANDARD.encode(bytes);

    Ok(format!("data:{};base64,{}", content_type, encoded))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct YoutubeCaptionTrack {
    language: String,
    format: String,
    content: String,
}

fn valid_youtube_video_id(video_id: &str) -> bool {
    !video_id.is_empty()
        && video_id.len() <= 32
        && video_id.chars().all(|character| {
            character.is_ascii_alphanumeric() || character == '-' || character == '_'
        })
}

fn find_caption_url(metadata: &Value, language_prefix: &str) -> Option<(String, String, String)> {
    for collection_name in ["subtitles", "automatic_captions"] {
        let Some(collection) = metadata.get(collection_name).and_then(Value::as_object) else {
            continue;
        };
        let Some(language_key) = collection
            .keys()
            .find(|language| *language == language_prefix)
            .or_else(|| {
                collection
                    .keys()
                    .find(|language| language.starts_with(language_prefix))
            })
        else {
            continue;
        };
        let Some(formats) = collection.get(language_key).and_then(Value::as_array) else {
            continue;
        };
        let Some(selected) = formats
            .iter()
            .find(|format| format.get("ext").and_then(Value::as_str) == Some("json3"))
            .or_else(|| formats.iter().find(|format| format.get("url").is_some()))
        else {
            continue;
        };
        let Some(url) = selected.get("url").and_then(Value::as_str) else {
            continue;
        };
        let format = selected
            .get("ext")
            .and_then(Value::as_str)
            .unwrap_or("json3")
            .to_string();
        return Some((language_key.to_string(), format, url.to_string()));
    }
    None
}

#[tauri::command]
async fn fetch_youtube_captions(
    video_id: String,
    state: State<'_, ConnectivityState>,
) -> Result<Vec<YoutubeCaptionTrack>, String> {
    state.require_online()?;
    if !valid_youtube_video_id(&video_id) {
        return Err("Invalid YouTube video ID.".to_string());
    }

    let watch_url = format!("https://www.youtube.com/watch?v={}", video_id);
    let output = tauri::async_runtime::spawn_blocking(move || {
        Command::new("yt-dlp")
            .args([
                "--dump-single-json",
                "--skip-download",
                "--no-playlist",
                "--no-warnings",
                &watch_url,
            ])
            .output()
    })
    .await
    .map_err(|error| error.to_string())?
    .map_err(|error| format!("Could not start yt-dlp: {}", error))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    let metadata: Value =
        serde_json::from_slice(&output.stdout).map_err(|error| error.to_string())?;
    let mut candidates = Vec::new();
    if let Some(track) =
        find_caption_url(&metadata, "es-orig").or_else(|| find_caption_url(&metadata, "es"))
    {
        candidates.push(track);
    }
    if let Some(track) = find_caption_url(&metadata, "en") {
        candidates.push(track);
    }
    if candidates.is_empty() {
        return Ok(Vec::new());
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(25))
        .build()
        .map_err(|error| error.to_string())?;
    let mut tracks = Vec::new();
    for (language, format, url) in candidates {
        let content = client
            .get(url)
            .send()
            .await
            .map_err(|error| error.to_string())?
            .text()
            .await
            .map_err(|error| error.to_string())?;
        tracks.push(YoutubeCaptionTrack {
            language,
            format,
            content,
        });
    }
    Ok(tracks)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ConnectivityState::new())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            set_connectivity_mode,
            validate_local_path,
            detect_local_tool,
            run_local_llm,
            run_local_stt,
            run_local_tts,
            proxy_fetch_text,
            proxy_fetch_data_url,
            fetch_youtube_captions
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn connectivity_state_blocks_network_when_offline() {
        let state = ConnectivityState::new();
        assert!(state.require_online().is_ok());
        state.online.store(false, Ordering::SeqCst);
        assert!(state.require_online().is_err());
    }

    #[test]
    fn remote_url_validation_rejects_non_http_protocols() {
        assert!(validate_remote_url("https://example.com").is_ok());
        assert!(validate_remote_url("http://example.com").is_ok());
        assert!(validate_remote_url("file:///secret.txt").is_err());
        assert!(validate_remote_url("javascript:alert(1)").is_err());
    }

    #[test]
    fn temporary_files_are_removed_on_drop() {
        let path = temporary_path("cleanup-test", "tmp");
        fs::write(&path, b"test").expect("create temporary test file");
        {
            let _files = TemporaryFiles::new(vec![path.clone()]);
            assert!(path.is_file());
        }
        assert!(!path.exists());
    }

    #[test]
    fn tool_detection_accepts_an_explicit_executable_path() {
        let executable = std::env::current_exe().expect("current executable");
        let detected = detect_local_tool(vec![executable.to_string_lossy().to_string()])
            .expect("detect explicit executable");
        assert_eq!(PathBuf::from(detected), executable);
    }

    #[test]
    fn piper_voice_validation_requires_the_json_sidecar() {
        let model = temporary_path("voice-validation", "onnx");
        let config = PathBuf::from(format!("{}.json", model.to_string_lossy()));
        let _temporary_files = TemporaryFiles::new(vec![model.clone(), config.clone()]);
        fs::write(&model, b"model").expect("write model");

        let missing = validate_local_path(
            model.to_string_lossy().to_string(),
            "file".to_string(),
            vec!["onnx".to_string()],
        );
        assert!(missing.is_err());

        fs::write(&config, b"{}").expect("write voice config");
        let valid = validate_local_path(
            model.to_string_lossy().to_string(),
            "file".to_string(),
            vec!["onnx".to_string()],
        );
        assert!(valid.is_ok());
    }
}
