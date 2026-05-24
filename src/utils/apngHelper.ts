import { FrameData, CanvasConfig } from '../types';

export interface APNGStatusTexts {
  initializing: string;
  processingFrames: string;
  processingFrameN: string;
  completed: string;
}

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

export const generateAPNG = async (
  frames: FrameData[],
  config: CanvasConfig,
  onProgress: (progress: number) => void,
  onStatus?: (status: string) => void,
  texts?: APNGStatusTexts
): Promise<Blob> => {
  const t = texts || {
    initializing: 'Initializing APNG encoder...',
    processingFrames: 'Processing frames...',
    processingFrameN: 'Processing frame {0}/{1}...',
    completed: 'Generation complete!'
  };

  const format = (str: string, ...args: (string | number)[]) => {
    return str.replace(/{(\d+)}/g, (match, number) => {
      return typeof args[number] !== 'undefined' ? String(args[number]) : match;
    });
  };

  if (onStatus) onStatus(t.initializing);
  onProgress(0);

  const canvas = document.createElement('canvas');
  canvas.width = config.width;
  canvas.height = config.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Could not create canvas context');
  }

  let backgroundImage: HTMLImageElement | null = null;
  if (config.backgroundImage && !config.transparent) {
    try {
      backgroundImage = await loadImage(config.backgroundImage);
    } catch (error) {
      console.warn('Failed to load APNG background image', error);
    }
  }

  if (onStatus) onStatus(t.processingFrames);

  const buffers: Array<ArrayBuffer> = [];
  const delays: number[] = [];

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (onStatus) onStatus(format(t.processingFrameN, i + 1, frames.length));

    const img = await loadImage(frame.previewUrl);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!config.transparent) {
      ctx.fillStyle = config.backgroundColor || '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (backgroundImage) {
        const bgX = config.backgroundImageX || 0;
        const bgY = config.backgroundImageY || 0;
        const bgWidth = config.backgroundImageDisplayWidth || config.width;
        const bgHeight = config.backgroundImageDisplayHeight || config.height;
        ctx.drawImage(backgroundImage, bgX, bgY, bgWidth, bgHeight);
      }
    }

    if (frame.rotation) {
      ctx.save();
      const cx = frame.x + frame.width / 2;
      const cy = frame.y + frame.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((frame.rotation * Math.PI) / 180);

      if (Math.abs(frame.rotation % 180) === 90) {
        ctx.drawImage(img, -frame.height / 2, -frame.width / 2, frame.height, frame.width);
      } else {
        ctx.drawImage(img, -frame.width / 2, -frame.height / 2, frame.width, frame.height);
      }
      ctx.restore();
    } else {
      ctx.drawImage(img, frame.x, frame.y, frame.width, frame.height);
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const frameData = new Uint8Array(imageData.data);
    buffers.push(frameData.buffer);
    delays.push(frame.duration);
    onProgress((i + 1) / (frames.length + 1));
  }

  const { default: UPNG } = await import('upng-js');
  const encoded = UPNG.encode(buffers, config.width, config.height, 0, delays);
  onProgress(1);
  if (onStatus) onStatus(t.completed);

  return new Blob([encoded], { type: 'image/apng' });
};
