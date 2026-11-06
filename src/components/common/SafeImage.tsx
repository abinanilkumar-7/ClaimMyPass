
import React from 'react';

type SafeImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src"
> & {
  src?: string | null;
  fallback?: string;
};

export default function SafeImage({
  src,
  fallback,
  alt = '',
  ...props
}: SafeImageProps) {
  const imageSrc = src?.trim() || fallback?.trim();

  if (!imageSrc) {
    return (
      <div
        role="img"
        aria-label={alt || 'Image unavailable'}
        className={props.className}
        style={{
          background: '#202027',
          ...props.style,
        }}
      />
    );
  }

  return <img {...props} src={imageSrc} alt={alt} />;
}
