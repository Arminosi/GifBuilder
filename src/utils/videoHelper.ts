export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

export interface VideoImportSettings {
  fps: number;
  startTime: number;
  endTime: number;
  maxWidth: number;
}

export interface DecodedVideoFrame {
  url: string;
  delay: number;
  width: number;
  height: number;
}

const waitForEvent = <T extends Event>(target: EventTarget, eventName: string): Promise<T> => {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener(eventName, handleEvent);
      target.removeEventListener('error', handleError);
    };

    const handleEvent = (event: Event) => {
      cleanup();
      resolve(event as T);
    };

    const handleError = () => {
      cleanup();
      reject(new Error(`Video ${eventName} failed`));
    };

    target.addEventListener(eventName, handleEvent, { once: true });
    target.addEventListener('error', handleError, { once: true });
  });
};

const createVideoElement = (file: File) => {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  return { video, url };
};

export const getVideoMetadata = async (file: File): Promise<VideoMetadata> => {
  const { video, url } = createVideoElement(file);

  try {
    await waitForEvent(video, 'loadedmetadata');
    return {
      duration: Number.isFinite(video.duration) ? video.duration : 0,
      width: video.videoWidth,
      height: video.videoHeight,
    };
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
};

const seekVideo = async (video: HTMLVideoElement, time: number) => {
  if (Math.abs(video.currentTime - time) < 0.001 && video.readyState >= 2) {
    return;
  }

  const seeked = waitForEvent(video, 'seeked');
  video.currentTime = time;
  await seeked;
};

export const extractVideoFrames = async (
  file: File,
  settings: VideoImportSettings,
  onProgress?: (current: number, total: number) => void
): Promise<DecodedVideoFrame[]> => {
  const { video, url } = createVideoElement(file);

  try {
    await waitForEvent(video, 'loadedmetadata');

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const startTime = Math.max(0, Math.min(settings.startTime, duration));
    const endTime = Math.max(startTime, Math.min(settings.endTime, duration || settings.endTime));
    const fps = Math.max(1, Math.min(60, settings.fps));
    const frameDelay = Math.round(1000 / fps);
    const importDuration = Math.max(1 / fps, endTime - startTime);
    const frameCount = Math.max(1, Math.ceil(importDuration * fps));

    const sourceWidth = video.videoWidth || 1;
    const sourceHeight = video.videoHeight || 1;
    const maxWidth = Math.max(0, settings.maxWidth || 0);
    const scale = maxWidth > 0 && sourceWidth > maxWidth ? maxWidth / sourceWidth : 1;
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) {
      throw new Error('Unable to create canvas context for video import');
    }

    const frames: DecodedVideoFrame[] = [];

    for (let i = 0; i < frameCount; i++) {
      const time = Math.min(startTime + i / fps, Math.max(startTime, endTime - 0.001));
      await seekVideo(video, time);

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(video, 0, 0, width, height);

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        throw new Error('Unable to encode extracted video frame');
      }

      frames.push({
        url: URL.createObjectURL(blob),
        delay: frameDelay,
        width,
        height,
      });

      onProgress?.(i + 1, frameCount);
    }

    return frames;
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
};

