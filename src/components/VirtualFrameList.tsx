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
  confirmResetText?: string;
  activeDragId?: string | null;
  isGathering?: boolean;
  isLayoutAnimating?: boolean;
  layoutMode?: 'auto' | 'vertical' | 'horizontal';
  onCompactModeChange?: (isCompact: boolean) => void;
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
    confirmResetText,
    activeDragId,
    isGathering,
    isLayoutAnimating,
    isHorizontal
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
            confirmResetText={confirmResetText}
            isMultiDragging={activeDragId && selectedFrameIds.has(frame.id) && selectedFrameIds.size > 1}
            isGathering={isGathering}
            frameWidth={frameWidth}
            isHorizontal={isHorizontal}
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
  confirmResetText,
  activeDragId,
  isGathering,
  isLayoutAnimating,
  layoutMode = 'auto',
  onCompactModeChange
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
          
          // Determine intended layout first
          let intendedHorizontal = false;
          if (layoutMode === 'horizontal') {
             intendedHorizontal = true;
          } else if (layoutMode === 'vertical') {
             intendedHorizontal = false;
          } else {
             // Auto: Switch to horizontal if width is sufficient (> 300px)
             intendedHorizontal = frameWidth > 300;
          }

          // Calculate potential vertical height first
          // Reduced height since inputs are more compact now
          const potentialVerticalHeight = frameWidth + 160;
          
          // Determine final layout
          // Only use horizontal if not in compact mode
          const isHorizontal = !compactMode && intendedHorizontal;
          
          let itemHeight;
          if (compactMode) {
            itemHeight = frameWidth + 60;
          } else if (isHorizontal) {
            // Horizontal layout
            // Scale height with width, but maintain minimum for inputs
            // Inputs need ~120px + padding/header
            itemHeight = Math.max(200, frameWidth * 0.6);
          } else {
            // Vertical layout
            itemHeight = potentialVerticalHeight;
          } 

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
                confirmResetText,
                activeDragId,
                isGathering,
                isLayoutAnimating,
                isHorizontal
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
