import React, { useState, useEffect } from 'react';

interface TransparentImageProps {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  transparentColor?: string | null;
  enabled?: boolean;
  draggable?: boolean;
}

export const TransparentImage: React.FC<TransparentImageProps> = ({
  src,
  alt,
  className,
  style,
  transparentColor,
  enabled,
  draggable
}) => {
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !transparentColor) {
      setProcessedUrl(null);
      return;
    }

    let isActive = true;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = src;

    img.onload = () => {
      if (!isActive) return;

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const rTarget = parseInt(transparentColor.slice(1, 3), 16);
      const gTarget = parseInt(transparentColor.slice(3, 5), 16);
      const bTarget = parseInt(transparentColor.slice(5, 7), 16);

      for (let i = 0; i < data.length; i += 4) {
        if (data[i] === rTarget && data[i+1] === gTarget && data[i+2] === bTarget) {
          data[i+3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      const newUrl = canvas.toDataURL();
      if (isActive) setProcessedUrl(newUrl);
    };

    return () => {
      isActive = false;
    };
  }, [src, enabled, transparentColor]);

  return (
    <img
      src={processedUrl || src}
      alt={alt}
      className={className}
      style={{
        ...style,
        backgroundImage: enabled ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
        backgroundSize: '10px 10px',
        backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
        backgroundColor: enabled ? 'transparent' : undefined
      }}
      draggable={draggable}
    />
  );
};
