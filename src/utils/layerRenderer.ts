import { CanvasConfig, FrameData, FrameTrack, LayerData, LayerTrack } from '../types';
import { findFrameAtTime } from './frameTrackTiming';
import { flattenTrackLayers, getFrameLayers } from './layerHelpers';

interface RenderFrameOptions {
  timelineFrameIndex?: number;
  timelineTimeMs?: number;
  globalLayers?: LayerData[];
  layerTracks?: LayerTrack[];
  sourceCanvasWidth?: number;
  sourceCanvasHeight?: number;
  imageCache?: Map<string, HTMLImageElement>;
  transparentKey?: {
    str: string;
    hex: number;
    alphaThreshold: number;
  } | null;
}

const loadImage = (url: string, cache?: Map<string, HTMLImageElement>): Promise<HTMLImageElement> => {
  const cached = cache?.get(url);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      cache?.set(url, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
};

const interpolateNumber = (from: number, to: number, progress: number) => {
  return from + (to - from) * progress;
};

export const resolveLayerAtFrame = (layer: LayerData, frameIndex: number): LayerData | null => {
  if (!layer.visible) return null;
  if (frameIndex < layer.startFrame) return null;
  if (layer.endFrame !== null && frameIndex > layer.endFrame) return null;
  if (!layer.keyframes || layer.keyframes.length === 0) return layer;

  const keyframes = [...layer.keyframes].sort((a, b) => a.frame - b.frame);
  const previous = [...keyframes].reverse().find(keyframe => keyframe.frame <= frameIndex);
  const next = keyframes.find(keyframe => keyframe.frame >= frameIndex);

  if (!previous && !next) return layer;
  if (!previous) return { ...layer, ...next };
  if (!next || previous.frame === next.frame) return { ...layer, ...previous };

  const progress = (frameIndex - previous.frame) / (next.frame - previous.frame);

  return {
    ...layer,
    x: previous.x !== undefined && next.x !== undefined ? interpolateNumber(previous.x, next.x, progress) : (previous.x ?? layer.x),
    y: previous.y !== undefined && next.y !== undefined ? interpolateNumber(previous.y, next.y, progress) : (previous.y ?? layer.y),
    width: previous.width !== undefined && next.width !== undefined ? interpolateNumber(previous.width, next.width, progress) : (previous.width ?? layer.width),
    height: previous.height !== undefined && next.height !== undefined ? interpolateNumber(previous.height, next.height, progress) : (previous.height ?? layer.height),
    rotation: previous.rotation !== undefined && next.rotation !== undefined ? interpolateNumber(previous.rotation, next.rotation, progress) : (previous.rotation ?? layer.rotation),
    opacity: previous.opacity !== undefined && next.opacity !== undefined ? interpolateNumber(previous.opacity, next.opacity, progress) : (previous.opacity ?? layer.opacity),
    visible: previous.visible ?? layer.visible,
  };
};

const drawLayer = async (
  ctx: CanvasRenderingContext2D,
  layer: LayerData,
  scaleX: number,
  scaleY: number,
  imageCache?: Map<string, HTMLImageElement>
) => {
  if (layer.type !== 'image') return;

  const img = await loadImage(layer.source.previewUrl, imageCache);
  const opacity = Math.min(1, Math.max(0, layer.opacity));
  if (opacity <= 0) return;

  ctx.save();
  ctx.globalAlpha *= opacity;
  if (layer.blendMode) {
    ctx.globalCompositeOperation = layer.blendMode;
  }

  const x = layer.x * scaleX;
  const y = layer.y * scaleY;
  const width = layer.width * scaleX;
  const height = layer.height * scaleY;
  const rotation = layer.rotation || 0;

  if (rotation) {
    const cx = x + width / 2;
    const cy = y + height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);

    if (Math.abs(rotation % 180) === 90) {
      ctx.drawImage(img, -height / 2, -width / 2, height, width);
    } else {
      ctx.drawImage(img, -width / 2, -height / 2, width, height);
    }
  } else {
    ctx.drawImage(img, x, y, width, height);
  }

  ctx.restore();
};

const applyTransparentKey = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  transparentKey: NonNullable<RenderFrameOptions['transparentKey']>
) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const r = (transparentKey.hex >> 16) & 0xff;
  const g = (transparentKey.hex >> 8) & 0xff;
  const b = transparentKey.hex & 0xff;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < transparentKey.alphaThreshold) {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    } else if (data[i + 3] < 255) {
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

export const renderFrameToCanvas = async (
  frame: FrameData,
  config: CanvasConfig,
  ctx: CanvasRenderingContext2D,
  options: RenderFrameOptions = {}
) => {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;
  const sourceWidth = options.sourceCanvasWidth ?? config.width;
  const sourceHeight = options.sourceCanvasHeight ?? config.height;
  const scaleX = width / sourceWidth;
  const scaleY = height / sourceHeight;
  const frameIndex = options.timelineFrameIndex ?? 0;
  const timeMs = options.timelineTimeMs ?? frameIndex;

  ctx.clearRect(0, 0, width, height);

  if (options.transparentKey) {
    ctx.fillStyle = options.transparentKey.str;
    ctx.fillRect(0, 0, width, height);
  } else if (!config.transparent) {
    ctx.fillStyle = config.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, width, height);

    if (config.backgroundImage) {
      try {
        const bgImg = await loadImage(config.backgroundImage, options.imageCache);
        const bgX = (config.backgroundImageX || 0) * scaleX;
        const bgY = (config.backgroundImageY || 0) * scaleY;
        const bgWidth = (config.backgroundImageDisplayWidth || sourceWidth) * scaleX;
        const bgHeight = (config.backgroundImageDisplayHeight || sourceHeight) * scaleY;
        ctx.drawImage(bgImg, bgX, bgY, bgWidth, bgHeight);
      } catch (error) {
        console.warn('Failed to draw background image', error);
      }
    }
  }

  if (options.transparentKey) {
    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = width;
    layerCanvas.height = height;
    const layerCtx = layerCanvas.getContext('2d', { willReadFrequently: true });
    if (!layerCtx) return;

    const resolvedLayers = [
      ...getFrameLayers(frame),
      ...(options.globalLayers ?? []),
      ...flattenTrackLayers(options.layerTracks ?? []),
    ]
      .map(layer => resolveLayerAtFrame(layer, frameIndex))
      .filter((layer): layer is LayerData => Boolean(layer));

    for (const layer of resolvedLayers) {
      await drawLayer(layerCtx, layer, scaleX, scaleY, options.imageCache);
    }

    applyTransparentKey(layerCtx, width, height, options.transparentKey);
    ctx.drawImage(layerCanvas, 0, 0);
    return;
  }

  const resolvedLayers = [
    ...getFrameLayers(frame),
    ...(options.globalLayers ?? []),
    ...flattenTrackLayers(options.layerTracks ?? []),
  ]
    .map(layer => resolveLayerAtFrame(layer, frameIndex))
    .filter((layer): layer is LayerData => Boolean(layer));

  for (const layer of resolvedLayers) {
    await drawLayer(ctx, layer, scaleX, scaleY, options.imageCache);
  }
};

export const renderFrameTracksToCanvas = async (
  tracks: FrameTrack[],
  fallbackFrame: FrameData | null,
  config: CanvasConfig,
  ctx: CanvasRenderingContext2D,
  options: Omit<RenderFrameOptions, 'globalLayers' | 'layerTracks'> = {}
) => {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;
  const sourceWidth = options.sourceCanvasWidth ?? config.width;
  const sourceHeight = options.sourceCanvasHeight ?? config.height;
  const scaleX = width / sourceWidth;
  const scaleY = height / sourceHeight;
  const frameIndex = options.timelineFrameIndex ?? 0;
  const timeMs = options.timelineTimeMs ?? frameIndex;

  ctx.clearRect(0, 0, width, height);

  if (options.transparentKey) {
    ctx.fillStyle = options.transparentKey.str;
    ctx.fillRect(0, 0, width, height);
  } else if (!config.transparent) {
    ctx.fillStyle = config.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, width, height);

    if (config.backgroundImage) {
      try {
        const bgImg = await loadImage(config.backgroundImage, options.imageCache);
        const bgX = (config.backgroundImageX || 0) * scaleX;
        const bgY = (config.backgroundImageY || 0) * scaleY;
        const bgWidth = (config.backgroundImageDisplayWidth || sourceWidth) * scaleX;
        const bgHeight = (config.backgroundImageDisplayHeight || sourceHeight) * scaleY;
        ctx.drawImage(bgImg, bgX, bgY, bgWidth, bgHeight);
      } catch (error) {
        console.warn('Failed to draw background image', error);
      }
    }
  }

  const layers = tracks.length > 0
    ? tracks.flatMap(track => {
      if (!track.visible) return [];
      const segment = findFrameAtTime(track.frames, timeMs);
      if (!segment) return [];

      return getFrameLayers(segment.frame).map(layer => ({
        ...layer,
        locked: track.locked || layer.locked,
        opacity: Math.min(1, Math.max(0, layer.opacity * track.opacity)),
      }));
    })
    : (fallbackFrame ? getFrameLayers(fallbackFrame) : []);

  if (options.transparentKey) {
    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = width;
    layerCanvas.height = height;
    const layerCtx = layerCanvas.getContext('2d', { willReadFrequently: true });
    if (!layerCtx) return;

    for (const layer of layers) {
      await drawLayer(layerCtx, layer, scaleX, scaleY, options.imageCache);
    }

    applyTransparentKey(layerCtx, width, height, options.transparentKey);
    ctx.drawImage(layerCanvas, 0, 0);
    return;
  }

  for (const layer of layers) {
    await drawLayer(ctx, layer, scaleX, scaleY, options.imageCache);
  }
};
