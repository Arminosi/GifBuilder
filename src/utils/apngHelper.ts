import { FrameData, CanvasConfig, FrameTrack, LayerData, LayerTrack } from '../types';
import { createCompositionTimeline } from './frameTrackTiming';
import { renderFrameToCanvas, renderFrameTracksToCanvas } from './layerRenderer';

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
  texts?: APNGStatusTexts,
  globalLayers: LayerData[] = [],
  layerTracks: LayerTrack[] = [],
  frameTracks: FrameTrack[] = []
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

  if (onStatus) onStatus(t.processingFrames);

  const buffers: Array<ArrayBuffer> = [];
  const delays: number[] = [];
  const imageCache = new Map<string, HTMLImageElement>();
  const firstTrackFrame = frameTracks.flatMap(track => track.frames)[0];
  const compositionSegments = frameTracks.length > 0 && (frames[0] || firstTrackFrame)
    ? createCompositionTimeline(frameTracks, frames)
    : null;
  const framesToRender = compositionSegments
    ? compositionSegments.map((segment, index) => ({
      ...(frames[0] ?? firstTrackFrame),
      id: `composition-${index}`,
      duration: segment.duration,
    }))
    : frames;

  for (let i = 0; i < framesToRender.length; i++) {
    const frame = framesToRender[i];
    if (onStatus) onStatus(format(t.processingFrameN, i + 1, framesToRender.length));

    if (frameTracks.length > 0) {
      await renderFrameTracksToCanvas(frameTracks, frame, config, ctx, {
        timelineFrameIndex: i,
        timelineTimeMs: compositionSegments?.[i]?.start,
        imageCache,
      });
    } else {
      await renderFrameToCanvas(frame, config, ctx, {
        timelineFrameIndex: i,
        globalLayers,
        layerTracks,
        imageCache,
      });
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const frameData = new Uint8Array(imageData.data);
    buffers.push(frameData.buffer);
    delays.push(frame.duration);
    onProgress((i + 1) / (framesToRender.length + 1));
  }

  const { default: UPNG } = await import('upng-js');
  const encoded = UPNG.encode(buffers, config.width, config.height, 0, delays);
  onProgress(1);
  if (onStatus) onStatus(t.completed);

  return new Blob([encoded], { type: 'image/apng' });
};
