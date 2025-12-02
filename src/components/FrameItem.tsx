
import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FrameData } from '../types';
import { X, GripVertical, RotateCcw } from 'lucide-react';
import { FrameLabels } from '../utils/translations';

interface FrameCardProps {
  frame: FrameData;
  index: number;
  onRemove?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<FrameData>) => void;
  onReset?: (id: string) => void;
  labels: FrameLabels;
  compact?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, e: React.MouseEvent) => void;
  onContextMenu?: (id: string, e: React.MouseEvent) => void;
  isDragging?: boolean;
  style?: React.CSSProperties;
  dragListeners?: any;
  dragAttributes?: any;
  setNodeRef?: (node: HTMLElement | null) => void;
}

// Helper component for buffered input
const BufferedInput = ({ 
  value, 
  onChange, 
  min, 
  label 
}: { 
  value: number; 
  onChange?: (val: number) => void; 
  min?: number;
  label: string;
}) => {
  const [localValue, setLocalValue] = useState(value.toString());

  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  const commit = () => {
    if (!onChange) return;
    const num = parseInt(localValue);
    if (!isNaN(num) && num !== value) {
      onChange(num);
    } else if (isNaN(num)) {
      setLocalValue(value.toString()); // Reset on invalid
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <label className="block text-gray-400 text-[10px] mb-0.5">{label}</label>
      <input
        type="number"
        min={min}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        readOnly={!onChange}
        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white focus:border-blue-500 focus:outline-none text-xs"
      />
    </div>
  );
};

// Pure presentation component
export const FrameCard: React.FC<FrameCardProps> = ({
  frame,
  index,
  onRemove,
  onUpdate,
  onReset,
  labels,
  compact,
  isSelected,
  onSelect,
  onContextMenu,
  isDragging,
  style,
  dragListeners,
  dragAttributes,
  setNodeRef
}) => {
  return (
    <div
      ref={setNodeRef}
      style={style}
      data-frame-id={frame.id}
      onClick={(e) => onSelect?.(frame.id, e)}
      onContextMenu={(e) => onContextMenu?.(frame.id, e)}
      className={`relative group flex flex-col rounded-lg shadow-sm border transition-all cursor-pointer select-none ${
        isSelected 
          ? 'bg-gray-800 border-blue-500 ring-2 ring-blue-500/50' 
          : 'bg-gray-800 border-gray-700 hover:border-gray-600'
      } ${compact ? 'p-2' : 'p-3 gap-2'} ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <div className="flex justify-between items-start mb-1">
        <div 
          {...dragAttributes} 
          {...dragListeners} 
          className="cursor-grab hover:text-blue-400 text-gray-500 p-0.5 touch-none"
          onClick={(e) => e.stopPropagation()} // Prevent select when grabbing
        >
          <GripVertical size={16} />
        </div>
        
        {frame.colorTag && (
          <div 
            className="w-3 h-3 rounded-full border border-gray-600 shadow-sm self-center ml-2" 
            style={{ backgroundColor: frame.colorTag }}
          />
        )}

        <div className="flex gap-1 ml-auto">
          {onReset && (
            <button
              onClick={(e) => { e.stopPropagation(); onReset(frame.id); }}
              className="text-gray-500 hover:text-blue-400 p-0.5 rounded transition-colors"
              title="Reset to original size"
            >
              <RotateCcw size={14} />
            </button>
          )}
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(frame.id); }}
              className="text-gray-500 hover:text-red-400 p-0.5 rounded transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className={`relative bg-gray-900 rounded border border-gray-700 overflow-hidden flex items-center justify-center ${compact ? 'aspect-square mb-1' : 'aspect-square'}`}>
        <img 
          src={frame.previewUrl} 
          alt={`Frame ${index}`} 
          draggable={false}
          className="max-w-full max-h-full object-contain pointer-events-none" 
        />
        <div className="absolute bottom-0 left-0 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded-tr">
          #{index + 1}
        </div>
      </div>

      {!compact && (
        <>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="col-span-2">
               <BufferedInput 
                 label={labels.time} 
                 value={frame.duration} 
                 min={10}
                 onChange={(val) => onUpdate?.(frame.id, { duration: val })} 
               />
            </div>
            
            <BufferedInput 
              label={labels.x} 
              value={frame.x} 
              onChange={(val) => onUpdate?.(frame.id, { x: val })} 
            />

            <BufferedInput 
              label={labels.y} 
              value={frame.y} 
              onChange={(val) => onUpdate?.(frame.id, { y: val })} 
            />

            <BufferedInput 
              label={labels.w} 
              value={frame.width} 
              min={1}
              onChange={(val) => onUpdate?.(frame.id, { width: val })} 
            />
            
            <BufferedInput 
              label={labels.h} 
              value={frame.height} 
              min={1}
              onChange={(val) => onUpdate?.(frame.id, { height: val })} 
            />
          </div>
          
          <div className="text-[10px] text-gray-500 truncate mt-1" title={frame.file.name}>
            {frame.file.name}
          </div>
        </>
      )}
    </div>
  );
};

interface FrameItemProps {
  frame: FrameData;
  index: number;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<FrameData>) => void;
  onReset?: (id: string) => void;
  labels: FrameLabels;
  compact?: boolean;
  isSelected?: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onContextMenu?: (id: string, e: React.MouseEvent) => void;
  isMultiDragging?: boolean;
  isGathering?: boolean;
}

export const FrameItem: React.FC<FrameItemProps> = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: props.frame.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: props.isGathering ? 'all 0.3s ease-in' : transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0 : (props.isMultiDragging && props.isGathering ? 0 : 1),
    scale: props.isMultiDragging && props.isGathering ? 0.5 : 1,
  };

  return (
    <FrameCard 
      {...props}
      setNodeRef={setNodeRef}
      style={style}
      dragAttributes={attributes}
      dragListeners={listeners}
      isDragging={isDragging}
    />
  );
};
