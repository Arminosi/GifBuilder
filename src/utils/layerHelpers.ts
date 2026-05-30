import { FrameData, LayerData, LayerTrack } from '../types';

export const createId = () => Math.random().toString(36).substr(2, 9);

export const createImageLayer = (input: {
  id?: string;
  name?: string;
  file?: File;
  previewUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  originalWidth: number;
  originalHeight: number;
  startFrame?: number;
  endFrame?: number | null;
  opacity?: number;
  visible?: boolean;
  locked?: boolean;
}): LayerData => ({
  id: input.id ?? createId(),
  name: input.name ?? input.file?.name ?? 'Image Layer',
  type: 'image',
  visible: input.visible ?? true,
  locked: input.locked ?? false,
  startFrame: input.startFrame ?? 0,
  endFrame: input.endFrame ?? null,
  opacity: input.opacity ?? 1,
  x: input.x,
  y: input.y,
  width: input.width,
  height: input.height,
  rotation: input.rotation ?? 0,
  source: {
    file: input.file,
    previewUrl: input.previewUrl,
    originalWidth: input.originalWidth,
    originalHeight: input.originalHeight,
    name: input.file?.name ?? input.name,
  },
});

export const createFrameFromImage = (input: {
  id?: string;
  file: File;
  previewUrl: string;
  duration: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  originalWidth: number;
  originalHeight: number;
  colorTag?: string;
}): FrameData => {
  const id = input.id ?? createId();
  const layer = createImageLayer({
    id: `${id}:layer:0`,
    name: input.file.name,
    file: input.file,
    previewUrl: input.previewUrl,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    rotation: input.rotation,
    originalWidth: input.originalWidth,
    originalHeight: input.originalHeight,
  });

  return {
    id,
    file: input.file,
    previewUrl: input.previewUrl,
    duration: input.duration,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    rotation: input.rotation,
    colorTag: input.colorTag,
    originalWidth: input.originalWidth,
    originalHeight: input.originalHeight,
    layers: [layer],
    activeLayerId: layer.id,
  };
};

export const getFrameLayers = (frame: FrameData): LayerData[] => {
  if (frame.layers && frame.layers.length > 0) {
    return frame.layers;
  }

  return [
    createImageLayer({
      id: `${frame.id}:layer:0`,
      name: frame.file?.name,
      file: frame.file,
      previewUrl: frame.previewUrl,
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
      rotation: frame.rotation,
      originalWidth: frame.originalWidth,
      originalHeight: frame.originalHeight,
    }),
  ];
};

export const getActiveLayer = (frame: FrameData): LayerData | null => {
  const layers = getFrameLayers(frame);
  return layers.find(layer => layer.id === frame.activeLayerId) ?? layers[0] ?? null;
};

export const syncFrameFromActiveLayer = (frame: FrameData): FrameData => {
  const activeLayer = getActiveLayer(frame);
  if (!activeLayer) return frame;

  return {
    ...frame,
    previewUrl: activeLayer.source.previewUrl,
    file: activeLayer.source.file ?? frame.file,
    x: activeLayer.x,
    y: activeLayer.y,
    width: activeLayer.width,
    height: activeLayer.height,
    rotation: activeLayer.rotation,
    originalWidth: activeLayer.source.originalWidth,
    originalHeight: activeLayer.source.originalHeight,
    activeLayerId: activeLayer.id,
  };
};

export const updateFrameActiveLayer = (frame: FrameData, updates: Partial<FrameData>): FrameData => {
  const layers = getFrameLayers(frame);
  const activeLayerId = frame.activeLayerId ?? layers[0]?.id;
  const transformKeys: Array<keyof FrameData> = ['x', 'y', 'width', 'height', 'rotation'];
  const hasLayerUpdate = transformKeys.some(key => updates[key] !== undefined);
  const hasSourceUpdate = updates.file !== undefined
    || updates.previewUrl !== undefined
    || updates.originalWidth !== undefined
    || updates.originalHeight !== undefined;

  if ((!hasLayerUpdate && !hasSourceUpdate) || !activeLayerId) {
    return { ...frame, ...updates, layers, activeLayerId };
  }

  const nextLayers = layers.map(layer => {
    if (layer.id !== activeLayerId) return layer;

    return {
      ...layer,
      x: updates.x ?? layer.x,
      y: updates.y ?? layer.y,
      width: updates.width ?? layer.width,
      height: updates.height ?? layer.height,
      rotation: updates.rotation ?? layer.rotation,
      source: hasSourceUpdate
        ? {
          ...layer.source,
          file: updates.file ?? layer.source.file,
          previewUrl: updates.previewUrl ?? layer.source.previewUrl,
          originalWidth: updates.originalWidth ?? layer.source.originalWidth,
          originalHeight: updates.originalHeight ?? layer.source.originalHeight,
          name: updates.file?.name ?? layer.source.name,
        }
        : layer.source,
    };
  });

  return syncFrameFromActiveLayer({
    ...frame,
    ...updates,
    layers: nextLayers,
    activeLayerId,
  });
};

export const cloneFrameWithNewIds = (frame: FrameData): FrameData => {
  const nextId = createId();
  const layers = getFrameLayers(frame).map((layer, index) => ({
    ...layer,
    id: `${nextId}:layer:${index}`,
  }));
  const activeLayerIndex = getFrameLayers(frame).findIndex(layer => layer.id === frame.activeLayerId);
  const activeLayer = layers[Math.max(0, activeLayerIndex)] ?? layers[0];

  return {
    ...frame,
    id: nextId,
    layers,
    activeLayerId: activeLayer?.id,
  };
};

export const flattenTrackLayers = (tracks: LayerTrack[]): LayerData[] => {
  return tracks.flatMap(track => {
    if (!track.visible) return [];

    return track.clips.map(clip => ({
      ...clip,
      locked: track.locked || clip.locked,
      opacity: Math.min(1, Math.max(0, clip.opacity * track.opacity)),
    }));
  });
};

export const createLayerTrack = (input: {
  id?: string;
  name?: string;
  visible?: boolean;
  locked?: boolean;
  opacity?: number;
  clips?: LayerData[];
}): LayerTrack => ({
  id: input.id ?? createId(),
  name: input.name ?? 'Layer Track',
  visible: input.visible ?? true,
  locked: input.locked ?? false,
  opacity: input.opacity ?? 1,
  clips: input.clips ?? [],
});
