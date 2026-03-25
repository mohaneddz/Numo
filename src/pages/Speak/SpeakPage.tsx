import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mic,
  Timer,
  Zap,
  ChevronDown,
  MessageSquare,
  BookOpen,
  Podcast,
  Sparkles,
  Play,
  CheckCircle2,
  Info,
  SlidersHorizontal,
  Volume2,
  Edit3,
  Search,
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
import { speakingSessions as seededSpeakingSessions } from '../../data/library';
import { useLanguage } from '../../contexts/LanguageContext';
import { buildActionUrl, buildTemplateUrl } from '../../navigation/actionTemplates';

type SpeakTab = 'stories' | 'chats' | 'pronunciation' | 'chips';
type DifficultyFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';

interface SpeakSessionItem {
  id: string;
  sessionId: string;
  title: string;
  description: string;
  tab: SpeakTab;
  minutes: number;
  difficulty: DifficultyFilter;
  progress: number;
  phrase: string;
  route: string;
}

const TABS: Array<{ id: SpeakTab; label: string; icon: typeof BookOpen }> = [
  { id: 'stories', label: 'Stories', icon: BookOpen },
  { id: 'chats', label: 'Chats', icon: MessageSquare },
  { id: 'pronunciation', label: 'Pronunciation', icon: Podcast },
  { id: 'chips', label: 'Chips', icon: Sparkles },
];

const DIFFICULTY_STEPS: DifficultyFilter[] = ['all', 'beginner', 'intermediate', 'advanced'];

function normalizeDifficulty(value: string): DifficultyFilter {
  const lowered = value.toLowerCase();
  if (lowered.includes('beginner')) return 'beginner';
  if (lowered.includes('advanced')) return 'advanced';
  return 'intermediate';
}

function tabFromType(value: string): SpeakTab {
  if (value === 'pronunciation' || value === 'shadowing') return 'pronunciation';
  if (value === 'roleplay') return 'chats';
  if (value === 'oral-exam') return 'chips';
  return 'stories';
}

const speakSessions: SpeakSessionItem[] = Array.from({ length: 52 }, (_, idx) => {
  const seed = seededSpeakingSessions[idx % seededSpeakingSessions.length];
  const progress = (55 + idx * 7) % 101;
  const tab = tabFromType(seed.type);
  const difficulty = normalizeDifficulty(seed.difficulty);

  return {
    id: `speak-${idx + 1}`,
    sessionId: seed.id,
    title: `${seed.title} ${idx + 1}`,
    description: seed.description,
    tab,
    difficulty,
    phrase: `${seed.title.split(':')[0]} phrase pack ${Math.floor(idx / 3) + 1}`,
    route: `/speak/session/${seed.id}?from=%2Fspeak&variant=${idx + 1}`,
    progress,
    minutes: 4 + (idx % 6),
  };
});

export default function SpeakPage() {
  const navigate = useNavigate();
  const { activeLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<SpeakTab>('stories');
  const [difficultyIndex, setDifficultyIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [onlyNeedsWork, setOnlyNeedsWork] = useState(false);

  const difficulty = DIFFICULTY_STEPS[difficultyIndex];

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return speakSessions.filter((session) => {
      if (session.tab !== activeTab) {
        return false;
      }
      if (difficulty !== 'all' && session.difficulty !== difficulty) {
        return false;
      }
      if (onlyNeedsWork && session.progress >= 70) {
        return false;
      }
      if (!query) {
        return true;
      }

      return [session.title, session.description, session.phrase, session.difficulty].some((value) => value.toLowerCase().includes(query));
    });
  }, [activeTab, difficulty, onlyNeedsWork, search]);

  const highlighted = filteredSessions[0];
  const trainingCards = filteredSessions.slice(1, 5);
  const helpfulPhrases = filteredSessions.slice(0, 8);

  return (
    <PageContent className="pb-12" width="wide">
      <PageActions>
        <button
          className="page-primary-action"
          onClick={() =>
            navigate(
              buildActionUrl('speak_quick_practice', {
                params: { from: '/speak', lang: activeLanguage.code },
              }),
            )
          }
        >
          <Zap size={16} fill="currentColor" />
          Quick Practice
        </button>
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
            <div className="flex items-center gap-3 pr-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dim" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  className="w-32 rounded-lg border border-white/5 bg-black/20 py-1.5 pl-8 pr-2 text-[12px] text-mist"
                />
              </div>
              <button
                onClick={() => setDifficultyIndex((prev) => (prev + 1) % DIFFICULTY_STEPS.length)}
                className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5 cursor-pointer hover:bg-white/5 transition-all"
              >
                <span className="text-[12px] text-dim font-medium capitalize">{difficulty}</span>
                <div className="flex gap-0.5 items-center">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`w-1 h-3 rounded-full ${difficultyIndex >= i ? 'bg-violet' : 'bg-dim/30'}`} />
                  ))}
                </div>
                <ChevronDown size={14} className="text-dim ml-1" />
              </button>
              <button
                onClick={() => setOnlyNeedsWork((prev) => !prev)}
                className={`p-1.5 rounded-lg border border-white/5 bg-black/10 transition-colors ${onlyNeedsWork ? 'text-violet' : 'text-dim hover:text-mist'}`}
                title="Toggle needs work"
              >
                <SlidersHorizontal size={16} />
              </button>
            </div>
          </div>

          <section>
            <h2 className="text-[16px] font-bold mb-4 text-mist flex items-center gap-2 uppercase tracking-widest">Speech Training</h2>
            <div className="grid grid-cols-12 gap-4">
              {trainingCards.map((session) => (
                <div key={session.id} className="col-span-3">
                  <SpotlightCard interactive className="p-6 aspect-square flex flex-col items-center justify-center text-center group">
                    <div className="w-16 h-16 rounded-2xl bg-violet/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative">
                      <div className="absolute inset-0 bg-violet/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      <MessageSquare size={32} className="text-violet relative z-10" />
                    </div>
                    <h3 className="text-[15px] font-bold text-mist mb-1">{session.title}</h3>
                    <p className="text-[11px] text-dim mb-4 leading-normal">{session.description}</p>
                    <Link to={session.route} className="w-full">
                      <button className="w-full py-2 bg-violet/20 hover:bg-violet/30 border border-violet/30 rounded-xl text-[12px] font-bold text-violet transition-all">Start</button>
                    </Link>
                  </SpotlightCard>
                </div>
              ))}

              <div className="col-span-6">
                <SpotlightCard interactive className="relative overflow-hidden group h-full">
                  <RemoteImage
                    src="https://images.unsplash.com/photo-1539037116277-4db20889f2d4?q=80&w=2670&auto=format&fit=crop"
                    alt="Barcelona Night"
                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent" />
                  <div className="relative z-10 p-6 h-full flex flex-col justify-end">
                    <h3 className="text-xl font-bold text-white mb-1">{highlighted?.title ?? 'No matching session'}</h3>
                    <div className="flex items-center gap-3 text-[12px] text-mist/80 mb-3">
                      <span className="flex items-center gap-1"><Timer size={14} /> {highlighted?.minutes ?? 0} min</span>
                      <span className="flex items-center gap-1 capitalize">• {highlighted?.difficulty ?? 'n/a'}</span>
                      <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
                        <div className="h-full bg-violet shadow-[0_0_8px_rgba(139,92,246,0.6)]" style={{ width: `${highlighted?.progress ?? 0}%` }} />
                      </div>
                      <span className="font-bold">{highlighted?.progress ?? 0}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-[11px] text-dim">{highlighted?.description}</div>
                      <button
                        className="px-5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl text-[12px] font-bold text-white transition-all flex items-center gap-2"
                        onClick={() =>
                          navigate(
                            highlighted?.route ??
                              buildTemplateUrl({
                                templateId: 'speak-no-highlight',
                                params: {
                                  from: '/speak',
                                  lang: activeLanguage.code,
                                  tab: activeTab,
                                  difficulty,
                                  q: search,
                                  needsWork: onlyNeedsWork,
                                },
                              }),
                          )
                        }
                      >
                        <Play size={12} fill="currentColor" /> Practice
                      </button>
                    </div>
                  </div>
                </SpotlightCard>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[16px] font-bold mb-4 text-mist flex items-center gap-2 uppercase tracking-widest">Daily Speak Mission</h2>
            <SpotlightCard className="p-6 relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-violet/10 blur-[80px] rounded-full pointer-events-none" />

              <div className="relative z-10 flex justify-between items-center">
                <div className="max-w-[70%]">
                  <h3 className="text-lg font-bold text-mist mb-1">Talk your way to fluency!</h3>
                  <p className="text-dim text-[13px] mb-5">Filtered queue: {filteredSessions.length} session(s) ready.</p>
                  <div className="flex items-center gap-5">
                    <button
                      className="px-6 py-2.5 bg-violet shadow-[0_4px_15px_rgba(139,92,246,0.3)] rounded-xl text-[13px] font-bold text-white transition-all"
                      onClick={() =>
                        navigate(
                          filteredSessions[0]?.route ??
                            buildTemplateUrl({
                              templateId: 'speak-start-mission-empty',
                              params: {
                                from: '/speak',
                                lang: activeLanguage.code,
                                tab: activeTab,
                                difficulty,
                                q: search,
                                needsWork: onlyNeedsWork,
                              },
                            }),
                        )
                      }
                    >
                      Start Mission
                    </button>
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] text-mist font-medium">{Math.min(3, filteredSessions.length)}/3 selected</span>
                      <div className="w-24 h-1.5 bg-black/40 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet to-cyan shadow-[0_0_8px_rgba(34,211,238,0.4)]" style={{ width: `${Math.min(100, filteredSessions.length * 25)}%` }} />
                      </div>
                      <span className="text-[12px] text-amber font-bold">+50 xp</span>
                    </div>
                  </div>
                </div>
                <div className="w-24 h-24 bg-graphite rounded-2xl border border-white/5 flex items-center justify-center relative group">
                  <div className="absolute inset-0 bg-violet/5 rounded-2xl blur-md" />
                  <Mic size={40} className="text-violet animate-pulse relative z-10" />
                </div>
              </div>
            </SpotlightCard>
          </section>

          <section>
            <h2 className="text-[16px] font-bold mb-4 text-mist uppercase tracking-widest">Helpful Words & Phrases</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <SpotlightCard className="p-5 flex flex-col justify-between h-full">
                <div>
                  <h4 className="text-[12px] font-bold text-dim mb-4 uppercase tracking-widest">Feedback Sensitivity</h4>
                  <div className="px-2">
                    <div className="h-1.5 bg-black/40 rounded-full relative mb-2">
                      <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-violet border-2 border-white shadow-[0_0_12px_rgba(139,92,246,0.6)]" style={{ left: `${difficultyIndex * 25}%` }} />
                    </div>
                  </div>
                </div>
                <button
                  className="w-full mt-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[12px] font-bold text-mist transition-all"
                  onClick={() =>
                    navigate(
                      buildTemplateUrl({
                        templateId: 'speak-feedback-sensitivity',
                        params: { from: '/speak', lang: activeLanguage.code, level: difficulty },
                      }),
                    )
                  }
                >
                  Practice
                </button>
              </SpotlightCard>

              <SpotlightCard className="p-5 flex flex-col justify-between h-full">
                <div>
                  <h4 className="text-[15px] font-bold text-mist mb-4">Session Phrases</h4>
                  <div className="space-y-3 mb-2">
                    {helpfulPhrases.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 group cursor-pointer p-1 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="w-4 h-4 rounded border border-white/20 flex items-center justify-center group-hover:border-violet group-hover:bg-violet/10 transition-all">
                          <CheckCircle2 size={10} className="text-violet opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div>
                          <p className="text-[13px] text-mist group-hover:text-white transition-colors">{item.phrase}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[12px] font-bold text-mist transition-all"
                  onClick={() =>
                    navigate(
                      buildTemplateUrl({
                        templateId: 'speak-phrase-practice',
                        params: { from: '/speak', lang: activeLanguage.code, tab: activeTab },
                      }),
                    )
                  }
                >
                  Practice
                </button>
              </SpotlightCard>
            </div>

            <SpotlightCard className="overflow-hidden">
              <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
                <h4 className="text-[13px] font-bold text-mist uppercase tracking-widest">Filtered Phrase List</h4>
                <Info size={14} className="text-dim" />
              </div>
              <div className="divide-y divide-white/5">
                {helpfulPhrases.map((item) => (
                  <div key={`phrase-${item.id}`} className="p-4 flex justify-between items-center hover:bg-white/[0.03] transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-graphite flex items-center justify-center border border-white/5 group-hover:border-violet/30 transition-colors">
                        <Volume2 size={16} className="text-dim group-hover:text-violet transition-colors" />
                      </div>
                      <span className="text-[14px] text-mist font-medium group-hover:text-white transition-colors">{item.phrase}</span>
                    </div>
                    <button
                      className="p-2.5 rounded-xl bg-graphite border border-white/5 text-dim hover:text-mist hover:border-white/20 transition-all"
                      onClick={() =>
                        navigate(
                          buildTemplateUrl({
                            templateId: 'speak-edit-phrase',
                            entityId: item.id,
                            params: { from: '/speak', lang: activeLanguage.code },
                          }),
                        )
                      }
                    >
                      <Edit3 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </SpotlightCard>
          </section>
        </PageMainColumn>

        <PageSidebar className="gap-6 pt-2">
          <section>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-[15px] font-bold text-mist uppercase tracking-widest">Echo's Feedback</h2>
            </div>
            <SpotlightCard className="p-6 flex flex-col items-center">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-violet/30 blur-[40px] rounded-full animate-pulse" />
                <img src="/figure/happy.png" alt="Echo" className="w-[120px] h-[120px] object-contain" />
              </div>
              <div className="w-full bg-graphite/40 rounded-2xl border border-white/10 p-5 relative">
                <p className="text-[12px] text-dim mb-2">Current filter</p>
                <p className="text-[14px] text-mist font-bold capitalize">{activeTab} • {difficulty}</p>
                <p className="text-[12px] text-dim mt-2">{filteredSessions.length} sessions matched</p>
              </div>
            </SpotlightCard>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-mist mb-4 px-1 uppercase tracking-widest">Speaking Progress</h2>
            <SpotlightCard className="p-6">
              <div className="flex items-center gap-8">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="56" cy="56" r="48" fill="transparent" stroke="currentColor" strokeWidth="10" className="text-white/5" />
                    <motion.circle
                      cx="56"
                      cy="56"
                      r="48"
                      fill="transparent"
                      stroke="url(#progressGradient)"
                      strokeWidth="10"
                      strokeDasharray="301.6"
                      initial={{ strokeDashoffset: 301.6 }}
                      animate={{ strokeDashoffset: 301.6 - 301.6 * ((highlighted?.progress ?? 0) / 100) }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#22D3EE" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-mist tracking-tighter">{highlighted?.progress ?? 0}%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] text-dim font-bold uppercase tracking-tighter mb-2">Daily goal progress</p>
                  <div className="h-2 bg-black/40 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-violet to-cyan" style={{ width: `${highlighted?.progress ?? 0}%` }} />
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </section>
        </PageSidebar>
      </PageMainSidebarLayout>
    </PageContent>
  );
}
