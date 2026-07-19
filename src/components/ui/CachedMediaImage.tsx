import { useEffect, useRef, useState } from 'react';
import {
  getCachedMediaAssetUrl,
  invalidateCachedMediaAsset,
} from '../../services/mediaAssetCache';

interface CachedMediaImageProps {
  src?: string;
  fallbackUrls?: string[];
  alt: string;
  className?: string;
  eager?: boolean;
  onExhausted?: () => void;
}

export default function CachedMediaImage({
  src,
  fallbackUrls = [],
  alt,
  className = '',
  eager = false,
  onExhausted,
}: CachedMediaImageProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [nearViewport, setNearViewport] = useState(eager);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [resolvedSrc, setResolvedSrc] = useState('');
  const sources = [src, ...fallbackUrls].filter(
    (value, index, values): value is string =>
      Boolean(value?.trim()) && values.indexOf(value) === index,
  );

  useEffect(() => {
    setSourceIndex(0);
    setResolvedSrc('');
  }, [src, fallbackUrls.join('|')]);

  useEffect(() => {
    if (eager) {
      setNearViewport(true);
      return;
    }
    const element = imageRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: '320px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [eager]);

  useEffect(() => {
    if (!nearViewport) return;
    const currentSource = sources[sourceIndex];
    if (!currentSource) {
      setResolvedSrc('');
      onExhausted?.();
      return;
    }
    let cancelled = false;
    void getCachedMediaAssetUrl(currentSource).then((url) => {
      if (!cancelled) setResolvedSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [nearViewport, sourceIndex, sources.join('|')]);

  const handleError = () => {
    const failedSource = sources[sourceIndex];
    if (failedSource) void invalidateCachedMediaAsset(failedSource);
    if (sourceIndex < sources.length - 1) {
      setResolvedSrc('');
      setSourceIndex((current) => current + 1);
    } else {
      setResolvedSrc('');
      onExhausted?.();
    }
  };

  return (
    <img
      ref={imageRef}
      src={resolvedSrc || undefined}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
      onError={handleError}
    />
  );
}
