import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { PracticeCard } from '../../components/practice/PracticeCard';
import { ProgressBar } from '../../components/practice/ProgressBar';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { generateSession, SessionState } from '../../lib/sessionEngine';
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function PracticeQuickPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeLanguage } = useLanguage();
  const mode = searchParams.get('mode') || undefined;
  const source = searchParams.get('source') || undefined;
  const lang = searchParams.get('lang') || activeLanguage.code;
  const languageCode = lang.trim().toLowerCase();
  const languageName = languageCode === activeLanguage.code ? activeLanguage.name : languageCode.toUpperCase();

  const [session, setSession] = useState<SessionState>({
    items: [],
    currentIndex: 0,
    correctAnswers: 0,
    completed: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  const currentItem = session.items[session.currentIndex];
  const progress = session.items.length > 0 ? ((session.currentIndex) / session.items.length) * 100 : 0;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setInputValue('');
    setFeedback(null);

    void (async () => {
      try {
        const generated = await generateSession({
          mode,
          source,
          languageCode,
          languageName,
        });
        if (!cancelled) {
          setSession(generated);
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

  useEffect(() => {
    if (feedback !== null) {
      const timer = setTimeout(() => {
        setFeedback(null);
        setInputValue('');
        if (session.currentIndex + 1 >= session.items.length) {
          setSession(s => ({ ...s, completed: true }));
        } else {
          setSession(s => ({ ...s, currentIndex: s.currentIndex + 1 }));
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [feedback, session.currentIndex, session.items.length]);

  const handleAnswer = (answer: string) => {
    if (feedback !== null || !currentItem) return;
    const isCorrect = answer.toLowerCase().trim() === currentItem.answer.toLowerCase().trim();
    if (isCorrect) {
      setSession(s => ({ ...s, correctAnswers: s.correctAnswers + 1 }));
      setFeedback('correct');
    } else {
      setFeedback('incorrect');
    }
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      handleAnswer(inputValue);
    }
  };

  if (isLoading) {
    return (
      <PageContent width="narrow" className="pb-12">
        <PageActions>
          <button className="page-primary-action" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Exit Session
          </button>
        </PageActions>
        <SpotlightCard className="p-6 flex items-center gap-3 text-mist">
          <Loader2 size={18} className="animate-spin" />
          <span>Generating practice for {languageName}...</span>
        </SpotlightCard>
      </PageContent>
    );
  }

  if (loadError) {
    return (
      <PageContent width="narrow" className="pb-12">
        <PageActions>
          <button className="page-primary-action" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Exit Session
          </button>
        </PageActions>
        <SpotlightCard className="p-6 text-rose-300 text-[14px]">
          {loadError}
        </SpotlightCard>
      </PageContent>
    );
  }

  if (!currentItem) {
    return (
      <PageContent width="narrow" className="pb-12">
        <PageActions>
          <button className="page-primary-action" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Exit Session
          </button>
        </PageActions>
        <SpotlightCard className="p-6 text-dim text-[14px]">
          No practice items generated for this session.
        </SpotlightCard>
      </PageContent>
    );
  }

  if (session.completed) {
    return (
      <PageContent width="narrow" className="pb-12">
        <PageActions>
          <button className="page-primary-action" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Back
          </button>
        </PageActions>
        <SpotlightCard className="p-8 text-center bg-emerald-500/5">
          <div className="mx-auto bg-emerald-500/20 text-emerald-400 w-16 h-16 flex items-center justify-center rounded-full mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-[28px] font-bold text-white mb-2">Session Complete!</h1>
          <p className="text-[15px] text-mist mb-8">
            You scored {session.correctAnswers} out of {session.items.length}.
          </p>
          <button className="page-primary-action w-full justify-center" onClick={() => navigate('/')}>
            Return Home
          </button>
        </SpotlightCard>
      </PageContent>
    );
  }

  return (
    <PageContent width="narrow" className="pb-12">
      <PageActions>
        <button className="page-primary-action" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Exit Session
        </button>
      </PageActions>
      
      <div className="mb-8">
        <h1 className="text-[24px] font-bold text-white mb-4">Quick Practice</h1>
        <ProgressBar progress={progress} />
      </div>

      <PracticeCard>
        <div className="text-[14px] text-dim uppercase tracking-wider font-bold mb-4">
          {currentItem.type === 'mcq' && 'Vocabulary Recall'}
          {currentItem.type === 'translate' && 'Translation'}
          {currentItem.type === 'speak' && 'Speaking Practice'}
        </div>
        
        <p className="text-[18px] text-white font-medium mb-6">
          {currentItem.prompt}
        </p>

        {currentItem.type === 'mcq' && currentItem.options && (
          <div className="grid gap-3">
            {currentItem.options.map((opt) => (
              <button
                key={opt}
                disabled={feedback !== null}
                onClick={() => handleAnswer(opt)}
                className="w-full text-left px-4 py-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-mist"
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {(currentItem.type === 'translate' || currentItem.type === 'speak') && (
          <form onSubmit={handleInputSubmit} className="flex flex-col gap-4">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={feedback !== null}
              placeholder={currentItem.type === 'speak' ? 'Type what you said... (microphone mock)' : 'Type your answer...'}
              className="w-full bg-black/20 rounded-lg border border-white/10 p-4 text-mist placeholder:text-dim outline-none resize-none min-h-[100px]"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || feedback !== null}
              className="page-primary-action justify-center"
            >
              Check Answer
            </button>
          </form>
        )}

        {feedback === 'correct' && (
          <div className="mt-6 flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
            <CheckCircle2 size={18} /> Correct! Excellent job.
          </div>
        )}
        
        {feedback === 'incorrect' && (
          <div className="mt-6 flex flex-col gap-2 text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
            <div className="flex items-center gap-2">
              <XCircle size={18} /> Not quite right.
            </div>
            <div className="text-[14px]">
              The correct answer is: <span className="font-bold text-white">{currentItem.answer}</span>
            </div>
          </div>
        )}
      </PracticeCard>
    </PageContent>
  );
}
