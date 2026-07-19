const CACHE_NAME = 'numo-immersion-media-v1';
const INDEX_KEY = 'numo_immersion_media_cache_index_v1';
const MAX_ASSET_COUNT = 180;
const MAX_TOTAL_BYTES = 120 * 1024 * 1024;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

interface AssetIndexEntry {
  cachedAt: number;
  lastAccessedAt: number;
  size: number;
}

type AssetIndex = Record<string, AssetIndexEntry>;

const memoryUrls = new Map<string, string>();
const pendingUrls = new Map<string, Promise<string>>();

function supportsPersistentCache(): boolean {
  return typeof caches !== 'undefined' && typeof localStorage !== 'undefined';
}

function readIndex(): AssetIndex {
  try {
    const parsed = JSON.parse(localStorage.getItem(INDEX_KEY) || '{}') as AssetIndex;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeIndex(index: AssetIndex) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

async function pruneCache(cache: Cache, index: AssetIndex) {
  const now = Date.now();
  const entries = Object.entries(index);
  const expired = entries.filter(([, entry]) => now - entry.cachedAt > MAX_AGE_MS);
  for (const [url] of expired) {
    await cache.delete(url);
    delete index[url];
    const memoryUrl = memoryUrls.get(url);
    if (memoryUrl) URL.revokeObjectURL(memoryUrl);
    memoryUrls.delete(url);
  }

  const remaining = Object.entries(index).sort(
    ([, left], [, right]) => left.lastAccessedAt - right.lastAccessedAt,
  );
  let totalBytes = remaining.reduce((total, [, entry]) => total + entry.size, 0);
  let totalCount = remaining.length;
  for (const [url, entry] of remaining) {
    if (totalCount <= MAX_ASSET_COUNT && totalBytes <= MAX_TOTAL_BYTES) break;
    await cache.delete(url);
    delete index[url];
    totalCount -= 1;
    totalBytes -= entry.size;
    const memoryUrl = memoryUrls.get(url);
    if (memoryUrl) URL.revokeObjectURL(memoryUrl);
    memoryUrls.delete(url);
  }
  writeIndex(index);
}

async function resolvePersistentAsset(remoteUrl: string): Promise<string> {
  const cachedInMemory = memoryUrls.get(remoteUrl);
  if (cachedInMemory) return cachedInMemory;
  if (!supportsPersistentCache()) return remoteUrl;

  const cache = await caches.open(CACHE_NAME);
  const index = readIndex();
  const indexed = index[remoteUrl];
  if (indexed && Date.now() - indexed.cachedAt > MAX_AGE_MS) {
    await cache.delete(remoteUrl);
    delete index[remoteUrl];
  }

  let response = await cache.match(remoteUrl);
  if (!response) {
    const fetched = await fetch(remoteUrl, {
      cache: 'force-cache',
      credentials: 'omit',
      mode: 'cors',
    });
    if (!fetched.ok) throw new Error(`Media asset returned HTTP ${fetched.status}`);
    await cache.put(remoteUrl, fetched.clone());
    response = fetched;
  }

  const blob = await response.blob();
  if (!blob.size) throw new Error('Media asset was empty.');
  const objectUrl = URL.createObjectURL(blob);
  memoryUrls.set(remoteUrl, objectUrl);
  index[remoteUrl] = {
    cachedAt: indexed?.cachedAt ?? Date.now(),
    lastAccessedAt: Date.now(),
    size: blob.size,
  };
  writeIndex(index);
  void pruneCache(cache, index);
  return objectUrl;
}

export async function getCachedMediaAssetUrl(remoteUrl: string): Promise<string> {
  const normalized = remoteUrl.trim();
  if (!normalized) return '';
  const memoryUrl = memoryUrls.get(normalized);
  if (memoryUrl) return memoryUrl;
  const pending = pendingUrls.get(normalized);
  if (pending) return pending;

  const request = resolvePersistentAsset(normalized)
    .catch(() => normalized)
    .finally(() => pendingUrls.delete(normalized));
  pendingUrls.set(normalized, request);
  return request;
}

export async function invalidateCachedMediaAsset(remoteUrl: string): Promise<void> {
  const normalized = remoteUrl.trim();
  if (!normalized) return;
  const memoryUrl = memoryUrls.get(normalized);
  if (memoryUrl) URL.revokeObjectURL(memoryUrl);
  memoryUrls.delete(normalized);
  pendingUrls.delete(normalized);
  if (!supportsPersistentCache()) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.delete(normalized);
  const index = readIndex();
  delete index[normalized];
  writeIndex(index);
}

export async function clearImmersionMediaCache(): Promise<void> {
  memoryUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
  memoryUrls.clear();
  pendingUrls.clear();
  if (typeof caches !== 'undefined') await caches.delete(CACHE_NAME);
  if (typeof localStorage !== 'undefined') localStorage.removeItem(INDEX_KEY);
}

export async function clearImmersionContentCaches(): Promise<void> {
  await clearImmersionMediaCache();
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem('numo_youtube_immersion_cache_v1');
  localStorage.removeItem('numo_public_domain_books_v2');
  localStorage.removeItem('numo_audio_artwork_v1');
}
