import type { ImmersionResource } from '../pages/Immerse/immersionCatalog';
import { resolveBookCover } from './bookContentService';

const CACHE_KEY = 'numo_audio_artwork_v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface ITunesResult {
  collectionName?: string;
  artistName?: string;
  artworkUrl100?: string;
  artworkUrl600?: string;
  collectionViewUrl?: string;
  feedUrl?: string;
}

interface ITunesResponse {
  results?: ITunesResult[];
}

export interface ResolvedAudioArtwork {
  resourceId: string;
  artworkUrl: string;
  title: string;
  creator: string;
  sourceUrl: string;
  feedUrl?: string;
  provider: 'itunes' | 'open-library';
}

interface ArtworkCache {
  createdAt: number;
  items: Record<string, ResolvedAudioArtwork>;
}

function readCache(): ArtworkCache {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') as ArtworkCache | null;
    if (parsed && Date.now() - parsed.createdAt <= CACHE_TTL_MS) return parsed;
  } catch {
    // Use an empty cache.
  }
  return { createdAt: Date.now(), items: {} };
}

function writeCache(cache: ArtworkCache) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function largestArtwork(result: ITunesResult): string {
  const source = result.artworkUrl600 || result.artworkUrl100 || '';
  return source
    .replace('100x100bb', '600x600bb')
    .replace('100x100-75', '600x600-75');
}

async function resolveFromITunes(resource: ImmersionResource): Promise<ResolvedAudioArtwork | null> {
  const isAudiobook = resource.category === 'Public-Domain Audiobooks';
  const endpoint = new URL('https://itunes.apple.com/search');
  endpoint.searchParams.set('term', `${resource.title} ${resource.author ?? ''}`);
  endpoint.searchParams.set('country', 'US');
  endpoint.searchParams.set('lang', 'es_es');
  endpoint.searchParams.set('limit', '5');
  endpoint.searchParams.set('media', isAudiobook ? 'audiobook' : 'podcast');
  endpoint.searchParams.set('entity', isAudiobook ? 'audiobook' : 'podcast');

  const response = await fetch(endpoint.toString());
  if (!response.ok) throw new Error(`Audio artwork provider returned HTTP ${response.status}`);
  const payload = await response.json() as ITunesResponse;
  const result = payload.results?.find((item) => largestArtwork(item)) ?? payload.results?.[0];
  const artworkUrl = result ? largestArtwork(result) : '';
  if (!result || !artworkUrl) return null;
  return {
    resourceId: resource.id,
    artworkUrl,
    title: result.collectionName || resource.title,
    creator: result.artistName || resource.author || '',
    sourceUrl: result.collectionViewUrl || resource.sourceUrl || '',
    feedUrl: result.feedUrl,
    provider: 'itunes',
  };
}

async function resolveArtwork(resource: ImmersionResource): Promise<ResolvedAudioArtwork> {
  const cache = readCache();
  const cached = cache.items[resource.id];
  if (cached?.artworkUrl) return cached;

  let resolved = await resolveFromITunes(resource);
  if (!resolved && resource.category === 'Public-Domain Audiobooks') {
    const book = await resolveBookCover(resource);
    if (book.coverUrl) {
      resolved = {
        resourceId: resource.id,
        artworkUrl: book.coverUrl,
        title: resource.title,
        creator: resource.author || '',
        sourceUrl: resource.sourceUrl || book.openLibraryUrl,
        provider: 'open-library',
      };
    }
  }
  if (!resolved) throw new Error(`No artwork found for ${resource.title}`);
  cache.items[resource.id] = resolved;
  writeCache(cache);
  return resolved;
}

export function getCachedAudioArtwork(resourceId: string): ResolvedAudioArtwork | null {
  return readCache().items[resourceId] ?? null;
}

export async function loadAudioArtwork(
  resources: ImmersionResource[],
): Promise<Record<string, ResolvedAudioArtwork>> {
  const resolved: Record<string, ResolvedAudioArtwork> = {};
  const concurrency = 4;
  for (let index = 0; index < resources.length; index += concurrency) {
    const chunk = resources.slice(index, index + concurrency);
    const results = await Promise.allSettled(
      chunk.map(async (resource) => {
        const artwork = await resolveArtwork(resource);
        return [resource.id, artwork] as const;
      }),
    );
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const [resourceId, artwork] = result.value;
        resolved[resourceId] = artwork;
      }
    });
  }
  return resolved;
}
