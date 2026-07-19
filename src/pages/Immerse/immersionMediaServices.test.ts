import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImmersionResource } from './immersionCatalog';
import { loadYouTubeMetadata } from '../../services/youtubeService';
import { loadBookCovers } from '../../services/bookContentService';
import { loadAudioArtwork } from '../../services/audioArtworkService';
import {
  clearImmersionMediaCache,
  getCachedMediaAssetUrl,
} from '../../services/mediaAssetCache';

function createLocalStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  };
}

function resource(overrides: Partial<ImmersionResource>): ImmersionResource {
  return {
    id: 'resource',
    kind: 'video',
    category: 'Documentaries',
    title: 'Resource',
    subtitle: 'Description',
    level: 'B1',
    duration: '20 min',
    accent: 'from-blue-500 to-black',
    progress: 0,
    tags: [],
    ...overrides,
  };
}

describe('immersion media resolution', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('localStorage', createLocalStorage());
  });

  it('keeps successful YouTube categories when another category fails', async () => {
    localStorage.setItem(
      'noema_settings_state_v1',
      JSON.stringify({ integrations: { 'YouTube API Key': 'test-key', 'YouTube Region': 'US' } }),
    );
    const resources = [
      resource({ id: 'video-doc', category: 'Documentaries' }),
      resource({ id: 'video-drama', category: 'Drama Series' }),
    ];
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('Drama+Series') || url.includes('Drama%20Series')) {
        throw new Error('category unavailable');
      }
      return {
        ok: true,
        json: async () => ({
          items: [{
            id: { videoId: 'video123' },
            snippet: {
              title: 'Actual documentary',
              channelTitle: 'Actual channel',
              thumbnails: { high: { url: 'https://img.example/video.jpg' } },
            },
          }],
        }),
      } as Response;
    }));

    const resolved = await loadYouTubeMetadata(resources, true);
    expect(resolved['video-doc']?.videoId).toBe('video123');
    expect(resolved['video-drama']).toBeUndefined();
  });

  it('keeps successful book covers when another Open Library lookup fails', async () => {
    const resources = [
      resource({ id: 'book-one', kind: 'reading', title: 'Book One', author: 'Author One' }),
      resource({ id: 'book-two', kind: 'reading', title: 'Book Two', author: 'Author Two' }),
    ];
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('Book+Two') || url.includes('Book%20Two')) throw new Error('cover unavailable');
      return {
        ok: true,
        json: async () => ({ docs: [{ cover_i: 12345, key: '/works/OL1W' }] }),
      } as Response;
    }));

    const resolved = await loadBookCovers(resources);
    expect(resolved['book-one']?.coverUrl).toContain('/12345-L.jpg?default=false');
    expect(resolved['book-two']).toBeUndefined();
  });

  it('keeps successful podcast artwork when another audio lookup fails', async () => {
    const resources = [
      resource({ id: 'audio-one', kind: 'audio', category: 'Narrative Podcasts', title: 'Podcast One' }),
      resource({ id: 'audio-two', kind: 'audio', category: 'Narrative Podcasts', title: 'Podcast Two' }),
    ];
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('Podcast+Two') || url.includes('Podcast%20Two')) throw new Error('artwork unavailable');
      return {
        ok: true,
        json: async () => ({
          results: [{
            collectionName: 'Podcast One',
            artistName: 'Publisher',
            artworkUrl600: 'https://img.example/podcast.jpg',
            collectionViewUrl: 'https://podcasts.example/show',
          }],
        }),
      } as Response;
    }));

    const resolved = await loadAudioArtwork(resources);
    expect(resolved['audio-one']?.artworkUrl).toBe('https://img.example/podcast.jpg');
    expect(resolved['audio-two']).toBeUndefined();
  });

  it('deduplicates image downloads and stores the response in the persistent media cache', async () => {
    const storedResponses = new Map<string, Response>();
    const cache = {
      match: vi.fn(async (url: string) => storedResponses.get(url)?.clone()),
      put: vi.fn(async (url: string, response: Response) => {
        storedResponses.set(url, response.clone());
      }),
      delete: vi.fn(async (url: string) => storedResponses.delete(url)),
    };
    vi.stubGlobal('caches', {
      open: vi.fn(async () => cache),
      delete: vi.fn(async () => true),
    });
    const fetchMock = vi.fn(async () =>
      new Response(new Blob(['image-bytes'], { type: 'image/jpeg' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const remoteUrl = 'https://img.example/unique-cached-cover.jpg';

    const [first, second] = await Promise.all([
      getCachedMediaAssetUrl(remoteUrl),
      getCachedMediaAssetUrl(remoteUrl),
    ]);

    expect(first).toBe(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cache.put).toHaveBeenCalledTimes(1);
    await clearImmersionMediaCache();
  });
});
