import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import RemoteImage from '../../components/ui/RemoteImage';
import { PageActions, PageContent, PageMainColumn, PageMainSidebarLayout, PageSidebar } from '../../components/layout/PageLayout';
import {
  Zap,
  SlidersHorizontal,
  Search,
  ChevronRight,
  ChevronDown,
  Play,
  Bookmark,
  Volume2,
  Maximize2,
  Bell,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { buildTemplateUrl } from '../../navigation/actionTemplates';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppData } from '../../contexts/AppDataContext';
import { integrationService, type LibraryApprovedItem } from '../../services/integrationService';
import { useCardBackground } from '../../hooks/useCardBackground';

type ImmerseTab = 'Stories' | 'Dialogues' | 'Podcasts' | 'Clips';
type SortMode = 'latest' | 'progress' | 'duration';

interface ImmerseContent {
  id: string;
  contentId: string;
  title: string;
  subtitle: string;
  tab: ImmerseTab;
  minutes: number;
  level: string;
  progress: number;
  image: string;
  tags: string[];
}

function ImmersionCardImage({
  item,
  languageCode,
  languageName,
  className,
  fallbackSrc,
}: {
  item: ImmerseContent;
  languageCode: string;
  languageName: string;
  className: string;
  fallbackSrc: string;
}) {
  const background = useCardBackground({
    itemKey: `immersion:${languageCode}:${item.contentId}`,
    itemType: 'immersion',
    languageCode,
    languageName,
    title: item.title,
    description: item.subtitle,
    topicTags: item.tags,
    cardType: item.tab.toLowerCase(),
    mood: 'cinematic immersive',
    fallbackAsset: item.image || fallbackSrc,
  });

  const isFallback = !background.selection || background.selection.provider === 'fallback';

  if (isFallback) {
    return <div className={`bg-gradient-to-br from-[#1E1B4B] to-[#0A0F24] flex items-center justify-center ${className}`}><span className="opacity-20 text-[64px]">🖼️</span></div>;
  }

  return <RemoteImage src={background.source} fallbackSrc={fallbackSrc} className={className} alt={item.title} />;
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' },
};

const fallbackImage = '/continue_learning.png';
const TABS: ImmerseTab[] = ['Stories', 'Dialogues', 'Podcasts', 'Clips'];

function mapContentTypeToTab(contentType: string): ImmerseTab {
  const normalized = contentType.toLowerCase();
  if (normalized.includes('dialog')) return 'Dialogues';
  if (normalized.includes('podcast') || normalized.includes('audio')) return 'Podcasts';
  if (normalized.includes('video') || normalized.includes('clip')) return 'Clips';
  return 'Stories';
}

function toImmerseItem(item: LibraryApprovedItem, progressByContentId: Record<string, { positionSec: number; completed: boolean }>): ImmerseContent {
  const metadata = item.metadata ?? {};
  const durationFromMeta = Number(metadata.durationSec ?? metadata.durationSeconds ?? 0);
  const durationSec = Number.isFinite(durationFromMeta) && durationFromMeta > 0
    ? durationFromMeta
    : Number(item.estimatedDurationSec ?? 0);

  const minutes = Math.max(1, Math.round((durationSec > 0 ? durationSec : 300) / 60));
  const progressState = progressByContentId[item.contentItemId];
  const computedProgress = progressState
    ? (progressState.completed
      ? 100
      : durationSec > 0
        ? Math.max(0, Math.min(99, Math.round((progressState.positionSec / durationSec) * 100)))
        : 0)
    : 0;

  const image = typeof metadata.imageUrl === 'string' && metadata.imageUrl.trim() ? metadata.imageUrl.trim() : fallbackImage;
  const level = item.difficultyBand ?? (typeof metadata.level === 'string' ? metadata.level : 'Unknown');

  return {
    id: item.contentItemId,
    contentId: item.contentItemId,
    title: item.title,
    subtitle: item.summary || 'No summary yet',
    tab: mapContentTypeToTab(item.contentType),
    minutes,
    level,
    progress: computedProgress,
    image,
    tags: item.tags,
  };
}

export default function ImmersePage() {
  const navigate = useNavigate();
  const { activeLanguage } = useLanguage();
  const { state } = useAppData();

  const [activeTab, setActiveTab] = useState<ImmerseTab>('Stories');
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('latest');
  const [needsWorkOnly, setNeedsWorkOnly] = useState(false);
  const [contentItems, setContentItems] = useState<LibraryApprovedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const approved = await integrationService.listApprovedContent(activeLanguage.code);
        if (!cancelled) {
          setContentItems(approved);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load immerse content.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeLanguage.code]);

  const progressByContentId = useMemo(() => {
    const output: Record<string, { positionSec: number; completed: boolean }> = {};
    Object.entries(state.immersionProgress).forEach(([contentId, progress]) => {
      output[contentId] = {
        positionSec: progress.positionSec,
        completed: progress.completed,
      };
    });
    return output;
  }, [state.immersionProgress]);

  const immerseContent = useMemo(
    () => contentItems.map((item) => toImmerseItem(item, progressByContentId)),
    [contentItems, progressByContentId],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    const output = immerseContent.filter((item) => {
      if (item.tab !== activeTab) return false;
      if (needsWorkOnly && item.progress >= 70) return false;
      if (!query) return true;

      return [item.title, item.subtitle, item.level, ...item.tags].some((value) =>
        value.toLowerCase().includes(query),
      );
    });

    output.sort((a, b) => {
      if (sortMode === 'progress') return b.progress - a.progress;
      if (sortMode === 'duration') return a.minutes - b.minutes;
      return b.id.localeCompare(a.id);
    });

    return output;
  }, [activeTab, immerseContent, needsWorkOnly, search, sortMode]);

  const featured = filtered[0];
  const recommended = filtered.slice(1, 6);
  const clips = filtered.slice(6, 10);
  const active = filtered[0];
  const savedPhrases = active ? state.immersionProgress[active.contentId]?.savedPhrases ?? [] : [];
  const featuredBackground = useCardBackground(
    featured
      ? {
          itemKey: `immersion:${activeLanguage.code}:${featured.contentId}`,
          itemType: 'immersion',
          languageCode: activeLanguage.code,
          languageName: activeLanguage.name,
          title: featured.title,
          description: featured.subtitle,
          topicTags: featured.tags,
          cardType: featured.tab.toLowerCase(),
          mood: 'cinematic immersive',
          fallbackAsset: featured.image || fallbackImage,
        }
      : null,
  );
  
  const isFeaturedFallback = !featuredBackground.selection || featuredBackground.selection.provider === 'fallback';

  return (
    <PageContent className="pb-24 relative" width="wide">
      <PageActions>
        <button className="page-primary-action" onClick={() => navigate('/review/session?mode=due-now')}>
          <Zap size={16} fill="currentColor" /> Smart Review
        </button>
      </PageActions>

      <PageMainSidebarLayout>
        <PageMainColumn className="gap-10">
          <div className="sticky top-0 z-20 flex justify-between items-center bg-graphite/30 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {TABS.map((pill) => (
                <button
                  key={pill}
                  onClick={() => setActiveTab(pill)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${
                    activeTab === pill ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'text-dim hover:text-mist hover:bg-white/5'
                  }`}
                >
                  {pill}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pr-2 shrink-0">
              <div className="relative group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-indigo-400 transition-colors" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  type="text"
                  placeholder={`Search ${activeTab.toLowerCase()}...`}
                  className="bg-black/20 border border-white/5 rounded-lg pl-9 pr-4 py-1.5 text-[12px] text-mist focus:outline-none focus:ring-1 focus:ring-indigo-500/50 w-48 transition-all"
                />
              </div>
              <button
                onClick={() => setSortMode((prev) => (prev === 'latest' ? 'progress' : prev === 'progress' ? 'duration' : 'latest'))}
                className="flex items-center gap-2 text-[12px] font-medium text-dim bg-black/20 border border-white/5 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-white/5 transition-all"
              >
                <span>Sort:</span>
                <span className="text-mist font-bold capitalize">{sortMode}</span>
                <ChevronDown size={14} className="text-dim" />
              </button>
              <button
                onClick={() => setNeedsWorkOnly((prev) => !prev)}
                className={`w-8 h-8 rounded-full flex items-center justify-center border border-white/10 ${needsWorkOnly ? 'text-indigo-400 bg-indigo-500/10' : 'text-dim bg-black/20'}`}
                title="Needs work only"
              >
                <SlidersHorizontal size={14} />
              </button>
            </div>
          </div>

          <motion.div {...fadeUp}>
            <SpotlightCard
              interactive
              className="p-0 border border-white/10 overflow-hidden w-full h-[280px] group cursor-pointer relative shadow-[0_0_40px_rgba(0,0,0,0.3)]"
              onClick={() =>
                navigate(
                  featured
                    ? `/immerse/${featured.contentId}`
                    : buildTemplateUrl({
                        templateId: 'immerse-empty-state',
                        params: {
                          from: '/immerse',
                          lang: activeLanguage.code,
                          tab: activeTab,
                          q: search,
                          sort: sortMode,
                          needsWork: needsWorkOnly,
                        },
                      }),
                )
              }
            >
              {!isFeaturedFallback && <RemoteImage src={featuredBackground.source} fallbackSrc={fallbackImage} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="featured" />}
              <div className={`absolute inset-0 ${isFeaturedFallback ? 'bg-gradient-to-r from-[#171033] via-[#0b1020] to-[#0A0F24]' : 'bg-gradient-to-t from-[#0B1020] via-[#0B1020]/40 to-transparent'}`} />

              <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col">
                <h2 className="text-[28px] font-bold text-white tracking-tight mb-4 drop-shadow-lg">{featured?.title ?? 'No approved content yet'}</h2>
                <div className="flex items-center gap-4 text-[13px] font-medium text-mist w-full">
                  <span>{featured?.minutes ?? 0} min</span>
                  <span className="text-dim uppercase tracking-wider text-[11px] font-bold">{featured?.level ?? 'N/A'}</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full mx-2 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${featured?.progress ?? 0}%` }} />
                  </div>
                  <span className="font-bold text-white">{featured?.progress ?? 0}%</span>
                </div>
              </div>
            </SpotlightCard>
          </motion.div>

          {loading && <p className="text-[13px] text-dim">Loading immerse content...</p>}
          {error && <p className="text-[13px] text-rose-300">{error}</p>}

          <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
            <h3 className="text-[16px] font-bold text-white mb-5 pl-2">Recommended {activeTab}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {recommended.map((item) => (
                <SpotlightCard
                  key={item.id}
                  interactive
                  className="p-0 border border-white/5 overflow-hidden flex flex-col group cursor-pointer"
                  onClick={() => navigate(`/immerse/${item.contentId}`)}
                >
                  <div className="h-[140px] w-full overflow-hidden relative">
                    <ImmersionCardImage
                      item={item}
                      languageCode={activeLanguage.code}
                      languageName={activeLanguage.name}
                      fallbackSrc={fallbackImage}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="p-5 flex flex-col bg-[#0F172A]/70 flex-1">
                    <h4 className="text-[16px] font-bold text-white mb-3 tracking-tight">{item.title}</h4>
                    <div className="flex items-center justify-between text-[12px] font-medium text-dim mb-4">
                      <span>{item.minutes} min</span>
                      <span className="uppercase tracking-wide text-[10px] font-bold bg-white/5 px-2 py-1 rounded-md">{item.level}</span>
                      <span className="text-mist font-bold">{item.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${item.progress}%` }} />
                    </div>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
            <h3 className="text-[16px] font-bold text-white mb-5 pl-2">Conversational Clips</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {clips.map((clip) => (
                <SpotlightCard
                  key={clip.id}
                  interactive
                  className="p-0 border border-white/5 overflow-hidden flex flex-col group cursor-pointer relative aspect-video"
                  onClick={() => navigate(`/immerse/${clip.contentId}`)}
                >
                  <ImmersionCardImage
                    item={clip}
                    languageCode={activeLanguage.code}
                    languageName={activeLanguage.name}
                    fallbackSrc={fallbackImage}
                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1020]/90 to-transparent" />

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-14 h-14 rounded-full bg-blue-600/40 border border-blue-400/50 flex items-center justify-center backdrop-blur-md shadow-[0_0_30px_rgba(37,99,235,0.6)] group-hover:scale-110 transition-transform">
                      <Play size={24} fill="white" strokeWidth={0} className="text-white ml-1 opacity-90" />
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 w-full p-4 flex flex-col">
                    <h4 className="text-[15px] font-bold text-white mb-2 tracking-tight">{clip.title}</h4>
                    <div className="flex items-center gap-3 text-[11px] font-medium text-dim">
                      <span>{clip.minutes} min</span>
                      <span className="uppercase tracking-wide font-bold bg-[#161B2C]/80 border border-white/5 px-2 py-0.5 rounded text-indigo-300">{clip.level}</span>
                      <span className="text-mist font-bold ml-auto">{clip.progress}%</span>
                    </div>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </motion.div>
        </PageMainColumn>

        <PageSidebar className="gap-0">
          <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="flex flex-col gap-6">
            <SpotlightCard className="p-0 border border-indigo-500/20 overflow-hidden shadow-[0_0_30px_rgba(99,102,241,0.1)]">
              <div className="h-[220px] w-full relative">
                {active ? (
                  <ImmersionCardImage
                    item={active}
                    languageCode={activeLanguage.code}
                    languageName={activeLanguage.name}
                    fallbackSrc={fallbackImage}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <RemoteImage src={fallbackImage} fallbackSrc={fallbackImage} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/30 to-transparent" />
              </div>
              <div className="p-5 flex flex-col bg-[#0F172A]">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-[18px] font-bold text-white tracking-tight leading-snug truncate">{active?.title ?? 'No content selected'}</h3>
                  <ChevronRight size={18} className="text-dim" />
                </div>
                <div className="flex items-center justify-between text-[12px] font-medium">
                  <div className="flex items-center gap-2 text-blue-400 font-bold">
                    <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Check size={10} strokeWidth={4} />
                    </div>
                    {active?.level ?? 'N/A'}
                  </div>
                  <div className="flex items-center justify-between gap-3 flex-1 ml-6">
                    <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: `${active?.progress ?? 0}%` }} />
                    </div>
                    <span className="text-mist font-bold">{active?.progress ?? 0}%</span>
                  </div>
                </div>
              </div>
            </SpotlightCard>

            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-[16px] font-bold text-white">Summary</h3>
                <button
                  className="flex items-center gap-2 bg-[#161B2C] border border-white/5 rounded-lg px-2 py-1 text-dim text-[12px] cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() =>
                    navigate(
                      buildTemplateUrl({
                        templateId: 'immerse-transcript-view',
                        params: { from: '/immerse', lang: activeLanguage.code, clip: active?.contentId },
                      }),
                    )
                  }
                >
                  <Volume2 size={14} /> <span className="mx-1">~</span> <Maximize2 size={12} />
                </button>
              </div>
              <SpotlightCard className="p-5 border border-white/5 bg-[#0F172A]/40 min-h-[160px] flex flex-col justify-between">
                <div className="flex flex-col gap-4 text-[14px] text-[#94a3b8] leading-relaxed mb-6 font-medium">
                  <p>{active?.subtitle ?? 'No summary available for this item.'}</p>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <button
                    className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-mist text-[12px] font-bold hover:bg-white/10 transition-colors"
                    onClick={() => active && navigate(`/immerse/${active.contentId}`)}
                  >
                    Open Content
                  </button>
                  <button
                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-dim hover:text-white"
                    onClick={() =>
                      navigate(
                        buildTemplateUrl({
                          templateId: 'immerse-bookmark',
                          entityId: active?.contentId,
                          params: { from: '/immerse', lang: activeLanguage.code },
                        }),
                      )
                    }
                  >
                    <Bookmark size={14} />
                  </button>
                </div>
              </SpotlightCard>
            </div>

            <SpotlightCard className="p-5 border border-indigo-500/20 bg-[#0A0D18]">
              <h4 className="text-[17px] font-bold text-white mb-4">{active?.subtitle ?? 'No subtitle'}</h4>
              <div className="flex items-center justify-between text-[12px] font-medium text-dim">
                <div className="flex items-center gap-2">
                  Memory Status
                  <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Bell size={12} />
                  </span>
                </div>
                <span>{savedPhrases.length} saved phrases</span>
              </div>
            </SpotlightCard>

            <div>
              <h3 className="text-[16px] font-bold text-white mb-3 px-1">Saved Phrases</h3>
              <div className="flex flex-col gap-2">
                {savedPhrases.length === 0 && (
                  <SpotlightCard className="p-4 border border-white/5 text-[13px] text-dim">
                    No phrases saved yet from this content.
                  </SpotlightCard>
                )}
                {savedPhrases.map((phrase) => (
                  <SpotlightCard key={phrase} className="p-3.5 px-5 border border-white/5 flex items-center justify-between">
                    <span className="text-[14px] font-bold text-white mr-2">{phrase}</span>
                    <button
                      className="px-4 py-1.5 rounded-lg bg-[#1E293B] border border-white/5 text-mist text-[12px] font-bold transition-all"
                      onClick={() =>
                        navigate(
                          buildTemplateUrl({
                            templateId: 'immerse-save-vocab',
                            entityId: active?.contentId,
                            params: { from: '/immerse', lang: activeLanguage.code, term: phrase },
                          }),
                        )
                      }
                    >
                      Save
                    </button>
                  </SpotlightCard>
                ))}
              </div>
            </div>
          </motion.div>
        </PageSidebar>
      </PageMainSidebarLayout>
    </PageContent>
  );
}
