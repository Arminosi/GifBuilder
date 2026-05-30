import React from 'react';
import { Layout, Minimize2, Play, ScanEye } from 'lucide-react';
import type { CanvasConfig, FrameData, FrameTrack, LayerData } from '../types';
import type { FrameLabels, TranslationSchema } from '../utils/translations';
import { createCompositionTimeline, findFrameAtTime, getCompositionDuration, getFrameStartTime, getTimelineSegmentIndexAtTime } from '../utils/frameTrackTiming';
import { getFrameLayers } from '../utils/layerHelpers';
import { renderFrameTracksToCanvas } from '../utils/layerRenderer';
import { CanvasEditor } from './CanvasEditor';
import { FrameTrackPanel } from './FrameTrackPanel';
import { GlobalFrameTimeline } from './GlobalFrameTimeline';
import { Timeline } from './Timeline';

const FRAME_TRACK_LABEL_WIDTH = 164;
const PLAYBACK_CACHE_LOOKAHEAD = 8;
const IDLE_CACHE_LOOKAHEAD = 2;
const MAX_COMPOSITION_CACHE_SIZE = 32;

interface CanvasWorkspaceProps {
  isVisible: boolean;
  isLargeScreen: boolean;
  editorHeight: number;
  frames: FrameData[];
  frameTracks: FrameTrack[];
  activeFrameTrackId: string | null;
  selectedFrameIds: Set<string>;
  selectedFrame: FrameData | null;
  selectedFrameIndex: number;
  isPlaying: boolean;
  previewFrameIndex: number | null;
  previewTimeMs: number | null;
  syncPreviewSelection: boolean;
  exportInFrameIndex: number | null;
  exportOutFrameIndex: number | null;
  config: CanvasConfig;
  gifTransparentColor: string;
  isGifTransparentEnabled: boolean;
  isEyeDropperActive: boolean;
  isGifEyeDropperActive: boolean;
  isBgColorEyeDropperActive: boolean;
  labels: {
    canvasEditor: string;
    unlinkSelection: string;
    linkSelection: string;
    hideEditor: string;
    selectFrameToEdit: string;
    frameInfo: string;
    frame: FrameLabels;
    preview: TranslationSchema['preview'];
    exportInPoint: string;
    exportOutPoint: string;
    clearExportRange: string;
    frameTracks: string;
    noFrameTracks: string;
    addTrack: string;
    startFrame: string;
    endFrame: string;
    opacity: string;
    visible: string;
    hidden: string;
    locked: string;
    unlocked: string;
    deleteLayer: string;
  };
  onSyncPreviewSelectionChange: (enabled: boolean) => void;
  onPlayingChange: (playing: boolean) => void;
  onHideEditor: () => void;
  onCanvasUpdate: (updates: Partial<FrameData>, commit?: boolean) => void;
  onSelectLayer?: (layerId: string) => void;
  onSelectFrameTrack: (trackId: string) => void;
  onUpdateFrameTrack: (trackId: string, updates: Partial<FrameTrack>) => void;
  onAddFrameTrack: () => void;
  onDeleteFrameTrack: (trackId: string) => void;
  onColorPick: (color: string) => void;
  onSelectFrame: (id: string, event: React.MouseEvent) => void;
  onSelectFrameByIndex: (index: number) => void;
  onSelectTimelineTime: (timeMs: number) => void;
  onSetExportInPoint: () => void;
  onSetExportOutPoint: () => void;
  onClearExportRange: () => void;
}

const buildCompositionFrame = (
  tracks: FrameTrack[],
  timeMs: number,
  fallbackFrame: FrameData | null
): FrameData | null => {
  if (tracks.length === 0) {
    return fallbackFrame;
  }

  const layers: LayerData[] = [];
  let baseFrame: FrameData | null = fallbackFrame;

  tracks.forEach(track => {
    if (!track.visible) return;

    const segment = findFrameAtTime(track.frames, timeMs);
    if (!segment) return;
    const trackFrame = segment.frame;

    if (!baseFrame) {
      baseFrame = trackFrame;
    }

    getFrameLayers(trackFrame).forEach(layer => {
      layers.push({
        ...layer,
        locked: track.locked || layer.locked,
        opacity: Math.min(1, Math.max(0, layer.opacity * track.opacity)),
      });
    });
  });

  if (!baseFrame || layers.length === 0) {
    return fallbackFrame && tracks.length === 0 ? fallbackFrame : null;
  }

  return {
    ...baseFrame,
    id: `composition-preview-${timeMs}`,
    layers,
    activeLayerId: fallbackFrame?.activeLayerId && layers.some(layer => layer.id === fallbackFrame.activeLayerId)
      ? fallbackFrame.activeLayerId
      : undefined,
  };
};

const closeCachedSource = (source: CanvasImageSource) => {
  if ('close' in source && typeof source.close === 'function') {
    source.close();
  }
};

const scheduleCloseCachedSource = (source: CanvasImageSource) => {
  if (!('close' in source) || typeof source.close !== 'function') return;

  window.setTimeout(() => closeCachedSource(source), 1000);
};

const createCachedSource = async (canvas: HTMLCanvasElement): Promise<CanvasImageSource> => {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(canvas);
  }

  return canvas;
};

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  isVisible,
  isLargeScreen,
  editorHeight,
  frames,
  frameTracks,
  activeFrameTrackId,
  selectedFrameIds,
  selectedFrame,
  selectedFrameIndex,
  isPlaying,
  previewFrameIndex,
  previewTimeMs,
  syncPreviewSelection,
  exportInFrameIndex,
  exportOutFrameIndex,
  config,
  gifTransparentColor,
  isGifTransparentEnabled,
  isEyeDropperActive,
  isGifEyeDropperActive,
  isBgColorEyeDropperActive,
  labels,
  onSyncPreviewSelectionChange,
  onPlayingChange,
  onHideEditor,
  onCanvasUpdate,
  onSelectLayer,
  onSelectFrameTrack,
  onUpdateFrameTrack,
  onAddFrameTrack,
  onDeleteFrameTrack,
  onColorPick,
  onSelectFrame,
  onSelectFrameByIndex,
  onSelectTimelineTime,
  onSetExportInPoint,
  onSetExportOutPoint,
  onClearExportRange,
}) => {
  const timelineSegments = createCompositionTimeline(frameTracks, frames);
  const compositionDuration = getCompositionDuration(frameTracks);
  const isMultiTrackMode = frameTracks.length > 1;
  const compositionBitmapCacheRef = React.useRef<Map<number, CanvasImageSource>>(new Map());
  const compositionRenderQueueRef = React.useRef<Set<number>>(new Set());
  const compositionImageCacheRef = React.useRef<Map<string, HTMLImageElement>>(new Map());
  const lastCompositionBitmapRef = React.useRef<CanvasImageSource | null>(null);
  const currentCompositionBitmapRef = React.useRef<CanvasImageSource | null>(null);
  const [compositionCacheVersion, setCompositionCacheVersion] = React.useState(0);
  const timelineFrames = timelineSegments.map((segment, index) => ({
    id: `timeline-segment-${index}`,
    duration: segment.duration,
    file: null as unknown as File,
    previewUrl: '',
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    originalWidth: 1,
    originalHeight: 1,
  } as FrameData));
  const hasPlayableContent = frames.length > 0 || frameTracks.some(track => track.frames.length > 0);
  const currentTimelineFrameIndex = previewFrameIndex !== null
    ? previewFrameIndex
    : previewTimeMs !== null
      ? -1
      : Math.max(0, selectedFrameIndex);
  const currentTimelineTimeMs = previewTimeMs !== null
    ? previewTimeMs
    : selectedFrameIndex >= 0
      ? getFrameStartTime(frames, selectedFrameIndex)
      : timelineSegments[0]?.start ?? 0;
  const currentTimelineSegment = timelineSegments[getTimelineSegmentIndexAtTime(timelineSegments, currentTimelineTimeMs)] ?? timelineSegments[0];
  const currentTimelineCacheKey = currentTimelineSegment?.start ?? currentTimelineTimeMs;
  const timelineSignature = React.useMemo(
    () => timelineSegments.map(segment => `${segment.start}:${segment.duration}`).join('|'),
    [timelineSegments]
  );
  const compositionCacheKey = React.useMemo(() => JSON.stringify({
    width: config.width,
    height: config.height,
    transparent: config.transparent,
    backgroundColor: config.backgroundColor,
    backgroundImage: config.backgroundImage,
    backgroundImageX: config.backgroundImageX,
    backgroundImageY: config.backgroundImageY,
    backgroundImageDisplayWidth: config.backgroundImageDisplayWidth,
    backgroundImageDisplayHeight: config.backgroundImageDisplayHeight,
    tracks: frameTracks.map(track => ({
      id: track.id,
      visible: track.visible,
      locked: track.locked,
      opacity: track.opacity,
      frames: track.frames.map(frame => ({
        id: frame.id,
        startTime: frame.startTime,
        duration: frame.duration,
        layers: getFrameLayers(frame).map(layer => ({
          id: layer.id,
          visible: layer.visible,
          opacity: layer.opacity,
          blendMode: layer.blendMode,
          x: layer.x,
          y: layer.y,
          width: layer.width,
          height: layer.height,
          rotation: layer.rotation,
          source: layer.source.previewUrl,
        })),
      })),
    })),
  }), [config, frameTracks]);
  React.useEffect(() => {
    compositionBitmapCacheRef.current.forEach(scheduleCloseCachedSource);
    compositionBitmapCacheRef.current.clear();
    compositionRenderQueueRef.current.clear();
    compositionImageCacheRef.current.clear();
    lastCompositionBitmapRef.current = null;
    currentCompositionBitmapRef.current = null;
    setCompositionCacheVersion(version => version + 1);
  }, [compositionCacheKey]);

  React.useEffect(() => {
    if (!isVisible || !isMultiTrackMode || timelineSegments.length === 0) return;

    let cancelled = false;
    const lookahead = isPlaying ? PLAYBACK_CACHE_LOOKAHEAD : IDLE_CACHE_LOOKAHEAD;
    const startIndex = getTimelineSegmentIndexAtTime(timelineSegments, currentTimelineTimeMs);
    const segmentsToWarm = Array.from({ length: Math.min(lookahead, timelineSegments.length) }, (_, offset) => {
      return timelineSegments[(startIndex + offset) % timelineSegments.length];
    });

    const renderSegment = async (segment: typeof timelineSegments[number]) => {
      const key = segment.start;
      if (compositionBitmapCacheRef.current.has(key) || compositionRenderQueueRef.current.has(key)) return;

      compositionRenderQueueRef.current.add(key);

      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, config.width);
        canvas.height = Math.max(1, config.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        await renderFrameTracksToCanvas(frameTracks, null, config, ctx, {
          timelineTimeMs: segment.start,
          imageCache: compositionImageCacheRef.current,
        });

        if (cancelled) return;

        const bitmap = await createCachedSource(canvas);
        if (cancelled) {
          closeCachedSource(bitmap);
          return;
        }

        const nextCache = compositionBitmapCacheRef.current;
        nextCache.set(key, bitmap);

        while (nextCache.size > MAX_COMPOSITION_CACHE_SIZE) {
          const oldestKey = nextCache.keys().next().value;
          if (typeof oldestKey !== 'number') break;
          const oldestSource = nextCache.get(oldestKey);
          if (oldestSource && lastCompositionBitmapRef.current === oldestSource) {
            lastCompositionBitmapRef.current = null;
          }
          if (oldestSource && currentCompositionBitmapRef.current === oldestSource) {
            currentCompositionBitmapRef.current = null;
          }
          if (oldestSource) scheduleCloseCachedSource(oldestSource);
          nextCache.delete(oldestKey);
        }

        setCompositionCacheVersion(version => version + 1);
      } catch (error) {
        console.warn('Failed to warm composition preview cache', error);
      } finally {
        compositionRenderQueueRef.current.delete(key);
      }
    };

    segmentsToWarm.forEach(segment => {
      void renderSegment(segment);
    });

    return () => {
      cancelled = true;
    };
  }, [isVisible, isMultiTrackMode, isPlaying, currentTimelineTimeMs, timelineSignature, compositionCacheKey]);

  React.useEffect(() => {
    return () => {
      compositionBitmapCacheRef.current.forEach(scheduleCloseCachedSource);
      compositionBitmapCacheRef.current.clear();
      lastCompositionBitmapRef.current = null;
      currentCompositionBitmapRef.current = null;
    };
  }, []);

  void compositionCacheVersion;
  const activeTrackFrameAtCurrentTime = findFrameAtTime(frames, currentTimelineTimeMs)?.frame ?? null;
  const canvasFrame = isMultiTrackMode
    ? buildCompositionFrame(
      frameTracks,
      currentTimelineTimeMs,
      activeTrackFrameAtCurrentTime ?? selectedFrame
    )
    : (frameTracks.length > 0 ? activeTrackFrameAtCurrentTime : selectedFrame);
  const cachedCompositionBitmap = isMultiTrackMode
    ? compositionBitmapCacheRef.current.get(currentTimelineCacheKey) ?? null
    : null;
  React.useEffect(() => {
    if (cachedCompositionBitmap) {
      lastCompositionBitmapRef.current = cachedCompositionBitmap;
    }
  }, [cachedCompositionBitmap]);
  const stableCompositionBitmap = cachedCompositionBitmap
    ?? (isMultiTrackMode && canvasFrame && (isPlaying || previewTimeMs !== null) ? lastCompositionBitmapRef.current : null);
  React.useEffect(() => {
    currentCompositionBitmapRef.current = stableCompositionBitmap;
  }, [stableCompositionBitmap]);
  const displayedCanvasFrame = canvasFrame;
  const shouldShowBlankCanvas = frameTracks.length > 0 && !displayedCanvasFrame && !stableCompositionBitmap;
  const isCompositionOnlyPreview = Boolean(
    stableCompositionBitmap || (canvasFrame && (!activeTrackFrameAtCurrentTime || !selectedFrameIds.has(activeTrackFrameAtCurrentTime.id)))
  );

  if (!isVisible) return null;

  return (
    <div
      style={{ height: isLargeScreen ? editorHeight : '100%' }}
      className={`flex flex-col bg-gray-900/50 relative ${!isLargeScreen ? 'flex-1' : ''}`}
    >
      <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layout size={16} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{labels.canvasEditor}</h2>
        </div>
        <div className="flex items-center gap-2">
          {hasPlayableContent && (
            <>
              <button
                onClick={() => onSyncPreviewSelectionChange(!syncPreviewSelection)}
                className={`p-1.5 rounded transition-colors flex items-center gap-1.5 text-xs font-medium ${syncPreviewSelection
                  ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                  : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'
                  }`}
                title={syncPreviewSelection ? labels.unlinkSelection : labels.linkSelection}
              >
                <ScanEye size={16} />
              </button>
              <button
                onClick={() => onPlayingChange(!isPlaying)}
                className={`p-1.5 rounded transition-colors flex items-center gap-1.5 text-xs font-medium ${isPlaying
                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                  : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                  }`}
                title={isPlaying ? labels.preview.pause : labels.preview.play}
              >
                {isPlaying ? <div className="w-3 h-3 bg-current rounded-sm" /> : <Play size={12} fill="currentColor" />}
                {isPlaying ? labels.preview.pause : labels.preview.play}
                <kbd className="ml-1 rounded border border-current/30 px-1 text-[10px] opacity-70">Space</kbd>
              </button>
            </>
          )}
          {isLargeScreen && (
            <button
              onClick={onHideEditor}
              className="text-gray-500 hover:text-white p-1"
              title={labels.hideEditor}
            >
              <Minimize2 size={16} />
            </button>
          )}
        </div>
      </div>
      <CanvasEditor
        frame={displayedCanvasFrame}
        frameIndex={currentTimelineFrameIndex >= 0 ? currentTimelineFrameIndex : undefined}
        previewBitmap={stableCompositionBitmap}
        config={config}
        onUpdate={onCanvasUpdate}
        onSelectLayer={onSelectLayer}
        labels={{ ...labels.frame, frameInfo: labels.frameInfo }}
        emptyMessage={labels.selectFrameToEdit}
        isPreview={isPlaying || isCompositionOnlyPreview}
        showBlankCanvas={shouldShowBlankCanvas}
        isEyeDropperActive={isEyeDropperActive || isGifEyeDropperActive || isBgColorEyeDropperActive}
        onColorPick={onColorPick}
        gifTransparentColor={gifTransparentColor}
        isGifTransparentEnabled={isGifTransparentEnabled}
      />
      {frames.length > 0 && (
        <Timeline
          frames={frames}
          selectedFrameIds={selectedFrameIds}
          onSelect={onSelectFrame}
          transparentColor={gifTransparentColor}
          isTransparentEnabled={isGifTransparentEnabled}
        />
      )}
      {frameTracks.length > 0 && (
        <div className="shrink-0 border-t border-gray-800 bg-gray-950/95 px-4 py-1.5">
          <FrameTrackPanel
            tracks={frameTracks}
            activeTrackId={activeFrameTrackId}
            currentFrameIndex={currentTimelineFrameIndex}
            currentTimeMs={currentTimelineTimeMs}
            labels={{
              title: labels.frameTracks,
              empty: labels.noFrameTracks,
              add: labels.addTrack,
              opacity: labels.opacity,
              visible: labels.visible,
              hidden: labels.hidden,
              locked: labels.locked,
              unlocked: labels.unlocked,
              delete: labels.deleteLayer,
              track: 'Track',
              inPoint: labels.exportInPoint,
              outPoint: labels.exportOutPoint,
              clearRange: labels.clearExportRange,
            }}
            exportControls={{
              canSetRange: currentTimelineFrameIndex >= 0,
              hasRange: exportInFrameIndex !== null || exportOutFrameIndex !== null,
              onSetInPoint: onSetExportInPoint,
              onSetOutPoint: onSetExportOutPoint,
              onClearRange: onClearExportRange,
            }}
            onSelectTrack={onSelectFrameTrack}
            onSelectFrame={onSelectFrameByIndex}
            onSelectTime={onSelectTimelineTime}
            onUpdateTrack={onUpdateFrameTrack}
            onAddTrack={onAddFrameTrack}
            onDeleteTrack={onDeleteFrameTrack}
            trackLabelWidth={FRAME_TRACK_LABEL_WIDTH}
            embedded
          />
          {frameTracks.length > 1 && (
            <GlobalFrameTimeline
              frames={frames}
              timelineFrames={timelineFrames}
              currentFrameIndex={currentTimelineFrameIndex}
              currentTimeMs={currentTimelineTimeMs}
              continuous
              leftGutterWidth={FRAME_TRACK_LABEL_WIDTH}
              totalDurationMs={compositionDuration}
              selectedFrameIds={selectedFrameIds}
              exportInFrameIndex={exportInFrameIndex}
              exportOutFrameIndex={exportOutFrameIndex}
              isLargeScreen={isLargeScreen}
              onSelectFrame={onSelectFrameByIndex}
              onSelectTime={onSelectTimelineTime}
              embedded
            />
          )}
        </div>
      )}
    </div>
  );
};
