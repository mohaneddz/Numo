import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Zap } from 'lucide-react';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { useLanguage } from '../../contexts/LanguageContext';
import { getLessonCatalog } from '../../services/learningPlanService';

interface LessonCardView {
  unitId: string;
  unitTitle: string;
  lessonId: string;
  lessonTitle: string;
  communicationGoal: string;
  objectives: number;
}

export default function LearnPage() {
  const navigate = useNavigate();
  const { activeLanguage } = useLanguage();
  const [lessons, setLessons] = useState<LessonCardView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const snapshot = await getLessonCatalog(activeLanguage.code);
        if (cancelled) return;
        const next = snapshot.units.flatMap((block) =>
          block.lessons.map((lessonBlock) => ({
            unitId: block.unit.id,
            unitTitle: block.unit.title,
            lessonId: lessonBlock.lesson.id,
            lessonTitle: lessonBlock.lesson.title,
            communicationGoal: lessonBlock.lesson.communicationGoal,
            objectives: lessonBlock.objectives.length,
          })),
        );
        setLessons(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
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
              lessons.length > 0
                ? `/learn/session?lessonId=${encodeURIComponent(lessons[0].lessonId)}`
                : '/learn/session',
            )
          }
        >
          <Zap size={16} /> Quick Start
        </button>
      </PageActions>

      <div className="card" style={{ padding: 20, marginBottom: 12 }}>
        <h2 style={{ marginBottom: 8 }}>Learn</h2>
        <p style={{ color: 'var(--color-dim)', margin: 0 }}>
          Structured unit to lesson to objective teaching path for {activeLanguage.name}.
        </p>
      </div>

      {loading && (
        <div className="card" style={{ padding: 16 }}>
          <p style={{ margin: 0, color: 'var(--color-dim)' }}>Loading lessons...</p>
        </div>
      )}

      {!loading && lessons.length === 0 && (
        <div className="card" style={{ padding: 16 }}>
          <p style={{ margin: 0, color: 'var(--color-dim)' }}>No lessons available for this language yet.</p>
        </div>
      )}

      <div className="grid gap-3">
        {lessons.map((lesson) => (
          <div key={lesson.lessonId} className="card" style={{ padding: 14 }}>
            <div className="flex items-center justify-between gap-3">
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{lesson.lessonTitle}</p>
                <p style={{ margin: '2px 0 0', color: 'var(--color-dim)', fontSize: 13 }}>{lesson.unitTitle}</p>
                <p style={{ margin: '6px 0 0', color: 'var(--color-dim)', fontSize: 13 }}>
                  {lesson.communicationGoal} • {lesson.objectives} objective(s)
                </p>
              </div>
              <Link to={`/learn/session?lessonId=${encodeURIComponent(lesson.lessonId)}`} className="no-underline">
                <button className="page-primary-action">
                  <BookOpen size={14} /> Start
                </button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </PageContent>
  );
}
