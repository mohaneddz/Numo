/**
 * Recommendations derived from the learner model.
 *
 * Home's "Recommended for You" was fed by `CurriculumContext`, an in-memory store
 * that started empty and was only ever populated by a developer debug button. In
 * normal use the section rendered its empty state forever; when the debug button
 * was pressed it filled with LLM-invented activities and invented progress
 * percentages ("Give realistic numbers for progress" was literally in the prompt).
 *
 * Every recommendation here is a real, reachable action justified by real state.
 */

import type { RecommendedCard } from '../../data/types';
import type { Roadmap, RoadmapStep } from './checkpointPlan';
import {
  masteryOf,
  recognitionProductionGap,
  selectDueSkills,
  selectWeakSkills,
  type SkillMasteryMap,
} from './masteryStore';
import type { Skill } from './skillGraph';

export interface HomeRecommendation extends RecommendedCard {
  /** Route this card opens. */
  to: string;
  /** Why the learner is seeing this. */
  reason: string;
}

export interface BuildRecommendationsInput {
  roadmap: Roadmap | null;
  nextStep: { step: RoadmapStep } | null;
  mastery: SkillMasteryMap;
  seenSkills: Skill[];
  dueReviewCount: number;
  languageName: string;
  now?: number;
}

const STEP_KIND_META: Record<
  RoadmapStep['kind'],
  { type: RecommendedCard['type']; icon: string; accent: string }
> = {
  rule: { type: 'grammar', icon: 'book-open', accent: 'violet' },
  vocabulary: { type: 'reading', icon: 'book', accent: 'emerald' },
  exercise: { type: 'grammar', icon: 'target', accent: 'indigo' },
  listening: { type: 'listening', icon: 'headphones', accent: 'blue' },
  speaking: { type: 'speaking', icon: 'mic', accent: 'rose' },
  review: { type: 'review', icon: 'rotate-ccw', accent: 'amber' },
};

/**
 * Builds the Home recommendation list, most useful first.
 *
 * Returns an empty array when there is genuinely nothing to recommend, which the
 * UI shows as an honest empty state rather than filler.
 */
export function buildRecommendations(input: BuildRecommendationsInput): HomeRecommendation[] {
  const recommendations: HomeRecommendation[] = [];
  const now = input.now ?? Date.now();

  // 1. The next step on the path is almost always the right thing to do.
  if (input.nextStep && input.roadmap) {
    const { step } = input.nextStep;
    const meta = STEP_KIND_META[step.kind];
    recommendations.push({
      id: `step:${step.id}`,
      title: step.title,
      description: step.description,
      duration: `${step.estimatedMinutes} min`,
      level: `Theme ${input.roadmap.theme.order}`,
      type: meta.type,
      icon: meta.icon,
      accentColor: meta.accent,
      to: `/learn/session?stepId=${encodeURIComponent(step.id)}`,
      reason: 'Next step on your path',
    });
  }

  // 2. Anything actually due for review, with the real count.
  if (input.dueReviewCount > 0) {
    recommendations.push({
      id: 'review:due',
      title: `${input.dueReviewCount} ${input.dueReviewCount === 1 ? 'card' : 'cards'} due`,
      description: 'Clear your due queue before it builds up.',
      duration: `${Math.max(2, Math.round(input.dueReviewCount * 0.4))} min`,
      level: 'Recall',
      type: 'review',
      icon: 'rotate-ccw',
      accentColor: 'amber',
      to: '/review/session?mode=due-now',
      reason: 'Scheduled for today',
    });
  }

  // 3. The single weakest skill, named rather than generic.
  const weak = selectWeakSkills(input.mastery, input.seenSkills, 1, now);
  if (weak.length > 0) {
    const { skill, record } = weak[0];
    recommendations.push({
      id: `weak:${skill.id}`,
      title: `Shore up ${skill.title}`,
      description: `Sitting at ${Math.round(record.mastery)}% after ${record.exposures} ${
        record.exposures === 1 ? 'attempt' : 'attempts'
      }. A focused pass should move it.`,
      duration: '5 min',
      level: 'Weak spot',
      type: 'grammar',
      icon: 'target',
      accentColor: 'rose',
      to: '/review/session?mode=weak',
      reason: 'Your weakest tracked skill',
    });
  }

  // 4. A production nudge only when recognition has genuinely run ahead of it.
  const gap = recognitionProductionGap(
    input.mastery,
    input.seenSkills.map((skill) => skill.id),
  );
  if (gap >= 15) {
    recommendations.push({
      id: 'gap:production',
      title: 'Say what you can already read',
      description: `You recognise ${gap} points more than you can produce. Speaking practice closes that.`,
      duration: '6 min',
      level: 'Production',
      type: 'speaking',
      icon: 'mic',
      accentColor: 'violet',
      to: '/speak',
      reason: 'Recognition is ahead of production',
    });
  }

  // 5. Immersion tied to what is currently being studied, not a generic prompt.
  if (input.roadmap && recommendations.length < 4) {
    recommendations.push({
      id: `immerse:${input.roadmap.theme.id}`,
      title: `${input.roadmap.theme.title} in the wild`,
      description: `Find real ${input.languageName} using the language from this theme.`,
      duration: '10 min',
      level: 'Immersion',
      type: 'listening',
      icon: 'headphones',
      accentColor: 'blue',
      to: `/immerse?theme=${encodeURIComponent(input.roadmap.theme.id)}`,
      reason: 'Matches your current theme',
    });
  }

  return recommendations.slice(0, 4);
}

export interface GuideMessage {
  headline: string;
  body: string;
  /** A single concrete metric, or null when there is not enough evidence for one. */
  highlight: string | null;
}

/**
 * The Guide card's copy.
 *
 * It previously read "You're in flow state tonight" and "Listening confidence up
 * 12%" for every learner on every visit — both hardcoded strings. Everything here
 * is computed, and the highlight is null rather than invented when there is not
 * enough evidence to say anything true.
 */
export function buildGuideMessage(input: {
  mastery: SkillMasteryMap;
  seenSkills: Skill[];
  minutesToday: number;
  currentStreak: number;
  dueReviewCount: number;
  languageName: string;
  now?: number;
}): GuideMessage {
  const now = input.now ?? Date.now();
  const tracked = input.seenSkills.filter((skill) => masteryOf(input.mastery, skill.id).exposures > 0);
  const due = selectDueSkills(input.mastery, input.seenSkills, 50, now);

  if (tracked.length === 0) {
    return {
      headline: `Let's start your ${input.languageName}.`,
      body: 'Your first session sets the baseline everything else adapts to.',
      highlight: null,
    };
  }

  const solid = tracked.filter((skill) => masteryOf(input.mastery, skill.id).mastery >= 82).length;

  if (input.dueReviewCount > 0 || due.length > 0) {
    const count = Math.max(input.dueReviewCount, due.length);
    return {
      headline: input.minutesToday > 0 ? 'Good start today.' : 'Review is waiting.',
      body: `${count} ${count === 1 ? 'item is' : 'items are'} scheduled for today. Clearing them keeps the spacing working.`,
      highlight: `${solid} of ${tracked.length} skills holding`,
    };
  }

  if (input.minutesToday > 0) {
    return {
      headline: 'Nothing overdue.',
      body: `${input.minutesToday} minutes in today and your queue is clear. New material is the best use of time now.`,
      highlight: input.currentStreak > 1 ? `${input.currentStreak}-day streak` : `${solid} skills solid`,
    };
  }

  return {
    headline: 'Ready when you are.',
    body: `Nothing is overdue, so today is a good day to move forward in ${input.languageName}.`,
    highlight: input.currentStreak > 0 ? `${input.currentStreak}-day streak` : null,
  };
}
