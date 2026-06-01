import React, { useRef, useEffect } from 'react';
import { FrameData } from '../types';
import { TransparentImage } from './TransparentImage';

interface TimelineProps {
  frames: FrameData[];
  selectedFrameIds: Set<string>;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onSelectIndex?: (index: number) => void;
  onReorder?: (newFrames: FrameData[]) => void;
  transparentColor?: string;
  isTransparentEnabled?: boolean;
}

const TimelineItem = ({ 
  frame, 
  index, 
  isSelected, 
  onSelect,
  transparentColor,
  isTransparentEnabled
}: { 
  frame: FrameData; 
  index: number; 
  isSelected: boolean; 
  onSelect: (id: string, e: React.MouseEvent) => void;
  transparentColor?: string;
  isTransparentEnabled?: boolean;
}) => {
  return (
    <div 
      data-timeline-index={index}
      onClick={(e) => onSelect(frame.id, e)}
      className={`
        relative h-10 w-10 rounded cursor-pointer overflow-hidden border-2 transition-all shrink-0 bg-gray-800 select-none
        ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-transparent hover:opacity-80 hover:border-gray-600'}
      `}
      title={`Frame ${index + 1}`}
    >
      <div className="w-full h-full pointer-events-none">
        {frame.isBlank ? (
          <div
            className="flex h-full w-full items-center justify-center bg-amber-500/15"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(245,158,11,0.18) 0 4px, rgba(245,158,11,0.05) 4px 8px)',
            }}
          >
            <span className="max-w-full truncate px-1 text-[8px] font-semibold uppercase tracking-wide text-amber-100">
              Blank
            </span>
          </div>
        ) : (
          <TransparentImage
            src={frame.previewUrl}
            alt={`Frame ${index}`}
            className="w-full h-full object-contain"
            transparentColor={transparentColor}
            enabled={isTransparentEnabled}
          />
        )}
      </div>
      
      {frame.colorTag && (
        <div 
          className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full border border-black/20 shadow-sm z-10" 
          style={{ backgroundColor: frame.colorTag }}
        />
      )}

      <div className="absolute bottom-0 right-0 bg-black/60 text-[8px] text-white px-0.5 leading-none rounded-tl">
        {index + 1}
      </div>
    </div>
  );
};

export const Timeline: React.FC<TimelineProps> = ({ 
  frames, 
  selectedFrameIds, 
  onSelect,
  onSelectIndex,
  transparentColor,
  isTransparentEnabled
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const lastScrubIndexRef = useRef<number | null>(null);

  const selectFrameFromPoint = (clientX: number, clientY: number) => {
    if (!onSelectIndex) return;

    const target = document.elementFromPoint(clientX, clientY);
    const item = target?.closest('[data-timeline-index]') as HTMLElement | null;
    if (!item) return;

    const index = Number(item.dataset.timelineIndex);
    if (!Number.isInteger(index) || index < 0 || index >= frames.length) return;
    if (lastScrubIndexRef.current === index) return;

    lastScrubIndexRef.current = index;
    onSelectIndex(index);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!onSelectIndex || event.button !== 0) return;

    activePointerIdRef.current = event.pointerId;
    lastScrubIndexRef.current = null;
    event.currentTarget.setPointerCapture(event.pointerId);
    selectFrameFromPoint(event.clientX, event.clientY);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) return;

    selectFrameFromPoint(event.clientX, event.clientY);
    event.preventDefault();
  };

  const stopScrubbing = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) return;

    activePointerIdRef.current = null;
    lastScrubIndexRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  // Auto scroll to last selected
  useEffect(() => {
    if (scrollContainerRef.current && selectedFrameIds.size > 0) {
      const lastSelectedId = Array.from(selectedFrameIds).pop();
      if (!lastSelectedId) return;
      
      const index = frames.findIndex(f => f.id === lastSelectedId);
      if (index >= 0) {
        const container = scrollContainerRef.current;
        const flexContainer = container.children[0];
        const element = flexContainer?.children[index] as HTMLElement;
        
        if (element) {
           element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }
  }, [selectedFrameIds, frames]);

  return (
    <div 
      ref={scrollContainerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopScrubbing}
      onPointerCancel={stopScrubbing}
      className="h-14 bg-gray-900/95 border-t border-gray-800 shrink-0 flex items-center px-2 overflow-x-auto custom-scrollbar z-30 backdrop-blur-sm"
    >
      <div className="flex gap-1.5">
        {frames.map((frame, index) => (
          <TimelineItem
            key={frame.id}
            frame={frame}
            index={index}
            isSelected={selectedFrameIds.has(frame.id)}
            onSelect={onSelect}
            transparentColor={transparentColor}
            isTransparentEnabled={isTransparentEnabled}
          />
        ))}
      </div>
    </div>
  );
};
