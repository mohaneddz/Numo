import { useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, BellRing, Flame, ListChecks } from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';
import { useCurriculumState } from './useCurriculumState';
import { useLanguageProgression } from './useLanguageProgression';

export interface AppNotification {
  id: string;
  icon: LucideIcon;
  tone: 'info' | 'warning';
  title: string;
  description: string;
  cta: { label: string; to: string };
}

/**
 * Real, derived notifications — there is no stored notification log (or need
 * for one yet), so this is computed fresh from due reviews, weak skills,
 * streak risk, and today's plan, the same signals the sidebar badges use.
 * Shared by the notifications bell badge and the Notifications page so they
 * never disagree about whether there is something to show.
 */
export function useNotifications(): AppNotification[] {
  const { dueCount, weakCount, dueReviewPreview } = useAppData();
  const { currentStreak, weakSkills } = useCurriculumState();
  const { minutesToday, targetMinutes, todayPlan } = useLanguageProgression();

  return useMemo<AppNotification[]>(() => {
    const items: AppNotification[] = [];

    if (dueCount > 0) {
      const preview = dueReviewPreview[0]?.term;
      items.push({
        id: 'due-review',
        icon: BellRing,
        tone: 'info',
        title: `${dueCount} card${dueCount === 1 ? '' : 's'} due for review`,
        description: preview
          ? `Including "${preview}" — clear them now before they pile up.`
          : 'Clear them now before they pile up.',
        cta: { label: 'Start review', to: '/review/session?mode=due-now' },
      });
    }

    if (currentStreak > 0 && minutesToday === 0) {
      items.push({
        id: 'streak-risk',
        icon: Flame,
        tone: 'warning',
        title: `Your ${currentStreak}-day streak is at risk`,
        description: "You haven't studied today yet — a short session keeps it alive.",
        cta: { label: 'Continue learning', to: '/learn' },
      });
    }

    if (weakCount > 0 && weakSkills.length > 0) {
      const topSkill = weakSkills[0]?.skill.title;
      items.push({
        id: 'weak-skills',
        icon: AlertTriangle,
        tone: 'warning',
        title: `${weakCount} weak spot${weakCount === 1 ? '' : 's'} to reinforce`,
        description: topSkill
          ? `"${topSkill}" needs another look, along with ${Math.max(0, weakCount - 1)} more.`
          : 'A few skills are falling behind on mastery.',
        cta: { label: 'Review weak spots', to: '/review/session?mode=weak' },
      });
    }

    const remainingPlanItems = todayPlan.filter((item) => item.required && !item.done);
    if (remainingPlanItems.length > 0 && minutesToday < targetMinutes) {
      items.push({
        id: 'today-plan',
        icon: ListChecks,
        tone: 'info',
        title: `${remainingPlanItems.length} item${remainingPlanItems.length === 1 ? '' : 's'} left in today's plan`,
        description: remainingPlanItems[0]?.label ?? "Finish today's plan to hit your session goal.",
        cta: { label: 'Open next item', to: remainingPlanItems[0]?.to ?? '/learn' },
      });
    }

    return items;
  }, [currentStreak, dueCount, dueReviewPreview, minutesToday, targetMinutes, todayPlan, weakCount, weakSkills]);
}
