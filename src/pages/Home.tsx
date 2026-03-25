// import { GreetingHero } from '../components/home/GreetingHero';
import { DailyGoalCard } from '../components/home/DailyGoalCard';
import { ContinueLearningCard } from '../components/home/ContinueLearningCard';
import { RecommendedSection } from '../components/home/RecommendedSection';
import { PathProgressCard } from '../components/home/PathProgressCard';
import { GuideCard } from '../components/home/GuideCard';
import { DueReviewCard } from '../components/home/DueReviewCard';
import { FocusAreasCard } from '../components/home/FocusAreasCard';
import { RecentlySavedCard } from '../components/home/RecentlySavedCard';
import { PageContent, PageActions, PageMainColumn, PageMainSidebarLayout, PageSidebar } from '../components/layout/PageLayout';
import { Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { buildActionUrl } from '../navigation/actionTemplates';
import { useLanguage } from '../contexts/LanguageContext';

export default function HomePage() {
    const navigate = useNavigate();
    const { activeLanguage } = useLanguage();

    return (
        <PageContent className="min-h-full" width="wide">
            <PageActions>
                <button
                    className="page-primary-action"
                    onClick={() =>
                        navigate(
                            buildActionUrl('home_quick_session', {
                                params: { from: '/', lang: activeLanguage.code },
                            }),
                        )
                    }
                >
                    <Zap size={16} fill="currentColor" /> Quick Session
                </button>
            </PageActions>

            {/* ============ CONTENT GRID ============ */}
            <PageMainSidebarLayout className="gap-6">
                {/* ============ LEFT COLUMN ============ */}
                <PageMainColumn className="gap-6">
                    <DailyGoalCard />
                    <ContinueLearningCard />
                    <RecommendedSection />
                    <PathProgressCard />
                </PageMainColumn>

                {/* ============ RIGHT COLUMN ============ */}
                <PageSidebar className="gap-4">
                    <GuideCard />
                    <DueReviewCard />
                    <FocusAreasCard />
                    <RecentlySavedCard />
                </PageSidebar>
            </PageMainSidebarLayout>
        </PageContent>
    );
}
