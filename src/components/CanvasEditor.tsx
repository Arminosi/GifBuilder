import React, { useRef, useState, useEffect, useCallback } from 'react';
import { FrameData, CanvasConfig } from '../types';
import { FrameLabels } from '../utils/translations';
import { Move, ZoomIn, ZoomOut, Maximize, Lock, Unlock, Magnet, Info, ChevronLeft, RotateCw, Target, RefreshCw, StretchHorizontal, Pipette } from 'lucide-react';

interface CanvasEditorProps {
  frame: FrameData | null;
  frameIndex?: number;
  config: CanvasConfig;
  onUpdate: (updates: Partial<FrameData>, commit: boolean) => void;
  labels: FrameLabels & { frameInfo: string };
  emptyMessage: string;
  isPreview?: boolean;
  isEyeDropperActive?: boolean;
  onColorPick?: (color: string) => void;
}

type InteractionMode = 'idle' | 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | 'resize-l' | 'resize-r' | 'resize-t' | 'resize-b';

interface InteractionState {
  mode: InteractionMode;
  startPointerX: number;
  startPointerY: number;
  startFrameX: number;
  startFrameY: number;
  startFrameW: number;
  startFrameH: number;
  ratio: number;
  hasCommitted: boolean;
}

const EditableStat = ({ 
  label, 
  value, 
  unit = '', 
  onChange 
}: { 
  label: string; 
  value: number; 
  unit?: string; 
  onChange: (val: number) => void; 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value.toString());
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
    const num = parseInt(localValue);
    if (!isNaN(num) && num !== value) {
      onChange(num);
    } else {
      setLocalValue(value.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setLocalValue(value.toString());
    }
  };

  if (isEditing) {
    return (
      <div className="flex gap-1.5 items-center pointer-events-auto" onClick={(e) => e.stopPropagation()}>
        <span className="text-gray-500 font-medium">{label}</span>
        <input
          ref={inputRef}
          type="number"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="w-16 bg-gray-800 border border-blue-500 rounded px-1 py-0 text-xs text-white focus:outline-none"
        />
        {unit && <span className="text-gray-500">{unit}</span>}
      </div>
    );
  }

  return (
    <div 
      className="flex gap-1.5 items-center cursor-pointer hover:bg-gray-800/50 rounded px-1 -mx-1 transition-colors group/stat pointer-events-auto"
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      title="Click to edit"
    >
      <span className="text-gray-500 font-medium">{label}</span>
      <span className="font-mono border-b border-dashed border-gray-600 group-hover/stat:border-blue-400 transition-colors">{value}{unit}</span>
    </div>
  );
};

export const CanvasEditor: React.FC<CanvasEditorProps> = ({ 
  frame, 
  frameIndex, 
  config, 
  onUpdate, 
  labels, 
  emptyMessage, 
  isPreview,
  isEyeDropperActive,
  onColorPick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isAutoFit, setIsAutoFit] = useState(true);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [interaction, setInteraction] = useState<InteractionState | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const longPressTimer = useRef<any>(null);

  // Close context menu on click
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const handleContextMenu = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    setContextMenu({ x: clientX, y: clientY });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isPreview) return;
    longPressTimer.current = setTimeout(() => {
      handleContextMenu(e);
    }, 500); // 500ms long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleMenuAction = (action: string) => {
    if (!frame) return;
    const updates: Partial<FrameData> = {};
    
    switch (action) {
      case 'center':
        updates.x = Math.round((config.width - frame.width) / 2);
        updates.y = Math.round((config.height - frame.height) / 2);
        break;
      case 'fit-contain':
        const ratio = frame.width / frame.height;
        const canvasRatio = config.width / config.height;
        let newW, newH;
        if (ratio > canvasRatio) {
            newW = config.width;
            newH = newW / ratio;
        } else {
            newH = config.height;
            newW = newH * ratio;
        }
        updates.width = Math.round(newW);
        updates.height = Math.round(newH);
        updates.x = Math.round((config.width - updates.width) / 2);
        updates.y = Math.round((config.height - updates.height) / 2);
        break;
      case 'fit-stretch':
        updates.x = 0;
        updates.y = 0;
        updates.width = config.width;
        updates.height = config.height;
        break;
      case 'reset':
        updates.x = 0;
        updates.y = 0;
        updates.width = frame.originalWidth;
        updates.height = frame.originalHeight;
        updates.rotation = 0;
        break;
      case 'rotate':
        const currentRotation = frame.rotation || 0;
        const newRotation = (currentRotation + 90) % 360;
        updates.rotation = newRotation;
        
        // Swap width and height to maintain visual bounding box consistency
        // We rotate around the center
        const cx = frame.x + frame.width / 2;
        const cy = frame.y + frame.height / 2;
        
        updates.width = frame.height;
        updates.height = frame.width;
        updates.x = Math.round(cx - updates.width / 2);
        updates.y = Math.round(cy - updates.height / 2);
        break;
    }
    onUpdate(updates, true);
    setContextMenu(null);
  };

  // Auto-scale canvas to fit container
  const fitToContainer = useCallback(() => {
    if (!containerRef.current) return;
    const { width: containerWidth, height: containerHeight } = containerRef.current.getBoundingClientRect();
    
    // If container is hidden or too small, don't update scale to invalid values
    if (containerWidth === 0 || containerHeight === 0) return;

    // Leave some padding
    const padding = 80;
    const availableW = Math.max(50, containerWidth - padding);
    const availableH = Math.max(50, containerHeight - padding);
    
    const scaleW = availableW / (config.width || 1);
    const scaleH = availableH / (config.height || 1);
    
    // Ensure scale is positive and reasonable
    setScale(Math.max(0.05, Math.min(scaleW, scaleH, 1.5))); 
  }, [config.width, config.height]);

  useEffect(() => {
    if (!isAutoFit || !containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        fitToContainer();
      });
    });

    resizeObserver.observe(containerRef.current);
    
    // Initial fit
    fitToContainer();

    return () => resizeObserver.disconnect();
  }, [isAutoFit, fitToContainer]);

  const handleZoomIn = () => {
    setIsAutoFit(false);
    setScale(prev => Math.min(prev + 0.1, 5));
  };

  const handleZoomOut = () => {
    setIsAutoFit(false);
    setScale(prev => Math.max(prev - 0.1, 0.1));
  };

  const handleResetZoom = () => {
    setIsAutoFit(true);
  };

  // Handle Pointer Events
  const handlePointerDown = (e: React.PointerEvent, mode: InteractionMode) => {
    if (!frame) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setInteraction({
      mode,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      startFrameX: frame.x,
      startFrameY: frame.y,
      startFrameW: frame.width,
      startFrameH: frame.height,
      ratio: frame.width / frame.height || 1,
      hasCommitted: false
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!interaction || !frame) return;
    e.preventDefault();

    const { 
      mode, 
      startPointerX, startPointerY, 
      startFrameX, startFrameY, startFrameW, startFrameH, 
      ratio 
    } = interaction;

    // Calculate raw displacement from start (in canvas units)
    const dx = (e.clientX - startPointerX) / scale;
    const dy = (e.clientY - startPointerY) / scale;

    let newX = startFrameX;
    let newY = startFrameY;
    let newW = startFrameW;
    let newH = startFrameH;

    const updates: Partial<FrameData> = {};
    const SNAP_THRESHOLD = 10 / scale;

    if (mode === 'move') {
      newX += dx;
      newY += dy;

      if (snapToGrid) {
        // Snap Left
        if (Math.abs(newX) < SNAP_THRESHOLD) newX = 0;
        // Snap Right
        else if (Math.abs(newX + newW - config.width) < SNAP_THRESHOLD) newX = config.width - newW;
        // Snap Center X
        else if (Math.abs(newX + newW / 2 - config.width / 2) < SNAP_THRESHOLD) newX = config.width / 2 - newW / 2;
        // Grid Snap X
        else newX = Math.round(newX / 10) * 10;

        // Snap Top
        if (Math.abs(newY) < SNAP_THRESHOLD) newY = 0;
        // Snap Bottom
        else if (Math.abs(newY + newH - config.height) < SNAP_THRESHOLD) newY = config.height - newH;
        // Snap Center Y
        else if (Math.abs(newY + newH / 2 - config.height / 2) < SNAP_THRESHOLD) newY = config.height / 2 - newH / 2;
        // Grid Snap Y
        else newY = Math.round(newY / 10) * 10;
      }
    } else {
      // Resize Logic
      const isCenter = e.altKey;
      const isLocked = keepAspectRatio || e.shiftKey;

      // 1. Calculate new dimensions based on handle movement
      const effectiveDx = isCenter ? dx * 2 : dx;
      const effectiveDy = isCenter ? dy * 2 : dy;

      switch (mode) {
        case 'resize-l':
          newW = startFrameW - effectiveDx;
          if (!isCenter) newX = startFrameX + dx;
          break;
        case 'resize-r':
          newW = startFrameW + effectiveDx;
          if (isCenter) newX = startFrameX - effectiveDx / 2;
          break;
        case 'resize-t':
          newH = startFrameH - effectiveDy;
          if (!isCenter) newY = startFrameY + dy;
          break;
        case 'resize-b':
          newH = startFrameH + effectiveDy;
          if (isCenter) newY = startFrameY - effectiveDy / 2;
          break;
        case 'resize-tl':
          newW = startFrameW - effectiveDx;
          newH = startFrameH - effectiveDy;
          if (!isCenter) { newX = startFrameX + dx; newY = startFrameY + dy; }
          break;
        case 'resize-tr':
          newW = startFrameW + effectiveDx;
          newH = startFrameH - effectiveDy;
          if (!isCenter) { newY = startFrameY + dy; }
          else { newX = startFrameX - effectiveDx / 2; }
          break;
        case 'resize-bl':
          newW = startFrameW - effectiveDx;
          newH = startFrameH + effectiveDy;
          if (!isCenter) { newX = startFrameX + dx; }
          else { newY = startFrameY - effectiveDy / 2; }
          break;
        case 'resize-br':
          newW = startFrameW + effectiveDx;
          newH = startFrameH + effectiveDy;
          if (isCenter) { newX = startFrameX - effectiveDx / 2; newY = startFrameY - effectiveDy / 2; }
          break;
      }

      // 1.5 Snap Active Edges (Border & Grid)
      if (snapToGrid && !isCenter) {
          // Left Edge
          if (mode.includes('l')) {
              if (Math.abs(newX) < SNAP_THRESHOLD) {
                  const diff = newX - 0;
                  newX = 0;
                  newW += diff;
              } else {
                  const snappedX = Math.round(newX / 10) * 10;
                  const diff = newX - snappedX;
                  newX = snappedX;
                  newW += diff;
              }
          }
          // Right Edge
          if (mode.includes('r')) {
              const right = newX + newW;
              if (Math.abs(right - config.width) < SNAP_THRESHOLD) {
                  newW = config.width - newX;
              } else {
                  const snappedRight = Math.round(right / 10) * 10;
                  newW = snappedRight - newX;
              }
          }
          // Top Edge
          if (mode.includes('t')) {
              if (Math.abs(newY) < SNAP_THRESHOLD) {
                  const diff = newY - 0;
                  newY = 0;
                  newH += diff;
              } else {
                  const snappedY = Math.round(newY / 10) * 10;
                  const diff = newY - snappedY;
                  newY = snappedY;
                  newH += diff;
              }
          }
          // Bottom Edge
          if (mode.includes('b')) {
              const bottom = newY + newH;
              if (Math.abs(bottom - config.height) < SNAP_THRESHOLD) {
                  newH = config.height - newY;
              } else {
                  const snappedBottom = Math.round(bottom / 10) * 10;
                  newH = snappedBottom - newY;
              }
          }
      }

      // 2. Apply Aspect Ratio Constraint
      if (isLocked) {
        if (['resize-l', 'resize-r'].includes(mode)) {
          newH = newW / ratio;
          newY = startFrameY + (startFrameH - newH) / 2;
        } else if (['resize-t', 'resize-b'].includes(mode)) {
          newW = newH * ratio;
          newX = startFrameX + (startFrameW - newW) / 2;
        } else {
          const wRatio = Math.abs(newW / startFrameW);
          const hRatio = Math.abs(newH / startFrameH);
          
          if (wRatio > hRatio) {
               newH = newW / ratio;
          } else {
               newW = newH * ratio;
          }
  
          if (isCenter) {
              newX = startFrameX + (startFrameW - newW) / 2;
              newY = startFrameY + (startFrameH - newH) / 2;
          } else {
              if (mode === 'resize-tl') {
                  newX = (startFrameX + startFrameW) - newW;
                  newY = (startFrameY + startFrameH) - newH;
              } else if (mode === 'resize-tr') {
                  newX = startFrameX; 
                  newY = (startFrameY + startFrameH) - newH;
              } else if (mode === 'resize-bl') {
                  newX = (startFrameX + startFrameW) - newW;
                  newY = startFrameY;
              } else if (mode === 'resize-br') {
                  newX = startFrameX;
                  newY = startFrameY;
              }
          }
        }
      }

      // 3. Min Size
      if (newW < 1) newW = 1;
      if (newH < 1) newH = 1;
    }

    const finalX = Math.round(newX);
    const finalY = Math.round(newY);
    const finalW = Math.round(newW);
    const finalH = Math.round(newH);

    if (finalX !== Math.round(frame.x)) updates.x = finalX;
    if (finalY !== Math.round(frame.y)) updates.y = finalY;
    if (finalW !== Math.round(frame.width)) updates.width = finalW;
    if (finalH !== Math.round(frame.height)) updates.height = finalH;

    if (Object.keys(updates).length > 0) {
       const shouldCommit = !interaction.hasCommitted;
       onUpdate(updates, shouldCommit);
       
       if (shouldCommit) {
         setInteraction(prev => prev ? { ...prev, hasCommitted: true } : null);
       }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (interaction) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setInteraction(null);
    }
  };

  // Keyboard navigation for fine-tuning
  useEffect(() => {
    if (!frame) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement instanceof HTMLInputElement || 
          document.activeElement instanceof HTMLTextAreaElement) {
        return;
      }

      const step = e.shiftKey ? 10 : 1;
      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case 'ArrowLeft': dx = -step; break;
        case 'ArrowRight': dx = step; break;
        case 'ArrowUp': dy = -step; break;
        case 'ArrowDown': dy = step; break;
        default: return;
      }

      e.preventDefault();
      onUpdate({
        x: Math.round(frame.x + dx),
        y: Math.round(frame.y + dy)
      }, true);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [frame, onUpdate]);

  const rgbToHex = (r: number, g: number, b: number) => {
    return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isEyeDropperActive || !onColorPick) return;
    e.stopPropagation();
    e.preventDefault();
    
    const img = e.currentTarget;
    
    // Use nativeEvent.offsetX/Y which gives coordinates relative to the target element (the image)
    // This works even if the image is scaled via CSS width/height
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;
    
    // Display dimensions
    const displayWidth = img.offsetWidth;
    const displayHeight = img.offsetHeight;
    
    // Natural dimensions
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    // Map to natural coordinates
    const originalX = Math.floor((x / displayWidth) * naturalWidth);
    const originalY = Math.floor((y / displayHeight) * naturalHeight);
    
    // Draw to canvas to get color
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        // Draw only the pixel we need
        ctx.drawImage(img, originalX, originalY, 1, 1, 0, 0, 1, 1);
        const p = ctx.getImageData(0, 0, 1, 1).data;
        const hex = "#" + ("000000" + rgbToHex(p[0], p[1], p[2])).slice(-6);
        onColorPick(hex);
    }
  };

  if (!frame) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 border-b border-gray-800 text-gray-500 text-sm">
        {emptyMessage}
      </div>
    );
  }

  const canvasStyle = {
    width: config.width * scale,
    height: config.height * scale,
    backgroundColor: config.transparent ? 'transparent' : (config.backgroundColor || '#ffffff'),
    backgroundImage: config.transparent ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
  };

  const frameStyle = {
    left: frame.x * scale,
    top: frame.y * scale,
    width: frame.width * scale,
    height: frame.height * scale,
  };

  return (
    <div 
      ref={containerRef} 
      className="flex-1 bg-gray-950 relative overflow-hidden flex items-center justify-center p-4 md:p-8 select-none touch-none"
    >
      {/* Canvas Area */}
      <div 
        className="relative shadow-2xl box-content border border-gray-700" 
        style={canvasStyle}
      >
        {/* Frame Image */}
        <div 
          className={`absolute group ${isEyeDropperActive ? 'cursor-crosshair' : 'cursor-move'} touch-none ${interaction || isPreview ? '' : 'transition-all duration-200 ease-out'}`}
          style={frameStyle}
          onPointerDown={(e) => !isPreview && !isEyeDropperActive && handlePointerDown(e, 'move')}
          onPointerMove={!isPreview && !isEyeDropperActive ? handlePointerMove : undefined}
          onPointerUp={!isPreview && !isEyeDropperActive ? handlePointerUp : undefined}
          onContextMenu={!isPreview && !isEyeDropperActive ? handleContextMenu : undefined}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
        >
          <img 
            src={frame.previewUrl} 
            alt="frame" 
            className={`absolute ${isEyeDropperActive ? 'pointer-events-auto' : 'pointer-events-none'}`}
            style={{
                width: (frame.rotation || 0) % 180 === 90 ? `${frame.height * scale}px` : '100%',
                height: (frame.rotation || 0) % 180 === 90 ? `${frame.width * scale}px` : '100%',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) rotate(${frame.rotation || 0}deg)`,
                objectFit: 'fill',
                transition: interaction || isPreview ? 'none' : 'all 0.2s ease-out'
            }}
            onClick={handleImageClick}
          />

          {/* Resize Handles & Border */}
          {!isPreview && !isEyeDropperActive && (
            <>
              {/* Border */}
              <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" />
              
              {/* Corners */}
              <div 
                className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-nw-resize z-10"
                onPointerDown={(e) => handlePointerDown(e, 'resize-tl')}
              />
              <div 
                className="absolute -right-1.5 -top-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-ne-resize z-10"
                onPointerDown={(e) => handlePointerDown(e, 'resize-tr')}
              />
              <div 
                className="absolute -left-1.5 -bottom-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-sw-resize z-10"
                onPointerDown={(e) => handlePointerDown(e, 'resize-bl')}
              />
              <div 
                className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-se-resize z-10"
                onPointerDown={(e) => handlePointerDown(e, 'resize-br')}
              />

              {/* Edges */}
              <div 
                className="absolute left-1/2 -top-1.5 w-3 h-3 -ml-1.5 bg-white border border-blue-500 rounded-full cursor-n-resize z-10"
                onPointerDown={(e) => handlePointerDown(e, 'resize-t')}
              />
              <div 
                className="absolute left-1/2 -bottom-1.5 w-3 h-3 -ml-1.5 bg-white border border-blue-500 rounded-full cursor-s-resize z-10"
                onPointerDown={(e) => handlePointerDown(e, 'resize-b')}
              />
              <div 
                className="absolute -left-1.5 top-1/2 w-3 h-3 -mt-1.5 bg-white border border-blue-500 rounded-full cursor-w-resize z-10"
                onPointerDown={(e) => handlePointerDown(e, 'resize-l')}
              />
              <div 
                className="absolute -right-1.5 top-1/2 w-3 h-3 -mt-1.5 bg-white border border-blue-500 rounded-full cursor-e-resize z-10"
                onPointerDown={(e) => handlePointerDown(e, 'resize-r')}
              />
            </>
          )}
        </div>
      </div>
      
      {/* Persistent Frame Stats Bar */}
      <div 
        onClick={() => setIsStatsExpanded(!isStatsExpanded)}
        className={`
          absolute z-20 bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-lg text-xs text-gray-300 transition-all
          flex flex-col rounded-r-lg border-l-0 cursor-pointer pointer-events-auto
          ${isStatsExpanded ? 'p-3 gap-2 min-w-[120px]' : 'p-2 gap-0'}
          
          /* Mobile: Bottom Left */
          left-0 bottom-4 top-auto translate-y-0
          
          /* Desktop: Bottom Left (Standard) */
          md:left-4 md:bottom-4 md:top-auto md:translate-y-0 md:rounded-lg md:border-l md:w-auto md:min-w-0
      `}>
        
        {/* Toggle Indicator */}
        <div className="flex items-center gap-2">
           <div className="text-gray-500">
              {isStatsExpanded ? <ChevronLeft size={14}/> : <Info size={14}/>}
           </div>
           {!isStatsExpanded && frameIndex !== undefined && (
             <span className="font-mono font-bold">#{frameIndex + 1}</span>
           )}
           {isStatsExpanded && <span className="text-gray-500 font-medium">{labels.frameInfo}</span>}
        </div>

        {/* Stats Content */}
        <div className={`
           flex flex-col gap-2
           ${isStatsExpanded ? 'mt-2' : 'hidden'}
           md:mt-2 md:flex-col md:gap-2
        `}>
            {frameIndex !== undefined && (
              <>
                <div className="flex gap-1.5 items-center">
                  <span className="text-gray-500 font-medium">#</span>
                  <span className="font-mono">{frameIndex + 1}</span>
                </div>
                <div className="w-full h-px bg-gray-700 my-1"></div>
              </>
            )}
            <EditableStat 
              label={labels.time} 
              value={frame.duration} 
              unit="ms" 
              onChange={(val) => onUpdate({ duration: val }, true)} 
            />
            <div className="w-full h-px bg-gray-700 my-1"></div>
            <EditableStat 
              label={labels.x} 
              value={Math.round(frame.x)} 
              onChange={(val) => onUpdate({ x: val }, true)} 
            />
            <div className="w-full h-px bg-gray-700 my-1"></div>
            <EditableStat 
              label={labels.y} 
              value={Math.round(frame.y)} 
              onChange={(val) => onUpdate({ y: val }, true)} 
            />
            <div className="w-full h-px bg-gray-700 my-1"></div>
            <EditableStat 
              label={labels.w} 
              value={Math.round(frame.width)} 
              onChange={(val) => onUpdate({ width: val }, true)} 
            />
            <div className="w-full h-px bg-gray-700 my-1"></div>
            <EditableStat 
              label={labels.h} 
              value={Math.round(frame.height)} 
              onChange={(val) => onUpdate({ height: val }, true)} 
            />
        </div>
      </div>      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => handleMenuAction('center')} className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2">
            <Target size={14} />
            <span>居中对齐</span>
          </button>
          <button onClick={() => handleMenuAction('fit-contain')} className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2">
            <Maximize size={14} />
            <span>比例缩放适应</span>
          </button>
          <button onClick={() => handleMenuAction('fit-stretch')} className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2">
            <StretchHorizontal size={14} />
            <span>拉伸缩放适应</span>
          </button>
          <div className="h-px bg-gray-700 my-1" />
          <button onClick={() => handleMenuAction('rotate')} className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2">
            <RotateCw size={14} />
            <span>旋转图像 (90°)</span>
          </button>
          <div className="h-px bg-gray-700 my-1" />
          <button onClick={() => handleMenuAction('reset')} className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2">
            <RefreshCw size={14} />
            <span>重置</span>
          </button>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-gray-900/90 p-1.5 rounded-lg backdrop-blur-sm border border-gray-700 shadow-lg z-20">
        <button 
          onClick={() => setKeepAspectRatio(!keepAspectRatio)}
          className={`p-1 rounded transition-colors ${keepAspectRatio ? 'text-blue-400 bg-blue-900/30' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
          title={keepAspectRatio ? "Unlock Aspect Ratio" : "Lock Aspect Ratio"}
        >
          {keepAspectRatio ? <Lock size={14} /> : <Unlock size={14} />}
        </button>

        <button 
          onClick={() => setSnapToGrid(!snapToGrid)}
          className={`p-1 rounded transition-colors ${snapToGrid ? 'text-blue-400 bg-blue-900/30' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
          title="Snap to Borders"
        >
          <Magnet size={14} />
        </button>

        <div className="w-px h-4 bg-gray-700 mx-1"></div>

        <button 
          onClick={handleZoomOut}
          className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>
        
        <span className="text-xs font-mono text-gray-300 w-12 text-center select-none">
          {Math.round(scale * 100)}%
        </span>

        <button 
          onClick={handleZoomIn}
          className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>

        <div className="w-px h-4 bg-gray-700 mx-1"></div>

        <button 
          onClick={handleResetZoom}
          className={`p-1 rounded transition-colors ${isAutoFit ? 'text-blue-400 bg-blue-900/30' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
          title="Auto Fit"
        >
          <Maximize size={14} />
        </button>

        {/* Eye Dropper Tool */}
        <button 
          onClick={() => {
            if (isPreview) return;
            // Toggle Eye Dropper Active State
            const newState = !isEyeDropperActive;
            setIsAutoFit(!newState); // Disable Auto Fit when Eye Dropper is active
            setInteraction(null); // End any ongoing interactions
            // Optionally, you can add a callback to handle color picking
            if (newState && frame) {
              // Simulate color pick action (you can replace this with real color picking logic)
              const dummyColor = '#ff0000';
              onColorPick?.(dummyColor);
            }
          }}
          className={`p-1 rounded transition-colors ${isEyeDropperActive ? 'text-blue-400 bg-blue-900/30' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
          title={isEyeDropperActive ? "Cancel Eye Dropper" : "Pick Color"}
        >
          <Pipette size={14} />
        </button>
      </div>
    </div>
  );
};
