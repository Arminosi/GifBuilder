import React, { useMemo, useRef, useState } from 'react';
import { FrameData } from '../types';

interface GlobalFrameTimelineProps {
  frames: FrameData[];
  selectedFrameIds: Set<string>;
  onSelectFrame: (index: number) => void;
  label?: string;
}

export const GlobalFrameTimeline: React.FC<GlobalFrameTimelineProps> = ({
  frames,
  selectedFrameIds,
  onSelectFrame,
  label = 'Timeline'
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

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

  const pickFrameFromPointer = (clientX: number) => {
    const track = trackRef.current;
    if (!track || frames.length === 0 || timeline.totalDuration <= 0) return;

    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const targetTime = ratio * timeline.totalDuration;
    const index = timeline.starts.findIndex((start, i) => {
      const end = start + timeline.durations[i];
      return targetTime >= start && targetTime < end;
    });

    const safeIndex = index === -1 ? frames.length - 1 : index;
    setHoverIndex(safeIndex);
    onSelectFrame(safeIndex);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pickFrameFromPointer(event.clientX);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 1) {
      return;
    }

    pickFrameFromPointer(event.clientX);
  };

  if (frames.length === 0) return null;

  return (
    <div className="shrink-0 border-t border-gray-800 bg-gray-950/95 px-4 py-2">
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
        onPointerLeave={() => setHoverIndex(null)}
        className="relative h-7 cursor-pointer select-none rounded border border-gray-800 bg-gray-900 px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
      >
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
            className="pointer-events-none absolute top-0 h-full w-px bg-white shadow-[0_0_0_1px_rgba(59,130,246,0.7)]"
            style={{ left: `calc(${selectedPercent}% - 0.5px)` }}
          />
        )}
      </div>
    </div>
  );
};
