import React from 'react';
import {
  Check,
  CheckSquare,
  Columns,
  Copy,
  Layout,
  Monitor,
  RotateCcw,
  Rows,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { FrameLabels, TranslationSchema } from '../utils/translations';

type LayoutMode = 'auto' | 'vertical' | 'horizontal';

interface BatchInputValues {
  x: string;
  y: string;
  width: string;
  height: string;
  duration: string;
}

interface FrameListControlsProps {
  frameCount: number;
  selectedCount: number;
  frameSize: number;
  compactMode: boolean;
  layoutMode: LayoutMode;
  isBatchSelectMode: boolean;
  isBatchEditOpen: boolean;
  showCanvasEditor: boolean;
  batchInputValues: BatchInputValues;
  labels: {
    frames: string;
    frameSize: string;
    compactMode: string;
    batchSelectMode: string;
    selectionProperties: string;
    showEditor: string;
    hideEditor: string;
    apply: string;
    duplicate: string;
    resetProperties: string;
    frame: FrameLabels;
    layoutMode: TranslationSchema['layoutMode'];
  };
  onFrameSizeChange: (size: number) => void;
  onCompactModeChange: (compact: boolean) => void;
  onLayoutModeChange: (mode: LayoutMode) => void;
  onBatchSelectModeChange: (enabled: boolean) => void;
  onBatchEditOpenChange: (open: boolean) => void;
  onShowCanvasEditorChange: (show: boolean) => void;
  onBatchInputChange: (field: keyof BatchInputValues, value: string) => void;
  onApplyBatchUpdates: () => void;
  onDuplicate: () => void;
  onResetProperties: () => void;
}

export const FrameListControls: React.FC<FrameListControlsProps> = ({
  frameCount,
  selectedCount,
  frameSize,
  compactMode,
  layoutMode,
  isBatchSelectMode,
  isBatchEditOpen,
  showCanvasEditor,
  batchInputValues,
  labels,
  onFrameSizeChange,
  onCompactModeChange,
  onLayoutModeChange,
  onBatchSelectModeChange,
  onBatchEditOpenChange,
  onShowCanvasEditorChange,
  onBatchInputChange,
  onApplyBatchUpdates,
  onDuplicate,
  onResetProperties,
}) => {
  const layoutLabel = layoutMode === 'auto' ? labels.layoutMode.auto : (layoutMode === 'vertical' ? labels.layoutMode.vertical : labels.layoutMode.horizontal);

  return (
    <div className="flex flex-col border-b border-gray-800 bg-gray-900/30">
      <div className="flex items-center justify-between px-4 py-2 overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <h2 className="text-sm font-medium text-gray-300 whitespace-nowrap">
            {labels.frames} <span className="text-gray-500">({frameCount})</span>
          </h2>

          <div className="h-4 w-px bg-gray-700 hidden sm:block"></div>

          <div className="flex items-center gap-1 sm:gap-2 group">
            <ZoomOut size={14} className="text-gray-500 hidden sm:block" />
            <input
              type="range"
              min="60"
              max="300"
              value={frameSize}
              onChange={(event) => onFrameSizeChange(parseInt(event.target.value))}
              className="w-16 sm:w-20 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              title={labels.frameSize}
            />
            <ZoomIn size={14} className="text-gray-500 hidden sm:block" />
          </div>

          <button
            onClick={() => onCompactModeChange(!compactMode)}
            className={`p-1.5 lg:px-2.5 rounded hover:bg-gray-800 transition-colors flex items-center gap-2 ${compactMode ? 'text-blue-400 bg-blue-900/20' : 'text-gray-500'}`}
            title={labels.compactMode}
          >
            <Monitor size={16} />
            <span className="hidden lg:inline text-xs font-medium">{labels.compactMode}</span>
          </button>

          <button
            onClick={() => {
              const modes: LayoutMode[] = ['auto', 'vertical', 'horizontal'];
              const nextIndex = (modes.indexOf(layoutMode) + 1) % modes.length;
              onLayoutModeChange(modes[nextIndex]);
            }}
            className={`p-1.5 lg:px-2.5 rounded hover:bg-gray-800 transition-colors flex items-center gap-2 ${layoutMode !== 'auto' ? 'text-blue-400 bg-blue-900/20' : 'text-gray-500'}`}
            title={layoutLabel}
          >
            {layoutMode === 'auto' && <Layout size={16} />}
            {layoutMode === 'vertical' && <Rows size={16} />}
            {layoutMode === 'horizontal' && <Columns size={16} />}
            <span className="hidden lg:inline text-xs font-medium">
              {layoutLabel}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onBatchSelectModeChange(!isBatchSelectMode)}
            className={`p-1.5 lg:px-2.5 rounded transition-colors flex items-center gap-1.5 ${isBatchSelectMode
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-blue-900/30 hover:text-blue-400'
              }`}
            title={labels.batchSelectMode}
          >
            <CheckSquare size={16} />
            <span className="hidden lg:inline text-xs font-medium">{labels.batchSelectMode}</span>
          </button>

          <button
            onClick={() => onBatchEditOpenChange(!isBatchEditOpen)}
            disabled={selectedCount === 0}
            className={`p-1.5 lg:px-2.5 rounded transition-colors flex items-center gap-1.5 ${isBatchEditOpen
              ? 'bg-blue-600 text-white'
              : selectedCount > 0
                ? 'text-blue-400 hover:bg-blue-900/30'
                : 'text-gray-600 cursor-not-allowed'
              }`}
            title={labels.selectionProperties}
          >
            <SlidersHorizontal size={16} />
            <span className="hidden lg:inline text-xs font-medium">{labels.selectionProperties}</span>
            {selectedCount > 0 && (
              <span className={`text-xs font-bold px-1.5 rounded-full ${isBatchEditOpen ? 'bg-white/20' : 'bg-blue-500/20'}`}>{selectedCount}</span>
            )}
          </button>

          <button
            onClick={() => onShowCanvasEditorChange(!showCanvasEditor)}
            className={`p-1.5 rounded hover:bg-gray-800 transition-colors hidden lg:block ${showCanvasEditor ? 'text-blue-400 bg-blue-900/20' : 'text-gray-500'}`}
            title={showCanvasEditor ? labels.hideEditor : labels.showEditor}
          >
            <Layout size={16} />
          </button>
        </div>
      </div>

      {isBatchEditOpen && selectedCount > 0 && (
        <div className="px-6 py-3 bg-blue-950/20 border-t border-blue-900/30 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
            <div>
              <label className="text-xs text-blue-300/70 mb-1 block">{labels.frame.x}</label>
              <input type="number"
                value={batchInputValues.x}
                placeholder="-"
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                onChange={(event) => onBatchInputChange('x', event.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-blue-300/70 mb-1 block">{labels.frame.y}</label>
              <input type="number"
                value={batchInputValues.y}
                placeholder="-"
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                onChange={(event) => onBatchInputChange('y', event.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-blue-300/70 mb-1 block">{labels.frame.w}</label>
              <input type="number"
                value={batchInputValues.width}
                placeholder="-"
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                onChange={(event) => onBatchInputChange('width', event.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-blue-300/70 mb-1 block">{labels.frame.h}</label>
              <input type="number"
                value={batchInputValues.height}
                placeholder="-"
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                onChange={(event) => onBatchInputChange('height', event.target.value)}
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs text-blue-300/70 mb-1 block">{labels.frame.time}</label>
              <input type="number"
                value={batchInputValues.duration}
                placeholder="-"
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                onChange={(event) => onBatchInputChange('duration', event.target.value)}
              />
            </div>

            <div className="col-span-2 md:col-span-1 flex gap-2">
              <button
                onClick={onApplyBatchUpdates}
                className="flex-1 flex items-center justify-center gap-1 p-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs transition-colors shadow-sm font-medium h-[30px]"
                title={labels.apply}
              >
                <Check size={14} />
              </button>
              <button
                onClick={onDuplicate}
                className="flex-1 flex items-center justify-center gap-1 p-1.5 rounded bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 border border-blue-900/50 text-xs transition-colors h-[30px]"
                title={labels.duplicate}
              >
                <Copy size={14} />
              </button>
              <button
                onClick={onResetProperties}
                className="flex-1 flex items-center justify-center gap-1 p-1.5 rounded bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 border border-blue-900/50 text-xs transition-colors h-[30px]"
                title={labels.resetProperties}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
