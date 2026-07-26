import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppData } from '../contexts/AppDataContext';
import type { ImmersionResource } from '../pages/Immerse/immersionCatalog';

/**
 * Ties an open immersion resource to the learner's saved state.
 *
 * `saveImmersionPhrase` and `updateImmersionProgress` already existed on
 * AppDataContext — fully implemented, mirroring saved phrases into the notebook and
 * the review queue — but **nothing in the app ever called either of them**. The
 * detail screens kept saved lines in component state, so mined language vanished on
 * navigation, and playback position was never recorded at all, which is why the
 * library's progress bars had nothing to read.
 *
 * This hook is the single place those two calls are made.
 */
export function useImmersionSession(resource: ImmersionResource | null) {
  const { state, saveImmersionPhrase, updateImmersionProgress } = useAppData();

  const contentId = resource?.id ?? '';
  const progress = contentId ? state.immersionProgress[contentId] : undefined;

  const savedPhrases = useMemo(() => new Set(progress?.savedPhrases ?? []), [progress?.savedPhrases]);

  // Position writes are throttled: a media player fires time updates several times
  // a second and every one of them would otherwise hit persistence.
  const lastWriteRef = useRef(0);
  const pendingRef = useRef<{ seconds: number; completed: boolean; total?: number } | null>(null);

  const recordPosition = useCallback(
    (positionSec: number, completed = false, totalUnits?: number) => {
      if (!contentId || !Number.isFinite(positionSec) || positionSec < 0) return;

      const now = Date.now();
      pendingRef.current = { seconds: positionSec, completed, total: totalUnits };
      // Completion is significant enough to write immediately.
      if (!completed && now - lastWriteRef.current < 5000) return;

      lastWriteRef.current = now;
      pendingRef.current = null;
      updateImmersionProgress(contentId, positionSec, completed, totalUnits);
    },
    [contentId, updateImmersionProgress],
  );

  // Flush whatever the throttle was holding when the learner leaves the page.
  useEffect(() => {
    return () => {
      const pending = pendingRef.current;
      if (!contentId || !pending) return;
      updateImmersionProgress(contentId, pending.seconds, pending.completed, pending.total);
    };
  }, [contentId, updateImmersionProgress]);

  const savePhrase = useCallback(
    (phrase: string, translation?: string) => {
      const trimmed = phrase.trim();
      if (!contentId || !trimmed) return;
      saveImmersionPhrase(contentId, trimmed, translation?.trim() || undefined);
    },
    [contentId, saveImmersionPhrase],
  );

  const isSaved = useCallback((phrase: string) => savedPhrases.has(phrase.trim()), [savedPhrases]);

  const markComplete = useCallback(() => {
    if (!contentId) return;
    updateImmersionProgress(contentId, progress?.positionSec ?? 0, true);
  }, [contentId, progress?.positionSec, updateImmersionProgress]);

  return {
    savedPhrases,
    savedCount: savedPhrases.size,
    positionSec: progress?.positionSec ?? 0,
    totalUnits: progress?.totalUnits,
    completed: progress?.completed ?? false,
    savePhrase,
    isSaved,
    recordPosition,
    markComplete,
  };
}
