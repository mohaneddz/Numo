import type { ReviewItem } from '../../data/types';
import type { ReviewCardType } from '../../components/exercises/review/types';
import { recognitionProductionGap, topConfusionPairs, type ExerciseSignalSnapshot } from './exerciseSignalsService';

const DEFAULT_ROTATION: ReviewCardType[] = [
  'flash_recall',
  'multiple',
  'produce_term',
  'reading_recall',
  'build',
  'seen_unseen',
  'confusion_pair',
  'delayed_recall',
  'radical_recall',
  'tfj',
  'write',
  'reveal',
  'tf',
];

// produce_term leads here: it is the only card that asks the learner to
// generate the target form from its meaning, which is precisely the skill a
// recognition/production gap says is lagging.
const PRODUCTION_ROTATION: ReviewCardType[] = ['produce_term', 'reading_recall', 'build', 'radical_recall', 'write', 'tfj'];
const RECOGNITION_ROTATION: ReviewCardType[] = ['flash_recall', 'multiple', 'seen_unseen', 'reveal', 'tf'];

function normalizedTerm(value: string): string {
  return value.trim().toLowerCase();
}

function confusionWeight(signals: ExerciseSignalSnapshot | null, term: string): number {
  if (!signals) return 0;
  const needle = normalizedTerm(term);
  return topConfusionPairs(signals, 32)
    .filter((entry) => entry.pair.includes(needle))
    .reduce((sum, entry) => sum + entry.count, 0);
}

export function prioritizeReviewQueueBySignals(queue: ReviewItem[], signals: ExerciseSignalSnapshot | null): ReviewItem[] {
  if (!signals || queue.length <= 1) return queue;

  return [...queue].sort((a, b) => {
    const confusionDelta = confusionWeight(signals, b.term) - confusionWeight(signals, a.term);
    if (confusionDelta !== 0) return confusionDelta;

    const weaknessRank = (value: ReviewItem['strength']) => {
      if (value === 'critical') return 4;
      if (value === 'weak') return 3;
      if (value === 'needs work') return 2;
      if (value === 'solid') return 1;
      return 0;
    };
    return weaknessRank(b.strength) - weaknessRank(a.strength);
  });
}

export function chooseAdaptiveReviewCardType(input: {
  index: number;
  item: ReviewItem;
  languageCode: string;
  signals: ExerciseSignalSnapshot | null;
}): ReviewCardType {
  const { index, item, languageCode, signals } = input;
  const confusion = confusionWeight(signals, item.term);
  if (confusion >= 2) return 'confusion_pair';

  const gap = signals ? recognitionProductionGap(signals) : 0;
  if (gap >= 18) {
    return PRODUCTION_ROTATION[index % PRODUCTION_ROTATION.length];
  }

  if (signals && signals.hoverTranslationUsage > Math.max(3, Math.round(signals.seenCount * 0.35))) {
    return RECOGNITION_ROTATION[index % RECOGNITION_ROTATION.length];
  }

  if ((languageCode === 'zh' || languageCode === 'ja') && signals && signals.scriptTraceScore > signals.scriptRecallScore + 12) {
    return index % 2 === 0 ? 'reading_recall' : 'flash_recall';
  }

  return DEFAULT_ROTATION[index % DEFAULT_ROTATION.length];
}
