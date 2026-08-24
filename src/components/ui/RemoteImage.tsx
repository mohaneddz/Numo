import { ImgHTMLAttributes, useEffect, useMemo, useState } from 'react';
import { fetch_data_url_with_fallback } from '../../utils/tauriNet';
import {
  getCachedMediaAssetUrl,
  invalidateCachedMediaAsset,
} from '../../services/mediaAssetCache';
import { LOCAL_RUNTIME_SETTINGS_EVENT } from '../../services/localRuntimeSettings';

type RemoteImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
  fallbackSrc?: string;
};

export function RemoteImage({ src, fallbackSrc, onError, ...props }: RemoteImageProps) {
  const [currentSrc, setCurrentSrc] = useState('');
  const [didTryProxy, setDidTryProxy] = useState(false);
  const [connectivityVersion, setConnectivityVersion] = useState(0);
  const resolvedFallback = useMemo(() => fallbackSrc || '/continue_learning.png', [fallbackSrc]);

  useEffect(() => {
    let cancelled = false;
    setCurrentSrc('');
    setDidTryProxy(false);
    void getCachedMediaAssetUrl(src).then((resolved) => {
      if (!cancelled) setCurrentSrc(resolved || resolvedFallback);
    });
    return () => {
      cancelled = true;
    };
  }, [connectivityVersion, resolvedFallback, src]);

  useEffect(() => {
    const handleConnectivityChange = () => {
      setConnectivityVersion((current) => current + 1);
    };
    window.addEventListener(LOCAL_RUNTIME_SETTINGS_EVENT, handleConnectivityChange);
    return () => window.removeEventListener(LOCAL_RUNTIME_SETTINGS_EVENT, handleConnectivityChange);
  }, []);

  return (
    <img
      {...props}
      src={currentSrc || resolvedFallback}
      onError={(event) => {
        if (!didTryProxy) {
          setDidTryProxy(true);
          void invalidateCachedMediaAsset(src);
          void fetch_data_url_with_fallback(src)
            .then((dataUrl) => {
              if (dataUrl && dataUrl !== src) {
                setCurrentSrc(dataUrl);
                return;
              }
              setCurrentSrc(resolvedFallback);
            })
            .catch(() => {
              setCurrentSrc(resolvedFallback);
            });
        } else {
          setCurrentSrc(resolvedFallback);
        }

        if (onError) {
          onError(event);
        }
      }}
    />
  );
}

export default RemoteImage;
