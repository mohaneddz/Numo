use base64::{engine::general_purpose::STANDARD, Engine as _};
use reqwest::header::CONTENT_TYPE;
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
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
    if kind == "file" && !extensions.is_empty() {
        let actual = resolved
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();
        if !extensions
            .iter()
            .any(|value| value.to_ascii_lowercase() == actual)
        {
            return Err(format!("Expected one of: .{}.", extensions.join(", .")));
        }
    }
    Ok(resolved.to_string_lossy().to_string())
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
        let _ = fs::remove_file(&prompt_path);
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
            let _ = fs::remove_file(&input_path);
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
        let _ = fs::remove_file(&input_path);
        let _ = fs::remove_file(&wav_path);
        if !output.status.success() {
            let _ = fs::remove_file(&transcript_path);
            return Err(command_failure("Whisper", &output));
        }
        let text = fs::read_to_string(&transcript_path)
            .map_err(|error| format!("Could not read the Whisper transcript: {}", error));
        let _ = fs::remove_file(&transcript_path);
        let text = text?.trim().to_string();
        if text.is_empty() {
            return Err("Whisper returned an empty transcript.".to_string());
        }
        Ok(text)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn run_local_tts(
    executable_path: String,
    voice_model_path: String,
    text: String,
) -> Result<Vec<u8>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let piper = require_file(&executable_path, "Piper executable", &[])?;
        let voice = require_file(&voice_model_path, "Piper voice model", &["onnx"])?;
        if text.trim().is_empty() {
            return Err("Text to synthesize is empty.".to_string());
        }
        let output_path = temporary_path("piper-speech", "wav");
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
            let _ = fs::remove_file(&output_path);
            return Err(command_failure("Piper", &output));
        }
        let audio = fs::read(&output_path)
            .map_err(|error| format!("Could not read Piper audio: {}", error));
        let _ = fs::remove_file(&output_path);
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
async fn proxy_fetch_text(url: String) -> Result<String, String> {
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
async fn proxy_fetch_data_url(url: String) -> Result<String, String> {
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
async fn fetch_youtube_captions(video_id: String) -> Result<Vec<YoutubeCaptionTrack>, String> {
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
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            validate_local_path,
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
