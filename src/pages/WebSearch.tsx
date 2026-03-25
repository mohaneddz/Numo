import { FormEvent, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import {
  documentation_search,
  image_search,
  podcast_search,
  resource_search,
  story_search,
  tool_search,
  web_search,
  wikipedia_search,
  youtube_search,
  type SearchResult,
  type WebSearchOptions,
} from '../utils';
import { PageActions, PageContent } from '../components/layout/PageLayout';
import { SpotlightCard } from '../components/ui/SpotlightCard';
import { DropdownSelect } from '../components/ui/DropdownSelect';

type SearchMode =
  | 'web'
  | 'youtube'
  | 'image'
  | 'podcast'
  | 'wikipedia'
  | 'documentation'
  | 'story'
  | 'tool'
  | 'resource';

const SEARCH_FN_BY_MODE: Record<SearchMode, (query: string, options: WebSearchOptions) => Promise<SearchResult[]>> = {
  web: web_search,
  youtube: youtube_search,
  image: image_search,
  podcast: podcast_search,
  wikipedia: wikipedia_search,
  documentation: documentation_search,
  story: story_search,
  tool: tool_search,
  resource: resource_search,
};

function getHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export default function WebSearchPage() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('web');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async () => {
    const normalized = query.trim();
    if (!normalized) {
      setError('Enter a query first.');
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await SEARCH_FN_BY_MODE[mode](normalized, { limit: 12, safeSearch: true });
      setResults(data);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Search failed.';
      setError(message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void runSearch();
  };

  return (
    <PageContent width="wide" className="pb-12">
      <PageActions hideSettingsButton />
      <SpotlightCard className="p-5">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
            <Search size={16} className="text-dim" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the web..."
              className="w-full bg-transparent text-[14px] text-white placeholder:text-dim/70 outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Search
            </button>
          </div>

          <label className="block text-[12px] text-dim">
            Source
            <DropdownSelect
              value={mode}
              onChange={(next) => setMode(next as SearchMode)}
              options={Object.keys(SEARCH_FN_BY_MODE).map((entry) => ({ value: entry, label: entry }))}
              className="mt-1"
            />
          </label>
        </form>
      </SpotlightCard>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-200">
          {error}
        </div>
      ) : null}

      <SpotlightCard className="mt-4 p-5">
        <p className="mb-3 text-[12px] uppercase tracking-wider text-dim font-bold">Results ({results.length})</p>
        <div className="space-y-3">
          {results.map((result, index) => (
            <article key={`${result.url}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-2 text-[11px] text-dim">{result.source} {getHost(result.url) ? `• ${getHost(result.url)}` : ''}</div>
              <a href={result.url} target="_blank" rel="noreferrer" className="text-[16px] font-bold text-white hover:text-cyan-300">
                {result.title}
              </a>
              <p className="mt-1 text-[13px] text-dim leading-relaxed">{result.snippet || 'No snippet available.'}</p>
            </article>
          ))}

          {!loading && results.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-8 text-center text-[13px] text-dim">
              No results yet.
            </div>
          ) : null}
        </div>
      </SpotlightCard>
    </PageContent>
  );
}
