use base64::{engine::general_purpose::STANDARD, Engine as _};
use reqwest::header::CONTENT_TYPE;
use std::time::Duration;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            proxy_fetch_text,
            proxy_fetch_data_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
