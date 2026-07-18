import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import HomePage from './pages/Home';
import LearnPage from './pages/Learn/LearnPage';
import ModuleDetail from './pages/Learn/ModuleDetail';
import ReviewPage from './pages/Review/ReviewPage';
import ReviewSession from './pages/Review/ReviewSession';
import ImmersePage from './pages/Immerse/ImmersePage';
import ContentDetail from './pages/Immerse/ContentDetail';
import SpeakPage from './pages/Speak/SpeakPage';
import SpeakSession from './pages/Speak/SpeakSession';
import WritePage from './pages/Write/WritePage';
import WriteEditor from './pages/Write/WriteEditor';
import NotebookPage from './pages/Notebook/NotebookPage';
import NotebookDetail from './pages/Notebook/NotebookDetail';
import InsightsPage from './pages/Insights';
import LibraryPage from './pages/Library';
import ReferencesPage from './pages/References';
import SettingsPage from './pages/Settings';
import ChatPage from './pages/Chat';
import WebSearchPage from './pages/WebSearch';
import ScriptPracticePage from './pages/ScriptPractice/ScriptPracticePage';
import ProfilePage from './pages/Profile';
import LoginPage from './pages/Login';
import LanguageSetupPage from './pages/LanguageSetup';
import LanguageWelcomePage from './pages/LanguageWelcome';
import { useLanguage } from './contexts/LanguageContext';
import { useLanguageJourney } from './contexts/LanguageJourneyContext';
import { useProfileSession } from './contexts/ProfileSessionContext';
import PracticeQuickPage from './pages/Practice/PracticeQuickPage';
import LearnSessionPage from './pages/Learn/LearnSessionPage';
import NotificationsPage from './pages/Notifications/NotificationsPage';
import ExercisesPage from './pages/Exercises/ExercisesPage';
import { DEV_MODE } from './config/env';

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1.8;
const ZOOM_STEP = 0.1;

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));
}

function GuardedShell() {
  const location = useLocation();
  const { status } = useProfileSession();
  const { activeLanguage } = useLanguage();
  const { getSettings } = useLanguageJourney();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        {/* Loading Image Placeholder */}
        <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
          {/* Animated background ring */}
          <div className="absolute inset-0 rounded-full border-4 border-current opacity-10 animate-ping"></div>
          
          {/* Actual image placeholder - replace src when you have the image */}
          <div className="relative z-10 w-20 h-20 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center overflow-hidden backdrop-blur-sm">
            <img 
              src="/loading-placeholder.png" 
              alt="Loading" 
              className="w-full h-full object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        </div>
        
        {/* Brand Text & Loading Dots */}
        <h2 className="text-2xl font-light tracking-widest mb-4 animate-pulse">NUMO</h2>
        
        <div className="flex items-center gap-2 text-dim opacity-70">
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
      </div>
    );
  }

  if (status !== 'ready') {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  // Ensure active language setup is complete
  const settings = getSettings(activeLanguage.code);
  if (!settings.onboardingCompleted && location.pathname !== '/language-setup') {
    return <Navigate to={`/language-setup?lang=${activeLanguage.code}`} replace />;
  }

  return <AppShell />;
}

export default function App() {
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    const root = document.documentElement;
    root.style.zoom = String(zoomLevel);
    return () => {
      root.style.zoom = '1';
    };
  }, [zoomLevel]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const meta = event.ctrlKey || event.metaKey;
      if (!meta || event.altKey) return;

      const key = event.key;
      if (key === '+' || key === '=' || key === 'NumpadAdd') {
        event.preventDefault();
        setZoomLevel((previous) => clampZoom(previous + ZOOM_STEP));
        return;
      }
      if (key === '-' || key === '_' || key === 'NumpadSubtract') {
        event.preventDefault();
        setZoomLevel((previous) => clampZoom(previous - ZOOM_STEP));
        return;
      }
      if (key === '0' || key === 'Numpad0') {
        event.preventDefault();
        setZoomLevel(1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<GuardedShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/learn/session" element={<LearnSessionPage />} />
        <Route path="/learn/:moduleId" element={<ModuleDetail />} />
        <Route path="/practice/quick" element={<PracticeQuickPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/review/session" element={<ReviewSession />} />
        <Route path="/immerse" element={<ImmersePage />} />
        <Route path="/immerse/:contentId" element={<ContentDetail />} />
        <Route path="/speak" element={<SpeakPage />} />
        <Route path="/speak/session/:sessionId" element={<SpeakSession />} />
        <Route path="/write" element={<WritePage />} />
        <Route path="/write/editor/:draftId?" element={<WriteEditor />} />
        <Route path="/notebook" element={<NotebookPage />} />
        <Route path="/notebook/:itemId" element={<NotebookDetail />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/script-practice" element={<ScriptPracticePage />} />
        <Route path="/references" element={<ReferencesPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/web-search" element={<WebSearchPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/language-setup" element={<LanguageSetupPage />} />
        <Route path="/language-welcome" element={<LanguageWelcomePage />} />
        {DEV_MODE && <Route path="/exercises" element={<ExercisesPage />} />}
      </Route>
    </Routes>
  );
}
