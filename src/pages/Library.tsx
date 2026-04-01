import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Play,
  Mic,
  Edit2,
  Star,
  ChevronDown,
  Filter,
  FileText,
  Volume2,
  AlertTriangle,
  MessageSquare,
  Briefcase,
  Book,
  CheckCircle2,
  Mic2,
  ArrowRight,
} from 'lucide-react';
import {
  PageActions,
  PageContent,
  PageMainColumn,
  PageMainSidebarLayout,
  PageSidebar,
} from '../components/layout/PageLayout';
import { SpotlightCard } from '../components/ui/SpotlightCard';
import { buildActionUrl, buildTemplateUrl } from '../navigation/actionTemplates';
import { useLanguage } from '../contexts/LanguageContext';
import { integrationService, type ApprovalQueueItem, type LibraryApprovedItem } from '../services/integrationService';
import type { ContentRevisionRecord } from '../persistence/types';

type ItemType = 'words' | 'phrases' | 'sentences' | 'audio';
type ActivityType = 'Speak' | 'Learn' | 'Write';

interface LibraryItem {
  id: string;
  term: string;
  context: string;
  language: string;
  langIcon: string;
  activity: ActivityType;
  type: ItemType;
  time: string;
  starred: boolean;
  isRecent: boolean;
}

const filters = [
  { id: 'words', label: 'Words', icon: FileText },
  { id: 'phrases', label: 'Phrases', icon: MessageSquare },
  { id: 'sentences', label: 'Sentences', icon: Play },
  { id: 'audio', label: 'Audio', icon: Volume2 },
];

const languages = [
  { label: 'All Languages', code: 'all' },
  { label: 'Spanish', code: 'Spanish' },
  { label: 'French', code: 'French' },
  { label: 'German', code: 'German' },
  { label: 'Chinese', code: 'Chinese' },
  { label: 'Japanese', code: 'Japanese' },
] as const;

const collectionVisuals = [
  { color: 'from-orange-500/20 to-rose-500/20', icon: '✈️' },
  { color: 'from-red-500/20 to-orange-500/20', icon: '⚠️' },
  { color: 'from-blue-500/20 to-purple-500/20', icon: '🎧' },
  { color: 'from-amber-500/20 to-yellow-500/20', icon: '📌' },
  { color: 'from-cyan-500/20 to-indigo-500/20', icon: '📚' },
  { color: 'from-emerald-500/20 to-teal-500/20', icon: '🧩' },
] as const;

function relativeLabel(value: string): string {
  const updated = new Date(value).getTime();
  if (!Number.isFinite(updated)) return 'Unknown';
  const delta = Date.now() - updated;
  const mins = Math.max(1, Math.round(delta / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function contentToItemType(item: LibraryApprovedItem): ItemType {
  const lower = item.contentType.toLowerCase();
  if (lower.includes('audio') || lower.includes('podcast')) return 'audio';
  if (lower.includes('dialog') || lower.includes('phrase')) return 'phrases';
  if (lower.includes('sentence') || lower.includes('story') || lower.includes('video')) return 'sentences';
  return 'words';
}

function contentToActivity(item: LibraryApprovedItem): ActivityType {
  const lower = item.contentType.toLowerCase();
  if (lower.includes('audio') || lower.includes('podcast') || lower.includes('video')) return 'Speak';
  if (lower.includes('story') || lower.includes('sentence')) return 'Learn';
  return 'Write';
}

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

export default function LibraryPage() {
  const navigate = useNavigate();
  const { activeLanguage } = useLanguage();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ItemType | null>(null);
  const [languageIndex, setLanguageIndex] = useState(0);
  const [starredOnly, setStarredOnly] = useState(false);
  const [approvalQueue, setApprovalQueue] = useState<ApprovalQueueItem[]>([]);
  const [approvedContent, setApprovedContent] = useState<LibraryApprovedItem[]>([]);
  const [revisionHistory, setRevisionHistory] = useState<Record<string, ContentRevisionRecord[]>>({});
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const selectedLanguage = languages[languageIndex];
  const libraryItems = useMemo<LibraryItem[]>(() => {
    const now = Date.now();
    return approvedContent.map((item) => {
      const updatedAtMs = new Date(item.updatedAt).getTime();
      const isRecent = Number.isFinite(updatedAtMs) ? (now - updatedAtMs) <= 72 * 60 * 60 * 1000 : false;
      return {
        id: item.contentItemId,
        term: item.title,
        context: item.summary || 'No summary available',
        language: activeLanguage.name,
        langIcon: activeLanguage.flag,
        activity: contentToActivity(item),
        type: contentToItemType(item),
        time: relativeLabel(item.updatedAt),
        starred: item.approvalStatus === 'approved',
        isRecent,
      };
    });
  }, [activeLanguage.flag, activeLanguage.name, approvedContent]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return libraryItems.filter((item) => {
      if (activeFilter && item.type !== activeFilter) {
        return false;
      }
      if (selectedLanguage.code !== 'all' && item.language !== selectedLanguage.code) {
        return false;
      }
      if (starredOnly && !item.starred) {
        return false;
      }
      if (!query) {
        return true;
      }

      return [item.term, item.context, item.language, item.activity, item.type].some((value) => value.toLowerCase().includes(query));
    });
  }, [activeFilter, libraryItems, search, selectedLanguage.code, starredOnly]);

  const recentlyAdded = useMemo(() => filteredItems.filter((item) => item.isRecent).slice(0, 9), [filteredItems]);
  const allItems = useMemo(() => filteredItems.slice(0, 42), [filteredItems]);

  const starredCount = filteredItems.filter((item) => item.starred).length;
  const approvedCount = approvedContent.filter((item) => item.approvalStatus === 'approved').length;
  const manualCount = approvedContent.filter((item) => item.approvalStatus === 'manual').length;

  const collections = useMemo(() => {
    const grouped = new Map<string, { count: number; updatedAt: string }>();
    approvedContent.forEach((item) => {
      const key = item.contentType || 'unknown';
      const current = grouped.get(key);
      if (!current) {
        grouped.set(key, { count: 1, updatedAt: item.updatedAt });
        return;
      }
      current.count += 1;
      if (new Date(item.updatedAt).getTime() > new Date(current.updatedAt).getTime()) {
        current.updatedAt = item.updatedAt;
      }
    });

    return Array.from(grouped.entries())
      .map(([type, value], index) => {
        const visual = collectionVisuals[index % collectionVisuals.length];
        return {
          id: `collection-${type}`,
          title: `${type.replace(/_/g, ' ')} (${value.count})`,
          desc: `Approved ${type.replace(/_/g, ' ')} content`,
          count: value.count,
          updated: relativeLabel(value.updatedAt),
          color: visual.color,
          icon: visual.icon,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [approvedContent]);

  const smartSections = useMemo(
    () => [
      {
        id: 's1',
        title: 'Pending Queue',
        desc: 'Items awaiting moderation decision',
        count: approvalQueue.length,
        action: approvalQueue.length > 0 ? 'Needs triage' : 'Queue clear',
        icon: AlertTriangle,
        color: 'text-rose-400',
        bg: 'bg-rose-500/10',
      },
      {
        id: 's2',
        title: 'Manual Curation',
        desc: 'Approved manually for review/edit loops',
        count: manualCount,
        action: manualCount > 0 ? 'Curated set' : 'None yet',
        icon: Briefcase,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
      },
      {
        id: 's3',
        title: 'Approved Content',
        desc: 'Ready to use across learning surfaces',
        count: approvedCount,
        action: approvedCount > 0 ? 'Ready' : 'No approved items',
        icon: CheckCircle2,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
      },
    ],
    [approvalQueue.length, approvedCount, manualCount],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLibraryLoading(true);
      setLibraryError(null);
      try {
        const [queue, approved] = await Promise.all([
          integrationService.listApprovalQueue(activeLanguage.code),
          integrationService.listApprovedContent(activeLanguage.code),
        ]);
        if (!cancelled) {
          setApprovalQueue(queue);
          setApprovedContent(approved);
        }
      } catch (error) {
        if (!cancelled) {
          setLibraryError(error instanceof Error ? error.message : 'Failed to load library approval data.');
        }
      } finally {
        if (!cancelled) {
          setLibraryLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeLanguage.code]);

  const refreshLibraryData = async () => {
    const [queue, approved] = await Promise.all([
      integrationService.listApprovalQueue(activeLanguage.code),
      integrationService.listApprovedContent(activeLanguage.code),
    ]);
    setApprovalQueue(queue);
    setApprovedContent(approved);
  };

  const runLibraryAction = async (actionKey: string, action: () => Promise<void>) => {
    setActionBusy(actionKey);
    setLibraryError(null);
    try {
      await action();
      await refreshLibraryData();
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : 'Action failed.');
    } finally {
      setActionBusy(null);
    }
  };

  const loadRevisionHistory = async (contentItemId: string) => {
    setActionBusy(`history:${contentItemId}`);
    setLibraryError(null);
    try {
      const revisions = await integrationService.getContentRevisionHistory(contentItemId);
      setRevisionHistory((previous) => ({
        ...previous,
        [contentItemId]: revisions,
      }));
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : 'Failed to load revision history.');
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <PageContent className="pb-12" width="wide">
      <PageActions />
      <PageMainSidebarLayout>
        <PageMainColumn className="gap-10">
          <motion.div
            {...fadeUp}
            transition={{ delay: 0.05 }}
            className="flex justify-between items-center bg-graphite/30 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md relative z-20"
          >
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {filters.map((filter) => {
                const Icon = filter.icon;
                const isActive = activeFilter === filter.id;

                return (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(isActive ? null : (filter.id as ItemType))}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                        : 'text-dim hover:text-mist hover:bg-white/5'
                    }`}
                  >
                    <Icon size={15} />
                    {filter.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pr-2 shrink-0">
              <div className="relative group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search library..."
                  className="bg-black/20 border border-white/5 rounded-lg pl-9 pr-4 py-1.5 text-[12px] text-mist focus:outline-none focus:ring-1 focus:ring-indigo-500/50 w-48 transition-all"
                />
              </div>

              <button
                onClick={() => setLanguageIndex((prev) => (prev + 1) % languages.length)}
                className="flex items-center gap-2 text-[12px] font-medium text-dim bg-black/20 border border-white/5 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-white/5 hover:text-mist transition-all"
              >
                <span>{selectedLanguage.label}</span>
                <ChevronDown size={14} className="text-dim" />
              </button>

              <button
                onClick={() => setStarredOnly((prev) => !prev)}
                className={`p-1.5 rounded-lg border border-white/5 bg-black/10 transition-colors ${
                  starredOnly ? 'text-amber-400' : 'text-dim hover:text-mist'
                }`}
                title="Toggle starred only"
              >
                <Filter size={16} />
              </button>
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white">Content Approval Queue</h2>
            <SpotlightCard className="p-4 bg-slate-900/30 border border-white/10">
              {libraryLoading ? (
                <p className="text-[13px] text-dim">Loading approval queue...</p>
              ) : approvalQueue.length === 0 ? (
                <p className="text-[13px] text-dim">No pending candidates yet for {activeLanguage.name}.</p>
              ) : (
                <div className="space-y-3">
                  {approvalQueue.slice(0, 6).map((candidate) => (
                    <div key={candidate.candidateId} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] text-mist font-bold truncate">{candidate.objective}</p>
                          <p className="text-[12px] text-dim mt-1 line-clamp-2">{candidate.candidateText}</p>
                          <p className="text-[11px] text-dim mt-1">
                            {candidate.contentType} • score {Math.round(candidate.score)} • {candidate.status}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            className="rounded-md bg-emerald-500/20 border border-emerald-500/40 px-2 py-1 text-[11px] text-emerald-300 disabled:opacity-50"
                            disabled={Boolean(actionBusy)}
                            onClick={() =>
                              void runLibraryAction(`approve:${candidate.candidateId}`, () =>
                                integrationService.decideCandidate({
                                  candidateId: candidate.candidateId,
                                  decision: 'approved',
                                  actorId: 'library-user',
                                  reason: 'Approved from library queue',
                                }),
                              )
                            }
                          >
                            Approve
                          </button>
                          <button
                            className="rounded-md bg-rose-500/20 border border-rose-500/40 px-2 py-1 text-[11px] text-rose-300 disabled:opacity-50"
                            disabled={Boolean(actionBusy)}
                            onClick={() =>
                              void runLibraryAction(`reject:${candidate.candidateId}`, () =>
                                integrationService.decideCandidate({
                                  candidateId: candidate.candidateId,
                                  decision: 'rejected',
                                  actorId: 'library-user',
                                  reason: 'Rejected from library queue',
                                }),
                              )
                            }
                          >
                            Reject
                          </button>
                          <button
                            className="rounded-md bg-indigo-500/20 border border-indigo-500/40 px-2 py-1 text-[11px] text-indigo-200 disabled:opacity-50"
                            disabled={Boolean(actionBusy)}
                            onClick={() =>
                              void runLibraryAction(`manual:${candidate.candidateId}`, () =>
                                integrationService.decideCandidate({
                                  candidateId: candidate.candidateId,
                                  decision: 'manual',
                                  actorId: 'library-user',
                                  reason: 'Marked manual for curation',
                                }),
                              )
                            }
                          >
                            Manual
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SpotlightCard>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.12 }} className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white">Approved Content (DB)</h2>
            <SpotlightCard className="p-4 bg-slate-900/30 border border-white/10">
              {approvedContent.length === 0 ? (
                <p className="text-[13px] text-dim">No approved content in DB yet for this language.</p>
              ) : (
                <div className="space-y-3">
                  {approvedContent.slice(0, 6).map((item) => (
                    <div key={item.contentItemId} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] text-mist font-bold truncate">{item.title}</p>
                          <p className="text-[12px] text-dim mt-1 truncate">{item.summary || 'No summary'}</p>
                          <p className="text-[11px] text-dim mt-1">
                            {item.contentType} • {item.approvalStatus} • updated {new Date(item.updatedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            className="rounded-md bg-white/10 border border-white/15 px-2 py-1 text-[11px] text-mist disabled:opacity-50"
                            disabled={Boolean(actionBusy)}
                            onClick={() => void loadRevisionHistory(item.contentItemId)}
                          >
                            History
                          </button>
                          <button
                            className="rounded-md bg-violet-500/20 border border-violet-500/40 px-2 py-1 text-[11px] text-violet-200 disabled:opacity-50"
                            disabled={Boolean(actionBusy)}
                            onClick={() =>
                              void runLibraryAction(`redo:${item.contentItemId}`, () =>
                                integrationService.redoContentFromActive({
                                  contentItemId: item.contentItemId,
                                  actorId: 'library-user',
                                  reason: 'Redo from library surface',
                                }),
                              )
                            }
                          >
                            Redo
                          </button>
                          <button
                            className="rounded-md bg-cyan-500/20 border border-cyan-500/40 px-2 py-1 text-[11px] text-cyan-200 disabled:opacity-50"
                            disabled={Boolean(actionBusy)}
                            onClick={() => {
                              const edited = window.prompt('Manual edit body');
                              if (!edited || !edited.trim()) return;
                              void runLibraryAction(`edit:${item.contentItemId}`, () =>
                                integrationService.manualEditContent({
                                  contentItemId: item.contentItemId,
                                  body: edited.trim(),
                                  actorId: 'library-user',
                                  reason: 'Manual edit from library surface',
                                }),
                              );
                            }}
                          >
                            Manual Edit
                          </button>
                        </div>
                      </div>

                      {revisionHistory[item.contentItemId] && revisionHistory[item.contentItemId].length > 0 && (
                        <div className="mt-3 border-t border-white/10 pt-3 space-y-2">
                          {revisionHistory[item.contentItemId].slice(0, 4).map((revision) => (
                            <div key={revision.id} className="flex items-center justify-between text-[11px] text-dim">
                              <span>
                                Rev {revision.revisionNumber} {revision.isActive ? '(active)' : ''} • {new Date(revision.createdAt).toLocaleString()}
                              </span>
                              {!revision.isActive && (
                                <button
                                  className="rounded-md bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-amber-200 disabled:opacity-50"
                                  disabled={Boolean(actionBusy)}
                                  onClick={() =>
                                    void runLibraryAction(`revert:${revision.id}`, () =>
                                      integrationService.revertContentRevision({
                                        contentItemId: item.contentItemId,
                                        revisionId: revision.id,
                                        actorId: 'library-user',
                                        reason: 'Reverted from library history',
                                      }),
                                    )
                                  }
                                >
                                  Revert
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {libraryError && <p className="text-[12px] text-rose-300 mt-3">{libraryError}</p>}
            </SpotlightCard>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.14 }} className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white">Recently Added</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentlyAdded.map((item) => (
                <SpotlightCard key={`recent-${item.id}`} className="p-5 flex flex-col justify-between group cursor-pointer relative overflow-hidden bg-slate-900/40">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div>
                    <h3 className="text-[17px] font-bold text-white mb-1">{item.term}</h3>
                    <p className="text-[13px] text-dim">{item.context}</p>
                  </div>

                  <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-[12px] text-dim font-medium">
                        <span>{item.langIcon}</span>
                        <span>{item.language}</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-white/20" />
                      <div className="flex items-center gap-1.5 text-[12px] text-dim">
                        {item.activity === 'Speak' && <Mic2 size={12} />}
                        {item.activity === 'Learn' && <Book size={12} />}
                        {item.activity === 'Write' && <Edit2 size={12} />}
                        {item.activity}
                      </div>
                    </div>
                    <button
                      className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:bg-indigo-500 group-hover:border-indigo-400 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all"
                      onClick={() =>
                        navigate(
                          buildTemplateUrl({
                            templateId: 'library-play-recent',
                            entityId: item.id,
                            params: { from: '/library', lang: activeLanguage.code },
                          }),
                        )
                      }
                    >
                      <Play size={12} className="ml-0.5" fill="currentColor" />
                    </button>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white">Your Collections</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {collections.map((col) => (
                <SpotlightCard key={col.id} className="p-5 flex flex-col justify-between group cursor-pointer border border-white/5 hover:border-white/10 bg-slate-900/40">
                  <div className="flex gap-4">
                    <div className={`w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br ${col.color} border border-white/5 flex items-center justify-center text-2xl shadow-inner`}>
                      {col.icon}
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-white mb-0.5">{col.title}</h3>
                      <p className="text-[12px] text-dim leading-snug">{col.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-5 text-[12px]">
                    <span className="text-dim/80 font-medium">{col.count} items</span>
                    <span className="text-dim/60 flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-white/20" /> Updated {col.updated}
                    </span>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white">All Items</h2>
            <div className="flex flex-col gap-2">
              {allItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/30 border border-white/5 hover:bg-slate-900/60 hover:border-white/10 transition-all group">
                  <div className="min-w-0 pr-4">
                    <h4 className="text-[15px] font-bold text-white mb-1 truncate whitespace-pre-line">{item.term}</h4>
                    <p className="text-[13px] text-dim truncate">{item.context}</p>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="hidden md:flex items-center gap-4 text-[12px] text-dim font-medium mr-4">
                      <div className="flex items-center gap-1.5">
                        <span>{item.langIcon}</span>
                        <span>{item.language}</span>
                      </div>
                      <div className="w-1 h-1 bg-white/10 rounded-full" />
                      <div className="flex items-center gap-1.5">
                        {item.activity === 'Speak' && <Mic2 size={12} />}
                        {item.activity === 'Learn' && <Book size={12} />}
                        {item.activity === 'Write' && <Edit2 size={12} />}
                        {item.activity}
                      </div>
                      <div className="w-1 h-1 bg-white/10 rounded-full" />
                      <span className="text-dim/60 w-16 text-right">{item.time}</span>
                    </div>

                    <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-mist hover:text-white transition-colors"
                        onClick={() =>
                          navigate(
                            buildTemplateUrl({
                              templateId: 'library-play-item',
                              entityId: item.id,
                              params: { from: '/library', lang: activeLanguage.code },
                            }),
                          )
                        }
                      >
                        <Play size={14} fill="currentColor" />
                      </button>
                      <button
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-mist hover:text-white transition-colors"
                        onClick={() =>
                          navigate(
                            buildTemplateUrl({
                              templateId: 'library-speak-item',
                              entityId: item.id,
                              params: { from: '/library', lang: activeLanguage.code },
                            }),
                          )
                        }
                      >
                        <Mic size={14} />
                      </button>
                      <button
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-mist hover:text-white transition-colors"
                        onClick={() =>
                          navigate(
                            buildTemplateUrl({
                              templateId: 'library-edit-item',
                              entityId: item.id,
                              params: { from: '/library', lang: activeLanguage.code },
                            }),
                          )
                        }
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className={`w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors ${item.starred ? 'text-amber-400 hover:text-amber-300' : 'text-mist hover:text-white'}`}
                        onClick={() =>
                          navigate(
                            buildTemplateUrl({
                              templateId: 'library-star-item',
                              entityId: item.id,
                              params: { from: '/library', lang: activeLanguage.code },
                            }),
                          )
                        }
                      >
                        <Star size={14} className={item.starred ? 'fill-amber-400' : ''} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Smart Sections</h2>
              <p className="text-[13px] text-dim">Derived from persisted queue and approved content records</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {smartSections.map((section) => {
                const Icon = section.icon;
                return (
                  <SpotlightCard key={section.id} className="p-5 group cursor-pointer bg-slate-900/40">
                    <div className="flex gap-4">
                      <div className={`w-10 h-10 rounded-xl ${section.bg} ${section.color} flex items-center justify-center shrink-0`}>
                        <Icon size={18} />
                      </div>
                      <div className="pt-0.5">
                        <h3 className="text-[15px] font-bold text-white mb-1">{section.title}</h3>
                        <p className="text-[12px] text-dim">{section.desc}</p>
                      </div>
                    </div>
                    <div className="mt-5 flex items-center justify-between text-[12px] border-t border-white/5 pt-4">
                      <span className="text-mist font-medium">{section.count} items</span>
                      <span className="text-dim px-2 py-0.5 rounded-md bg-white/5">{section.action}</span>
                    </div>
                  </SpotlightCard>
                );
              })}
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="mt-4">
            <SpotlightCard className="p-6 relative overflow-hidden group border-indigo-500/20">
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 via-purple-500/10 to-indigo-500/10" />
              <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-rose-500/20 blur-[80px] -translate-y-1/2 rounded-full mix-blend-screen" />

              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-500 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.3)] border border-white/10">
                    <SparklesIcon className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-white mb-1">Practice from Library</h3>
                    <p className="text-[13px] text-dim">Generate a Speak or Learn session from your collections</p>
                  </div>
                </div>

                <button
                  className="px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[14px] transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] whitespace-nowrap border border-indigo-400"
                  onClick={() =>
                    navigate(
                      buildActionUrl('library_start_practice', {
                        params: { from: '/library', lang: activeLanguage.code },
                      }),
                    )
                  }
                >
                  Start Practice <ArrowRight size={16} />
                </button>
              </div>
            </SpotlightCard>
          </motion.div>
        </PageMainColumn>
        <PageSidebar className="gap-5">
          <SpotlightCard className="p-5">
            <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-3">Library Snapshot</p>
            <h4 className="text-[20px] font-bold text-white mb-1">{filteredItems.length} items</h4>
            <p className="text-[13px] text-dim mb-4">Across {collections.length} collections and {recentlyAdded.length} recent additions.</p>
            <div className="space-y-2 text-[12px] text-dim">
              <div className="flex items-center justify-between">
                <span>Starred</span>
                <span className="text-mist font-bold">{starredCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Recent</span>
                <span className="text-mist font-bold">{recentlyAdded.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Smart Groups</span>
                <span className="text-mist font-bold">{smartSections.length}</span>
              </div>
            </div>
          </SpotlightCard>

          <SpotlightCard className="p-5">
            <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-3">Quick Collections</p>
            <div className="space-y-2">
              {collections.slice(0, 3).map((col) => (
                <button
                  key={col.id}
                  className="w-full rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-left hover:bg-white/10 transition-colors"
                  onClick={() =>
                    navigate(
                      buildTemplateUrl({
                        templateId: 'library-collection',
                        entityId: col.id,
                        params: { from: '/library', lang: activeLanguage.code },
                      }),
                    )
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-mist">{col.title}</span>
                    <span className="text-[12px] text-dim">{col.count}</span>
                  </div>
                </button>
              ))}
            </div>
          </SpotlightCard>

          <SpotlightCard className="p-5">
            <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-3">Needs Review</p>
            <div className="space-y-3">
              {smartSections.map((section) => (
                <div key={section.id} className="flex items-center justify-between text-[13px]">
                  <span className="text-dim">{section.title}</span>
                  <span className="text-white font-bold">{section.count}</span>
                </div>
              ))}
            </div>
          </SpotlightCard>
        </PageSidebar>
      </PageMainSidebarLayout>
    </PageContent>
  );
}

function SparklesIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
