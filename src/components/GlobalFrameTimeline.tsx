import React, { useMemo, useRef, useState } from 'react';
import { FrameData } from '../types';

interface GlobalFrameTimelineProps {
  frames: FrameData[];
  timelineFrames?: FrameData[];
  currentFrameIndex?: number;
  currentTimeMs?: number;
  continuous?: boolean;
  leftGutterWidth?: number;
  totalDurationMs?: number;
  embedded?: boolean;
  selectedFrameIds: Set<string>;
  onSelectFrame: (index: number) => void;
  onSelectTime?: (timeMs: number) => void;
  exportInFrameIndex?: number | null;
  exportOutFrameIndex?: number | null;
  isLargeScreen: boolean;
  label?: string;
}

export const GlobalFrameTimeline: React.FC<GlobalFrameTimelineProps> = ({
  frames,
  timelineFrames,
  currentFrameIndex,
  currentTimeMs,
  continuous,
  leftGutterWidth = 0,
  totalDurationMs,
  embedded = false,
  selectedFrameIds,
  onSelectFrame,
  onSelectTime,
  exportInFrameIndex,
  exportOutFrameIndex,
  isLargeScreen,
  label = 'Timeline'
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const displayFrames = timelineFrames && timelineFrames.length > 0 ? timelineFrames : frames;
  const frameCount = Math.max(1, displayFrames.length);

  const timeline = useMemo(() => {
    const durations = displayFrames.length > 0 ? displayFrames.map(frame => Math.max(1, frame.duration || 1)) : [1];
    const timelineDuration = durations.reduce((sum, duration) => sum + duration, 0);
    const totalDuration = Math.max(1, timelineDuration, totalDurationMs ?? 0);
    const starts: number[] = [];
    let cursor = 0;

    durations.forEach(duration => {
      starts.push(cursor);
      cursor += duration;
    });

    return { durations, starts, totalDuration };
  }, [displayFrames, totalDurationMs]);

  const selectedFrameIndex = frames.findIndex(frame => selectedFrameIds.has(frame.id));
  const selectedIndex = selectedFrameIndex >= 0
    ? selectedFrameIndex
    : Math.min(frameCount - 1, Math.max(0, currentFrameIndex ?? 0));
  const selectedStart = typeof currentTimeMs === 'number' ? currentTimeMs : (selectedIndex >= 0 ? timeline.starts[selectedIndex] : 0);
  const selectedDuration = typeof currentTimeMs === 'number' ? 0 : (selectedIndex >= 0 ? timeline.durations[selectedIndex] : 0);
  const selectedPercent = timeline.totalDuration > 0
    ? ((selectedStart + selectedDuration / 2) / timeline.totalDuration) * 100
    : 0;
  const exportInIndex = typeof exportInFrameIndex === 'number' && exportInFrameIndex >= 0 && exportInFrameIndex < frameCount
    ? exportInFrameIndex
    : null;
  const exportOutIndex = typeof exportOutFrameIndex === 'number' && exportOutFrameIndex >= 0 && exportOutFrameIndex < frameCount
    ? exportOutFrameIndex
    : null;
  const hasExportIn = exportInIndex !== null;
  const hasExportOut = exportOutIndex !== null;
  const hasExportRange = hasExportIn || hasExportOut;
  const isInvalidExportRange = exportInIndex !== null && exportOutIndex !== null && exportInIndex > exportOutIndex;
  const exportStartIndex = exportInIndex ?? 0;
  const exportEndIndex = exportOutIndex ?? frameCount - 1;
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
    if (!track || timeline.totalDuration <= 0) return null;

    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const targetTime = ratio * timeline.totalDuration;
    const index = timeline.starts.findIndex((start, i) => {
      const end = start + timeline.durations[i];
      return targetTime >= start && targetTime < end;
    });

    return index === -1 ? frameCount - 1 : index;
  };

  const getTimeFromPointer = (clientX: number) => {
    const track = trackRef.current;
    if (!track || timeline.totalDuration <= 0) return null;

    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.min(Math.max(0, timeline.totalDuration - 1), Math.floor(ratio * timeline.totalDuration));
  };

  const pickFrameFromPointer = (clientX: number) => {
    const safeIndex = getFrameIndexFromPointer(clientX);
    if (safeIndex === null) return null;

    setHoverIndex(safeIndex);
    const targetTime = getTimeFromPointer(clientX);
    if (targetTime !== null) {
      onSelectTime?.(targetTime);
    }
    if (!onSelectTime) {
      onSelectFrame(safeIndex);
    }
    return safeIndex;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const targetIndex = getFrameIndexFromPointer(event.clientX);

    activePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();

    if (targetIndex !== null) {
      setHoverIndex(targetIndex);
      const targetTime = getTimeFromPointer(event.clientX);
      if (targetTime !== null) {
        onSelectTime?.(targetTime);
      }
      if (!onSelectTime) {
        onSelectFrame(targetIndex);
      }
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    event.preventDefault();
    pickFrameFromPointer(event.clientX);
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    activePointerIdRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const hasLeftGutter = leftGutterWidth > 0;
  const timelineTrack = (
    <div
      ref={trackRef}
      role="slider"
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={frameCount}
      aria-valuenow={selectedIndex >= 0 ? selectedIndex + 1 : 1}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onPointerLeave={() => setHoverIndex(null)}
      className={`relative h-7 cursor-pointer select-none touch-none bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${hasLeftGutter ? '' : 'rounded border border-gray-800 px-1 py-1'}`}
    >
      {hasExportRange && (
        <div
          className={`pointer-events-none absolute ${hasLeftGutter ? 'top-0 bottom-0' : 'top-1 bottom-1'} z-10 rounded-sm ${isInvalidExportRange ? 'bg-red-500/25 ring-1 ring-red-400/60' : 'bg-emerald-500/20 ring-1 ring-emerald-400/50'}`}
          style={{
            left: `${exportRangeLeft}%`,
            width: `${exportRangeRight - exportRangeLeft}%`,
          }}
        />
      )}
      <div className={`flex h-full overflow-hidden bg-gray-800 ${hasLeftGutter ? '' : 'rounded'}`}>
        {continuous ? (
          <div className="h-full w-full bg-gray-700" title="Timeline" />
        ) : displayFrames.length > 0 ? displayFrames.map((frame, index) => {
          const width = `${(timeline.durations[index] / timeline.totalDuration) * 100}%`;
          const isSelected = index === selectedIndex;
          const isHovered = index === hoverIndex;

          return (
            <div
              key={frame.id}
              className={`relative h-full border-r border-gray-950/40 last:border-r-0 ${isSelected ? 'bg-blue-500' : isHovered ? 'bg-gray-500' : 'bg-gray-700'
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
        }) : (
          <div className="h-full w-full bg-gray-700" title="Empty timeline" />
        )}
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
  );

  return (
    <div className={embedded ? 'relative shrink-0 bg-gray-950/95' : 'relative shrink-0 border-t border-gray-800 bg-gray-950/95 px-4 py-2'}>
      <div
        className={hasLeftGutter ? `grid border border-gray-800 bg-gray-950 ${embedded ? 'rounded-b' : 'rounded'}` : ''}
        style={hasLeftGutter ? { gridTemplateColumns: `${leftGutterWidth}px minmax(0, 1fr)` } : undefined}
      >
        {hasLeftGutter && (
          <div className="flex h-7 min-w-0 items-center border-r border-gray-800 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            {label}
          </div>
        )}
        <div className="relative min-w-0">
          {timelineTrack}
        </div>
      </div>
    </div>
  );
};
