import type { BackgroundImageCandidate, BackgroundProvider, BackgroundProviderName } from './types';

interface PexelsSearchResponse {
  photos?: Array<{
    id: number;
    width: number;
    height: number;
    alt: string;
    url: string;
    avg_color?: string;
    photographer: string;
    photographer_url?: string;
    src: {
      large2x?: string;
      large?: string;
      medium?: string;
      original?: string;
    };
  }>;
}

interface PixabaySearchResponse {
  hits?: Array<{
    id: number;
    pageURL: string;
    tags: string;
    previewURL?: string;
    webformatURL?: string;
    largeImageURL?: string;
    imageWidth: number;
    imageHeight: number;
    user: string;
    userImageURL?: string;
  }>;
}

interface UnsplashSearchResponse {
  results?: Array<{
    id: string;
    width: number;
    height: number;
    color?: string;
    alt_description?: string;
    description?: string;
    links?: { html?: string };
    urls: {
      regular?: string;
      full?: string;
      small?: string;
    };
    user: {
      name: string;
      links?: { html?: string };
    };
    tags?: Array<{ title?: string }>;
  }>;
}

function cleanTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
}

async function safeJsonFetch<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function encodeQuery(query: string): string {
  return encodeURIComponent(query.trim());
}

function withUnsplashSizedUrl(url: string | undefined, width = 1600): string {
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}w=${width}&q=80&fit=crop`;
}

function attribution(provider: BackgroundProviderName, photographer: string): string {
  if (provider === 'unsplash') return `Photo by ${photographer} on Unsplash`;
  if (provider === 'pexels') return `Photo by ${photographer} on Pexels`;
  return `Photo by ${photographer} on Pixabay`;
}

class PexelsProvider implements BackgroundProvider {
  readonly name = 'pexels' as const;
  readonly enabled: boolean;

  constructor(private readonly apiKey: string | undefined) {
    this.enabled = Boolean(apiKey && apiKey.trim());
  }

  async searchImages(query: string, options?: { perPage?: number; signal?: AbortSignal }): Promise<BackgroundImageCandidate[]> {
    if (!this.enabled || !this.apiKey) return [];
    const perPage = Math.max(3, Math.min(options?.perPage ?? 12, 30));
    const url = `https://api.pexels.com/v1/search?query=${encodeQuery(query)}&per_page=${perPage}&orientation=landscape&size=large`;
    const payload = await safeJsonFetch<PexelsSearchResponse>(url, {
      headers: {
        Authorization: this.apiKey,
      },
      signal: options?.signal,
    });
    const photos = payload?.photos ?? [];
    const output: BackgroundImageCandidate[] = [];
    for (const photo of photos) {
      const imageUrl = photo.src.large2x ?? photo.src.large ?? photo.src.medium ?? photo.src.original ?? '';
      if (!imageUrl) continue;
      const description = photo.alt?.trim() || query;
      output.push({
        provider: this.name,
        providerImageId: String(photo.id),
        title: description,
        description,
        width: photo.width,
        height: photo.height,
        imageUrl,
        downloadUrl: imageUrl,
        pageUrl: photo.url,
        colorHex: photo.avg_color,
        tags: cleanTags(description),
        photographerName: photo.photographer,
        photographerUrl: photo.photographer_url,
        attributionText: attribution(this.name, photo.photographer),
      });
    }
    return output;
  }

  async getCuratedImages(topic: string, options?: { perPage?: number; signal?: AbortSignal }): Promise<BackgroundImageCandidate[]> {
    return this.searchImages(topic, options);
  }
}

class PixabayProvider implements BackgroundProvider {
  readonly name = 'pixabay' as const;
  readonly enabled: boolean;

  constructor(private readonly apiKey: string | undefined) {
    this.enabled = Boolean(apiKey && apiKey.trim());
  }

  async searchImages(query: string, options?: { perPage?: number; signal?: AbortSignal }): Promise<BackgroundImageCandidate[]> {
    if (!this.enabled || !this.apiKey) return [];
    const perPage = Math.max(3, Math.min(options?.perPage ?? 12, 50));
    const url = `https://pixabay.com/api/?key=${encodeURIComponent(this.apiKey)}&q=${encodeQuery(query)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=${perPage}`;
    const payload = await safeJsonFetch<PixabaySearchResponse>(url, { signal: options?.signal });
    const hits = payload?.hits ?? [];
    const output: BackgroundImageCandidate[] = [];
    for (const hit of hits) {
      const imageUrl = hit.largeImageURL || hit.webformatURL || hit.previewURL || '';
      if (!imageUrl) continue;
      const photographer = hit.user || 'Unknown';
      output.push({
        provider: this.name,
        providerImageId: String(hit.id),
        title: hit.tags || query,
        description: hit.tags || query,
        width: hit.imageWidth,
        height: hit.imageHeight,
        imageUrl,
        downloadUrl: imageUrl,
        pageUrl: hit.pageURL,
        tags: cleanTags(hit.tags || ''),
        photographerName: photographer,
        photographerUrl: hit.userImageURL,
        attributionText: attribution(this.name, photographer),
      });
    }
    return output;
  }

  async getCuratedImages(topic: string, options?: { perPage?: number; signal?: AbortSignal }): Promise<BackgroundImageCandidate[]> {
    return this.searchImages(topic, options);
  }
}

class UnsplashProvider implements BackgroundProvider {
  readonly name = 'unsplash' as const;
  readonly enabled: boolean;

  constructor(private readonly accessKey: string | undefined) {
    this.enabled = Boolean(accessKey && accessKey.trim());
  }

  async searchImages(query: string, options?: { perPage?: number; signal?: AbortSignal }): Promise<BackgroundImageCandidate[]> {
    if (!this.enabled || !this.accessKey) return [];
    const perPage = Math.max(3, Math.min(options?.perPage ?? 12, 30));
    const url = `https://api.unsplash.com/search/photos?query=${encodeQuery(query)}&per_page=${perPage}&orientation=landscape&content_filter=high&client_id=${encodeURIComponent(this.accessKey)}`;
    const payload = await safeJsonFetch<UnsplashSearchResponse>(url, { signal: options?.signal });
    const results = payload?.results ?? [];
    const output: BackgroundImageCandidate[] = [];
    for (const result of results) {
      const imageUrl = withUnsplashSizedUrl(result.urls.regular ?? result.urls.full ?? result.urls.small, 1600);
      if (!imageUrl) continue;
      const photographer = result.user.name || 'Unknown';
      const pageUrl = result.links?.html || '';
      const description = result.alt_description || result.description || query;
      const tagList = (result.tags ?? [])
        .map((tag) => tag.title?.trim().toLowerCase() || '')
        .filter(Boolean)
        .slice(0, 8);

      output.push({
        provider: this.name,
        providerImageId: result.id,
        title: description,
        description,
        width: result.width,
        height: result.height,
        imageUrl,
        downloadUrl: imageUrl,
        pageUrl,
        colorHex: result.color,
        tags: tagList,
        photographerName: photographer,
        photographerUrl: result.user.links?.html,
        attributionText: attribution(this.name, photographer),
      });
    }
    return output;
  }

  async getCuratedImages(topic: string, options?: { perPage?: number; signal?: AbortSignal }): Promise<BackgroundImageCandidate[]> {
    return this.searchImages(topic, options);
  }
}

export function createBackgroundProviders(): BackgroundProvider[] {
  const pexelsKey = import.meta.env.VITE_PEXELS_API_KEY as string | undefined;
  const pixabayKey = import.meta.env.VITE_PIXABAY_API_KEY as string | undefined;
  const unsplashKey = (import.meta.env.VITE_UNSPLASH_ACCESS_KEY as string | undefined)
    || (import.meta.env.VITE_UNSPLASH_API_KEY as string | undefined);

  return [
    new UnsplashProvider(unsplashKey),
    new PexelsProvider(pexelsKey),
    new PixabayProvider(pixabayKey),
  ].filter((provider) => provider.enabled);
}
