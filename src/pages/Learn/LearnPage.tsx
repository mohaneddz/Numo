import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, RotateCcw, Zap } from 'lucide-react';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { useAppData } from '../../contexts/AppDataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { buildActionUrl } from '../../navigation/actionTemplates';
import { integrationService, type InsightsSnapshot } from '../../services/integrationService';
import { useCardBackground } from '../../hooks/useCardBackground';

export default function LearnPage() {
  const navigate = useNavigate();
  const { activeLanguage } = useLanguage();
  const { recordLearnInteraction } = useAppData();
  const [snapshot, setSnapshot] = useState<InsightsSnapshot | null>(null);
  const courseBackground = useCardBackground({
    itemKey: `learn:course:${activeLanguage.code}`,
    itemType: 'course',
    languageCode: activeLanguage.code,
    languageName: activeLanguage.name,
    title: `${activeLanguage.name} course`,
    topicTags: ['course', 'learning path', 'culture'],
    cardType: 'learn_course',
    mood: 'cinematic subtle',
    fallbackAsset: '/continue_learning.png',
  });
  const lessonBackground = useCardBackground({
    itemKey: `learn:lesson:${activeLanguage.code}`,
    itemType: 'lesson',
    languageCode: activeLanguage.code,
    languageName: activeLanguage.name,
    title: `${activeLanguage.name} lesson activity`,
    topicTags: ['lesson', 'study desk'],
    cardType: 'learn_lesson',
    mood: 'focused calm',
    fallbackAsset: '/continue_learning.png',
  });

  const courseIsFallback = !courseBackground.selection || courseBackground.selection.provider === 'fallback';
  const lessonIsFallback = !lessonBackground.selection || lessonBackground.selection.provider === 'fallback';

  useEffect(() => {
    let cancelled = false;
    void integrationService.queryInsights(activeLanguage.code, 30).then((next) => {
      if (!cancelled) setSnapshot(next);
    });
    return () => {
      cancelled = true;
    };
  }, [activeLanguage.code]);

  return (
    <PageContent width="narrow" className="pb-12">
      <PageActions>
        <button
          className="page-primary-action"
          onClick={() =>
            navigate(
              buildActionUrl('learn_quick_start', {
                params: { from: '/learn', lang: activeLanguage.code },
              }),
            )
          }
        >
          <Zap size={16} /> Quick Start
        </button>
      </PageActions>

      <div className="card" style={{ padding: 20, marginBottom: 12 }}>
        <h2 style={{ marginBottom: 8 }}>Learn</h2>
        <p style={{ color: 'var(--color-dim)', margin: 0 }}>
          This view only shows persisted study signals. Curriculum demo modules were removed from the production path in this phase.
        </p>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <p style={{ margin: 0 }}>Recent lessons completed: {snapshot?.lessonsCompleted ?? 0}</p>
        <p style={{ margin: 0, color: 'var(--color-dim)' }}>
          Study minutes (30d): {snapshot?.totalStudyMinutes ?? 0} • Due now: {snapshot?.dueNowCount ?? 0}
        </p>
      </div>

      <div className="grid gap-3">
      <div className="card relative overflow-hidden" style={{ padding: 14 }}>
          {!courseIsFallback && <img src={courseBackground.source} alt="course" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
          <div className={`absolute inset-0 ${courseIsFallback ? 'bg-gradient-to-r from-[#171033] via-[#0b1020] to-[#0A0F24]' : 'bg-gradient-to-t from-[#0b1020]/85 to-[#0b1020]/45'}`} />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>Log Learn Activity</p>
              <p style={{ margin: 0, color: 'var(--color-dim)', fontSize: 13 }}>Create real evidence for learner updates.</p>
            </div>
            <button
              className="page-primary-action"
              onClick={() => recordLearnInteraction({ moduleId: 'learn-core', note: 'Manual learn activity from Learn page.' })}
            >
              <BookOpen size={14} /> Log
            </button>
          </div>
        </div>

        <div className="card relative overflow-hidden" style={{ padding: 14 }}>
          {!lessonIsFallback && <img src={lessonBackground.source} alt="lesson" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
          <div className={`absolute inset-0 ${lessonIsFallback ? 'bg-gradient-to-r from-[#0b1020] via-[#0A0F24] to-[#121E36]' : 'bg-gradient-to-t from-[#0b1020]/85 to-[#0b1020]/45'}`} />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>Continue Review</p>
              <p style={{ margin: 0, color: 'var(--color-dim)', fontSize: 13 }}>Use due queue generated from persisted scheduler only.</p>
            </div>
            <Link to="/review/session?mode=due-now" className="no-underline">
              <button className="page-primary-action">
                <RotateCcw size={14} /> Review
              </button>
            </Link>
          </div>
        </div>
      </div>
    </PageContent>
  );
}
