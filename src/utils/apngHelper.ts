import { FrameData, CanvasConfig, FrameTrack, LayerData, LayerTrack } from '../types';
import { createCompositionTimeline } from './frameTrackTiming';
import { buildTrackRenderCache, findSegmentAtTime, renderFrameToCanvas, renderFrameTracksToCanvas } from './layerRenderer';
import { createExportStatusTimer } from './exportStatusTimer';
import type { ExportTimingSnapshot } from './exportStatusTimer';

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
  frameTracks: FrameTrack[] = [],
  onTiming?: (timing: ExportTimingSnapshot) => void
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
  const statusTimer = createExportStatusTimer(onStatus, onTiming);

  statusTimer.report(t.initializing, 'initializing');
  onProgress(0);

  const canvas = document.createElement('canvas');
  canvas.width = config.width;
  canvas.height = config.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Could not create canvas context');
  }

  statusTimer.report(t.processingFrames, 'processing');

  const buffers: Array<ArrayBuffer> = [];
  const delays: number[] = [];
  const imageCache = new Map<string, HTMLImageElement>();
  const firstTrackFrame = frameTracks.flatMap(track => track.frames)[0];
  const compositionSegments = frameTracks.length > 0 && (frames[0] || firstTrackFrame)
    ? createCompositionTimeline(frameTracks, frames)
    : null;
  const { trackSegments, resolvedTrackLayers } = buildTrackRenderCache(frameTracks, compositionSegments);
  const singleTrackFrameBySegment = frameTracks.length === 1 && compositionSegments
    ? compositionSegments.map(segment => findSegmentAtTime(trackSegments.get(frameTracks[0].id) ?? [], segment.start)?.frame ?? null)
    : null;
  const singleTrackFrameIndexById = singleTrackFrameBySegment
    ? new Map(frameTracks[0].frames.map((frame, index) => [frame.id, index]))
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
    statusTimer.report(format(t.processingFrameN, i + 1, framesToRender.length), 'processing');

    if (frameTracks.length > 1) {
      await renderFrameTracksToCanvas(frameTracks, frame, config, ctx, {
        timelineFrameIndex: i,
        timelineTimeMs: compositionSegments?.[i]?.start,
        imageCache,
        trackSegments,
        resolvedTrackLayers: resolvedTrackLayers ?? undefined,
      });
    } else {
      const singleTrackFrame = singleTrackFrameBySegment?.[i] ?? null;
      await renderFrameToCanvas(singleTrackFrame ?? frame, config, ctx, {
        timelineFrameIndex: singleTrackFrame
          ? (singleTrackFrameIndexById?.get(singleTrackFrame.id) ?? 0)
          : i,
        timelineTimeMs: singleTrackFrame ? undefined : compositionSegments?.[i]?.start,
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

  statusTimer.report('Encoding APNG...', 'encoding');
  const { default: UPNG } = await import('upng-js');
  const encoded = UPNG.encode(buffers, config.width, config.height, 0, delays);
  onProgress(1);
  statusTimer.complete(t.completed);

  return new Blob([encoded], { type: 'image/apng' });
};
