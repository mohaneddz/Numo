import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Zap } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import { PageActions, PageContent } from '../components/layout/PageLayout';
import { SpotlightCard } from '../components/ui/SpotlightCard';
import { useLanguage } from '../contexts/LanguageContext';
import { buildActionUrl } from '../navigation/actionTemplates';
import { integrationService, type InsightsSnapshot } from '../services/integrationService';
import { LockedPageState } from '../components/ui/LockedPageState';
import { useLanguageProgression } from '../hooks/useLanguageProgression';

const chartTooltip = {
  background: 'rgba(13, 18, 41, 0.95)',
  border: '1px solid rgba(120, 140, 255, 0.35)',
  borderRadius: 12,
  color: '#E5E7FF',
  fontSize: 12,
};

export default function InsightsPage() {
  const navigate = useNavigate();
  const { activeLanguage } = useLanguage();
  const { lockStates } = useLanguageProgression();
  const [snapshot, setSnapshot] = useState<InsightsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await integrationService.queryInsights(activeLanguage.code, 90);
        if (!cancelled) setSnapshot(next);
      } catch (nextError) {
        if (!cancelled) setError(nextError instanceof Error ? nextError.message : 'Failed to load insights.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeLanguage.code]);

  const weeklyActivity = snapshot?.weeklyActivity ?? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => ({ day, minutes: 0 }));
  const hasWeeklyData = weeklyActivity.some((item) => item.minutes > 0);

  const modeSeries = useMemo(() => {
    const values = [
      { name: 'Speaking', value: snapshot?.speakingSessions ?? 0, color: '#4E6BFF' },
      { name: 'Writing', value: snapshot?.writingPieces ?? 0, color: '#9D6BFF' },
      { name: 'Learning', value: snapshot?.lessonsCompleted ?? 0, color: '#4CC4F2' },
      { name: 'Review', value: snapshot?.reviewAccuracy ?? 0, color: '#7C5BFF' },
    ];
    return values;
  }, [snapshot]);

  const hasModeData = modeSeries.some((item) => item.value > 0);
  const lock = lockStates.insights;

  if (!lock.unlocked) {
    return (
      <PageContent width="wide" className="pb-10">
        <LockedPageState
          title={lock.title}
          whatThisPageIsFor="Evidence-based trends across review, speaking, writing, and study consistency."
          whyLocked={lock.whyLocked}
          unlocksWhen={lock.unlocksWhen}
          nextAction={lock.nextAction}
          nextActionTo="/learn"
        />
      </PageContent>
    );
  }

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
          <Zap size={16} /> Quick Review
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

      <div className="grid gap-5">
        <SpotlightCard className="p-6">
          <h2 className="text-[24px] font-bold text-white mb-2">Monitoring Snapshot</h2>
          {/* Guardrail: this page shows query-backed metrics only; no synthetic placeholders. */}
          <p className="text-[13px] text-dim">All numbers are persisted evidence/query outputs; no synthetic analytics are injected.</p>
          {loading && <p className="mt-2 text-[12px] text-dim">Loading DB metrics...</p>}
          {error && <p className="mt-2 text-[12px] text-rose-300">{error}</p>}
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist">Due now: {snapshot?.dueNowCount ?? 0}</div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist">Overdue: {snapshot?.overdueCount ?? 0}</div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist">Total minutes: {snapshot?.totalStudyMinutes ?? 0}</div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist">Words learned: {snapshot?.wordsLearned ?? 0}</div>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-6">
          <h3 className="text-[20px] font-bold text-white mb-3">Weekly Activity (Real Minutes)</h3>
          {!hasWeeklyData && <p className="text-[13px] text-dim">Not enough data yet for weekly activity trends.</p>}
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyActivity} margin={{ top: 12, right: 10, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="rgba(135, 150, 230, 0.2)" strokeDasharray="3 4" />
                <XAxis dataKey="day" tick={{ fill: '#8D95C3', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8D95C3', fontSize: 12 }} axisLine={false} tickLine={false} width={34} />
                <Tooltip contentStyle={chartTooltip} />
                <Line type="monotone" dataKey="minutes" stroke="#35A6FF" strokeWidth={2.6} dot={{ fill: '#5FCCFF', strokeWidth: 0, r: 3.4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-6">
          <h3 className="text-[20px] font-bold text-white mb-3">Sessions by Mode</h3>
          {!hasModeData && <p className="text-[13px] text-dim">Not enough data yet for mode balance.</p>}
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={modeSeries}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={82}
                  startAngle={90}
                  endAngle={-270}
                  stroke="rgba(12, 15, 33, 0.9)"
                  strokeWidth={2}
                >
                  {modeSeries.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SpotlightCard>
      </div>
    </PageContent>
  );
}
