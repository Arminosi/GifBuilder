import React from 'react';
import { AlignCenter, ArrowDownAZ, ArrowUpAZ, Maximize, Merge, Scaling, Scissors } from 'lucide-react';
import type { TranslationSchema } from '../utils/translations';

type DurationMode = 'ms' | 'fps';
type FitMode = 'fill' | 'contain';

interface SidebarBatchOperationsPanelProps {
  title: string;
  labels: Pick<
    TranslationSchema,
    | 'setDuration'
    | 'apply'
    | 'autoFit'
    | 'fitFill'
    | 'fitContain'
    | 'applyFit'
    | 'alignCenter'
    | 'mergeDuplicates'
  >;
  reduceLabels: TranslationSchema['reduceFrames'];
  durationMode: DurationMode;
  globalDuration: number;
  fpsValue: number;
  fitMode: FitMode;
  reduceKeep: number;
  reduceRemove: number;
  onDurationModeChange: (mode: DurationMode) => void;
  onGlobalDurationChange: (duration: number) => void;
  onFpsValueChange: (fps: number) => void;
  onApplyDuration: () => void;
  onFitModeChange: (mode: FitMode) => void;
  onAutoFit: () => void;
  onAlignCenterAll: () => void;
  onMergeDuplicates: () => void;
  onSortByFilename: (direction: 'asc' | 'desc') => void;
  onReduceKeepChange: (value: number) => void;
  onReduceRemoveChange: (value: number) => void;
  onReduceFrames: () => void;
}

const fpsToMs = (fps: number): number => {
  if (fps <= 0) return 100;
  return Math.round(1000 / fps);
};

const msToFps = (ms: number): number => {
  if (ms <= 0) return 10;
  return Math.round(1000 / ms);
};

export const SidebarBatchOperationsPanel: React.FC<SidebarBatchOperationsPanelProps> = ({
  title,
  labels,
  reduceLabels,
  durationMode,
  globalDuration,
  fpsValue,
  fitMode,
  reduceKeep,
  reduceRemove,
  onDurationModeChange,
  onGlobalDurationChange,
  onFpsValueChange,
  onApplyDuration,
  onFitModeChange,
  onAutoFit,
  onAlignCenterAll,
  onMergeDuplicates,
  onSortByFilename,
  onReduceKeepChange,
  onReduceRemoveChange,
  onReduceFrames,
}) => (
  <div className="space-y-3">
    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">{title}</h3>

    <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-gray-500 uppercase block">{labels.setDuration}</label>
          <div className="flex rounded-md border border-gray-700 bg-gray-800/50 overflow-hidden p-0.5">
            <button
              onClick={() => {
                onDurationModeChange('ms');
                onFpsValueChange(msToFps(globalDuration));
              }}
              className={`px-2 py-0.5 text-[9px] font-medium rounded transition-colors ${durationMode === 'ms'
                ? 'bg-gray-700 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-400'
                }`}
            >
              MS
            </button>
            <button
              onClick={() => {
                onDurationModeChange('fps');
                onGlobalDurationChange(fpsToMs(fpsValue));
              }}
              className={`px-2 py-0.5 text-[9px] font-medium rounded transition-colors ${durationMode === 'fps'
                ? 'bg-gray-700 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-400'
                }`}
            >
              FPS
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          {durationMode === 'ms' ? (
            <div className="flex-1 relative">
              <input
                type="number"
                value={globalDuration}
                onChange={(event) => {
                  const ms = parseInt(event.target.value) || 100;
                  onGlobalDurationChange(ms);
                  onFpsValueChange(msToFps(ms));
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm pr-8 focus:border-blue-500 focus:outline-none"
                min="10"
                step="10"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">ms</span>
            </div>
          ) : (
            <div className="flex-1 relative">
              <input
                type="number"
                value={fpsValue === 0 ? '' : fpsValue}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === '') {
                    onFpsValueChange(0);
                  } else {
                    const fps = parseInt(value) || 0;
                    onFpsValueChange(fps);
                    if (fps > 0) {
                      onGlobalDurationChange(fpsToMs(fps));
                    }
                  }
                }}
                onBlur={(event) => {
                  const value = event.target.value;
                  if (value === '' || parseInt(value) <= 0) {
                    onFpsValueChange(10);
                    onGlobalDurationChange(fpsToMs(10));
                  }
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm pr-10 focus:border-blue-500 focus:outline-none"
                min="1"
                step="1"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">fps</span>
            </div>
          )}
          <button
            onClick={onApplyDuration}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs font-medium transition-colors"
          >
            {labels.apply}
          </button>
        </div>
        <p className="text-[9px] text-gray-600">
          {durationMode === 'ms'
            ? `≈ ${msToFps(globalDuration)} fps`
            : fpsValue > 0
              ? `≈ ${fpsToMs(fpsValue)} ms`
              : '请输入 FPS 值'
          }
        </p>
      </div>

      <div className="w-full h-px bg-gray-800" />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-gray-500 uppercase">{labels.autoFit}</label>
          <Scaling size={12} className="text-gray-600" />
        </div>
        <div className="flex rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden p-0.5">
          <button
            onClick={() => onFitModeChange('fill')}
            className={`flex-1 py-1 text-[10px] font-medium rounded-md transition-colors ${fitMode === 'fill' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-400'}`}
          >
            {labels.fitFill}
          </button>
          <button
            onClick={() => onFitModeChange('contain')}
            className={`flex-1 py-1 text-[10px] font-medium rounded-md transition-colors ${fitMode === 'contain' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-400'}`}
          >
            {labels.fitContain}
          </button>
        </div>
        <button
          onClick={onAutoFit}
          className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 text-gray-300"
        >
          <Maximize size={12} /> {labels.applyFit}
        </button>
      </div>

      <div className="w-full h-px bg-gray-800" />

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onAlignCenterAll}
          className="py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs font-medium transition-colors flex flex-col items-center justify-center gap-1.5 text-gray-300"
          title={labels.alignCenter}
        >
          <AlignCenter size={14} />
          <span className="text-[10px]">{labels.alignCenter}</span>
        </button>
        <button
          onClick={onMergeDuplicates}
          className="py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs font-medium transition-colors flex flex-col items-center justify-center gap-1.5 text-gray-300"
          title={labels.mergeDuplicates}
        >
          <Merge size={14} />
          <span className="text-[10px]">{labels.mergeDuplicates}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onSortByFilename('asc')}
          className="py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs transition-colors flex items-center justify-center gap-1.5 text-gray-400 hover:text-gray-200"
        >
          <ArrowDownAZ size={14} />
          <span className="text-[10px] uppercase">A-Z</span>
        </button>
        <button
          onClick={() => onSortByFilename('desc')}
          className="py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs transition-colors flex items-center justify-center gap-1.5 text-gray-400 hover:text-gray-200"
        >
          <ArrowUpAZ size={14} />
          <span className="text-[10px] uppercase">Z-A</span>
        </button>
      </div>

      <div className="w-full h-px bg-gray-800" />

      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Scissors size={12} className="text-gray-500" />
          <label className="text-[10px] text-gray-500 uppercase">{reduceLabels.title}</label>
        </div>
        <div className="flex items-center justify-between gap-1 text-xs text-gray-400 bg-gray-800/50 p-1.5 rounded-lg border border-gray-700/50">
          <span className="text-[10px]">{reduceLabels.every}</span>
          <input
            type="number"
            min="1"
            value={reduceKeep}
            onChange={(event) => onReduceKeepChange(Math.max(1, parseInt(event.target.value) || 1))}
            className="w-10 bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-center text-xs"
          />
          <span className="text-[10px]">{reduceLabels.remove}</span>
          <input
            type="number"
            min="1"
            value={reduceRemove}
            onChange={(event) => onReduceRemoveChange(Math.max(1, parseInt(event.target.value) || 1))}
            className="w-10 bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-center text-xs"
          />
        </div>
        <button
          onClick={onReduceFrames}
          className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs font-medium transition-colors flex items-center justify-center gap-2 text-gray-300"
        >
          {reduceLabels.apply}
        </button>
      </div>
    </div>
  </div>
);
