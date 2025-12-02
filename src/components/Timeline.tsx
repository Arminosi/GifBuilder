import React, { useRef, useEffect } from 'react';
import { FrameData } from '../types';

interface TimelineProps {
  frames: FrameData[];
  selectedFrameIds: Set<string>;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onReorder?: (newFrames: FrameData[]) => void;
}

const TimelineItem = ({ 
  frame, 
  index, 
  isSelected, 
  onSelect,
}: { 
  frame: FrameData; 
  index: number; 
  isSelected: boolean; 
  onSelect: (id: string, e: React.MouseEvent) => void;
}) => {
  return (
    <div 
      onClick={(e) => onSelect(frame.id, e)}
      className={`
        relative h-10 w-10 rounded cursor-pointer overflow-hidden border-2 transition-all shrink-0 bg-gray-800 select-none
        ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-transparent hover:opacity-80 hover:border-gray-600'}
      `}
      title={`Frame ${index + 1}`}
    >
      <img src={frame.previewUrl} className="w-full h-full object-contain pointer-events-none" draggable={false} alt={`Frame ${index}`} />
      
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

export const Timeline: React.FC<TimelineProps> = ({ frames, selectedFrameIds, onSelect }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
          />
        ))}
      </div>
    </div>
  );
};
