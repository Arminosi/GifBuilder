import React from 'react';
import { Layout, Minimize2, Play, ScanEye } from 'lucide-react';
import type { CanvasConfig, FrameData } from '../types';
import type { FrameLabels, TranslationSchema } from '../utils/translations';
import { CanvasEditor } from './CanvasEditor';
import { GlobalFrameTimeline } from './GlobalFrameTimeline';
import { Timeline } from './Timeline';

interface CanvasWorkspaceProps {
  isVisible: boolean;
  isLargeScreen: boolean;
  editorHeight: number;
  frames: FrameData[];
  selectedFrameIds: Set<string>;
  selectedFrame: FrameData | null;
  selectedFrameIndex: number;
  isPlaying: boolean;
  previewFrameIndex: number | null;
  syncPreviewSelection: boolean;
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
  };
  onSyncPreviewSelectionChange: (enabled: boolean) => void;
  onPlayingChange: (playing: boolean) => void;
  onHideEditor: () => void;
  onCanvasUpdate: (updates: Partial<FrameData>, commit?: boolean) => void;
  onColorPick: (color: string) => void;
  onSelectFrame: (id: string, event: React.MouseEvent) => void;
  onSelectFrameByIndex: (index: number) => void;
}

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  isVisible,
  isLargeScreen,
  editorHeight,
  frames,
  selectedFrameIds,
  selectedFrame,
  selectedFrameIndex,
  isPlaying,
  previewFrameIndex,
  syncPreviewSelection,
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
  onColorPick,
  onSelectFrame,
  onSelectFrameByIndex,
}) => {
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
        frame={isPlaying && previewFrameIndex !== null ? frames[previewFrameIndex] : selectedFrame}
        frameIndex={isPlaying && previewFrameIndex !== null ? previewFrameIndex : (selectedFrameIndex !== -1 ? selectedFrameIndex : undefined)}
        config={config}
        onUpdate={onCanvasUpdate}
        labels={{ ...labels.frame, frameInfo: labels.frameInfo }}
        emptyMessage={labels.selectFrameToEdit}
        isPreview={isPlaying}
        isEyeDropperActive={isEyeDropperActive || isGifEyeDropperActive || isBgColorEyeDropperActive}
        onColorPick={onColorPick}
        gifTransparentColor={gifTransparentColor}
        isGifTransparentEnabled={isGifTransparentEnabled}
      />
      {selectedFrameIds.size > 1 && (
        <div className="absolute bottom-14 left-4 bg-blue-900/80 text-blue-200 px-3 py-1 rounded-full text-xs border border-blue-700 backdrop-blur-sm shadow-lg pointer-events-none">
          {labels.selectedFrames.replace('{count}', selectedFrameIds.size.toString())} ({labels.batchMode})
        </div>
      )}

      {frames.length > 0 && (
        <>
          <Timeline
            frames={frames}
            selectedFrameIds={selectedFrameIds}
            onSelect={onSelectFrame}
            transparentColor={gifTransparentColor}
            isTransparentEnabled={isGifTransparentEnabled}
          />
          <GlobalFrameTimeline
            frames={frames}
            selectedFrameIds={selectedFrameIds}
            onSelectFrame={onSelectFrameByIndex}
          />
        </>
      )}
    </div>
  );
};
