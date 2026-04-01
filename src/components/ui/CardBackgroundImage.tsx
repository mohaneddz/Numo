import type { ReactNode } from 'react';
import type { BackgroundImageRequest } from '../../services/backgrounds';
import { useCardBackground } from '../../hooks/useCardBackground';

interface CardBackgroundImageProps {
  request: BackgroundImageRequest;
  children: ReactNode;
  className?: string;
  overlayClassName?: string;
  imageClassName?: string;
}

export function CardBackgroundImage({
  request,
  children,
  className = '',
  overlayClassName = 'bg-gradient-to-t from-[#0b1020]/90 via-[#0b1020]/55 to-[#0b1020]/20',
  imageClassName = 'object-cover',
}: CardBackgroundImageProps) {
  const { source, selection } = useCardBackground(request);
  const isFallback = !selection || selection.provider === 'fallback';

  return (
    <div className={`relative ${className}`.trim()}>
      {!isFallback && <img src={source} alt={request.title || request.lessonTitle || 'background'} className={`absolute inset-0 h-full w-full ${imageClassName}`.trim()} />}
      <div className={`absolute inset-0 ${isFallback ? 'bg-gradient-to-br from-[#171033] via-[#0b1020] to-[#0A0F24]' : overlayClassName}`.trim()} />
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}

export default CardBackgroundImage;
