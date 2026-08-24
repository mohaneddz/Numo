import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  BookOpen,
  MessageCircle,
  ChevronRight,
  Star,
  Plus,
  Sparkles,
  LayoutGrid,
  Clock,
  Bookmark,
  Flame,
  CheckCircle2,
  MoreHorizontal,
} from 'lucide-react';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import RemoteImage from '../../components/ui/RemoteImage';
import {
  PageActions,
  PageContent,
  PageMainColumn,
  PageMainSidebarLayout,
  PageSidebar,
} from '../../components/layout/PageLayout';
import { useAppData } from '../../contexts/AppDataContext';
import { buildActionUrl, buildTemplateUrl } from '../../navigation/actionTemplates';
import { useLanguage } from '../../contexts/LanguageContext';
import NotebookSectionNav from '../../components/notebook/NotebookSectionNav';

const TABS = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'words', label: 'Words', icon: BookOpen },
  { id: 'phrases', label: 'Phrases', icon: MessageCircle },
] as const;

export default function NotebookPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('all');
  const [activeListTab, setActiveListTab] = useState<'favorites' | 'recent' | 'more'>('favorites');
  const [search, setSearch] = useState('');
  const [listLimit, setListLimit] = useState(16);
  const [explorerLimit, setExplorerLimit] = useState(8);
  const [collectionMode, setCollectionMode] = useState<'words' | 'phrases'>('words');
  const { state, flashCardCount } = useAppData();

  useEffect(() => {
    const viewOpt = searchParams.get('view');
    if (viewOpt === 'writing') {
      setActiveListTab('more');
      setSearchParams(new URLSearchParams());
    }

    const actionOpt = searchParams.get('action');
    if (actionOpt === 'new' || actionOpt === 'new_collection') {
      // Mock action logic
      alert(`[Mock] Action ${actionOpt} invoked on Notebook page!`);
      // Clear action param after handling
      setSearchParams(new URLSearchParams());
    }
  }, [searchParams, setSearchParams]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return state.notebookEntries.filter((item) => {
      if (activeTab === 'words' && item.type !== 'word') {
        return false;
      }
      if (activeTab === 'phrases' && item.type !== 'phrase') {
        return false;
      }
      if (!query) {
        return true;
      }

      return [item.term, item.translation, item.context ?? '', item.tags.join(' ')].some((value) =>
        value.toLowerCase().includes(query),
      );
    });
  }, [activeTab, search, state.notebookEntries]);

  const favorites = useMemo(() => {
    const fav = filteredItems.filter((item) => item.favorited);
    return fav.length > 0 ? fav : filteredItems;
  }, [filteredItems]);

  const listItems = useMemo(() => {
    if (activeListTab === 'favorites') {
      return favorites.slice(0, listLimit);
    }
    if (activeListTab === 'recent') {
      return [...filteredItems]
        .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
        .slice(0, listLimit);
    }
    return filteredItems.slice(0, listLimit);
  }, [activeListTab, favorites, filteredItems, listLimit]);

  const explorerItems = useMemo(() => {
    const base = filteredItems.filter((item) => item.type === 'word' || item.type === 'phrase');
    if (activeListTab === 'recent') {
      return [...base]
        .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
        .slice(0, explorerLimit);
    }
    return base.slice(0, explorerLimit);
  }, [activeListTab, explorerLimit, filteredItems]);

  return (
    <PageContent className="pb-12" width="wide">
      <PageActions>
        <NotebookSectionNav />
        <div className="flex gap-2">
          <Link to="/review/session?mode=due-now" className="no-underline">
            <button className="page-primary-action">
              <Sparkles size={16} /> Flash Cards ({flashCardCount})
            </button>
          </Link>
          <button
            className="page-primary-action"
            onClick={() =>
              navigate(
                buildActionUrl('notebook_new_item', {
                  params: { from: '/notebook', lang: activeLanguage.code },
                }),
              )
            }
          >
            <Plus size={16} /> New Item
          </button>
        </div>
      </PageActions>

      <PageMainSidebarLayout>
        <PageMainColumn>
          <div className="flex justify-between items-center bg-graphite/30 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
            <div className="flex gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-violet text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]'
                      : 'text-dim hover:text-mist hover:bg-white/5'
                  }`}
                >
                  <tab.icon size={15} />
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pr-2 flex-1 max-w-xs">
              <div className="relative w-full group">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-violet transition-colors"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search your notebook..."
                  className="bg-black/20 border border-white/5 rounded-lg pl-9 pr-4 py-1.5 text-[12px] text-mist focus:outline-none focus:ring-1 focus:ring-violet/50 w-full transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center bg-violet/5 p-3 rounded-2xl border border-violet/10">
            <div className="flex items-center gap-6 px-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet" />
                <span className="text-[13px] font-bold text-mist">Flash Cards</span>
                <span className="text-[13px] text-dim font-medium">{flashCardCount}</span>
              </div>
            </div>
            <Link to="/review/session?mode=due-now" className="no-underline">
              <button className="flex items-center gap-2 bg-violet/10 hover:bg-violet/20 border border-violet/20 px-4 py-1.5 rounded-xl transition-all">
                <Sparkles size={14} className="text-violet" />
                <span className="text-[12px] font-bold text-mist">Start Flash Cards</span>
              </button>
            </Link>
          </div>

          <SpotlightCard interactive className="relative overflow-hidden group h-[200px]">
            <RemoteImage
              src="https://images.unsplash.com/photo-1539037116277-4db20889f2d4?q=80&w=2670&auto=format&fit=crop"
              alt="Barcelona Night"
              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent" />
            <div className="relative z-10 p-8 h-full flex flex-col justify-end">
              <h3 className="text-2xl font-bold text-white mb-1">Notebook to Flash Cards</h3>
              <p className="text-mist/80 text-[14px] font-medium tracking-wide">Save in Notebook, review in Flash Cards.</p>
            </div>
          </SpotlightCard>

          <section>
            <div className="flex gap-4 mb-4 items-center">
              {[
                { id: 'favorites', label: 'Favorites', icon: Star },
                { id: 'recent', label: 'Recent', icon: Clock },
                { id: 'more', label: 'More all', icon: MoreHorizontal },
              ].map((seg) => (
                <button
                  key={seg.id}
                  onClick={() => setActiveListTab(seg.id as 'favorites' | 'recent' | 'more')}
                  className={`flex items-center gap-2 text-[14px] font-bold pb-1 px-1 transition-all border-b-2 ${
                    activeListTab === seg.id ? 'text-violet border-violet' : 'text-dim border-transparent hover:text-mist'
                  }`}
                >
                  <seg.icon size={14} />
                  {seg.label}
                </button>
              ))}
            </div>

            <SpotlightCard className="overflow-hidden">
              <div className="p-4 bg-white/5 border-b border-white/5 flex items-center gap-2 text-violet font-bold text-[13px]">
                <Star size={14} fill="currentColor" />
                {activeListTab === 'favorites' ? 'Favorites' : activeListTab === 'recent' ? 'Recent' : 'All Matches'}
              </div>
              <div className="divide-y divide-white/5">
                {listItems.map((item) => (
                  <div key={item.id} className="p-4 flex justify-between items-center hover:bg-white/[0.02] transition-colors group">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-graphite flex items-center justify-center border border-white/5 group-hover:border-violet/30 transition-colors">
                        <BookOpen size={18} className="text-dim group-hover:text-violet transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <Link to={`/notebook/${item.id}`} className="no-underline">
                          <p className="text-[15px] font-bold text-mist group-hover:text-white transition-colors truncate">{item.term}</p>
                        </Link>
                        <p className="text-[12px] text-dim truncate">{item.translation}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[11px] text-dim font-bold uppercase tracking-widest">{item.type}</span>
                      <Link to="/review/session?mode=due-now" className="no-underline">
                        <button className="px-3 py-1 rounded-lg text-[11px] font-bold bg-violet/10 hover:bg-violet/20 border border-violet/20 text-mist">
                          Review in Flash Cards
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
                {listItems.length === 0 && <div className="p-4 text-[12px] text-dim">No entries match this filter.</div>}
              </div>
              <div className="p-3 bg-black/20 flex justify-between items-center px-6">
                <button
                  className="text-[11px] text-dim hover:text-mist font-bold uppercase transition-colors"
                  onClick={() => setListLimit((prev) => Math.min(filteredItems.length, prev + 16))}
                >
                  View All
                </button>
                <button
                  className="text-[11px] text-dim hover:text-mist font-bold uppercase transition-colors flex items-center gap-1"
                  onClick={() => setListLimit((prev) => Math.min(filteredItems.length, prev + 16))}
                >
                  View All <ChevronRight size={10} />
                </button>
              </div>
            </SpotlightCard>
          </section>

          <section>
            <h2 className="text-[16px] font-bold mb-4 text-mist uppercase tracking-widest flex items-center gap-2">Word Explorer</h2>
            <div className="flex flex-col gap-3">
              {explorerItems.map((item) => (
                <SpotlightCard key={item.id} className="p-5 group">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex gap-4 items-start min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-violet/10 border border-violet/20 flex items-center justify-center text-violet mt-1 group-hover:scale-110 transition-transform">
                        <Sparkles size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <Link to={`/notebook/${item.id}`} className="no-underline">
                            <h3 className="text-lg font-bold text-mist truncate">{item.term}</h3>
                          </Link>
                          <span className="text-[12px] text-dim font-medium italic truncate">{item.translation}</span>
                        </div>
                        {item.context && <p className="text-[13px] text-mist/70 mb-3 italic">"{item.context}"</p>}
                        <div className="flex gap-2">
                          {item.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] text-dim-dark font-bold uppercase">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-mist tracking-tighter bg-violet/10 px-2 py-0.5 rounded-lg border border-violet/20">
                        <Plus size={10} className="text-violet" /> 1+
                        <MoreHorizontal size={10} className="text-dim ml-1" />
                      </div>
                      <Link to="/review/session?mode=due-now" className="no-underline">
                        <button className="px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[12px] font-bold text-mist transition-all group-hover:border-violet/30">
                          Review in Flash Cards
                        </button>
                      </Link>
                    </div>
                  </div>
                </SpotlightCard>
              ))}
              {explorerItems.length === 0 && (
                <SpotlightCard className="p-5 text-[12px] text-dim">No word or phrase entries yet. Add notebook entries to build your flash-card queue.</SpotlightCard>
              )}
              <button
                className="w-full mt-2 py-3 bg-graphite/40 hover:bg-graphite/60 border border-white/5 rounded-xl text-[12px] font-bold text-mist transition-all flex items-center justify-center gap-2 group"
                onClick={() => setExplorerLimit((prev) => Math.min(filteredItems.length, prev + 8))}
              >
                View More <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </section>
        </PageMainColumn>

        <PageSidebar className="gap-6 pt-2">
          <section>
            <h2 className="text-[15px] font-bold text-mist mb-4 px-1 uppercase tracking-widest">Your Collections</h2>
            <SpotlightCard className="p-4">
              <div className="flex gap-1 p-1 bg-black/30 rounded-xl mb-4">
                <button
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${collectionMode === 'words' ? 'bg-graphite/60 text-mist shadow-sm' : 'text-dim hover:text-mist'}`}
                  onClick={() => setCollectionMode('words')}
                >
                  Words
                </button>
                <button
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${collectionMode === 'phrases' ? 'bg-graphite/60 text-mist shadow-sm' : 'text-dim hover:text-mist'}`}
                  onClick={() => setCollectionMode('phrases')}
                >
                  Phrases
                </button>
              </div>

              <div className="flex justify-between items-center mb-4 px-1">
                <span className="text-[12px] text-dim font-medium">
                  <span className="text-mist font-bold">{flashCardCount}</span> Ready for Flash Cards
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {[
                  { label: 'Daily Life', icon: Bookmark, color: 'text-violet', bg: 'bg-violet/10', border: 'border-violet/20' },
                  { label: 'Trips & Travel', icon: Bookmark, color: 'text-cyan', bg: 'bg-cyan/10', border: 'border-cyan/20' },
                  { label: 'Restaurant Talk', icon: Bookmark, color: 'text-amber', bg: 'bg-amber/10', border: 'border-amber/20' },
                ].map((col, i) => (
                  <button
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/20 hover:bg-black/30 transition-all group"
                    onClick={() =>
                      navigate(
                        buildTemplateUrl({
                          templateId: 'notebook-collection',
                          entityId: col.label.toLowerCase().replace(/\s+/g, '-'),
                          params: { from: '/notebook', lang: activeLanguage.code, tab: collectionMode },
                        }),
                      )
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${col.bg} ${col.border} border flex items-center justify-center ${col.color}`}>
                        <col.icon size={16} fill="currentColor" />
                      </div>
                      <span className="text-[13px] font-bold text-mist group-hover:text-white transition-colors">{col.label}</span>
                    </div>
                    <ChevronRight size={14} className="text-dim-dark" />
                  </button>
                ))}
              </div>
            </SpotlightCard>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-mist mb-4 px-1 uppercase tracking-widest">Notepad</h2>
            <SpotlightCard className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-[15px] font-black text-mist leading-none">{state.notebookEntries.filter((e) => e.type === 'word').length}</span>
                    <span className="text-[9px] text-dim uppercase font-bold tracking-tighter">Words</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[15px] font-black text-mist leading-none">{state.notebookEntries.filter((e) => e.type === 'phrase').length}</span>
                    <span className="text-[9px] text-dim uppercase font-bold tracking-tighter">Phrases</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[15px] font-black text-mist leading-none">{state.notebookEntries.filter((e) => e.type === 'grammar').length}</span>
                    <span className="text-[9px] text-dim uppercase font-bold tracking-tighter">Grammar</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber/10 border border-amber/20 rounded-xl p-3 flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-amber animate-bounce" fill="currentColor" />
                  <span className="text-[13px] font-bold text-amber capitalize">Flash Cards Active</span>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-dim-dark font-bold uppercase leading-tight">Queue: {flashCardCount}</p>
                  <p className="text-[9px] text-dim-dark font-bold uppercase leading-tight">Single smart deck</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-mist">{state.notebookEntries.length} <span className="text-dim-dark font-medium">Notebook items</span></span>
                  <span className="text-mist">{flashCardCount} <span className="text-dim-dark font-medium">Flash cards</span></span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-mist">{listItems.length} <span className="text-dim-dark font-medium">Visible</span></span>
                  <CheckCircle2 size={12} className="text-dim" />
                </div>
              </div>
            </SpotlightCard>
          </section>
        </PageSidebar>
      </PageMainSidebarLayout>
    </PageContent>
  );
}
