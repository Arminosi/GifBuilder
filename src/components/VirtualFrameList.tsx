import React, { memo, forwardRef, useImperativeHandle, useRef } from 'react';
import { FixedSizeList as List, areEqual } from 'react-window';
import type { ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FrameData } from '../types';
import { FrameItem } from './FrameItem';
import { FrameLabels } from '../utils/translations';

export interface VirtualFrameListHandle {
  scrollToItem: (index: number) => void;
}

interface VirtualFrameListProps {
  frames: FrameData[];
  frameSize: number;
  compactMode: boolean;
  selectedFrameIds: Set<string>;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<FrameData>) => void;
  onReset?: (id: string) => void;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onContextMenu: (id: string, e: React.MouseEvent) => void;
  labels: FrameLabels;
  activeDragId?: string | null;
  isGathering?: boolean;
  isLayoutAnimating?: boolean;
}

const GAP = 16; // gap-4 (1rem)
const PADDING = 24; // p-6 (1.5rem)

const Row = memo(({ index, style, data }: ListChildComponentProps) => {
  const { 
    frames, 
    columnCount, 
    frameWidth, 
    itemHeight,
    compactMode,
    selectedFrameIds,
    onRemove,
    onUpdate,
    onReset,
    onSelect,
    onContextMenu,
    labels,
    activeDragId,
    isGathering,
    isLayoutAnimating
  } = data;

  const startIndex = index * columnCount;
  // Get frames for this row
  const rowFrames = frames.slice(startIndex, startIndex + columnCount);

  return (
    <div 
      style={{
        ...style,
        paddingLeft: PADDING,
        paddingRight: PADDING,
        boxSizing: 'border-box',
        transition: isLayoutAnimating ? 'top 0.3s cubic-bezier(0.25, 1, 0.5, 1), left 0.3s cubic-bezier(0.25, 1, 0.5, 1)' : 'none'
      }} 
      className="flex gap-4"
    >
      {rowFrames.map((frame: FrameData, i: number) => (
        <div 
          key={frame.id} 
          style={{ 
            width: frameWidth, 
            height: itemHeight - GAP, // Subtract gap from height to maintain spacing
          }}
        >
          <FrameItem
            frame={frame}
            index={startIndex + i}
            onRemove={onRemove}
            onUpdate={onUpdate}
            onReset={onReset}
            labels={labels}
            compact={compactMode}
            isSelected={selectedFrameIds.has(frame.id)}
            onSelect={onSelect}
            onContextMenu={onContextMenu}
            isMultiDragging={activeDragId && selectedFrameIds.has(frame.id) && selectedFrameIds.size > 1}
            isGathering={isGathering}
          />
        </div>
      ))}
    </div>
  );
}, areEqual);

export const VirtualFrameList = forwardRef<VirtualFrameListHandle, VirtualFrameListProps>(({
  frames,
  frameSize,
  compactMode,
  selectedFrameIds,
  onRemove,
  onUpdate,
  onReset,
  onSelect,
  onContextMenu,
  labels,
  activeDragId,
  isGathering,
  isLayoutAnimating
}, ref) => {
  const listRef = useRef<List>(null);
  const columnCountRef = useRef<number>(1);

  useImperativeHandle(ref, () => ({
    scrollToItem: (index: number) => {
      if (listRef.current) {
        const rowIndex = Math.floor(index / columnCountRef.current);
        listRef.current.scrollToItem(rowIndex, 'smart');
      }
    }
  }));
  
  // Estimate item height based on frameSize and mode
  // Image is square (width = frameWidth >= frameSize)
  // We use frameSize as base for height calculation, but width might be larger.
  // However, FrameItem image container is aspect-square.
  // So height grows with width.
  // This is tricky because width is dynamic.
  // We need to calculate height inside AutoSizer render prop.

  return (
    <div className="flex-1 h-full min-h-0">
      <AutoSizer>
        {({ height, width }) => {
          // Calculate columns
          const availableWidth = width - (PADDING * 2); 
          const columnCount = Math.floor((availableWidth + GAP) / (frameSize + GAP));
          const safeColumnCount = Math.max(1, columnCount);
          columnCountRef.current = safeColumnCount;
          
          // Calculate actual width per item to fill space
          const frameWidth = (availableWidth - (safeColumnCount - 1) * GAP) / safeColumnCount;
          
          // Calculate item height based on actual width (since image is aspect-square)
          // Compact: padding/border (~20px) + header (~24px) + image (frameWidth)
          // Full: padding/border (~24px) + header (~24px) + image (frameWidth) + inputs (~140px)
          const itemHeight = compactMode 
            ? frameWidth + 60 
            : frameWidth + 220; 

          const rowCount = Math.ceil(frames.length / safeColumnCount);

          return (
            <List
              ref={listRef}
              height={height}
              itemCount={rowCount}
              itemSize={itemHeight}
              width={width}
              className="custom-scrollbar"
              itemData={{
                frames,
                columnCount: safeColumnCount,
                frameWidth,
                itemHeight,
                compactMode,
                selectedFrameIds,
                onRemove,
                onUpdate,
                onReset,
                onSelect,
                onContextMenu,
                labels,
                activeDragId,
                isGathering,
                isLayoutAnimating
              }}
            >
              {Row}
            </List>
          );
        }}
      </AutoSizer>
    </div>
  );
});
