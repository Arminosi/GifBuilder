
import React, { useState, useEffect, memo, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FrameData } from '../types';
import { X, GripVertical, RotateCcw } from 'lucide-react';
import { FrameLabels } from '../utils/translations';
import { TransparentImage } from './TransparentImage';

interface FrameCardProps {
  frame: FrameData;
  index: number;
  onRemove?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<FrameData>) => void;
  onReset?: (id: string) => void;
  labels: FrameLabels;
  confirmResetText?: string;
  compact?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, e: React.MouseEvent) => void;
  onContextMenu?: (id: string, e: React.MouseEvent) => void;
  isDragging?: boolean;
  style?: React.CSSProperties;
  dragListeners?: any;
  dragAttributes?: any;
  setNodeRef?: (node: HTMLElement | null) => void;
  frameWidth?: number;
  isHorizontal?: boolean;
  transparentColor?: string | null;
  isTransparentEnabled?: boolean;
}

// Helper component for buffered input
const BufferedInput = ({ 
  value, 
  onChange, 
  min, 
  label,
  tooltip
}: { 
  value: number; 
  onChange?: (val: number) => void; 
  min?: number;
  label: string;
  tooltip?: string;
}) => {
  const [localValue, setLocalValue] = useState(value.toString());
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commit = () => {
    setIsEditing(false);
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
      commit();
    } else if (e.key === 'Escape') {
      setLocalValue(value.toString());
      setIsEditing(false);
    }
  };

  return (
    <div 
      onClick={(e) => e.stopPropagation()} 
      className="relative flex items-center justify-between gap-2 bg-gray-900 border border-gray-800 rounded px-2 h-6 w-full hover:border-gray-600 transition-colors group/input"
    >
      {isEditing && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-900 text-blue-400 text-[10px] px-1.5 py-0.5 rounded border border-blue-500/30 whitespace-nowrap z-20 shadow-lg animate-in fade-in zoom-in-95 duration-100 pointer-events-none">
          {tooltip || label}
        </div>
      )}
      {!isEditing && <label className="text-gray-500 text-[10px] font-medium truncate select-none group-hover/input:text-gray-400 transition-colors max-w-[45%]" title={label}>{label}</label>}
      {isEditing ? (
        <input
          ref={inputRef}
          type="number"
          min={min}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="min-w-0 w-full bg-transparent text-white focus:outline-none text-xs font-mono text-right p-0 border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      ) : (
        <div 
          onClick={() => onChange && setIsEditing(true)}
          className={`text-xs font-mono truncate text-right flex-1 ${
            onChange 
              ? 'text-gray-300 cursor-text' 
              : 'text-gray-500 cursor-default'
          }`}
        >
          {value}
        </div>
      )}
    </div>
  );
};

// Pure presentation component
export const FrameCard: React.FC<FrameCardProps> = (props) => {
  const {
    frame,
    index,
    onRemove,
    onUpdate,
    onReset,
    labels,
    confirmResetText = "Confirm?",
    compact,
    isSelected,
    onSelect,
    onContextMenu,
    isDragging,
    style,
    dragListeners,
    dragAttributes,
    setNodeRef,
    frameWidth,
    isHorizontal
  } = props;
  const [resetConfirm, setResetConfirm] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-frame-id={frame.id}
      onClick={(e) => {
        // Prevent default browser scrolling/focus behavior when clicking the card background
        // This fixes the issue where clicking a large card causes the panel to jump
        if (!e.defaultPrevented) {
           onSelect?.(frame.id, e);
        }
      }}
      onContextMenu={(e) => onContextMenu?.(frame.id, e)}
      className={`relative group flex flex-col rounded-lg shadow-sm border transition-all cursor-pointer select-none h-full ${
        isSelected 
          ? 'bg-gray-800 border-blue-500 ring-2 ring-blue-500/50' 
          : 'bg-gray-800 border-gray-700 hover:border-gray-600'
      } ${compact ? 'p-2' : 'p-3 gap-2'} ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <div className="flex justify-between items-start mb-1 shrink-0">
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
          {onReset && (!frameWidth || frameWidth >= 160) && (
            <div className="relative">
              {resetConfirm && (
                <div className="absolute top-full right-0 mt-1 bg-gray-900 text-amber-500 text-[10px] px-1.5 py-0.5 rounded border border-amber-500/30 whitespace-nowrap z-20 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                  {confirmResetText}
                </div>
              )}
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (resetConfirm) {
                    onReset(frame.id);
                    setResetConfirm(false);
                  } else {
                    setResetConfirm(true);
                    setTimeout(() => setResetConfirm(false), 2000);
                  }
                }}
                className={`${resetConfirm ? 'text-amber-500 hover:text-amber-600 bg-amber-500/10' : 'text-gray-500 hover:text-blue-400'} p-0.5 rounded transition-colors`}
                title={resetConfirm ? confirmResetText : "Reset to original size"}
              >
                <RotateCcw size={14} />
              </button>
            </div>
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

      <div className={`flex ${isHorizontal ? 'flex-row gap-3 h-full min-h-0' : 'flex-col'}`}>
        <div className={`relative bg-gray-900 rounded border border-gray-700 overflow-hidden flex items-center justify-center ${isHorizontal ? 'flex-1 h-full' : (compact ? 'aspect-square mb-1' : 'aspect-square')}`}>
          <TransparentImage 
            src={frame.previewUrl} 
            alt={`Frame ${index}`} 
            draggable={false}
            className="max-w-full max-h-full object-contain pointer-events-none" 
            transparentColor={props.transparentColor}
            enabled={props.isTransparentEnabled}
          />
          <div className="absolute bottom-0 left-0 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded-tr">
            #{index + 1}
          </div>
        </div>

        {!compact && (
          <div className={isHorizontal ? 'flex-1 flex flex-col justify-center min-w-0' : ''}>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div className="col-span-2">
                 <BufferedInput 
                   label={labels.time} 
                   value={frame.duration} 
                   min={10}
                   onChange={(val) => onUpdate?.(frame.id, { duration: val })} 
                 />
              </div>
              
              <BufferedInput 
                label="X" 
                tooltip={labels.x}
                value={frame.x} 
                onChange={(val) => onUpdate?.(frame.id, { x: val })} 
              />

              <BufferedInput 
                label="Y" 
                tooltip={labels.y}
                value={frame.y} 
                onChange={(val) => onUpdate?.(frame.id, { y: val })} 
              />

              <BufferedInput 
                label="W" 
                tooltip={labels.w}
                value={frame.width} 
                min={1}
                onChange={(val) => onUpdate?.(frame.id, { width: val })} 
              />
              
              <BufferedInput 
                label="H" 
                tooltip={labels.h}
                value={frame.height} 
                min={1}
                onChange={(val) => onUpdate?.(frame.id, { height: val })} 
              />
            </div>
            
            <div className="text-[10px] text-gray-500 truncate mt-2 px-1 shrink-0" title={frame.file.name}>
              {frame.file.name}
            </div>
          </div>
        )}
      </div>
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
  confirmResetText?: string;
  compact?: boolean;
  isSelected?: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onContextMenu?: (id: string, e: React.MouseEvent) => void;
  isMultiDragging?: boolean;
  isGathering?: boolean;
  frameWidth?: number;
  isHorizontal?: boolean;
  transparentColor?: string | null;
  isTransparentEnabled?: boolean;
}

const FrameItemComponent: React.FC<FrameItemProps> = (props) => {
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

export const FrameItem = memo(FrameItemComponent, (prev, next) => {
  // 1. Compare simple props
  if (prev.index !== next.index ||
      prev.isSelected !== next.isSelected ||
      prev.isMultiDragging !== next.isMultiDragging ||
      prev.isGathering !== next.isGathering ||
      prev.compact !== next.compact ||
      prev.labels !== next.labels || 
      prev.confirmResetText !== next.confirmResetText ||
      prev.frameWidth !== next.frameWidth ||
      prev.isHorizontal !== next.isHorizontal ||
      prev.onRemove !== next.onRemove ||
      prev.onUpdate !== next.onUpdate ||
      prev.onReset !== next.onReset ||
      prev.onSelect !== next.onSelect ||
      prev.onContextMenu !== next.onContextMenu ||
      prev.transparentColor !== next.transparentColor ||
      prev.isTransparentEnabled !== next.isTransparentEnabled) {
    return false;
  }

  // 2. Compare frame data
  const f1 = prev.frame;
  const f2 = next.frame;

  if (f1 === f2) return true;

  // If frame reference changed, check if relevant fields changed
  // We ignore x, y, width, height, rotation as they don't affect the thumbnail
  // UNLESS we are in non-compact mode where we show inputs!
  
  // Wait! If !compact, we show inputs for x, y, w, h.
  // If we ignore them, the inputs won't update!
  
  if (!next.compact) {
     // In detailed mode, we MUST update if x,y,w,h changed.
     // So we can only optimize for compact mode OR if x,y,w,h didn't change.
     if (f1.x !== f2.x || f1.y !== f2.y || f1.width !== f2.width || f1.height !== f2.height) {
         return false;
     }
  }

  return (
    f1.id === f2.id &&
    f1.previewUrl === f2.previewUrl &&
    f1.colorTag === f2.colorTag &&
    f1.duration === f2.duration &&
    f1.file === f2.file
  );
});
