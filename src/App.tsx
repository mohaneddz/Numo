import { Routes, Route } from 'react-router-dom';
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

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/learn/:moduleId" element={<ModuleDetail />} />
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
        <Route path="/references" element={<ReferencesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
