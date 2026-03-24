import { GreetingHero } from '../components/home/GreetingHero';
import { DailyGoalCard } from '../components/home/DailyGoalCard';
import { ContinueLearningCard } from '../components/home/ContinueLearningCard';
import { RecommendedSection } from '../components/home/RecommendedSection';
import { PathProgressCard } from '../components/home/PathProgressCard';
import { GuideCard } from '../components/home/GuideCard';
import { DueReviewCard } from '../components/home/DueReviewCard';
import { FocusAreasCard } from '../components/home/FocusAreasCard';
import { RecentlySavedCard } from '../components/home/RecentlySavedCard';

export default function HomePage() {
    return (
        <div className="flex flex-col gap-6 w-full max-w-[1300px] mx-auto min-h-full">
            {/* ============ TOP HERO SECTION (FULL WIDTH) ============ */}
            <GreetingHero />

            {/* ============ CONTENT GRID ============ */}
            <div className="flex xl:gap-8 lg:gap-6 gap-5">
                {/* ============ LEFT COLUMN ============ */}
                <div className="flex-1 min-w-0 flex flex-col gap-6">
                    <DailyGoalCard />
                    <ContinueLearningCard />
                    <RecommendedSection />
                    <PathProgressCard />
                </div>

                {/* ============ RIGHT COLUMN ============ */}
                <div className="w-80 shrink-0 flex flex-col gap-4">
                    <GuideCard />
                    <DueReviewCard />
                    <FocusAreasCard />
                    <RecentlySavedCard />
                </div>
            </div>
        </div>
    );
}
