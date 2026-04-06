import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { completeWithEcho } from '../../services/aiProvider';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { useAppData } from '../../contexts/AppDataContext';
import { buildTemplateUrl } from '../../navigation/actionTemplates';
import { useLanguage } from '../../contexts/LanguageContext';
import { integrationService } from '../../services/integrationService';
import { writeExerciseRegistry } from '../../components/exercises/write/registry';
import type { WriteCorrectionItem } from '../../components/exercises/write/types';
import { UnsupportedExerciseCard } from '../../components/exercises/shared/UnsupportedExerciseCard';

export default function WriteEditor() {
    const DEFAULT_TEXT = '';

    const { draftId } = useParams();
    const navigate = useNavigate();
    const { activeLanguage } = useLanguage();
    const { state, saveDraft, analyzeDraft } = useAppData();
    const activeDraft = draftId ? state.writingDrafts.find((draft) => draft.id === draftId) : undefined;

    const [text, setText] = useState(activeDraft?.content ?? DEFAULT_TEXT);
    const [showCorrections, setShowCorrections] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [corrections, setCorrections] = useState<WriteCorrectionItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (activeDraft) {
            setText(activeDraft.content);
            return;
        }
        if (!draftId) {
            setText(DEFAULT_TEXT);
        }
    }, [activeDraft, draftId]);

    if (draftId && !activeDraft) {
        return (
            <PageContent width="wide" className="pb-12">
                <PageActions>
                    <div className="flex gap-2">
                        <Link to="/write" className="no-underline">
                            <button className="page-primary-action">
                                <ArrowLeft size={16} /> Back to Write
                            </button>
                        </Link>
                        <button
                            className="page-primary-action"
                            onClick={() =>
                                navigate(
                                    buildTemplateUrl({
                                        templateId: 'write-draft-fallback',
                                        entityId: draftId,
                                        params: { from: '/write', lang: activeLanguage.code },
                                    }),
                                )
                            }
                        >
                            Open Template
                        </button>
                    </div>
                </PageActions>
                <div className="card" style={{ padding: 24 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Draft not found</h2>
                    <p style={{ color: 'var(--color-dim)' }}>
                        This draft ID does not exist anymore. Open the template fallback or return to the write dashboard.
                    </p>
                </div>
            </PageContent>
        );
    }

    const handleReview = async () => {
        setIsAnalyzing(true);
        setError(null);
        try {
            const prompt = `
                Analyze the following ${activeLanguage.name} text for grammar, spelling, and style errors.
                Provide a list of corrections. For each correction, include:
                - original: the problematic part
                - corrected: the fixed part (if same as original, type is "correct")
                - type: "grammar", "spelling", "correct", or "style"
                - explanation: a short helpful tip in English.
                
                Text: "${text}"
                
                Format your response as a JSON array of objects: 
                [{"original": "...", "corrected": "...", "type": "...", "explanation": "..."}]
            `;

            const response = await completeWithEcho([
                { id: '1', role: 'user', content: prompt, createdAt: Date.now() }
            ], 'analyst');

            const jsonPart = response.match(/\[.*\]/s)?.[0] || response;
            const data = JSON.parse(jsonPart);
            setCorrections(data);
            setShowCorrections(true);
            const saved = saveDraft({
                id: activeDraft?.id,
                promptId: activeDraft?.promptId,
                title: activeDraft?.title ?? 'Writing Editor Draft',
                content: text,
            });
                analyzeDraft(saved.id, data);
                void integrationService.logWriteAttempt({
                languageCode: activeLanguage.code,
                text,
                corrections: Array.isArray(data) ? data.filter((item: WriteCorrectionItem) => item.type !== 'correct').length : 0,
                hasAnalysis: true,
            });
        } catch {
            setCorrections([]);
            setShowCorrections(true);
            setError('Analysis failed. No fallback corrections were generated.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const DraftComponent = writeExerciseRegistry.draft_composition.component;
    const CorrectionsComponent = writeExerciseRegistry.correction_review.component;
    const draftValid = writeExerciseRegistry.draft_composition.validate({ text });
    const correctionValid = writeExerciseRegistry.correction_review.validate({ corrections });

    return (
        <PageContent width="wide" className="pb-12">
            <PageActions>
                <Link to="/write" className="no-underline">
                    <button className="page-primary-action">
                        <ArrowLeft size={16} /> Back to Write
                    </button>
                </Link>
            </PageActions>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ display: 'flex', gap: 20 }}>
                    {/* Editor */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 14 }}>{activeDraft?.title ?? 'Writing Editor'}</h2>
                        {draftValid ? (
                          <DraftComponent
                            text={text}
                            onTextChange={setText}
                            onToggleCorrections={() => setShowCorrections(!showCorrections)}
                            onAnalyze={() => {
                              void handleReview();
                            }}
                            showCorrections={showCorrections}
                            isAnalyzing={isAnalyzing}
                            wordCount={wordCount}
                            error={error}
                          />
                        ) : (
                          <UnsupportedExerciseCard reason="Draft composition payload is invalid." />
                        )}
                    </div>

                    {/* Corrections Panel */}
                    {showCorrections && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            style={{ width: 320, flexShrink: 0 }}
                        >
                            {correctionValid ? <CorrectionsComponent corrections={corrections} /> : <UnsupportedExerciseCard reason="Correction payload is invalid." />}
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </PageContent>
    );
}
