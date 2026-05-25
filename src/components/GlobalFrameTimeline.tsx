import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FrameData } from '../types';

const CONTROL_PANEL_DOCK_THRESHOLD = 18;

interface GlobalFrameTimelineProps {
  frames: FrameData[];
  selectedFrameIds: Set<string>;
  onSelectFrame: (index: number) => void;
  exportInFrameIndex?: number | null;
  exportOutFrameIndex?: number | null;
  isLargeScreen: boolean;
  labels: {
    inPoint: string;
    outPoint: string;
    clearRange: string;
    selectedFrames: string;
    batchMode: string;
  };
  onSetExportInPoint: () => void;
  onSetExportOutPoint: () => void;
  onClearExportRange: () => void;
  label?: string;
}

export const GlobalFrameTimeline: React.FC<GlobalFrameTimelineProps> = ({
  frames,
  selectedFrameIds,
  onSelectFrame,
  exportInFrameIndex,
  exportOutFrameIndex,
  isLargeScreen,
  labels,
  onSetExportInPoint,
  onSetExportOutPoint,
  onClearExportRange,
  label = 'Timeline'
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const controlPanelHideTimerRef = useRef<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);

  const clearControlPanelHideTimer = () => {
    if (controlPanelHideTimerRef.current !== null) {
      window.clearTimeout(controlPanelHideTimerRef.current);
      controlPanelHideTimerRef.current = null;
    }
  };

  const showControlPanel = () => {
    clearControlPanelHideTimer();
    setIsControlPanelOpen(true);
  };

  const scheduleControlPanelHide = () => {
    clearControlPanelHideTimer();
    controlPanelHideTimerRef.current = window.setTimeout(() => {
      setIsControlPanelOpen(false);
      controlPanelHideTimerRef.current = null;
    }, 2000);
  };

  useEffect(() => {
    return () => clearControlPanelHideTimer();
  }, []);

  const timeline = useMemo(() => {
    const durations = frames.map(frame => Math.max(1, frame.duration || 1));
    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
    const starts: number[] = [];
    let cursor = 0;

    durations.forEach(duration => {
      starts.push(cursor);
      cursor += duration;
    });

    return { durations, starts, totalDuration };
  }, [frames]);

  const selectedIndex = frames.findIndex(frame => selectedFrameIds.has(frame.id));
  const selectedStart = selectedIndex >= 0 ? timeline.starts[selectedIndex] : 0;
  const selectedDuration = selectedIndex >= 0 ? timeline.durations[selectedIndex] : 0;
  const selectedPercent = timeline.totalDuration > 0
    ? ((selectedStart + selectedDuration / 2) / timeline.totalDuration) * 100
    : 0;
  const exportInIndex = typeof exportInFrameIndex === 'number' && exportInFrameIndex >= 0 && exportInFrameIndex < frames.length
    ? exportInFrameIndex
    : null;
  const exportOutIndex = typeof exportOutFrameIndex === 'number' && exportOutFrameIndex >= 0 && exportOutFrameIndex < frames.length
    ? exportOutFrameIndex
    : null;
  const hasExportIn = exportInIndex !== null;
  const hasExportOut = exportOutIndex !== null;
  const hasExportRange = hasExportIn || hasExportOut;
  const isInvalidExportRange = exportInIndex !== null && exportOutIndex !== null && exportInIndex > exportOutIndex;
  const exportStartIndex = exportInIndex ?? 0;
  const exportEndIndex = exportOutIndex ?? frames.length - 1;
  const visualStartIndex = Math.min(exportStartIndex, exportEndIndex);
  const visualEndIndex = Math.max(exportStartIndex, exportEndIndex);
  const getFrameStartPercent = (index: number) => timeline.totalDuration > 0
    ? (timeline.starts[index] / timeline.totalDuration) * 100
    : 0;
  const getFrameEndPercent = (index: number) => timeline.totalDuration > 0
    ? ((timeline.starts[index] + timeline.durations[index]) / timeline.totalDuration) * 100
    : 0;
  const exportRangeLeft = hasExportRange ? getFrameStartPercent(visualStartIndex) : 0;
  const exportRangeRight = hasExportRange ? getFrameEndPercent(visualEndIndex) : 0;
  const exportInPercent = exportInIndex !== null ? getFrameStartPercent(exportInIndex) : null;
  const exportOutPercent = exportOutIndex !== null ? getFrameEndPercent(exportOutIndex) : null;

  const getFrameIndexFromPointer = (clientX: number) => {
    const track = trackRef.current;
    if (!track || frames.length === 0 || timeline.totalDuration <= 0) return null;

    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const targetTime = ratio * timeline.totalDuration;
    const index = timeline.starts.findIndex((start, i) => {
      const end = start + timeline.durations[i];
      return targetTime >= start && targetTime < end;
    });

    return index === -1 ? frames.length - 1 : index;
  };

  const pickFrameFromPointer = (clientX: number) => {
    const safeIndex = getFrameIndexFromPointer(clientX);
    if (safeIndex === null) return null;

    setHoverIndex(safeIndex);
    onSelectFrame(safeIndex);
    return safeIndex;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const targetIndex = getFrameIndexFromPointer(event.clientX);
    if (targetIndex !== null) {
      showControlPanel();
    }

    activePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();

    if (targetIndex !== null) {
      setHoverIndex(targetIndex);
      onSelectFrame(targetIndex);
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const targetIndex = pickFrameFromPointer(event.clientX);
    if (targetIndex !== null) {
      showControlPanel();
    }
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    activePointerIdRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    scheduleControlPanelHide();
  };

  if (frames.length === 0) return null;

  const hasSelectedFrame = selectedIndex >= 0;
  const showControls = isControlPanelOpen && hasSelectedFrame;
  const selectedCount = selectedFrameIds.size;
  const panelLeft = selectedPercent <= CONTROL_PANEL_DOCK_THRESHOLD
    ? '0%'
    : selectedPercent >= 100 - CONTROL_PANEL_DOCK_THRESHOLD
      ? '100%'
      : `${selectedPercent}%`;
  const panelTransform = selectedPercent <= CONTROL_PANEL_DOCK_THRESHOLD
    ? 'translateX(0)'
    : selectedPercent >= 100 - CONTROL_PANEL_DOCK_THRESHOLD
      ? 'translateX(-100%)'
      : 'translateX(-50%)';
  const controlButtonClass = 'shrink-0 whitespace-nowrap rounded border border-gray-700 bg-gray-800 px-2.5 py-1 text-[11px] font-semibold text-gray-300 transition-colors hover:border-blue-500 hover:bg-gray-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-700 disabled:hover:bg-gray-800 disabled:hover:text-gray-300';
  const controls = (
    <div
      className="pointer-events-auto absolute top-0 z-50 flex w-max items-center gap-1 overflow-visible rounded-lg border border-gray-700 bg-gray-900/95 p-1 shadow-xl shadow-black/30 backdrop-blur"
      style={{ left: panelLeft, transform: panelTransform }}
    >
      <button
        type="button"
        className={controlButtonClass}
        disabled={!hasSelectedFrame}
        onClick={onSetExportInPoint}
      >
        {labels.inPoint}
        <kbd className="ml-1 rounded border border-current/30 px-1 text-[9px] opacity-70">I</kbd>
      </button>
      <button
        type="button"
        className={controlButtonClass}
        disabled={!hasSelectedFrame}
        onClick={onSetExportOutPoint}
      >
        {labels.outPoint}
        <kbd className="ml-1 rounded border border-current/30 px-1 text-[9px] opacity-70">O</kbd>
      </button>
      <button
        type="button"
        className={controlButtonClass}
        disabled={!hasExportRange}
        onClick={onClearExportRange}
      >
        {labels.clearRange}
      </button>
    </div>
  );

  return (
    <div className="relative shrink-0 border-t border-gray-800 bg-gray-950/95 px-4 py-2">
      <div
        ref={trackRef}
        role="slider"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={frames.length}
        aria-valuenow={selectedIndex >= 0 ? selectedIndex + 1 : 1}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onPointerLeave={() => setHoverIndex(null)}
        className="relative h-7 cursor-pointer select-none touch-none rounded border border-gray-800 bg-gray-900 px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
      >
        {hasExportRange && (
          <div
            className={`pointer-events-none absolute top-1 bottom-1 z-10 rounded-sm ${isInvalidExportRange ? 'bg-red-500/25 ring-1 ring-red-400/60' : 'bg-emerald-500/20 ring-1 ring-emerald-400/50'}`}
            style={{
              left: `${exportRangeLeft}%`,
              width: `${exportRangeRight - exportRangeLeft}%`,
            }}
          />
        )}
        <div className="flex h-full overflow-hidden rounded bg-gray-800">
          {frames.map((frame, index) => {
            const width = `${(timeline.durations[index] / timeline.totalDuration) * 100}%`;
            const isSelected = index === selectedIndex;
            const isHovered = index === hoverIndex;

            return (
              <div
                key={frame.id}
                className={`relative h-full border-r border-gray-950/40 transition-colors last:border-r-0 ${isSelected ? 'bg-blue-500' : isHovered ? 'bg-gray-500' : 'bg-gray-700'
                  }`}
                style={{ width }}
                title={`Frame ${index + 1} - ${frame.duration}ms`}
              >
                {frame.colorTag && (
                  <div
                    className="absolute inset-x-0 bottom-0 h-1.5"
                    style={{ backgroundColor: frame.colorTag }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {selectedIndex >= 0 && (
          <div
            className="pointer-events-none absolute top-0 z-30 h-full w-px bg-white shadow-[0_0_0_1px_rgba(59,130,246,0.7)]"
            style={{ left: `calc(${selectedPercent}% - 0.5px)` }}
          />
        )}
        {exportInPercent !== null && (
          <div
            className={`pointer-events-none absolute top-0 z-20 h-full w-0.5 ${isInvalidExportRange ? 'bg-red-300' : 'bg-emerald-300'}`}
            style={{ left: `calc(${exportInPercent}% - 1px)` }}
            title={`In ${(exportInIndex ?? 0) + 1}`}
          >
            <span className={`absolute -top-1 left-1/2 -translate-x-1/2 rounded px-1 text-[9px] font-bold leading-3 text-gray-950 ${isInvalidExportRange ? 'bg-red-300' : 'bg-emerald-300'}`}>I</span>
          </div>
        )}
        {exportOutPercent !== null && (
          <div
            className={`pointer-events-none absolute top-0 z-20 h-full w-0.5 ${isInvalidExportRange ? 'bg-red-300' : 'bg-emerald-300'}`}
            style={{ left: `calc(${exportOutPercent}% - 1px)` }}
            title={`Out ${(exportOutIndex ?? 0) + 1}`}
          >
            <span className={`absolute -top-1 left-1/2 -translate-x-1/2 rounded px-1 text-[9px] font-bold leading-3 text-gray-950 ${isInvalidExportRange ? 'bg-red-300' : 'bg-emerald-300'}`}>O</span>
          </div>
        )}
      </div>

      {selectedCount > 1 && hasSelectedFrame && (
        <div className="relative mt-1 h-6">
          <div
            className="pointer-events-none absolute top-0 z-30 max-w-[calc(100vw-2rem)] whitespace-nowrap rounded-full border border-blue-700 bg-blue-900/90 px-3 py-1 text-xs text-blue-200 shadow-lg shadow-black/30 backdrop-blur-sm"
            style={{ left: panelLeft, transform: panelTransform }}
          >
            {labels.selectedFrames.replace('{count}', selectedCount.toString())} ({labels.batchMode})
          </div>
        </div>
      )}
      {showControls && (
        <div className="pointer-events-none absolute left-4 right-4 top-[calc(100%-0.25rem)] z-50">
          {controls}
        </div>
      )}
    </div>
  );
};
