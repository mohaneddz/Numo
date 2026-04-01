import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { LessonBlock } from '../../components/practice/LessonBlock';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { generateLearnConcept, LearnConceptData } from '../../services/learnSessionGenerator';
import { useLanguage } from '../../contexts/LanguageContext';

export default function LearnSessionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeLanguage } = useLanguage();
  const mode = searchParams.get('mode') || 'start'; // start, continue, next, review
  const source = searchParams.get('source') || undefined;
  const lang = searchParams.get('lang') || activeLanguage.code;
  const languageCode = lang.trim().toLowerCase();
  const languageName = languageCode === activeLanguage.code ? activeLanguage.name : languageCode.toUpperCase();

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [conceptData, setConceptData] = useState<LearnConceptData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [inputVal, setInputVal] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setStep(0);
    setInputVal('');
    setFeedback(null);

    void (async () => {
      try {
        const generated = await generateLearnConcept({
          mode,
          source,
          languageCode,
          languageName,
        });
        if (!cancelled) {
          setConceptData(generated);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load session');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [languageCode, languageName, mode, source]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conceptData) return;
    if (inputVal.toLowerCase().trim() === conceptData.answer.toLowerCase()) {
      setFeedback('correct');
    } else {
      setFeedback('incorrect');
    }
  };

  return (
    <PageContent width="narrow" className="pb-12">
      <PageActions>
        <button className="page-primary-action" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Exit Lesson
        </button>
      </PageActions>

      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-white mb-2">Learning Session</h1>
        <p className="text-[14px] text-dim">Mode: {mode}</p>
      </div>

      {isLoading && (
        <SpotlightCard className="p-6 flex items-center gap-3 text-mist">
          <Loader2 size={18} className="animate-spin" />
          <span>Generating lesson for {languageName}...</span>
        </SpotlightCard>
      )}

      {loadError && !isLoading && (
        <SpotlightCard className="p-6 text-rose-300 text-[14px]">
          {loadError}
        </SpotlightCard>
      )}

      {!conceptData || isLoading ? null : (
        <>
      {step === 0 && (
        <>
          <LessonBlock 
            title={conceptData.title}
            concept={conceptData.concept}
            example={conceptData.example}
          />
          <button 
            className="page-primary-action w-full justify-center py-3"
            onClick={() => setStep(1)}
          >
            Got it, let's practice <ArrowRight size={16} />
          </button>
        </>
      )}

      {step === 1 && (
        <SpotlightCard className="p-6">
          <h2 className="text-[18px] font-bold text-white mb-4">Practice</h2>
          <p className="text-[15px] text-mist mb-6">{conceptData.practicePrompt}</p>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              disabled={feedback === 'correct'}
              placeholder="Your answer..."
              className="w-full bg-black/20 rounded-lg border border-white/10 p-4 text-mist placeholder:text-dim outline-none"
            />
            {feedback === null && (
              <button
                type="submit"
                disabled={!inputVal.trim()}
                className="page-primary-action justify-center py-3"
              >
                Check
              </button>
            )}
          </form>

          {feedback === 'incorrect' && (
            <div className="mt-4 text-rose-400 text-[14px]">
              Not quite right. Try again, or review the concept.
              <button 
                className="ml-4 text-white underline opacity-70 hover:opacity-100"
                onClick={() => { setFeedback(null); setStep(0); }}
              >
                Review Concept
              </button>
            </div>
          )}

          {feedback === 'correct' && (
            <div className="mt-6 flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle2 size={20} /> Correct! You've unlocked the next part.
              </div>
              <button 
                className="page-primary-action w-full justify-center py-3 bg-white text-black hover:bg-mist"
                onClick={() => navigate('/')}
              >
                Complete Session
              </button>
            </div>
          )}
        </SpotlightCard>
      )}
        </>
      )}
    </PageContent>
  );
}
