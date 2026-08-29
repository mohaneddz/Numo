import { fetch_json_with_fallback, fetch_text_with_fallback } from "./tauriNet";
import { requireOnline } from '../services/localRuntimeSettings';

export type SearchDomain =
  | "web"
  | "video"
  | "image"
  | "podcast"
  | "documentation"
  | "wikipedia"
  | "tool"
  | "story"
  | "resource";

export interface WebSearchOptions {
  limit?: number;
  language?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  safeSearch?: boolean;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  domain: SearchDomain;
  publishedAt?: string;
  thumbnail?: string;
  image?: {
    width?: number;
    height?: number;
    format?: string;
  };
  metadata?: Record<string, string | number | boolean | null>;
}

export interface ImageSearchResult extends SearchResult {
  domain: "image";
  thumbnail?: string;
  image: {
    width?: number;
    height?: number;
    format?: string;
  };
}

export interface YouTubeSearchResult extends SearchResult {
  domain: "video";
  channel?: string;
  videoId?: string;
}

interface DuckDuckGoResponse {
  Results?: Array<{
    Text?: string;
    FirstURL?: string;
  }>;
  RelatedTopics?: Array<DuckDuckGoTopic | DuckDuckGoTopicGroup>;
}

interface DuckDuckGoTopic {
  Text?: string;
  FirstURL?: string;
}

interface DuckDuckGoTopicGroup {
  Name?: string;
  Topics?: DuckDuckGoTopic[];
}

interface WikipediaResponse {
  query?: {
    search?: Array<{
      title?: string;
      snippet?: string;
      pageid?: number;
      timestamp?: string;
    }>;
  };
}

interface WikimediaImageResponse {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        imageinfo?: Array<{
          url?: string;
          thumburl?: string;
          mime?: string;
          width?: number;
          height?: number;
          size?: number;
        }>;
      }
    >;
  };
}

interface ITunesPodcastResult {
  collectionName?: string;
  artistName?: string;
  feedUrl?: string;
  trackViewUrl?: string;
  artworkUrl600?: string;
  releaseDate?: string;
  primaryGenreName?: string;
}

interface ITunesSearchResponse {
  results?: ITunesPodcastResult[];
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function normalizeLimit(limit?: number): number {
  if (!Number.isFinite(limit) || !limit) {
    return DEFAULT_LIMIT;
  }
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
}

function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ");
}

function cleanSnippet(snippet: string): string {
  return snippet
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function keepByDomain(url: string, includeDomains?: string[], excludeDomains?: string[]): boolean {
  const hostname = parseDomain(url);
  if (!hostname) {
    return false;
  }

  if (includeDomains && includeDomains.length > 0) {
    const allow = includeDomains.some((d) => hostname.endsWith(d.toLowerCase()));
    if (!allow) {
      return false;
    }
  }

  if (excludeDomains && excludeDomains.length > 0) {
    const blocked = excludeDomains.some((d) => hostname.endsWith(d.toLowerCase()));
    if (blocked) {
      return false;
    }
  }

  return true;
}

function buildQueryWithDomains(query: string, includeDomains?: string[]): string {
  const normalized = normalizeQuery(query);
  if (!includeDomains || includeDomains.length === 0) {
    return normalized;
  }

  const sites = includeDomains.map((domain) => `site:${domain}`).join(" OR ");
  return `${normalized} (${sites})`;
}

function dedupeResults<T extends SearchResult>(results: T[]): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const result of results) {
    const key = result.url.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(result);
  }

  return deduped;
}

function scoreResult(result: SearchResult, query: string): number {
  const q = normalizeQuery(query).toLowerCase();
  const text = `${result.title} ${result.snippet}`.toLowerCase();
  const tokens = q.split(" ").filter(Boolean);

  let score = 0;
  for (const token of tokens) {
    if (result.title.toLowerCase().includes(token)) {
      score += 5;
    }
    if (text.includes(token)) {
      score += 2;
    }
  }

  if (result.source === "wikipedia") {
    score += 1;
  }
  if (result.thumbnail) {
    score += 1;
  }

  return score;
}

function sortResults<T extends SearchResult>(results: T[], query: string): T[] {
  return [...results].sort((a, b) => scoreResult(b, query) - scoreResult(a, query));
}

async function safeJsonFetch<T>(url: string): Promise<T | null> {
  requireOnline('Web search');
  try {
    return await fetch_json_with_fallback<T>(url);
  } catch {
    return null;
  }
}

function mapDuckDuckGoTopic(topic: DuckDuckGoTopic): SearchResult | null {
  if (!topic.FirstURL || !topic.Text) {
    return null;
  }

  const [titlePart, snippetPart] = topic.Text.split(" - ");
  return {
    title: cleanSnippet(titlePart || topic.Text),
    url: topic.FirstURL,
    snippet: cleanSnippet(snippetPart || topic.Text),
    source: "duckduckgo",
    domain: "web",
  };
}

function isDuckDuckGoDirectTopic(
  topic: DuckDuckGoTopic | DuckDuckGoTopicGroup,
): topic is DuckDuckGoTopic {
  return !("Topics" in topic);
}

export async function searchDuckDuckGo(
  query: string,
  options: WebSearchOptions = {},
): Promise<SearchResult[]> {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return [];
  }

  const url = new URL("https://api.duckduckgo.com/");
  url.searchParams.set("q", buildQueryWithDomains(normalized, options.includeDomains));
  url.searchParams.set("format", "json");
  url.searchParams.set("no_html", "1");
  url.searchParams.set("skip_disambig", "1");
  if (options.safeSearch === false) {
    url.searchParams.set("kp", "-2");
  } else {
    url.searchParams.set("kp", "1");
  }

  const payload = await safeJsonFetch<DuckDuckGoResponse>(url.toString());
  if (!payload) {
    return [];
  }

  const mapped: SearchResult[] = [];

  for (const result of payload.Results || []) {
    const mappedResult = mapDuckDuckGoTopic(result);
    if (mappedResult) {
      mapped.push(mappedResult);
    }
  }

  for (const topic of payload.RelatedTopics || []) {
    if (!isDuckDuckGoDirectTopic(topic)) {
      for (const nested of topic.Topics || []) {
        const mappedResult = mapDuckDuckGoTopic(nested);
        if (mappedResult) {
          mapped.push(mappedResult);
        }
      }
      continue;
    }

    const mappedResult = mapDuckDuckGoTopic(topic);
    if (mappedResult) {
      mapped.push(mappedResult);
    }
  }

  return mapped.filter((item) => keepByDomain(item.url, options.includeDomains, options.excludeDomains));
}

export async function wikipedia_search(
  query: string,
  options: WebSearchOptions = {},
): Promise<SearchResult[]> {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return [];
  }

  const lang = (options.language || "en").trim().toLowerCase();
  const endpoint = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  endpoint.searchParams.set("action", "query");
  endpoint.searchParams.set("list", "search");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("utf8", "1");
  endpoint.searchParams.set("origin", "*");
  endpoint.searchParams.set("srsearch", normalized);
  endpoint.searchParams.set("srlimit", String(normalizeLimit(options.limit)));

  const payload = await safeJsonFetch<WikipediaResponse>(endpoint.toString());
  if (!payload?.query?.search) {
    return [];
  }

  const results: SearchResult[] = payload.query.search
    .filter((entry) => Boolean(entry.title))
    .map((entry) => ({
      title: cleanSnippet(entry.title || "Wikipedia Result"),
      url: `https://${lang}.wikipedia.org/?curid=${entry.pageid}`,
      snippet: cleanSnippet(entry.snippet || "Wikipedia article"),
      source: "wikipedia",
      domain: "wikipedia",
      publishedAt: entry.timestamp,
      metadata: {
        pageId: entry.pageid ?? "",
      },
    }));

  return results.filter((item) => keepByDomain(item.url, options.includeDomains, options.excludeDomains));
}

export async function podcast_search(
  query: string,
  options: WebSearchOptions = {},
): Promise<SearchResult[]> {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return [];
  }

  const endpoint = new URL("https://itunes.apple.com/search");
  endpoint.searchParams.set("term", normalized);
  endpoint.searchParams.set("media", "podcast");
  endpoint.searchParams.set("entity", "podcast");
  endpoint.searchParams.set("limit", String(normalizeLimit(options.limit)));

  const payload = await safeJsonFetch<ITunesSearchResponse>(endpoint.toString());
  if (!payload?.results) {
    return [];
  }

  const results: SearchResult[] = payload.results
    .filter((item) => item.collectionName && (item.feedUrl || item.trackViewUrl))
    .map((item) => ({
      title: item.collectionName || "Podcast",
      url: item.feedUrl || item.trackViewUrl || "",
      snippet: cleanSnippet([item.artistName, item.primaryGenreName].filter(Boolean).join(" | ")),
      source: "itunes",
      domain: "podcast" as const,
      thumbnail: item.artworkUrl600,
      publishedAt: item.releaseDate,
      metadata: {
        artist: item.artistName || "",
        genre: item.primaryGenreName || "",
      },
    }))
    .filter((item) => Boolean(item.url));

  return results.filter((item) => keepByDomain(item.url, options.includeDomains, options.excludeDomains));
}

export async function youtube_search(
  query: string,
  options: WebSearchOptions = {},
): Promise<YouTubeSearchResult[]> {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return [];
  }

  const limit = normalizeLimit(options.limit);
  const endpoint = new URL("https://www.youtube.com/feeds/videos.xml");
  endpoint.searchParams.set("search_query", normalized);

  let xml: string;
  try {
    xml = await fetch_text_with_fallback(endpoint.toString());
  } catch {
    return [];
  }
  const doc = new DOMParser().parseFromString(xml, "application/xml");

  const entries = Array.from(doc.getElementsByTagName("entry")).slice(0, limit);
  const results: YouTubeSearchResult[] = [];

  for (const entry of entries) {
      const title = entry.getElementsByTagName("title")[0]?.textContent?.trim() || "YouTube Video";
      const videoId = entry.getElementsByTagName("yt:videoId")[0]?.textContent?.trim() || "";
      const channel = entry.getElementsByTagName("name")[0]?.textContent?.trim() || "";
      const publishedAt = entry.getElementsByTagName("published")[0]?.textContent?.trim();

      if (!videoId) {
        continue;
      }

      results.push({
        title,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        snippet: channel ? `Channel: ${channel}` : "YouTube result",
        source: "youtube",
        domain: "video",
        channel,
        videoId,
        publishedAt,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      });
  }

  return results.filter((item) => keepByDomain(item.url, options.includeDomains, options.excludeDomains));
}

export async function image_search(
  query: string,
  options: WebSearchOptions = {},
): Promise<ImageSearchResult[]> {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return [];
  }

  const endpoint = new URL("https://commons.wikimedia.org/w/api.php");
  endpoint.searchParams.set("action", "query");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("origin", "*");
  endpoint.searchParams.set("generator", "search");
  endpoint.searchParams.set("gsrsearch", `file:${normalized}`);
  endpoint.searchParams.set("gsrlimit", String(normalizeLimit(options.limit)));
  endpoint.searchParams.set("prop", "imageinfo");
  endpoint.searchParams.set("iiprop", "url|size|mime");

  const payload = await safeJsonFetch<WikimediaImageResponse>(endpoint.toString());
  const pages = payload?.query?.pages;
  if (!pages) {
    return [];
  }

  const results: ImageSearchResult[] = [];

  for (const page of Object.values(pages)) {
      const info = page.imageinfo?.[0];
      if (!info?.url) {
        continue;
      }

      results.push({
        title: cleanSnippet((page.title || "Image").replace(/^File:/i, "")),
        url: info.url,
        snippet: "Image result from Wikimedia Commons",
        source: "wikimedia",
        domain: "image",
        thumbnail: info.thumburl || info.url,
        image: {
          width: info.width,
          height: info.height,
          format: info.mime,
        },
        metadata: {
          bytes: info.size ?? 0,
        },
      });
  }

  return results.filter((item) => keepByDomain(item.url, options.includeDomains, options.excludeDomains));
}

export async function documentation_search(
  query: string,
  options: WebSearchOptions = {},
): Promise<SearchResult[]> {
  const includeDomains = options.includeDomains && options.includeDomains.length > 0
    ? options.includeDomains
    : ["developer.mozilla.org", "docs.python.org", "react.dev", "typescriptlang.org", "nodejs.org"];

  return web_search(query, {
    ...options,
    includeDomains,
  });
}

export async function story_search(query: string, options: WebSearchOptions = {}): Promise<SearchResult[]> {
  return web_search(`${query} story OR article OR blog`, options);
}

export async function tool_search(query: string, options: WebSearchOptions = {}): Promise<SearchResult[]> {
  return web_search(`${query} software OR tool OR github`, options);
}

export async function resource_search(query: string, options: WebSearchOptions = {}): Promise<SearchResult[]> {
  const [webResults, wikiResults] = await Promise.all([
    web_search(`${query} guide OR tutorial OR resource`, options),
    wikipedia_search(query, options),
  ]);

  return dedupeResults([...webResults, ...wikiResults]).slice(0, normalizeLimit(options.limit));
}

export async function web_search(query: string, options: WebSearchOptions = {}): Promise<SearchResult[]> {
  const limit = normalizeLimit(options.limit);
  const [duckResults, wikiResults] = await Promise.all([
    searchDuckDuckGo(query, options),
    wikipedia_search(query, options),
  ]);

  const merged = dedupeResults([...duckResults, ...wikiResults]);
  return sortResults(merged, query).slice(0, limit);
}

// camelCase aliases for codebases that prefer JS naming conventions
export const webSearch = web_search;
export const youtubeSearch = youtube_search;
export const imageSearch = image_search;
export const podcastSearch = podcast_search;
export const wikipediaSearch = wikipedia_search;
export const documentationSearch = documentation_search;
export const storySearch = story_search;
export const toolSearch = tool_search;
export const resourceSearch = resource_search;
