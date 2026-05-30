import React from 'react';
import { Layout, Minimize2, Play, ScanEye } from 'lucide-react';
import type { CanvasConfig, FrameData, FrameTrack, LayerData } from '../types';
import type { FrameLabels, TranslationSchema } from '../utils/translations';
import { createCompositionTimeline, findFrameAtTime, getFrameStartTime } from '../utils/frameTrackTiming';
import { getFrameLayers } from '../utils/layerHelpers';
import { CanvasEditor } from './CanvasEditor';
import { FrameTrackPanel } from './FrameTrackPanel';
import { GlobalFrameTimeline } from './GlobalFrameTimeline';
import { Timeline } from './Timeline';

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
    selectedFrames: string;
    batchMode: string;
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
  if (!isVisible) return null;

  const timelineSegments = createCompositionTimeline(frameTracks, frames);
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
  const activeTrackFrameAtCurrentTime = currentTimelineFrameIndex >= 0
    ? findFrameAtTime(frames, currentTimelineTimeMs)?.frame ?? null
    : null;
  const canvasFrame = buildCompositionFrame(
    frameTracks,
    currentTimelineTimeMs,
    activeTrackFrameAtCurrentTime ?? selectedFrame
  );
  const shouldShowBlankCanvas = frameTracks.length > 0 && !canvasFrame;
  const isCompositionOnlyPreview = Boolean(
    canvasFrame && (!activeTrackFrameAtCurrentTime || !selectedFrameIds.has(activeTrackFrameAtCurrentTime.id))
  );

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
          {frames.length > 0 && (
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
        frame={canvasFrame}
        frameIndex={currentTimelineFrameIndex >= 0 ? currentTimelineFrameIndex : undefined}
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
          }}
          onSelectTrack={onSelectFrameTrack}
          onSelectFrame={onSelectFrameByIndex}
          onSelectTime={onSelectTimelineTime}
          onUpdateTrack={onUpdateFrameTrack}
          onAddTrack={onAddFrameTrack}
          onDeleteTrack={onDeleteFrameTrack}
        />
      )}
      {frameTracks.length > 0 && (
        <GlobalFrameTimeline
          frames={frames}
          timelineFrames={timelineFrames}
          currentFrameIndex={currentTimelineFrameIndex}
          currentTimeMs={currentTimelineTimeMs}
          selectedFrameIds={selectedFrameIds}
          exportInFrameIndex={exportInFrameIndex}
          exportOutFrameIndex={exportOutFrameIndex}
          isLargeScreen={isLargeScreen}
          labels={{
            inPoint: labels.exportInPoint,
            outPoint: labels.exportOutPoint,
            clearRange: labels.clearExportRange,
            selectedFrames: labels.selectedFrames,
            batchMode: labels.batchMode,
          }}
          onSelectFrame={onSelectFrameByIndex}
          onSelectTime={onSelectTimelineTime}
          onSetExportInPoint={onSetExportInPoint}
          onSetExportOutPoint={onSetExportOutPoint}
          onClearExportRange={onClearExportRange}
        />
      )}
    </div>
  );
};
