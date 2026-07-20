import { invoke, isTauri } from '@tauri-apps/api/core';
import { requireOnline } from '../services/localRuntimeSettings';

function ensureHttpUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported URL protocol: ${parsed.protocol}`);
  }
  return parsed.toString();
}

export async function fetch_text_with_fallback(url: string): Promise<string> {
  requireOnline('Remote content');
  const normalized = ensureHttpUrl(url);

  if (isTauri()) {
    return invoke<string>('proxy_fetch_text', { url: normalized });
  }

  const response = await fetch(normalized);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.text();
}

export async function fetch_json_with_fallback<T>(url: string): Promise<T> {
  const text = await fetch_text_with_fallback(url);
  return JSON.parse(text) as T;
}

export async function fetch_data_url_with_fallback(url: string): Promise<string> {
  requireOnline('Remote media');
  const normalized = ensureHttpUrl(url);

  if (isTauri()) {
    return invoke<string>('proxy_fetch_data_url', { url: normalized });
  }

  return normalized;
}

export const fetchTextWithFallback = fetch_text_with_fallback;
export const fetchJsonWithFallback = fetch_json_with_fallback;
export const fetchDataUrlWithFallback = fetch_data_url_with_fallback;
