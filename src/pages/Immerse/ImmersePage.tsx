import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  ChevronRight,
  Clock3,
  Film,
  Headphones,
  Play,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Youtube,
  type LucideIcon,
} from 'lucide-react';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import {
  getImmersionResourcesForLanguage,
  immersionCatalogLanguages,
  type ImmersionKind,
  type ImmersionResource,
} from './immersionCatalog';
import {
  getYouTubeConfiguration,
  loadYouTubeMetadata,
  type YouTubeResourceMetadata,
} from '../../services/youtubeService';
import { loadBookCovers, type ResolvedBook } from '../../services/bookContentService';
import { loadAudioArtwork, type ResolvedAudioArtwork } from '../../services/audioArtworkService';
import CachedMediaImage from '../../components/ui/CachedMediaImage';
import { getLocalBookResources, LOCAL_BOOKS_CHANGED_EVENT } from '../../services/localBookService';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppData } from '../../contexts/AppDataContext';
import { useLanguageJourney } from '../../contexts/LanguageJourneyContext';

const tabs: Array<{ id: ImmersionKind; label: string; icon: LucideIcon }> = [
  { id: 'video', label: 'Videos', icon: Film },
  { id: 'reading', label: 'Readings', icon: BookOpen },
  { id: 'audio', label: 'Audio', icon: Headphones },
];

type SortMode = 'recommended' | 'title' | 'shortest';
type MediaStatus = 'idle' | 'loading' | 'connected' | 'missing' | 'error';

function durationInMinutes(duration: string): number {
  const hours = duration.match(/([\d.]+)\s*h/i);
  const minutes = duration.match(/([\d.]+)\s*m(?:in)?/i);
  return (hours ? Number.parseFloat(hours[1]) * 60 : 0) + (minutes ? Number.parseFloat(minutes[1]) : 0);
}

function formatYouTubeDuration(seconds?: number, fallback = ''): string {
  if (!seconds) return fallback;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
    : `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

/** CEFR ordering, used to rank how well a resource matches the learner's level. */
const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** Maps the onboarding level onto the CEFR scale the catalog is labelled with. */
const LEARNER_LEVEL_TO_CEFR: Record<string, number> = {
  complete_beginner: 0,
  beginner: 1,
  lower_intermediate: 2,
  intermediate_plus: 3,
};

function ResourceCard({
  resource,
  youtube,
  book,
  audio,
  progressPercent,
  onOpen,
}: {
  resource: ImmersionResource;
  youtube?: YouTubeResourceMetadata;
  book?: ResolvedBook;
  audio?: ResolvedAudioArtwork;
  progressPercent: number;
  onOpen: () => void;
}) {
  const Icon = resource.kind === 'video' ? Play : resource.kind === 'reading' ? BookOpen : Headphones;

  if (resource.kind === 'reading') {
    return (
      <motion.button
        type="button"
        whileHover={{ y: -5 }}
        whileTap={{ scale: 0.985 }}
        onClick={onOpen}
        className="group min-w-0 text-left"
      >
        <div
          className={`relative aspect-[3/4] overflow-hidden rounded-[18px] border border-white/10 bg-gradient-to-br ${resource.accent} shadow-[0_18px_45px_rgba(0,0,0,0.32)] transition-all group-hover:border-[#8B5CF6]/40`}
        >
          <div className="absolute inset-y-0 left-0 w-3 border-r border-white/10 bg-black/20" />
          <div className="absolute inset-5 flex flex-col items-center justify-center border border-white/10 px-3 text-center">
            <BookOpen size={24} className="mb-4 text-white/55" />
            <span className="text-[15px] font-black leading-tight text-white">{resource.title}</span>
            <span className="mt-3 text-[9px] font-bold uppercase tracking-wider text-white/50">{resource.author}</span>
          </div>
          {book?.coverUrl && (
            <CachedMediaImage
              src={book.coverUrl}
              alt={`Cover of ${resource.title}`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 to-transparent" />
          <span className="absolute bottom-3 right-3 rounded-lg border border-white/15 bg-black/45 px-2 py-1 text-[9px] font-black text-white backdrop-blur-md">
            {resource.level}
          </span>
          {progressPercent > 0 && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/30">
              <div className="h-full bg-[#A78BFA]" style={{ width: `${progressPercent}%` }} />
            </div>
          )}
        </div>
        <h3 className="mt-3 truncate text-[13px] font-black text-white">{resource.title}</h3>
        <p className="mt-1 truncate text-[10px] font-semibold text-dim">
          {resource.author}
          {resource.publicationYear ? ` · ${resource.publicationYear}` : ''}
        </p>
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
      onClick={onOpen}
      className="group min-w-0 overflow-hidden rounded-2xl border border-white/8 bg-[#0B1020]/78 text-left shadow-[0_16px_45px_rgba(0,0,0,0.2)] transition-colors hover:border-[#8B5CF6]/35"
    >
      <div className={`relative h-32 overflow-hidden bg-gradient-to-br ${resource.accent}`}>
        {(youtube || audio) && (
          <CachedMediaImage
            src={youtube?.thumbnailUrl || audio?.artworkUrl}
            fallbackUrls={youtube ? [`https://i.ytimg.com/vi/${youtube.videoId}/hqdefault.jpg`] : []}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        {(youtube || audio) && <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />}
        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-black/30 text-white backdrop-blur-md">
          <Icon size={19} fill={resource.kind === 'video' ? 'currentColor' : 'none'} />
        </div>
        <span className="absolute right-3 top-3 rounded-lg border border-white/10 bg-black/35 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/85 backdrop-blur-md">
          {resource.level}
        </span>
        {progressPercent > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/25">
            <div className="h-full bg-[#A78BFA]" style={{ width: `${progressPercent}%` }} />
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="truncate text-[14px] font-black text-white">{youtube?.title || audio?.title || resource.title}</h3>
        {(youtube?.channel || audio?.creator || resource.author) && (
          <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-wider text-[#A78BFA]">
            {youtube?.channel || audio?.creator || resource.author}
          </p>
        )}
        <p className="mt-1 line-clamp-2 min-h-9 text-[11px] leading-relaxed text-dim">
          {youtube?.description || resource.subtitle}
        </p>
        <div className="mt-3 flex items-center justify-between border-t border-white/6 pt-3 text-[10px] font-semibold text-dim">
          <span className="flex items-center gap-1.5">
            <Clock3 size={11} /> {formatYouTubeDuration(youtube?.durationSeconds, resource.duration)}
          </span>
          <span className="flex items-center gap-1 text-[#C4B5FD] opacity-0 transition-opacity group-hover:opacity-100">
            Open <ChevronRight size={12} />
          </span>
        </div>
      </div>
    </motion.button>
  );
}

export default function ImmersePage() {
  const navigate = useNavigate();
  const { activeLanguage } = useLanguage();
  const { state } = useAppData();
  const { getSettings } = useLanguageJourney();
  const journeySettings = getSettings(activeLanguage.code);

  const [localBooks, setLocalBooks] = useState(getLocalBookResources);
  const [activeTab, setActiveTab] = useState<ImmersionKind>('video');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('All');
  const [lengthFilter, setLengthFilter] = useState('All');
  const [sortMode, setSortMode] = useState<SortMode>('recommended');
  const [unstartedOnly, setUnstartedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const [youtubeMetadata, setYoutubeMetadata] = useState<Record<string, YouTubeResourceMetadata>>({});
  const [bookMetadata, setBookMetadata] = useState<Record<string, ResolvedBook>>({});
  const [audioMetadata, setAudioMetadata] = useState<Record<string, ResolvedAudioArtwork>>({});
  const [bookCoverStatus, setBookCoverStatus] = useState<'idle' | 'loading' | 'loaded'>('idle');
  const [audioArtworkStatus, setAudioArtworkStatus] = useState<'idle' | 'loading' | 'loaded'>('idle');

  // Video and audio each resolve their own YouTube metadata. A single shared status
  // meant refreshing the audio tab surfaced "API key not configured" under Videos.
  const [videoStatus, setVideoStatus] = useState<MediaStatus>('idle');
  const [audioStatus, setAudioStatus] = useState<MediaStatus>('idle');
  const [videoError, setVideoError] = useState('');
  const [audioError, setAudioError] = useState('');

  // The catalog is filtered by the language being studied. It previously was not,
  // so every learner saw the bundled Spanish material.
  const languageResources = useMemo(
    () => getImmersionResourcesForLanguage(activeLanguage.code),
    [activeLanguage.code],
  );
  const allResources = useMemo(
    () => [...localBooks, ...languageResources],
    [languageResources, localBooks],
  );
  const catalogLanguages = useMemo(() => immersionCatalogLanguages(), []);
  const hasCatalogForLanguage = catalogLanguages.includes(activeLanguage.code.split('-')[0].toLowerCase());

  useEffect(() => {
    const refreshLocalBooks = () => setLocalBooks(getLocalBookResources());
    window.addEventListener(LOCAL_BOOKS_CHANGED_EVENT, refreshLocalBooks);
    window.addEventListener('storage', refreshLocalBooks);
    return () => {
      window.removeEventListener(LOCAL_BOOKS_CHANGED_EVENT, refreshLocalBooks);
      window.removeEventListener('storage', refreshLocalBooks);
    };
  }, []);

  /** Real progress, from what the learner has actually opened. */
  const progressFor = (resourceId: string): number => {
    const record = state.immersionProgress[resourceId];
    if (!record) return 0;
    if (record.completed) return 100;
    // positionSec is the only signal available for partially-watched media; without a
    // known total it is reported as "started" rather than an invented percentage.
    return record.positionSec > 0 ? Math.min(95, Math.max(5, Math.round(record.positionSec / 60))) : 0;
  };

  const refreshYouTube = async (kind: 'video' | 'audio', forceRefresh = false) => {
    const setStatus = kind === 'video' ? setVideoStatus : setAudioStatus;
    const setError = kind === 'video' ? setVideoError : setAudioError;

    const { apiKey } = getYouTubeConfiguration();
    if (!apiKey) {
      setStatus('missing');
      return;
    }

    setStatus('loading');
    setError('');
    try {
      const metadata = await loadYouTubeMetadata(
        languageResources.filter((resource) => resource.kind === kind),
        forceRefresh,
      );
      setYoutubeMetadata((current) => ({ ...current, ...metadata }));
      setStatus('connected');
    } catch (error) {
      setStatus('error');
      setError(error instanceof Error ? error.message : 'Could not load YouTube resources.');
    }
  };

  useEffect(() => {
    // Reset resolved media when the language changes: the previous language's
    // thumbnails must not be shown against a new catalog.
    setYoutubeMetadata({});
    setBookMetadata({});
    setAudioMetadata({});
    setBookCoverStatus('idle');
    setAudioArtworkStatus('idle');
    setVideoStatus('idle');
    setAudioStatus('idle');
    if (languageResources.some((resource) => resource.kind === 'video')) {
      void refreshYouTube('video');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLanguage.code]);

  useEffect(() => {
    if (activeTab !== 'reading' || bookCoverStatus !== 'idle') return;
    const readings = languageResources.filter((resource) => resource.kind === 'reading');
    if (readings.length === 0) return;
    setBookCoverStatus('loading');
    void loadBookCovers(readings)
      .then(setBookMetadata)
      .catch(() => setBookMetadata({}))
      .finally(() => setBookCoverStatus('loaded'));
  }, [activeTab, bookCoverStatus, languageResources]);

  useEffect(() => {
    if (activeTab !== 'audio' || audioArtworkStatus !== 'idle') return;
    const audios = languageResources.filter((resource) => resource.kind === 'audio');
    if (audios.length === 0) return;
    setAudioArtworkStatus('loading');
    void refreshYouTube('audio');
    void loadAudioArtwork(audios)
      .then(setAudioMetadata)
      .catch(() => setAudioMetadata({}))
      .finally(() => setAudioArtworkStatus('loaded'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, audioArtworkStatus, languageResources]);

  /** Levels actually present in the catalog, rather than a hardcoded CEFR list. */
  const availableLevels = useMemo(() => {
    const levels = [...new Set(allResources.filter((r) => r.kind === activeTab).map((r) => r.level))];
    return levels.sort((a, b) => {
      const indexA = LEVEL_ORDER.indexOf(a);
      const indexB = LEVEL_ORDER.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [activeTab, allResources]);

  useEffect(() => {
    // A level selected on one tab may not exist on another.
    if (levelFilter !== 'All' && !availableLevels.includes(levelFilter)) setLevelFilter('All');
  }, [availableLevels, levelFilter]);

  const resolvedMinutes = (resource: ImmersionResource): number => {
    const seconds = youtubeMetadata[resource.id]?.durationSeconds;
    return seconds ? seconds / 60 : durationInMinutes(resource.duration);
  };

  const visibleResources = useMemo(() => {
    const query = search.trim().toLowerCase();

    const resources = allResources.filter((resource) => {
      if (resource.kind !== activeTab) return false;
      if (levelFilter !== 'All' && resource.level !== levelFilter) return false;
      if (unstartedOnly && progressFor(resource.id) > 0) return false;

      const minutes = resolvedMinutes(resource);
      if (lengthFilter === 'Short' && minutes > 20) return false;
      if (lengthFilter === 'Medium' && (minutes <= 20 || minutes > 60)) return false;
      if (lengthFilter === 'Long' && minutes <= 60) return false;

      if (!query) return true;
      const youtube = youtubeMetadata[resource.id];
      const audio = audioMetadata[resource.id];
      return `${youtube?.title ?? resource.title} ${youtube?.channel ?? audio?.creator ?? resource.author ?? ''} ${resource.subtitle} ${resource.category}`
        .toLowerCase()
        .includes(query);
    });

    const sorted = [...resources];
    if (sortMode === 'title') {
      sorted.sort((a, b) =>
        (youtubeMetadata[a.id]?.title ?? a.title).localeCompare(youtubeMetadata[b.id]?.title ?? b.title),
      );
    } else if (sortMode === 'shortest') {
      // Uses resolved YouTube durations, which the length filter already relied on.
      // The old sort read the catalog string and disagreed with its own filter.
      sorted.sort((a, b) => resolvedMinutes(a) - resolvedMinutes(b));
    } else {
      // "Recommended" did nothing at all before. In-progress items come first so the
      // learner can finish what they started, then the closest level match.
      const learnerLevelIndex = LEARNER_LEVEL_TO_CEFR[journeySettings.level] ?? 1;
      sorted.sort((a, b) => {
        const progressA = progressFor(a.id);
        const progressB = progressFor(b.id);
        const startedA = progressA > 0 && progressA < 100 ? 0 : 1;
        const startedB = progressB > 0 && progressB < 100 ? 0 : 1;
        if (startedA !== startedB) return startedA - startedB;

        const finishedA = progressA >= 100 ? 1 : 0;
        const finishedB = progressB >= 100 ? 1 : 0;
        if (finishedA !== finishedB) return finishedA - finishedB;

        const distanceA = Math.abs(LEVEL_ORDER.indexOf(a.level) - learnerLevelIndex);
        const distanceB = Math.abs(LEVEL_ORDER.indexOf(b.level) - learnerLevelIndex);
        return distanceA - distanceB;
      });
    }

    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    allResources,
    journeySettings.level,
    audioMetadata,
    lengthFilter,
    levelFilter,
    search,
    sortMode,
    state.immersionProgress,
    unstartedOnly,
    youtubeMetadata,
  ]);

  const sections = useMemo(() => {
    const categories = [...new Set(visibleResources.map((resource) => resource.category))];
    return categories.map((category) => ({
      category,
      resources: visibleResources.filter((resource) => resource.category === category),
    }));
  }, [visibleResources]);

  /** Only genuinely started material can be "continued". */
  const continueResource = useMemo(
    () =>
      allResources.find((resource) => {
        const progress = progressFor(resource.id);
        return progress > 0 && progress < 100;
      }) ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allResources, state.immersionProgress],
  );

  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label ?? 'Videos';

  const resetFilters = () => {
    setLevelFilter('All');
    setLengthFilter('All');
    setSortMode('recommended');
    setUnstartedOnly(false);
    setSearch('');
  };

  const youtubeStatus = activeTab === 'audio' ? audioStatus : videoStatus;
  const youtubeError = activeTab === 'audio' ? audioError : videoError;

  return (
    <PageContent width="wide" className="pb-20">
      <PageActions>
        {continueResource && (
          <button
            type="button"
            className="page-primary-action"
            onClick={() => navigate(`/immerse/${continueResource.id}`)}
          >
            <Play size={15} fill="currentColor" /> Continue: {continueResource.title}
          </button>
        )}
      </PageActions>

      <div className="grid min-h-[calc(100vh-190px)] grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <main className="min-w-0">
          <section className="sticky top-0 z-30 rounded-[24px] border border-white/10 bg-[#080D1C]/92 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-1 rounded-2xl bg-black/20 p-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const selected = tab.id === activeTab;
                  const count = allResources.filter((resource) => resource.kind === tab.id).length;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12px] font-black transition-all ${
                        selected
                          ? 'bg-[#8B5CF6] text-white shadow-[0_8px_24px_rgba(139,92,246,0.28)]'
                          : 'text-dim hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon size={15} /> {tab.label}
                      <span className={selected ? 'text-white/70' : 'text-dim/70'}>{count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <label className="relative min-w-0 flex-1 lg:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={`Search ${activeTabLabel.toLowerCase()}`}
                    className="w-full rounded-xl border border-white/8 bg-black/20 py-2.5 pl-9 pr-3 text-[12px] text-white outline-none transition-colors placeholder:text-dim/70 focus:border-[#8B5CF6]/50"
                  />
                </label>
                {/* This button did nothing at all before. */}
                <button
                  type="button"
                  aria-label={showFilters ? 'Hide filters' : 'Show filters'}
                  aria-pressed={showFilters}
                  onClick={() => setShowFilters((current) => !current)}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors xl:hidden ${
                    showFilters
                      ? 'border-[#8B5CF6]/40 bg-[#8B5CF6]/15 text-[#C4B5FD]'
                      : 'border-white/8 bg-black/20 text-dim hover:text-white'
                  }`}
                >
                  <SlidersHorizontal size={15} />
                </button>
              </div>
            </div>
          </section>

          {!hasCatalogForLanguage && (
            <div className="mt-8 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] p-5">
              <h2 className="text-[15px] font-black text-white">
                No {activeLanguage.name} immersion catalog yet
              </h2>
              <p className="mt-1.5 text-[12px] leading-relaxed text-dim">
                The bundled catalog currently covers {catalogLanguages.join(', ')}. Rather than showing you material in
                another language, this page stays empty until {activeLanguage.name} content is available. You can still
                import your own books from Settings and they will appear here.
              </p>
            </div>
          )}

          <div className="mt-8 space-y-11">
            {hasCatalogForLanguage && sections.length === 0 && (
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 text-[13px] text-dim">
                Nothing matches these filters.{' '}
                <button type="button" onClick={resetFilters} className="text-[#C4B5FD] underline underline-offset-2">
                  Reset them
                </button>
                .
              </div>
            )}

            {sections.map((section, sectionIndex) => {
              const isExpanded = expandedCategory === section.category;
              const visible = isExpanded ? section.resources : section.resources.slice(0, 6);
              const hasMore = section.resources.length > 6;

              return (
                <motion.section
                  key={section.category}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: sectionIndex * 0.04 }}
                >
                  <div className="mb-4 flex items-end justify-between">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#A78BFA]">{activeTabLabel}</p>
                      <h2 className="mt-1 text-[19px] font-black text-white">{section.category}</h2>
                    </div>
                    {/* "See all" was a dead button on every section. */}
                    {hasMore && (
                      <button
                        type="button"
                        onClick={() => setExpandedCategory(isExpanded ? null : section.category)}
                        className="flex items-center gap-1 text-[11px] font-bold text-dim transition-colors hover:text-white"
                      >
                        {isExpanded ? 'Show less' : `See all ${section.resources.length}`}
                        <ChevronRight size={13} className={isExpanded ? 'rotate-90 transition-transform' : 'transition-transform'} />
                      </button>
                    )}
                  </div>

                  <div
                    className={`grid grid-cols-2 gap-4 sm:grid-cols-3 ${activeTab === 'reading' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}
                  >
                    {visible.map((resource) => (
                      <ResourceCard
                        key={resource.id}
                        resource={resource}
                        youtube={youtubeMetadata[resource.id]}
                        book={bookMetadata[resource.id]}
                        audio={audioMetadata[resource.id]}
                        progressPercent={progressFor(resource.id)}
                        onOpen={() => navigate(`/immerse/${resource.id}`)}
                      />
                    ))}
                  </div>
                </motion.section>
              );
            })}
          </div>
        </main>

        <aside className={`xl:sticky xl:top-0 xl:self-start ${showFilters ? '' : 'hidden xl:block'}`}>
          <div className="rounded-[26px] border border-white/10 bg-[#0B1020]/84 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-[#A78BFA]">
              <SlidersHorizontal size={16} />
              <p className="text-[10px] font-black uppercase tracking-[0.17em]">Browse controls</p>
            </div>

            {continueResource && (
              <button
                type="button"
                onClick={() => navigate(`/immerse/${continueResource.id}`)}
                className="mt-4 w-full overflow-hidden rounded-2xl border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 text-left transition-colors hover:bg-[#8B5CF6]/15"
              >
                <div className={`h-20 bg-gradient-to-br ${continueResource.accent}`} />
                <div className="p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#C4B5FD]">Continue</p>
                  <h3 className="mt-1 truncate text-[13px] font-black text-white">{continueResource.title}</h3>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    {/* Previously Math.max(progress, 8), so an unstarted item showed 8%. */}
                    <div
                      className="h-full rounded-full bg-[#8B5CF6]"
                      style={{ width: `${progressFor(continueResource.id)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[10px] font-semibold text-dim">
                    {progressFor(continueResource.id)}% complete
                  </p>
                </div>
              </button>
            )}

            {activeTab !== 'reading' && (
              <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.025] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Youtube size={15} className="text-red-400" />
                    <div>
                      <h3 className="text-[12px] font-black text-white">
                        {activeTab === 'audio' ? 'YouTube audio streams' : 'YouTube sources'}
                      </h3>
                      <p className="mt-0.5 text-[9px] text-dim">
                        {youtubeStatus === 'connected'
                          ? `${
                              languageResources.filter(
                                (resource) => resource.kind === activeTab && youtubeMetadata[resource.id],
                              ).length
                            } resolved`
                          : youtubeStatus === 'loading'
                            ? 'Resolving…'
                            : youtubeStatus === 'error'
                              ? 'Connection error'
                              : youtubeStatus === 'missing'
                                ? 'API key not configured'
                                : 'Not loaded'}
                      </p>
                    </div>
                  </div>
                  {youtubeStatus === 'missing' ? (
                    <button
                      type="button"
                      onClick={() => navigate('/settings?tab=integrations')}
                      className="rounded-lg border border-red-400/25 bg-red-400/10 px-2.5 py-1.5 text-[9px] font-black text-red-200"
                    >
                      Configure
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={youtubeStatus === 'loading'}
                      onClick={() => void refreshYouTube(activeTab === 'audio' ? 'audio' : 'video', true)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/8 bg-white/[0.025] text-dim hover:text-white disabled:opacity-40"
                    >
                      <RefreshCw size={13} className={youtubeStatus === 'loading' ? 'animate-spin' : ''} />
                    </button>
                  )}
                </div>
                {youtubeError && (
                  <p className="mt-2 rounded-lg border border-rose-400/20 bg-rose-400/8 px-2.5 py-2 text-[9px] leading-relaxed text-rose-200">
                    {youtubeError}
                  </p>
                )}
              </div>
            )}

            {activeTab === 'reading' && (
              <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.025] p-3">
                <div className="flex items-center gap-3">
                  <BookOpen size={15} className="text-emerald-300" />
                  <div>
                    <h3 className="text-[11px] font-black text-white">Public-domain library</h3>
                    <p className="mt-0.5 text-[9px] text-dim">
                      {bookCoverStatus === 'loading'
                        ? 'Resolving covers…'
                        : `${Object.keys(bookMetadata).length} covers · Gutenberg text`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 border-t border-white/8 pt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-[12px] font-black text-white">Refine results</h3>
                <span className="text-[9px] font-black uppercase tracking-wider text-[#A78BFA]">
                  {visibleResources.length} found
                </span>
              </div>

              <div className="mt-3 space-y-2">
                <label className="block rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5">
                  <span className="block text-[8px] font-black uppercase tracking-wider text-dim">Level</span>
                  <select
                    value={levelFilter}
                    onChange={(event) => setLevelFilter(event.target.value)}
                    className="mt-1 w-full bg-transparent text-[11px] font-black text-white outline-none"
                  >
                    {/* Options come from the catalog rather than a fixed A2/B1/B2/C1 list. */}
                    <option className="bg-[#0B1020]">All</option>
                    {availableLevels.map((level) => (
                      <option key={level} className="bg-[#0B1020]">
                        {level}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5">
                    <span className="block text-[8px] font-black uppercase tracking-wider text-dim">Length</span>
                    <select
                      value={lengthFilter}
                      onChange={(event) => setLengthFilter(event.target.value)}
                      className="mt-1 w-full bg-transparent text-[11px] font-black text-white outline-none"
                    >
                      <option className="bg-[#0B1020]">All</option>
                      <option className="bg-[#0B1020]">Short</option>
                      <option className="bg-[#0B1020]">Medium</option>
                      <option className="bg-[#0B1020]">Long</option>
                    </select>
                  </label>
                  <label className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5">
                    <span className="block text-[8px] font-black uppercase tracking-wider text-dim">Sort</span>
                    <select
                      value={sortMode}
                      onChange={(event) => setSortMode(event.target.value as SortMode)}
                      className="mt-1 w-full bg-transparent text-[11px] font-black text-white outline-none"
                    >
                      <option value="recommended" className="bg-[#0B1020]">
                        Recommended
                      </option>
                      <option value="title" className="bg-[#0B1020]">
                        Title
                      </option>
                      <option value="shortest" className="bg-[#0B1020]">
                        Shortest
                      </option>
                    </select>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => setUnstartedOnly((current) => !current)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left ${
                    unstartedOnly ? 'border-[#8B5CF6]/40 bg-[#8B5CF6]/15' : 'border-white/8 bg-white/[0.025]'
                  }`}
                >
                  <span>
                    <span className="block text-[10px] font-black text-white">Unstarted only</span>
                    <span className="mt-0.5 block text-[8px] text-dim">Hide anything already in progress</span>
                  </span>
                  <span className={`relative h-5 w-9 rounded-full ${unstartedOnly ? 'bg-[#8B5CF6]' : 'bg-white/10'}`}>
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                        unstartedOnly ? 'translate-x-[18px]' : 'translate-x-0.5'
                      }`}
                    />
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 w-full rounded-xl border border-white/8 py-2.5 text-[10px] font-black text-dim transition-colors hover:bg-white/[0.03] hover:text-white"
              >
                Reset filters
              </button>
            </div>
          </div>
        </aside>
      </div>
    </PageContent>
  );
}
