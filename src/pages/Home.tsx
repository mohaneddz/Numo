// import { GreetingHero } from '../components/home/GreetingHero';
import { DailyGoalCard } from '../components/home/DailyGoalCard';
import { ContinueLearningCard } from '../components/home/ContinueLearningCard';
import { RecommendedSection } from '../components/home/RecommendedSection';
import { PathProgressCard } from '../components/home/PathProgressCard';
import { GuideCard } from '../components/home/GuideCard';
import { DueReviewCard } from '../components/home/DueReviewCard';
import { FocusAreasCard } from '../components/home/FocusAreasCard';
import { RecentlySavedCard } from '../components/home/RecentlySavedCard';
import { RuntimeStatusCard } from '../components/home/RuntimeStatusCard';
import { TodayPlanCard } from '../components/home/TodayPlanCard';
import { PageContent, PageActions, PageMainColumn, PageMainSidebarLayout, PageSidebar } from '../components/layout/PageLayout';
import { Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { buildActionUrl } from '../navigation/actionTemplates';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurriculum } from '../contexts/CurriculumContext';
import { useEffect } from 'react';
import { backgroundImageService } from '../services/backgrounds';

export default function HomePage() {
    const navigate = useNavigate();
    const { activeLanguage } = useLanguage();
    const { recommendedCards } = useCurriculum();

    useEffect(() => {
        void backgroundImageService.prefetchLikelyLanguageCards({
            languageCode: activeLanguage.code,
            languageName: activeLanguage.name,
            continueLearning: activeLanguage.continueLearning,
            recommended: recommendedCards.map((card) => ({
                id: card.id,
                title: card.title,
                description: card.description,
                type: card.type,
            })),
            includeGeneric: true,
        });
    }, [activeLanguage.code, activeLanguage.continueLearning, activeLanguage.name, recommendedCards]);

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
                    <TodayPlanCard />
                    <DailyGoalCard />
                    <ContinueLearningCard />
                    <RecommendedSection />
                    <PathProgressCard />
                </PageMainColumn>

                {/* ============ RIGHT COLUMN ============ */}
                <PageSidebar className="gap-4">
                    <GuideCard />
                    <RuntimeStatusCard />
                    <DueReviewCard />
                    <FocusAreasCard />
                    <RecentlySavedCard />
                </PageSidebar>
            </PageMainSidebarLayout>
        </PageContent>
    );
}
