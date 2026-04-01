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
import { useProfileSession } from './contexts/ProfileSessionContext';
import PracticeQuickPage from './pages/Practice/PracticeQuickPage';
import LearnSessionPage from './pages/Learn/LearnSessionPage';
import NotificationsPage from './pages/Notifications/NotificationsPage';

function GuardedShell() {
  const location = useLocation();
  const { status } = useProfileSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-dim text-sm">
        Bootstrapping local profile session...
      </div>
    );
  }

  if (status !== 'ready') {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return <AppShell />;
}

export default function App() {
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
      </Route>
    </Routes>
  );
}
