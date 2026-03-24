import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { TrendingUp, Clock, BookOpen, Mic, PenLine, Brain, Download, Settings } from 'lucide-react';
import { analytics } from '../data/analytics';
import { SpotlightCard } from '../components/ui/SpotlightCard';
import { PageActions, PageContent } from '../components/layout/PageLayout';

const chartTheme = { bg: '#171C24', grid: '#222A36', text: '#93A0B4' };
const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

export default function InsightsPage() {
  const { monthlyStats } = analytics;

  return (
    <PageContent className="pb-8">
      <PageActions>
        <button className="flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-600/20 px-5 py-2 text-[14px] font-bold text-blue-400 transition-colors hover:bg-blue-600/30 cursor-pointer">
          <Download size={16} /> Export Report
        </button>
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-dim transition-colors hover:text-white cursor-pointer">
          <Settings size={18} />
        </button>
      </PageActions>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
      <div className="min-w-0">

      {/* Monthly Stats */}
      <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 28 }}>
          {[
            { icon: Clock, label: 'Study Time', value: `${Math.round(monthlyStats.totalMinutes / 60)}h`, color: '#8B5CF6' },
            { icon: BookOpen, label: 'Words Learned', value: monthlyStats.wordsLearned.toString(), color: '#22D3EE' },
            { icon: Brain, label: 'Lessons Done', value: monthlyStats.lessonsCompleted.toString(), color: '#34D399' },
            { icon: TrendingUp, label: 'Accuracy', value: `${monthlyStats.reviewAccuracy}%`, color: '#F59E0B' },
            { icon: Mic, label: 'Speaking', value: monthlyStats.speakingSessions.toString(), color: '#F87171' },
            { icon: PenLine, label: 'Written', value: monthlyStats.writingPieces.toString(), color: '#8B5CF6' },
          ].map(stat => (
            <SpotlightCard key={stat.label} style={{ padding: 14, textAlign: 'center' }}>
              <stat.icon size={18} style={{ color: stat.color, marginBottom: 8 }} />
              <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>{stat.value}</p>
              <p style={{ fontSize: 11, color: 'var(--color-dim)', fontWeight: 500 }}>{stat.label}</p>
            </SpotlightCard>
          ))}
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Weekly Activity */}
        <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
          <SpotlightCard style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Weekly Activity</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="day" tick={{ fill: chartTheme.text, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartTheme.text, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#171C24', border: '1px solid #222A36', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#D9E1EE' }} />
                <Bar dataKey="minutes" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SpotlightCard>
        </motion.div>

        {/* Vocab Growth */}
        <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
          <SpotlightCard style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Vocabulary Growth</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={analytics.vocabGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="month" tick={{ fill: chartTheme.text, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartTheme.text, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#171C24', border: '1px solid #222A36', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#D9E1EE' }} />
                <Area type="monotone" dataKey="words" stroke="#22D3EE" fill="rgba(34, 211, 238, 0.1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </SpotlightCard>
        </motion.div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Retention Rate */}
        <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
          <SpotlightCard style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Retention Rate</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analytics.retentionRate}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="week" tick={{ fill: chartTheme.text, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartTheme.text, fontSize: 12 }} axisLine={false} tickLine={false} domain={[60, 100]} />
                <Tooltip contentStyle={{ background: '#171C24', border: '1px solid #222A36', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#D9E1EE' }} />
                <Line type="monotone" dataKey="rate" stroke="#34D399" strokeWidth={2} dot={{ fill: '#34D399', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </SpotlightCard>
        </motion.div>

        {/* Pronunciation Trend */}
        <motion.div {...fadeUp} transition={{ delay: 0.25 }}>
          <SpotlightCard style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Pronunciation Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analytics.pronunciationTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="session" tick={{ fill: chartTheme.text, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartTheme.text, fontSize: 12 }} axisLine={false} tickLine={false} domain={[50, 100]} />
                <Tooltip contentStyle={{ background: '#171C24', border: '1px solid #222A36', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#D9E1EE' }} />
                <Line type="monotone" dataKey="score" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </SpotlightCard>
        </motion.div>
      </div>

      {/* Skill Breakdown */}
      <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
        <SpotlightCard style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Skill Breakdown</h3>
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ width: 300, height: 250 }}>
              <ResponsiveContainer>
                <RadarChart data={analytics.skillBreakdown}>
                  <PolarGrid stroke={chartTheme.grid} />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: chartTheme.text, fontSize: 12 }} />
                  <PolarRadiusAxis tick={false} domain={[0, 100]} />
                  <Radar dataKey="score" stroke="#8B5CF6" fill="rgba(139, 92, 246, 0.2)" strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
              {analytics.skillBreakdown.map(skill => (
                <div key={skill.skill} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--color-dim)', width: 80, fontWeight: 500 }}>{skill.skill}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--color-slate)', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${skill.score}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      style={{ height: '100%', borderRadius: 99, background: skill.color }}
                    />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, width: 32, textAlign: 'right' }}>{skill.score}%</span>
                </div>
              ))}
            </div>
          </div>
        </SpotlightCard>
      </motion.div>
      </div>

      <aside className="flex flex-col gap-5 xl:sticky xl:top-4">
        <SpotlightCard className="p-5">
          <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-3">Highlights</p>
          <div className="space-y-3 text-[13px]">
            <div className="flex items-center justify-between"><span className="text-dim">Best skill</span><span className="text-mint font-bold">Listening</span></div>
            <div className="flex items-center justify-between"><span className="text-dim">Fastest growth</span><span className="text-cyan font-bold">Vocabulary</span></div>
            <div className="flex items-center justify-between"><span className="text-dim">Review accuracy</span><span className="text-amber font-bold">{monthlyStats.reviewAccuracy}%</span></div>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-5">
          <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-3">Goal Progress</p>
          <p className="text-[13px] text-dim mb-4">Weekly target: 6 study sessions</p>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
            <div className="h-full w-[68%] bg-gradient-to-r from-violet to-cyan" />
          </div>
          <p className="text-[12px] text-mist font-bold">4 / 6 sessions completed</p>
        </SpotlightCard>

        <SpotlightCard className="p-5">
          <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-3">Next Focus</p>
          <div className="space-y-2">
            {['Speaking drills', 'Grammar review', 'Retention checkpoint'].map((item) => (
              <div key={item} className="rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-[13px] text-mist">{item}</div>
            ))}
          </div>
        </SpotlightCard>
      </aside>
      </div>

    </PageContent>
  );
}



