import { ImgHTMLAttributes, useEffect, useMemo, useState } from 'react';
import { fetch_data_url_with_fallback } from '../../utils/tauriNet';

type RemoteImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
  fallbackSrc?: string;
};

export function RemoteImage({ src, fallbackSrc, onError, ...props }: RemoteImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [didTryProxy, setDidTryProxy] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setDidTryProxy(false);
  }, [src]);

  const resolvedFallback = useMemo(() => fallbackSrc || '/continue_learning.png', [fallbackSrc]);

  return (
    <img
      {...props}
      src={currentSrc}
      onError={(event) => {
        if (!didTryProxy) {
          setDidTryProxy(true);
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
