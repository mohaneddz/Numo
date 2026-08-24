import type { ImmersionResource, ReadingLine } from '../pages/Immerse/immersionCatalog';
import { requireOnline } from './localRuntimeSettings';

const CACHE_KEY = 'numo_public_domain_books_v2';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface OpenLibraryResponse {
  docs?: Array<{
    cover_i?: number;
    key?: string;
    edition_key?: string[];
  }>;
}

interface GutendexBook {
  id: number;
  title: string;
  languages: string[];
  formats: Record<string, string>;
}

interface GutendexResponse {
  results?: GutendexBook[];
}

export interface ResolvedBook {
  resourceId: string;
  coverUrl: string;
  openLibraryUrl: string;
  gutenbergBookId?: number;
  textUrl?: string;
  lines?: ReadingLine[];
}

interface BookCache {
  createdAt: number;
  books: Record<string, ResolvedBook>;
}

function readCache(): BookCache {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') as BookCache | null;
    if (parsed && Date.now() - parsed.createdAt <= CACHE_TTL_MS) return parsed;
  } catch {
    // Fall through to an empty cache.
  }
  return { createdAt: Date.now(), books: {} };
}

function writeCache(cache: BookCache) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function normalizeTextUrl(url: string): string {
  return url.startsWith('http://') ? `https://${url.slice('http://'.length)}` : url;
}

function pickPlainTextUrl(formats: Record<string, string>): string | undefined {
  const preferred = Object.entries(formats).find(([format]) =>
    format.toLowerCase().startsWith('text/plain; charset=utf-8'),
  );
  const fallback = Object.entries(formats).find(([format]) =>
    format.toLowerCase().startsWith('text/plain'),
  );
  const url = preferred?.[1] ?? fallback?.[1];
  return url ? normalizeTextUrl(url) : undefined;
}

function cleanGutenbergText(raw: string): ReadingLine[] {
  const startMarker = raw.search(/\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i);
  const endMarker = raw.search(/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i);
  const body = raw.slice(startMarker >= 0 ? startMarker : 0, endMarker > 0 ? endMarker : raw.length);
  const paragraphs = body
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim())
    .filter((paragraph) => {
      if (paragraph.length < 110 || paragraph.length > 1200) return false;
      if (/project gutenberg|www\.gutenberg|ebook|copyright/i.test(paragraph)) return false;
      const letters = paragraph.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '');
      return letters.length > 80;
    })
    .slice(0, 36);

  return paragraphs.map((source, index) => ({
    id: `gutenberg-${index + 1}`,
    source,
    translation: '',
  }));
}

async function resolveCover(resource: ImmersionResource): Promise<Pick<ResolvedBook, 'coverUrl' | 'openLibraryUrl'>> {
  const endpoint = new URL('https://openlibrary.org/search.json');
  endpoint.searchParams.set('title', resource.title);
  if (resource.author && resource.author !== 'Anonymous') {
    endpoint.searchParams.set('author', resource.author);
  }
  endpoint.searchParams.set('fields', 'key,cover_i,edition_key');
  endpoint.searchParams.set('limit', '5');

  const response = await fetch(endpoint.toString());
  if (!response.ok) throw new Error(`Open Library returned HTTP ${response.status}`);
  const payload = await response.json() as OpenLibraryResponse;
  const match = payload.docs?.find((document) => document.cover_i) ?? payload.docs?.[0];
  const coverUrl = match?.cover_i
    ? `https://covers.openlibrary.org/b/id/${match.cover_i}-L.jpg?default=false`
    : '';
  const openLibraryUrl = match?.key
    ? `https://openlibrary.org${match.key}`
    : `https://openlibrary.org/search?q=${encodeURIComponent(`${resource.title} ${resource.author ?? ''}`)}`;
  return { coverUrl, openLibraryUrl };
}

async function resolveGutenberg(resource: ImmersionResource): Promise<Pick<ResolvedBook, 'gutenbergBookId' | 'textUrl'>> {
  const endpoint = new URL('https://gutendex.com/books');
  endpoint.searchParams.set('search', `${resource.title} ${resource.author ?? ''}`);
  endpoint.searchParams.set('languages', 'es');
  const response = await fetch(endpoint.toString());
  if (!response.ok) throw new Error(`Gutenberg catalog returned HTTP ${response.status}`);
  const payload = await response.json() as GutendexResponse;
  const match =
    payload.results?.find((book) => book.languages.includes('es') && pickPlainTextUrl(book.formats)) ??
    payload.results?.find((book) => pickPlainTextUrl(book.formats));
  return {
    gutenbergBookId: match?.id,
    textUrl: match ? pickPlainTextUrl(match.formats) : undefined,
  };
}

export function getCachedBook(resourceId: string): ResolvedBook | null {
  return readCache().books[resourceId] ?? null;
}

export async function resolveBookCover(resource: ImmersionResource): Promise<ResolvedBook> {
  const cache = readCache();
  const cached = cache.books[resource.id];
  if (cached?.coverUrl) return cached;
  requireOnline('Online book lookup');
  const cover = await resolveCover(resource);
  const resolved: ResolvedBook = {
    resourceId: resource.id,
    coverUrl: cover.coverUrl,
    openLibraryUrl: cover.openLibraryUrl,
    gutenbergBookId: cached?.gutenbergBookId,
    textUrl: cached?.textUrl,
    lines: cached?.lines,
  };
  cache.books[resource.id] = resolved;
  writeCache(cache);
  return resolved;
}

export async function resolveBook(resource: ImmersionResource): Promise<ResolvedBook> {
  const cache = readCache();
  const cached = cache.books[resource.id];
  if (cached?.coverUrl && cached?.textUrl) return cached;
  requireOnline('Online book lookup');

  const [coverResult, gutenbergResult] = await Promise.allSettled([
    resolveCover(resource),
    resolveGutenberg(resource),
  ]);
  const resolved: ResolvedBook = {
    resourceId: resource.id,
    coverUrl: coverResult.status === 'fulfilled' ? coverResult.value.coverUrl : cached?.coverUrl ?? '',
    openLibraryUrl: coverResult.status === 'fulfilled'
      ? coverResult.value.openLibraryUrl
      : cached?.openLibraryUrl ?? resource.sourceUrl ?? '',
    gutenbergBookId: gutenbergResult.status === 'fulfilled'
      ? gutenbergResult.value.gutenbergBookId
      : cached?.gutenbergBookId,
    textUrl: gutenbergResult.status === 'fulfilled'
      ? gutenbergResult.value.textUrl
      : cached?.textUrl,
    lines: cached?.lines,
  };
  cache.books[resource.id] = resolved;
  writeCache(cache);
  return resolved;
}

export async function loadBookText(resource: ImmersionResource): Promise<ResolvedBook> {
  const resolved = await resolveBook(resource);
  if (resolved.lines?.length) return resolved;
  if (!resolved.textUrl) return resolved;
  requireOnline('Online book download');

  const response = await fetch(resolved.textUrl);
  if (!response.ok) throw new Error(`Book text returned HTTP ${response.status}`);
  const raw = await response.text();
  const lines = cleanGutenbergText(raw);
  const next = { ...resolved, lines };
  const cache = readCache();
  cache.books[resource.id] = next;
  writeCache(cache);
  return next;
}

export async function loadBookCovers(
  resources: ImmersionResource[],
): Promise<Record<string, ResolvedBook>> {
  const resolved: Record<string, ResolvedBook> = {};
  const concurrency = 4;
  for (let index = 0; index < resources.length; index += concurrency) {
    const chunk = resources.slice(index, index + concurrency);
    const results = await Promise.allSettled(
      chunk.map(async (resource) => {
        const book = await resolveBookCover(resource);
        return [resource.id, book] as const;
      }),
    );
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const [resourceId, book] = result.value;
        resolved[resourceId] = book;
      }
    });
  }
  return resolved;
}
