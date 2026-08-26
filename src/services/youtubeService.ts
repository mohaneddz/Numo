import type { ImmersionResource } from '../pages/Immerse/immersionCatalog';
import { isOnlineMode, requireOnline } from './localRuntimeSettings';

const SETTINGS_STORAGE_KEY = 'numo_settings_state_v1';
const CACHE_STORAGE_KEY = 'numo_youtube_immersion_cache_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface StoredSettings {
  integrations?: {
    'YouTube API Key'?: string;
    'YouTube Region'?: string;
  };
}

interface YouTubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: {
      maxres?: { url?: string };
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
  error?: { message?: string };
}

interface YouTubeVideosResponse {
  items?: Array<{
    id?: string;
    contentDetails?: { duration?: string };
  }>;
  error?: { message?: string };
}

export interface YouTubeResourceMetadata {
  resourceId: string;
  videoId: string;
  title: string;
  channel: string;
  description: string;
  publishedAt?: string;
  durationSeconds?: number;
  thumbnailUrl: string;
  watchUrl: string;
}

interface YouTubeCache {
  createdAt: number;
  keyFingerprint: string;
  resources: Record<string, YouTubeResourceMetadata>;
}

function readSettings(): StoredSettings {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}') as StoredSettings;
  } catch {
    return {};
  }
}

export function getYouTubeConfiguration(): { apiKey: string; region: string } {
  const settings = readSettings();
  const environmentKey = (import.meta.env.VITE_YOUTUBE_API_KEY ?? '').trim();
  return {
    apiKey: settings.integrations?.['YouTube API Key']?.trim() || environmentKey,
    region: settings.integrations?.['YouTube Region']?.trim() || 'US',
  };
}

function keyFingerprint(apiKey: string): string {
  if (!apiKey) return '';
  return `${apiKey.slice(0, 4)}:${apiKey.slice(-4)}:${apiKey.length}`;
}

function readCache(apiKey: string): YouTubeCache | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_STORAGE_KEY) || 'null') as YouTubeCache | null;
    if (!parsed) return null;
    if (parsed.keyFingerprint !== keyFingerprint(apiKey)) return null;
    if (Date.now() - parsed.createdAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(apiKey: string, resources: Record<string, YouTubeResourceMetadata>) {
  const cache: YouTubeCache = {
    createdAt: Date.now(),
    keyFingerprint: keyFingerprint(apiKey),
    resources,
  };
  localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
}

function decodeYouTubeText(value: string): string {
  if (typeof document === 'undefined') return value;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

export function getCachedYouTubeMetadata(resourceId: string): YouTubeResourceMetadata | null {
  const { apiKey } = getYouTubeConfiguration();
  if (!apiKey) return null;
  return readCache(apiKey)?.resources[resourceId] ?? null;
}

async function searchCategory(
  apiKey: string,
  region: string,
  category: string,
  kind: ImmersionResource['kind'],
  count: number,
): Promise<YouTubeSearchItem[]> {
  const endpoint = new URL('https://www.googleapis.com/youtube/v3/search');
  endpoint.searchParams.set('part', 'snippet');
  endpoint.searchParams.set('type', 'video');
  endpoint.searchParams.set('safeSearch', 'strict');
  endpoint.searchParams.set('videoEmbeddable', 'true');
  endpoint.searchParams.set('maxResults', String(Math.min(10, count)));
  endpoint.searchParams.set('regionCode', region);
  endpoint.searchParams.set('relevanceLanguage', 'es');
  const query = kind === 'audio'
    ? category === 'Public-Domain Audiobooks'
      ? 'audiolibro completo español dominio público'
      : `podcast español ${category} episodio`
    : `Spanish ${category} authentic language`;
  endpoint.searchParams.set('q', query);
  endpoint.searchParams.set('key', apiKey);

  const response = await fetch(endpoint.toString());
  const payload = await response.json() as YouTubeSearchResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message || `YouTube API returned HTTP ${response.status}`);
  }
  return payload.items ?? [];
}

function parseIsoDuration(duration?: string): number | undefined {
  if (!duration) return undefined;
  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return undefined;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}

async function loadVideoDurations(
  apiKey: string,
  videoIds: string[],
): Promise<Record<string, number>> {
  if (videoIds.length === 0) return {};
  const endpoint = new URL('https://www.googleapis.com/youtube/v3/videos');
  endpoint.searchParams.set('part', 'contentDetails');
  endpoint.searchParams.set('id', videoIds.join(','));
  endpoint.searchParams.set('key', apiKey);
  const response = await fetch(endpoint.toString());
  const payload = await response.json() as YouTubeVideosResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message || `YouTube details returned HTTP ${response.status}`);
  }
  const durations: Record<string, number> = {};
  for (const item of payload.items ?? []) {
    const seconds = parseIsoDuration(item.contentDetails?.duration);
    if (item.id && seconds !== undefined) durations[item.id] = seconds;
  }
  return durations;
}

export async function loadYouTubeMetadata(
  mediaResources: ImmersionResource[],
  forceRefresh = false,
): Promise<Record<string, YouTubeResourceMetadata>> {
  const { apiKey, region } = getYouTubeConfiguration();
  if (!apiKey) return {};

  const cached = readCache(apiKey);
  const cachedResources = cached?.resources ?? {};
  const missingResources = forceRefresh
    ? mediaResources
    : mediaResources.filter((resource) => !cachedResources[resource.id]);
  if (missingResources.length === 0) return cachedResources;
  if (!isOnlineMode()) return cachedResources;

  const categoryGroups = [
    ...new Map(
      missingResources.map((resource) => [
        `${resource.kind}:${resource.category}`,
        { kind: resource.kind, category: resource.category },
      ]),
    ).values(),
  ];
  const groupedResults = await Promise.allSettled(
    categoryGroups.map(async ({ kind, category }) => {
      const resources = missingResources.filter(
        (resource) => resource.kind === kind && resource.category === category,
      );
      const results = await searchCategory(apiKey, region, category, kind, resources.length);
      const durations = await loadVideoDurations(
        apiKey,
        results.flatMap((item) => item.id?.videoId ? [item.id.videoId] : []),
      ).catch((): Record<string, number> => ({}));
      return { resources, results, durations };
    }),
  );

  const resolved: Record<string, YouTubeResourceMetadata> = { ...cachedResources };
  groupedResults.forEach((groupedResult) => {
    if (groupedResult.status !== 'fulfilled') return;
    const { resources, results, durations } = groupedResult.value;
    resources.forEach((resource, index) => {
      const item = results[index];
      const videoId = item?.id?.videoId;
      const snippet = item?.snippet;
      const thumbnailUrl =
        snippet?.thumbnails?.maxres?.url ??
        snippet?.thumbnails?.high?.url ??
        snippet?.thumbnails?.medium?.url ??
        snippet?.thumbnails?.default?.url;
      if (!videoId || !thumbnailUrl) return;
      resolved[resource.id] = {
        resourceId: resource.id,
        videoId,
        title: decodeYouTubeText(snippet?.title || resource.title),
        channel: decodeYouTubeText(snippet?.channelTitle || 'YouTube'),
        description: decodeYouTubeText(snippet?.description || resource.subtitle),
        publishedAt: snippet?.publishedAt,
        durationSeconds: durations[videoId],
        thumbnailUrl,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      };
    });
  });

  if (missingResources.every((resource) => !resolved[resource.id])) {
    const firstFailure = groupedResults.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    throw firstFailure?.reason instanceof Error
      ? firstFailure.reason
      : new Error('YouTube returned no embeddable videos for the configured categories.');
  }
  writeCache(apiKey, resolved);
  return resolved;
}

export async function validateYouTubeApiKey(apiKey: string): Promise<string> {
  requireOnline('YouTube API validation');
  const endpoint = new URL('https://www.googleapis.com/youtube/v3/videos');
  endpoint.searchParams.set('part', 'id');
  endpoint.searchParams.set('id', 'dQw4w9WgXcQ');
  endpoint.searchParams.set('key', apiKey.trim());
  const response = await fetch(endpoint.toString());
  const payload = await response.json() as YouTubeSearchResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message || `YouTube API returned HTTP ${response.status}`);
  }
  return 'YouTube Data API is connected.';
}
