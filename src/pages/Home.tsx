// import { GreetingHero } from '../components/home/GreetingHero';
import { DailyGoalCard } from '../components/home/DailyGoalCard';
import { ContinueLearningCard } from '../components/home/ContinueLearningCard';
import { RecommendedSection } from '../components/home/RecommendedSection';
import { PathProgressCard } from '../components/home/PathProgressCard';
import { GuideCard } from '../components/home/GuideCard';
import { DueReviewCard } from '../components/home/DueReviewCard';
import { FocusAreasCard } from '../components/home/FocusAreasCard';
import { RecentlySavedCard } from '../components/home/RecentlySavedCard';
import { PageContent, PageActions } from '../components/layout/PageLayout';
import { Zap, Settings } from 'lucide-react';

export default function HomePage() {
    return (
        <PageContent className="min-h-full">
            <PageActions>
                <button className="flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-600/20 px-5 py-2 text-[14px] font-bold text-blue-400 transition-colors hover:bg-blue-600/30 cursor-pointer">
                    <Zap size={16} fill="currentColor" /> Quick Session
                </button>
                <button className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-dim transition-colors hover:text-white cursor-pointer">
                    <Settings size={18} />
                </button>
            </PageActions>

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
        </PageContent>
    );
}
