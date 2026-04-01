import { useEffect, useMemo, useState } from 'react';
import { backgroundImageService } from '../services/backgrounds';
import type { BackgroundImageRequest, CardBackgroundSelection } from '../services/backgrounds';

export function useCardBackground(request: BackgroundImageRequest | null, options?: { forceRefresh?: boolean }) {
  const [selection, setSelection] = useState<CardBackgroundSelection | null>(null);
  const [loading, setLoading] = useState(false);

  const key = useMemo(() => request?.itemKey || '', [request?.itemKey]);

  useEffect(() => {
    if (!request) {
      setSelection(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    void backgroundImageService
      .resolveBackground(request, { forceRefresh: options?.forceRefresh, signal: controller.signal })
      .then((next) => {
        if (!controller.signal.aborted) {
          setSelection(next);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSelection({
            itemKey: request.itemKey,
            source: request.fallbackAsset || '/continue_learning.png',
            provider: 'fallback',
            attributionText: 'Bundled local fallback',
            fromCache: true,
          });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [key, options?.forceRefresh, request]);

  return {
    selection,
    loading,
    source: selection?.source || request?.fallbackAsset || '/continue_learning.png',
  };
}
