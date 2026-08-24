import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCachedMediaAssetUrl } from './mediaAssetCache';

const values = new Map<string, string>();

describe('media cache offline policy', () => {
  beforeEach(() => {
    values.clear();
    values.set('numo_local_runtime_settings_v1', JSON.stringify({
      connectivityMode: 'offline',
      paths: {},
    }));
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('caches', undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not expose or fetch an uncached remote URL offline', async () => {
    await expect(getCachedMediaAssetUrl('https://example.com/image.jpg')).resolves.toBe('');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('continues to return built-in local assets offline', async () => {
    await expect(getCachedMediaAssetUrl('/continue_learning.png')).resolves.toBe(
      '/continue_learning.png',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('serves an existing persistent cache entry offline without fetching', async () => {
    const cachedResponse = new Response(new Blob(['image-bytes'], { type: 'image/jpeg' }));
    vi.stubGlobal('caches', {
      open: vi.fn(async () => ({
        match: vi.fn(async () => cachedResponse.clone()),
        put: vi.fn(),
        delete: vi.fn(),
      })),
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cached-image');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    await expect(getCachedMediaAssetUrl('https://example.com/cached.jpg')).resolves.toBe(
      'blob:cached-image',
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
