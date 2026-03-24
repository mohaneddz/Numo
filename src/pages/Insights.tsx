import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { TrendingUp, Clock, BookOpen, Mic, PenLine, Brain } from 'lucide-react';
import { analytics } from '../data/analytics';
import { focusAreas } from '../data/learner';
import { SpotlightCard } from '../components/ui/SpotlightCard';

const chartTheme = { bg: '#171C24', grid: '#222A36', text: '#93A0B4' };
const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

export default function InsightsPage() {
  const { monthlyStats } = analytics;

  return (
    <div style={{ maxWidth: 1100 }}>
      <motion.div {...fadeUp}>
        <p style={{ color: 'var(--color-dim)', fontSize: 14, marginBottom: 24 }}>
          Your learning analytics and performance trends at a glance.
        </p>
      </motion.div>

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
  );
}
