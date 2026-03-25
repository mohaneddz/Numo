import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, Lock, Play, Clock, Zap } from 'lucide-react';
import { modules, lessons } from '../../data/lessons';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { useNavigate } from 'react-router-dom';
import { buildTemplateUrl } from '../../navigation/actionTemplates';
import { useLanguage } from '../../contexts/LanguageContext';

export default function ModuleDetail() {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const { activeLanguage } = useLanguage();
    const mod = modules.find(m => m.id === moduleId);
    const moduleLessons = lessons.filter(l => l.moduleId === moduleId);

    if (!mod) {
        return (
            <PageContent width="narrow">
                <PageActions>
                    <div className="flex gap-2">
                        <Link to="/learn" className="no-underline">
                            <button className="page-primary-action">
                                <ArrowLeft size={16} /> Back to Learn
                            </button>
                        </Link>
                        <button
                            className="page-primary-action"
                            onClick={() =>
                                navigate(
                                    buildTemplateUrl({
                                        templateId: 'learn-module-fallback',
                                        entityId: moduleId,
                                        params: { from: '/learn', lang: activeLanguage.code },
                                    }),
                                )
                            }
                        >
                            Open Template
                        </button>
                    </div>
                </PageActions>
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <p style={{ color: 'var(--color-dim)' }}>Module not found.</p>
                </div>
            </PageContent>
        );
    }

    const progress = mod.lessonsCount > 0 ? (mod.completedLessons / mod.lessonsCount) * 100 : 0;

    const statusConfig = {
        'completed': { color: '#34D399', icon: CheckCircle, label: 'Completed' },
        'in-progress': { color: '#8B5CF6', icon: Play, label: 'In Progress' },
        'available': { color: '#22D3EE', icon: Play, label: 'Start' },
        'locked': { color: 'var(--color-dim-dark)', icon: Lock, label: 'Locked' },
    };

    return (
        <PageContent width="narrow" className="pb-12">
            <PageActions>
                <Link to="/learn" className="no-underline">
                    <button className="page-primary-action">
                        <ArrowLeft size={16} /> Back to Learn
                    </button>
                </Link>
            </PageActions>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="card" style={{ padding: 24, marginBottom: 24, borderLeft: `3px solid ${mod.accentColor}` }}>
                    <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>{mod.title}</h1>
                    <p style={{ color: 'var(--color-dim)', fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>{mod.description}</p>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        <span className="pill" style={{ background: `${mod.accentColor}15`, color: mod.accentColor }}>{mod.level}</span>
                        <span className="pill" style={{ background: 'var(--color-slate)', color: 'var(--color-dim)' }}>{mod.duration}</span>
                        <span className="pill" style={{ background: 'var(--color-slate)', color: 'var(--color-dim)' }}>{mod.lessonsCount} lessons</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: 'var(--color-slate)', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', borderRadius: 99, background: mod.accentColor }} />
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--color-dim)', marginTop: 6 }}>
                        {mod.completedLessons} / {mod.lessonsCount} completed
                    </p>
                </div>
            </motion.div>

            {/* Lessons List */}
            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 14 }}>Lessons</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {moduleLessons.map((lesson, i) => {
                    const status = statusConfig[lesson.status];
                    const StatusIcon = status.icon;
                    return (
                        <motion.div
                            key={lesson.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                        >
                            <div
                                className="card"
                                style={{
                                    padding: '14px 18px',
                                    display: 'flex', alignItems: 'center', gap: 14,
                                    opacity: lesson.status === 'locked' ? 0.5 : 1,
                                    cursor: lesson.status !== 'locked' ? 'pointer' : 'default',
                                }}
                                onClick={() => {
                                    if (lesson.status === 'locked') {
                                        return;
                                    }
                                    navigate(
                                        buildTemplateUrl({
                                            templateId: 'learn-lesson',
                                            entityId: lesson.id,
                                            params: {
                                                from: `/learn/${mod.id}`,
                                                lang: activeLanguage.code,
                                                module: mod.id,
                                                status: lesson.status,
                                            },
                                        }),
                                    );
                                }}
                            >
                                <div style={{
                                    width: 32, height: 32, borderRadius: 8,
                                    background: `${status.color}15`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                }}>
                                    <StatusIcon size={15} style={{ color: status.color }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h4 style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{lesson.title}</h4>
                                    <p style={{ fontSize: 12, color: 'var(--color-dim)' }}>{lesson.description}</p>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                                    <span style={{ fontSize: 12, color: 'var(--color-dim)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                        <Clock size={12} /> {lesson.duration}
                                    </span>
                                    {lesson.xpEarned > 0 && (
                                        <span style={{ fontSize: 12, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 3 }}>
                                            <Zap size={12} /> {lesson.xpEarned} XP
                                        </span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </PageContent>
    );
}
