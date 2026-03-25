import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpRight,
  BookText,
  CalendarDays,
  Check,
  Clock3,
  Flame,
  Gauge,
  Languages,
  MessageSquareText,
  PencilLine,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { analytics } from '../data/analytics';
import { PageActions, PageContent, PageMainColumn, PageMainSidebarLayout, PageSidebar } from '../components/layout/PageLayout';
import { SpotlightCard } from '../components/ui/SpotlightCard';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { buildActionUrl, buildTemplateUrl } from '../navigation/actionTemplates';

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

const dailyModes = [
  { label: 'Speaking', value: 35, color: '#4E6BFF' },
  { label: 'Learning', value: 25, color: '#4CC4F2' },
  { label: 'Reviewing', value: 20, color: '#7C5BFF' },
  { label: 'Writing', value: 20, color: '#9D6BFF' },
];

const timeSpent = [
  { label: 'Speak', hours: 14, color: 'linear-gradient(90deg, #1FC6FF, #5B8DFF)' },
  { label: 'Learn', hours: 9, color: 'linear-gradient(90deg, #28E1D8, #8AB2FF)' },
  { label: 'Review', hours: 5, color: 'linear-gradient(90deg, #6E72FF, #9B6CFF)' },
  { label: 'Write', hours: 3, color: 'linear-gradient(90deg, #825CFF, #C17BFF)' },
];

const recentEvents = [
  { icon: MessageSquareText, title: 'Practiced Spanish speaking', tag: 'Speaking', time: '1h ago' },
  { icon: BookText, title: 'Discovered 8 new words in Chinese', tag: 'Vocabulary', time: 'Today' },
  { icon: Flame, title: 'Reached a 12-day streak', tag: 'Streak', time: 'Yesterday' },
  { icon: PencilLine, title: 'Saved 4 phrases to your Library', tag: 'Notebook', time: '2 days ago' },
];

const lineData = analytics.weeklyActivity.map((item, index) => ({
  day: item.day,
  xp: 220 + item.minutes * 6 + index * 14,
}));

const heatmapRows = 6;
const heatmapCols = 26;
const heatmap = Array.from({ length: heatmapRows }, (_, row) =>
  Array.from({ length: heatmapCols }, (_, col) => {
    const base = (row * 19 + col * 7 + analytics.weeklyActivity[col % 7].minutes) % 100;
    if (base > 80) return 3;
    if (base > 55) return 2;
    if (base > 35) return 1;
    return 0;
  }),
);

const heatmapColor = ['#1A2144', '#2C3B7D', '#4F61B8', '#D4A85A'];

const chipWords = ['siempre', 'tambien', 'yo', 'ni', 'esta', 'porque', 'antes', 'bueno'];

const chartTooltip = {
  background: 'rgba(13, 18, 41, 0.95)',
  border: '1px solid rgba(120, 140, 255, 0.35)',
  borderRadius: 12,
  color: '#E5E7FF',
  fontSize: 12,
};

interface SnapshotMetricProps {
  icon: LucideIcon;
  value: string;
  label: string;
  accent: string;
  footnote: string;
}

function SnapshotMetric({ icon: Icon, value, label, accent, footnote }: SnapshotMetricProps) {
  return (
    <div className="flex items-center gap-3 px-0 py-1 md:px-2">
      <div className="h-10 w-10 shrink-0 rounded-full border border-white/10 flex items-center justify-center" style={{ background: 'rgba(10, 14, 33, 0.8)' }}>
        <Icon size={18} style={{ color: accent }} />
      </div>
      <div>
        <p className="text-[34px] leading-none tracking-tight text-white/95">
          {value}
          <span className="ml-1 text-[14px] font-medium text-[#A6B0D8]">{label}</span>
        </p>
        <p className="mt-1 text-[12px] font-medium text-[#8A93B9]">{footnote}</p>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const navigate = useNavigate();
  const { activeLanguage } = useLanguage();
  const monthlyStats = analytics.monthlyStats;
  const totalStudyHours = Math.round(analytics.monthlyStats.totalMinutes / 60);
  const totalWords = analytics.monthlyStats.wordsLearned + 173;
  const weeklyXpGain = lineData[lineData.length - 1].xp - lineData[0].xp;
  const avgSessionMinutes = Math.round(monthlyStats.totalMinutes / Math.max(monthlyStats.speakingSessions, 1));

  return (
    <PageContent width="wide" className="pb-10">
      <PageActions>
        <button
          className="page-primary-action"
          onClick={() =>
            navigate(
              buildActionUrl('insights_quick_review', {
                params: { from: '/insights', lang: activeLanguage.code },
              }),
            )
          }
        >
          <Zap size={16} fill="currentColor" /> Quick Review
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#0F1637]/80 px-4 py-2 text-[13px] font-semibold text-[#CFD8FF] hover:bg-[#141E46] transition-colors"
          onClick={() =>
            navigate(
              buildActionUrl('insights_period', {
                params: { from: '/insights', lang: activeLanguage.code, range: '90d' },
              }),
            )
          }
        >
          <CalendarDays size={15} />
          Past 90 Days
        </button>
      </PageActions>

      <PageMainSidebarLayout className="gap-6">
        <PageMainColumn className="gap-5">
          <div
            className="space-y-5 rounded-[26px] p-2"
            style={{
              backgroundImage:
                'radial-gradient(circle at 12% 18%, rgba(93, 86, 225, 0.22), transparent 38%), radial-gradient(circle at 88% 22%, rgba(43, 163, 255, 0.14), transparent 36%), radial-gradient(circle at 52% 85%, rgba(110, 95, 255, 0.18), transparent 38%)',
            }}
          >
            <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.04 }}>
              <SpotlightCard className="p-5 md:p-7" spotlightColor="rgba(100, 150, 255, 0.18)">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-0 opacity-90" style={{ background: 'radial-gradient(circle at 25% 8%, rgba(115, 125, 255, 0.2), transparent 45%)' }} />
                  <p className="relative text-[23px] md:text-[31px] leading-tight text-white font-semibold">Streak & XP Snapshot</p>
                  <div className="relative mt-5 grid gap-4 md:grid-cols-3">
                    <SnapshotMetric icon={Flame} value="12" label="day" accent="#FFB347" footnote="Today streak" />
                    <SnapshotMetric icon={Sparkles} value="10,250" label="XP" accent="#FFD466" footnote="+9675 XP" />
                    <SnapshotMetric icon={Check} value="30" label="minutes" accent="#31D7D6" footnote="Daily goal" />
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>

            <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.08 }}>
              <SpotlightCard className="p-5 md:p-6" spotlightColor="rgba(73, 132, 255, 0.18)">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[22px] md:text-[30px] leading-tight text-white font-semibold">Weekly XP Gain</p>
                  <p className="text-[22px] md:text-[26px] leading-none text-[#A5B8FF]">+{weeklyXpGain} <span className="text-[14px] text-[#8F99C7]">XP this week</span></p>
                </div>

                <div className="mt-4 grid gap-6 xl:grid-cols-[1fr_310px]">
                  <div>
                    <div className="grid grid-cols-[repeat(26,minmax(0,1fr))] gap-[4px]">
                      {heatmap.flatMap((row, rowIndex) =>
                        row.map((intensity, colIndex) => (
                          <div
                            key={`${rowIndex}-${colIndex}`}
                            className="aspect-square rounded-[4px] border border-black/20"
                            style={{ backgroundColor: heatmapColor[intensity] }}
                          />
                        )),
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-7 text-[13px] font-medium text-[#8D95C3]">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <span key={day}>{day}</span>
                      ))}
                    </div>
                  </div>

                  <div className="h-[160px] rounded-2xl border border-white/10 bg-[#0A0F2B]/55 px-2 py-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineData} margin={{ top: 12, right: 10, left: -20, bottom: 8 }}>
                        <CartesianGrid stroke="rgba(135, 150, 230, 0.2)" strokeDasharray="3 4" />
                        <XAxis dataKey="day" tick={{ fill: '#8D95C3', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#8D95C3', fontSize: 12 }} axisLine={false} tickLine={false} width={34} />
                        <Tooltip contentStyle={chartTooltip} />
                        <Line type="monotone" dataKey="xp" stroke="#35A6FF" strokeWidth={2.6} dot={{ fill: '#5FCCFF', strokeWidth: 0, r: 3.4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>

            <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.12 }}>
              <SpotlightCard className="px-5 py-4 md:px-7" spotlightColor="rgba(95, 116, 255, 0.18)">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[26px] md:text-[36px] leading-none text-white/95">
                  <p><span className="text-[#6AA8FF]">✦</span> 7-Day <span className="text-[#A0A8CE] text-[14px] md:text-[17px]">Streak</span></p>
                  <p>100 <span className="text-[#A0A8CE] text-[14px] md:text-[17px]">Words Learned</span></p>
                  <p>20 <span className="text-[#A0A8CE] text-[14px] md:text-[17px]">Characters Discovered</span></p>
                </div>
              </SpotlightCard>
            </motion.div>

            <div className="grid gap-5 xl:grid-cols-2">
              <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.16 }}>
                <SpotlightCard className="p-5 md:p-6" spotlightColor="rgba(82, 141, 255, 0.18)">
                  <p className="text-[22px] md:text-[30px] leading-tight text-white font-semibold">Time Spent</p>
                  <div className="mt-4 flex items-end gap-3 text-white">
                    <Clock3 size={21} className="text-[#7CA1FF]" />
                    <p className="text-[36px] md:text-[45px] leading-none">{totalStudyHours}<span className="ml-1 text-[15px] md:text-[17px] text-[#9CA7D3]">hours</span></p>
                  </div>

                  <div className="mt-6 space-y-4">
                    {timeSpent.map((item) => {
                      const ratio = (item.hours / timeSpent[0].hours) * 100;
                      return (
                        <div key={item.label} className="grid grid-cols-[54px_1fr_44px] items-center gap-3">
                          <span className="text-[16px] md:text-[21px] text-[#BAC5EE]">{item.label}</span>
                          <div className="h-6 rounded-lg border border-white/10 bg-[#0B102B] p-1">
                            <div className="h-full rounded-md" style={{ width: `${ratio}%`, background: item.color }} />
                          </div>
                          <span className="text-right text-[24px] md:text-[31px] leading-none text-white/90">{item.hours}<span className="text-[14px] text-[#8A95C3]">h</span></span>
                        </div>
                      );
                    })}
                  </div>
                </SpotlightCard>
              </motion.div>

              <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }}>
                <SpotlightCard className="p-5 md:p-6" spotlightColor="rgba(103, 124, 255, 0.18)">
                  <p className="text-[22px] md:text-[30px] leading-tight text-white font-semibold">Words & Phrases</p>
                  <div className="mt-5">
                    <div className="flex items-center justify-between">
                      <p className="text-[40px] md:text-[53px] leading-none text-white">{totalWords}</p>
                      <p className="text-[13px] text-[#92A0CC]">Vocabulary learned</p>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-[#111936]">
                      <div className="h-full w-[73%] rounded-full bg-[linear-gradient(90deg,#2CD5E8,#7789FF)]" />
                    </div>
                  </div>

                  <p className="mt-6 text-[16px] text-white">Most frequent words</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {chipWords.map((word) => (
                      <span key={word} className="rounded-full border border-white/12 bg-[#13193A]/80 px-3 py-1 text-[13px] text-[#C3CDF5]">
                        {word}
                      </span>
                    ))}
                  </div>

                  <button
                    className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#11193B] px-4 py-2 text-[13px] font-semibold text-[#C8D3FF] hover:bg-[#162148] transition-colors"
                    onClick={() =>
                      navigate(
                        buildTemplateUrl({
                          templateId: 'insights-milestones',
                          params: { from: '/insights', lang: activeLanguage.code, words: totalWords },
                        }),
                      )
                    }
                  >
                    Make Milestones <ArrowUpRight size={14} />
                  </button>
                </SpotlightCard>
              </motion.div>

              <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.24 }}>
                <SpotlightCard className="p-5 md:p-6" spotlightColor="rgba(70, 145, 255, 0.2)">
                  <p className="text-[22px] md:text-[30px] leading-tight text-white font-semibold">Sessions by Mode</p>

                  <div className="mt-4 grid items-center gap-4 sm:grid-cols-[220px_1fr]">
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dailyModes}
                            dataKey="value"
                            nameKey="label"
                            innerRadius={55}
                            outerRadius={82}
                            startAngle={90}
                            endAngle={-270}
                            stroke="rgba(12, 15, 33, 0.9)"
                            strokeWidth={2}
                          >
                            {dailyModes.map((entry) => (
                              <Cell key={entry.label} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={chartTooltip} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2">
                      {dailyModes.map((mode) => (
                        <div key={mode.label} className="flex items-center justify-between rounded-lg border border-white/10 bg-[#101734]/70 px-3 py-2">
                          <span className="text-[15px] text-[#D0DAFF]">{mode.label}</span>
                          <span className="text-[15px] text-white">{mode.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </SpotlightCard>
              </motion.div>

              <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.28 }}>
                <SpotlightCard className="p-5 md:p-6" spotlightColor="rgba(105, 122, 255, 0.2)">
                  <p className="text-[22px] md:text-[30px] leading-tight text-white font-semibold">Characters Learned</p>
                  <div className="mt-4 flex items-end gap-3">
                    <Languages size={23} className="text-[#77BCFF]" />
                    <p className="text-[39px] md:text-[50px] leading-none text-white">248</p>
                    <p className="pb-1 text-[14px] text-[#9AA7D3]">Total (HSK target 3000)</p>
                  </div>

                  <div className="mt-5 space-y-4">
                    {[
                      { level: 'HSK 1', count: 107, width: 86 },
                      { level: 'HSK 2', count: 72, width: 58 },
                      { level: 'HSK 3', count: 107, width: 76 },
                    ].map((item) => (
                      <div key={item.level} className="grid grid-cols-[60px_1fr_44px] items-center gap-3">
                        <span className="text-[15px] text-[#A9B4DF]">{item.level}</span>
                        <div className="h-2 rounded-full bg-[#111936]">
                          <div className="h-full rounded-full bg-[linear-gradient(90deg,#2BC7E9,#8D72FF)]" style={{ width: `${item.width}%` }} />
                        </div>
                        <span className="text-right text-[16px] text-white/90">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </SpotlightCard>
              </motion.div>
            </div>

            <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.32 }}>
              <SpotlightCard className="p-4 md:p-5" spotlightColor="rgba(73, 141, 255, 0.16)">
                <div className="space-y-1">
                  {recentEvents.map((event, index) => (
                    <div
                      key={event.title}
                      className={`flex items-center justify-between rounded-xl px-3 py-3 ${index !== recentEvents.length - 1 ? 'border-b border-white/10' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full border border-white/10 bg-[#111936] flex items-center justify-center">
                          <event.icon size={16} className="text-[#8EA8FF]" />
                        </div>
                        <div>
                          <p className="text-[15px] md:text-[17px] text-[#E3E9FF]">{event.title}</p>
                          <p className="text-[12px] text-[#8B97C2]">{event.tag}</p>
                        </div>
                      </div>
                      <span className="text-[13px] text-[#9BA8D4]">{event.time}</span>
                    </div>
                  ))}
                </div>
              </SpotlightCard>
            </motion.div>
          </div>
        </PageMainColumn>

        <PageSidebar className="gap-5">
          <SpotlightCard className="p-5">
            <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-3">Highlights</p>
            <div className="space-y-3 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-dim flex items-center gap-1.5"><Gauge size={13} /> Accuracy</span>
                <span className="text-mint font-bold">{monthlyStats.reviewAccuracy}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dim">Weekly XP gain</span>
                <span className="text-cyan font-bold">+{weeklyXpGain}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dim">Avg session</span>
                <span className="text-amber font-bold">{avgSessionMinutes} min</span>
              </div>
            </div>
          </SpotlightCard>

          <SpotlightCard className="p-5">
            <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-3">Goal Progress</p>
            <p className="text-[13px] text-dim mb-4">Weekly target: 6 sessions</p>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
              <div className="h-full w-[68%] bg-gradient-to-r from-violet to-cyan" />
            </div>
            <p className="text-[12px] text-mist font-bold">4 / 6 sessions completed</p>
          </SpotlightCard>

          <SpotlightCard className="p-5">
            <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-3">Quick Actions</p>
            <div className="space-y-2">
              {[
                { label: 'Start XP Drill', icon: Zap },
                { label: 'Run Speaking Check', icon: Target },
                { label: 'Export Weekly Report', icon: ArrowUpRight },
              ].map((action) => (
                <button
                  key={action.label}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10 transition-colors flex items-center justify-between"
                  onClick={() =>
                    navigate(
                      buildTemplateUrl({
                        templateId: 'insights-quick-action',
                        entityId: action.label.toLowerCase().replace(/\s+/g, '-'),
                        params: { from: '/insights', lang: activeLanguage.code },
                      }),
                    )
                  }
                >
                  <span className="text-[13px] text-mist">{action.label}</span>
                  <action.icon size={14} className="text-dim" />
                </button>
              ))}
            </div>
          </SpotlightCard>

          <SpotlightCard className="p-5">
            <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-3">Top Focus</p>
            <p className="text-[13px] text-dim mb-4">You gain most XP on speaking-heavy days. Keep the next two sessions oral-first.</p>
            <button
              className="w-full rounded-xl bg-indigo-600/20 border border-indigo-500/30 px-4 py-2 text-[13px] font-bold text-indigo-300 hover:bg-indigo-600/30 transition-colors"
              onClick={() =>
                navigate(
                  buildTemplateUrl({
                    templateId: 'insights-plan-session',
                    params: { from: '/insights', lang: activeLanguage.code, focus: 'speaking' },
                  }),
                )
              }
            >
              Plan Next Session
            </button>
          </SpotlightCard>
        </PageSidebar>
      </PageMainSidebarLayout>
    </PageContent>
  );
}
