import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { DailyGoalCard } from '../components/home/DailyGoalCard';
import { ContinueLearningCard } from '../components/home/ContinueLearningCard';
import { RecommendedSection } from '../components/home/RecommendedSection';
import { PathProgressCard } from '../components/home/PathProgressCard';
import { GuideCard } from '../components/home/GuideCard';
import { DueReviewCard } from '../components/home/DueReviewCard';
import { FocusAreasCard } from '../components/home/FocusAreasCard';
import { RecentlySavedCard } from '../components/home/RecentlySavedCard';
import { TodayPlanCard } from '../components/home/TodayPlanCard';
import {
  PageActions,
  PageContent,
  PageMainColumn,
  PageMainSidebarLayout,
  PageSidebar,
} from '../components/layout/PageLayout';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurriculumState } from '../hooks/useCurriculumState';
import { backgroundImageService } from '../services/backgrounds';

export default function HomePage() {
  const navigate = useNavigate();
  const { activeLanguage } = useLanguage();
  const { nextStep, selectedTheme } = useCurriculumState();

  // Warm the card artwork for the theme the learner is actually on. This
  // previously depended on the recommended-cards array identity, so it re-ran on
  // every context update and re-requested the same images.
  useEffect(() => {
    void backgroundImageService.prefetchLikelyLanguageCards({
      languageCode: activeLanguage.code,
      languageName: activeLanguage.name,
      includeGeneric: true,
      recommended: [
        {
          id: selectedTheme.id,
          title: selectedTheme.title,
          description: selectedTheme.shortDescription,
          type: 'course',
        },
      ],
    });
  }, [activeLanguage.code, activeLanguage.name, selectedTheme.id, selectedTheme.shortDescription, selectedTheme.title]);

  return (
    <PageContent className="min-h-full" width="wide">
      <PageActions>
        <button
          className="page-primary-action"
          onClick={() =>
            navigate(
              nextStep ? `/learn/session?stepId=${encodeURIComponent(nextStep.step.id)}` : '/learn',
            )
          }
        >
          <Zap size={16} fill="currentColor" /> {nextStep ? 'Continue session' : 'Open learning path'}
        </button>
      </PageActions>

      <PageMainSidebarLayout className="gap-6">
        <PageMainColumn className="gap-6">
          <TodayPlanCard />
          <ContinueLearningCard />
          <RecommendedSection />
          <PathProgressCard />
        </PageMainColumn>

        <PageSidebar className="gap-4">
          <GuideCard />
          <DailyGoalCard />
          <DueReviewCard />
          <FocusAreasCard />
          <RecentlySavedCard />
        </PageSidebar>
      </PageMainSidebarLayout>
    </PageContent>
  );
}
