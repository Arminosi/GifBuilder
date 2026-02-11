import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload, Play, Download, Trash2, Undo2, Redo2,
  History, Save, ArrowDownAZ, ArrowUpAZ, Loader2, ImagePlus, Languages, X as XIcon, Maximize, Scaling,
  Eye, Monitor, Palette, AlertCircle, Check, PanelLeft, Layout, Minimize2, CheckSquare, Layers, Package, Copy, Plus, FilePlus, ClipboardCopy, ClipboardPaste, RotateCcw, SlidersHorizontal, ZoomIn, ZoomOut, List, Pin, PinOff, AlignCenter, ScanEye, Pipette, Eraser, Rows, Columns, Lock, Unlock, Merge, Scissors, Film
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { FrameData, CanvasConfig, HistorySnapshot } from './types';
import { FrameItem, FrameCard } from './components/FrameItem';
import { CanvasEditor } from './components/CanvasEditor';
import { Timeline } from './components/Timeline';
import { VirtualFrameList, VirtualFrameListHandle } from './components/VirtualFrameList';
import { useHistory } from './hooks/useHistory';
import { generateGIF } from './utils/gifHelper';
import { generateFrameZip, extractFramesFromZip } from './utils/zipHelper';
import { translations, Language } from './utils/translations';
import {
  saveSnapshotToDB,
  getSnapshotsFromDB,
  deleteSnapshotFromDB,
  clearSnapshotsFromDB
} from './utils/storage';
import { GenerationModal } from './components/GenerationModal';
import { parseGifFrames } from './utils/gifParser';

// Initial states
const INITIAL_CANVAS_CONFIG: CanvasConfig = {
  width: 500,
  height: 500,
  quality: 10,
  repeat: 0,
  transparent: 'rgba(0,0,0,0)',
  backgroundColor: '#ffffff'
};

const TAG_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ec4899', // pink
];

interface AppState {
  frames: FrameData[];
  canvasConfig: CanvasConfig;
}

const App: React.FC = () => {
  // Use custom history hook for Undo/Redo
  const {
    state: appState,
    setState: setAppState,
    overwrite: overwriteAppState,
    undo,
    redo,
    canUndo,
    canRedo,
    history: historyStack,
    currentIndex: historyIndex,
    jumpTo: jumpToHistory
  } = useHistory<AppState>({
    frames: [],
    canvasConfig: INITIAL_CANVAS_CONFIG
  });

  // Safe destructuring with fallback
  const { frames, canvasConfig } = appState || { frames: [], canvasConfig: INITIAL_CANVAS_CONFIG };

  const [isGenerating, setIsGenerating] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [generatedGif, setGeneratedGif] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [snapshots, setSnapshots] = useState<HistorySnapshot[]>([]);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showHistoryStack, setShowHistoryStack] = useState(false);
  const [isHistoryPinned, setIsHistoryPinned] = useState(false);
  const [globalDuration, setGlobalDuration] = useState(100);
  const [durationMode, setDurationMode] = useState<'ms' | 'fps'>('ms'); // Duration input mode
  const [fpsValue, setFpsValue] = useState(10); // FPS value (10 fps = 100ms per frame)
  const [language, setLanguage] = useState<Language>('zh');
  const [fitMode, setFitMode] = useState<'fill' | 'contain'>('fill');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [targetSizeMB, setTargetSizeMB] = useState<string>('');

  // Background Removal State
  const [removeColor, setRemoveColor] = useState<string>('#ffffff');
  const [tolerance, setTolerance] = useState<number>(10);
  const [isEyeDropperActive, setIsEyeDropperActive] = useState(false);

  // GIF Transparent Color State
  const [gifTransparentColor, setGifTransparentColor] = useState<string>('#00ff00');
  const [isGifTransparentEnabled, setIsGifTransparentEnabled] = useState(false);
  const [isGifEyeDropperActive, setIsGifEyeDropperActive] = useState(false);
  const [isBgColorEyeDropperActive, setIsBgColorEyeDropperActive] = useState(false);

  // Color Smoothing State
  const [enableColorSmoothing, setEnableColorSmoothing] = useState(false);

  // Notification State
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [notificationClosing, setNotificationClosing] = useState(false);

  // Transparent Background Switch Confirmation Dialog
  const [showTransparentConfirm, setShowTransparentConfirm] = useState(false);
  const [dialogClosing, setDialogClosing] = useState(false);
  const [pendingTransparentSwitch, setPendingTransparentSwitch] = useState(false);
  const [hasSeenTransparentPrompt, setHasSeenTransparentPrompt] = useState(false);

  // Selection State
  const [selectedFrameIds, setSelectedFrameIds] = useState<Set<string>>(new Set());
  const [isBatchSelectMode, setIsBatchSelectMode] = useState(false);
  const [batchInputValues, setBatchInputValues] = useState<{
    x: string;
    y: string;
    width: string;
    height: string;
    duration: string;
  }>({ x: '', y: '', width: '', height: '', duration: '' });

  // Clipboard State
  const [clipboard, setClipboard] = useState<FrameData[]>([]);

  // View options
  const [frameSize, setFrameSize] = useState(150);
  const [isViewOptionsOpen, setIsViewOptionsOpen] = useState(false);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'auto' | 'vertical' | 'horizontal'>('auto');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showCanvasEditor, setShowCanvasEditor] = useState(true);

  // Confirm states
  const [clearHistoryConfirm, setClearHistoryConfirm] = useState(false);
  const [clearFramesConfirm, setClearFramesConfirm] = useState(false);
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);
  const [githubLinkConfirm, setGithubLinkConfirm] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, insertIndex: number } | null>(null);
  // Insert Modal State
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [insertTargetIndex, setInsertTargetIndex] = useState<number | null>(null);
  const [showFooter, setShowFooter] = useState(true);

  // Canvas Aspect Ratio Lock
  const [isAspectRatioLocked, setIsAspectRatioLocked] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1);

  // Reduce Frames State
  const [reduceKeep, setReduceKeep] = useState<number>(3);
  const [reduceRemove, setReduceRemove] = useState<number>(1);


  // Resizable Panels State
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [editorHeight, setEditorHeight] = useState(450);
  const [isLargeScreen, setIsLargeScreen] = useState(true);

  // Animation States
  const [isGathering, setIsGathering] = useState(false);
  const [isLayoutAnimating, setIsLayoutAnimating] = useState(false);

  // Mobile Tab State
  const [activeMobileTab, setActiveMobileTab] = useState<'frames' | 'editor' | 'settings'>('frames');

  // Preview State
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewFrameIndex, setPreviewFrameIndex] = useState<number | null>(null);
  const [syncPreviewSelection, setSyncPreviewSelection] = useState(false);

  // Refs for preview loop to access latest state without restarting loop
  const selectedFrameIdsRef = useRef(selectedFrameIds);
  const syncPreviewSelectionRef = useRef(syncPreviewSelection);

  useEffect(() => {
    selectedFrameIdsRef.current = selectedFrameIds;
  }, [selectedFrameIds]);

  useEffect(() => {
    syncPreviewSelectionRef.current = syncPreviewSelection;
  }, [syncPreviewSelection]);

  // Auto-scroll VirtualFrameList to selected frame
  useEffect(() => {
    if (frames.length === 0) return;

    // Prevent auto-scroll if the frame list is too small to avoid layout shifts
    // This helps prevent the "whole page scroll" issue when the list height is very small
    const listContainer = document.getElementById('virtual-list-container');
    if (listContainer && listContainer.clientHeight < 100) {
      return;
    }

    let targetId: string | null = null;

    // If we have a lastSelectedIdRef, use that (it tracks the most recent click/selection)
    if (lastSelectedIdRef.current && selectedFrameIds.has(lastSelectedIdRef.current)) {
      targetId = lastSelectedIdRef.current;
    } else if (selectedFrameIds.size === 1) {
      // Fallback to the single item in the set
      targetId = Array.from(selectedFrameIds)[0];
    }

    if (targetId) {
      const index = frames.findIndex(f => f.id === targetId);
      if (index !== -1 && virtualListRef.current) {
        // Use requestAnimationFrame to ensure layout is stable
        requestAnimationFrame(() => {
          virtualListRef.current?.scrollToItem(index);
        });
      }
    }
  }, [selectedFrameIds]); // Removed frames dependency to prevent auto-scroll on parameter updates

  // Force reset scroll position on frame changes to prevent layout shift
  useEffect(() => {
    if (frames.length > 0) {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      const root = document.getElementById('root');
      if (root) root.scrollTop = 0;
      const mainLayout = document.getElementById('main-layout-container');
      if (mainLayout) mainLayout.scrollTop = 0;
    }
  }, [frames.length]);

  // Handle screen resize
  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024); // lg breakpoint
    };

    // Initial check
    checkScreenSize();

    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Preview Loop
  useEffect(() => {
    if (!isPlaying || frames.length === 0) {
      setPreviewFrameIndex(null);
      return;
    }

    // Start from selected frame if available
    let startIndex = 0;
    const currentSelection = selectedFrameIdsRef.current;
    if (currentSelection.size > 0) {
      // Find the first selected frame in the list
      const firstSelected = frames.findIndex(f => currentSelection.has(f.id));
      if (firstSelected !== -1) startIndex = firstSelected;
    }

    let currentIndex = startIndex;
    setPreviewFrameIndex(currentIndex);

    let timeoutId: ReturnType<typeof setTimeout>;

    const playNextFrame = () => {
      const frame = frames[currentIndex];
      const duration = frame.duration || globalDuration;

      timeoutId = setTimeout(() => {
        if (!isPlaying) return; // Check again inside timeout
        currentIndex = (currentIndex + 1) % frames.length;
        setPreviewFrameIndex(currentIndex);

        // Sync selection if enabled
        if (syncPreviewSelectionRef.current) {
          const nextFrameId = frames[currentIndex].id;
          setSelectedFrameIds(new Set([nextFrameId]));
        }

        playNextFrame();
      }, duration);
    };

    playNextFrame();

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
    };
  }, [isPlaying, frames, globalDuration]);

  const t = translations[language];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const insertFileInputRef = useRef<HTMLInputElement>(null);
  const virtualListRef = useRef<VirtualFrameListHandle>(null);
  const notificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper function to check if image has transparency
  const checkImageTransparency = async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(false);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Check if any pixel has alpha < 255 (has transparency)
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 255) {
            URL.revokeObjectURL(url);
            resolve(true);
            return;
          }
        }

        URL.revokeObjectURL(url);
        resolve(false);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(false);
      };
    });
  };

  // Show notification with auto-dismiss
  // Show notification with auto-dismiss
  const showNotification = (message: string) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
    setNotificationMessage(message);
    setNotificationClosing(false);
    notificationTimeoutRef.current = setTimeout(() => {
      setNotificationClosing(true);
      setTimeout(() => {
        setNotificationMessage(null);
        setNotificationClosing(false);
      }, 300);
    }, 3500);
  };

  // Show persistent notification (no auto-dismiss)
  const showLoadingNotification = (message: string) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
    setNotificationMessage(message);
    setNotificationClosing(false);
  };

  // Explicitly hide notification
  const hideNotification = () => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
    setNotificationClosing(true);
    setTimeout(() => {
      setNotificationMessage(null);
      setNotificationClosing(false);
    }, 300);
  };

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require movement before drag starts to allow clicks
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load snapshots from DB on mount
  useEffect(() => {
    getSnapshotsFromDB().then(loadedSnapshots => {
      setSnapshots(loadedSnapshots);
    }).catch(err => {
      console.error("Failed to load snapshots history", err);
    });
  }, []);

  // Clear batch inputs when selection changes
  useEffect(() => {
    setBatchInputValues({ x: '', y: '', width: '', height: '', duration: '' });
  }, [selectedFrameIds]);

  // Close context menu on click elsewhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // --- Actions ---

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };

  // Helper to get last selected ID for range selection
  const lastSelectedIdRef = useRef<string | null>(null);

  const handleSelection = (id: string, e: React.MouseEvent) => {
    const { ctrlKey, metaKey, shiftKey } = e;
    const isMultiSelect = ctrlKey || metaKey || isBatchSelectMode;
    const isRangeSelect = shiftKey;

    setSelectedFrameIds(prev => {
      const next = new Set(prev);

      if (isRangeSelect && lastSelectedIdRef.current && frames.some(f => f.id === lastSelectedIdRef.current)) {
        const lastIndex = frames.findIndex(f => f.id === lastSelectedIdRef.current);
        const currentIndex = frames.findIndex(f => f.id === id);
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);

        // If not holding Ctrl/Cmd, clear previous selection to mimic standard OS behavior
        if (!isMultiSelect) {
          next.clear();
        }

        // Add range to selection
        for (let i = start; i <= end; i++) {
          next.add(frames[i].id);
        }
      } else if (isMultiSelect) {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        lastSelectedIdRef.current = id;
      } else {
        // Single select
        next.clear();
        next.add(id);
        lastSelectedIdRef.current = id;
      }
      return next;
    });
  };

  // Copy to internal clipboard
  const handleCopy = useCallback(() => {
    if (selectedFrameIds.size === 0) return;
    const selectedFrames = frames
      .filter(f => selectedFrameIds.has(f.id))
      .sort((a, b) => frames.indexOf(a) - frames.indexOf(b));

    if (selectedFrames.length > 0) {
      setClipboard(selectedFrames);
    }
  }, [frames, selectedFrameIds]);

  // Paste from internal clipboard
  const handlePaste = useCallback(() => {
    if (clipboard.length === 0) return;

    // Create copies with new IDs
    const newFrames = clipboard.map(f => ({
      ...f,
      id: Math.random().toString(36).substr(2, 9)
    }));

    setAppState(prev => {
      // Determine insertion index
      // If items selected, insert after the last selected item
      // Else insert at end
      let insertIndex = prev.frames.length;
      if (selectedFrameIds.size > 0) {
        const selectedIndices = prev.frames
          .map((f, i) => selectedFrameIds.has(f.id) ? i : -1)
          .filter(i => i !== -1);

        if (selectedIndices.length > 0) {
          insertIndex = Math.max(...selectedIndices) + 1;
        }
      }

      const nextFrames = [...prev.frames];
      nextFrames.splice(insertIndex, 0, ...newFrames);
      return { ...prev, frames: nextFrames };
    });

    // Select the new frames
    const newIds = new Set(newFrames.map(f => f.id));
    setSelectedFrameIds(newIds);
    lastSelectedIdRef.current = newFrames[newFrames.length - 1].id;
  }, [clipboard, selectedFrameIds, setAppState]);

  const handleDuplicate = useCallback(() => {
    const selectedIdsArray = Array.from(selectedFrameIds);
    if (selectedIdsArray.length === 0) return;

    // Filter and sort selected frames based on current order
    const selectedFramesInOrder = frames
      .filter(f => selectedFrameIds.has(f.id))
      .sort((a, b) => frames.indexOf(a) - frames.indexOf(b));

    if (selectedFramesInOrder.length === 0) return;

    // Create copies with new IDs
    const newFrames: FrameData[] = selectedFramesInOrder.map(f => ({
      ...f,
      id: Math.random().toString(36).substr(2, 9)
    }));

    const newIds = new Set(newFrames.map(f => f.id));

    setAppState(prev => {
      // Find the index of the last selected item to insert after
      const lastSelectedIndex = prev.frames.reduce((lastIndex, frame, index) => {
        return selectedFrameIds.has(frame.id) ? index : lastIndex;
      }, -1);

      const nextFrames = [...prev.frames];
      // If no selection found (weird case), append to end. Otherwise insert after selection.
      const insertIndex = lastSelectedIndex === -1 ? nextFrames.length : lastSelectedIndex + 1;

      nextFrames.splice(insertIndex, 0, ...newFrames);

      return { ...prev, frames: nextFrames };
    });

    // Select the newly created frames
    setSelectedFrameIds(newIds);
    lastSelectedIdRef.current = newFrames[newFrames.length - 1].id;
  }, [selectedFrameIds, frames, setAppState]);

  // Context Menu Handlers
  const handleFrameContextMenu = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If we right-click on an item that isn't selected, select it exclusively
    // This matches standard OS behavior
    if (!selectedFrameIds.has(id)) {
      setSelectedFrameIds(new Set([id]));
      lastSelectedIdRef.current = id;
    }

    const index = frames.findIndex(f => f.id === id);
    // Default to inserting AFTER the clicked item
    setContextMenu({ x: e.clientX, y: e.clientY, insertIndex: index + 1 });
  };

  const handleBackgroundContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();

    // Find closest frame to determine index for "Insert Here" functionality
    const framesElements = Array.from(document.querySelectorAll('[data-frame-id]'));
    let closestIndex = frames.length; // Default to end
    let minDistance = Infinity;

    if (framesElements.length > 0) {
      framesElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);

        // Limit detection range to avoid weird jumps if clicking far away
        if (dist < minDistance && dist < 500) {
          minDistance = dist;
          const id = el.getAttribute('data-frame-id');
          const index = frames.findIndex(f => f.id === id);

          if (index !== -1) {
            // Simple heuristic: if mouse is to the right of center (LTR layout), insert after
            // This works well for grid layouts
            closestIndex = (e.clientX > centerX) ? index + 1 : index;
          }
        }
      });
    }

    setContextMenu({ x: e.clientX, y: e.clientY, insertIndex: closestIndex });
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Only deselect if clicking directly on the background container, not its children
    if (e.target === e.currentTarget) {
      setSelectedFrameIds(new Set());
    }
  };

  const handleContextCopy = () => {
    handleCopy();
    setContextMenu(null);
  };

  const handleContextPaste = () => {
    if (!contextMenu || clipboard.length === 0) return;
    const { insertIndex } = contextMenu;

    const newFrames = clipboard.map(f => ({
      ...f,
      id: Math.random().toString(36).substr(2, 9)
    }));

    setAppState(prev => {
      const nextFrames = [...prev.frames];
      nextFrames.splice(insertIndex, 0, ...newFrames);
      return { ...prev, frames: nextFrames };
    });

    const newIds = new Set(newFrames.map(f => f.id));
    setSelectedFrameIds(newIds);
    setContextMenu(null);
  };

  const handleContextDownload = async () => {
    if (selectedFrameIds.size === 0) {
      setContextMenu(null);
      return;
    }

    const selectedFrames = frames
      .filter(f => selectedFrameIds.has(f.id))
      .sort((a, b) => frames.indexOf(a) - frames.indexOf(b));

    if (selectedFrames.length === 0) {
      setContextMenu(null);
      return;
    }

    if (selectedFrames.length === 1) {
      // Download single file
      const frame = selectedFrames[0];
      const link = document.createElement('a');
      link.href = URL.createObjectURL(frame.file);
      link.download = frame.file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Download zip
      setIsZipping(true);
      try {
        const blob = await generateFrameZip(selectedFrames);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `frames_selection_${new Date().getTime()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Failed to zip frames", error);
      } finally {
        setIsZipping(false);
      }
    }

    setContextMenu(null);
  };

  const handleContextDuplicate = () => {
    if (!contextMenu) return;
    const { insertIndex } = contextMenu;

    const selectedIdsArray = Array.from(selectedFrameIds);
    if (selectedIdsArray.length === 0) return;

    const selectedFramesInOrder = frames
      .filter(f => selectedFrameIds.has(f.id))
      .sort((a, b) => frames.indexOf(a) - frames.indexOf(b));

    const newFrames: FrameData[] = selectedFramesInOrder.map(f => ({
      ...f,
      id: Math.random().toString(36).substr(2, 9)
    }));

    setAppState(prev => {
      const nextFrames = [...prev.frames];
      nextFrames.splice(insertIndex, 0, ...newFrames);
      return { ...prev, frames: nextFrames };
    });

    // Select new frames
    const newIds = new Set(newFrames.map(f => f.id));
    setSelectedFrameIds(newIds);
    setContextMenu(null);
  };

  const handleContextInsert = () => {
    if (!contextMenu) return;
    const { insertIndex } = contextMenu;

    setInsertTargetIndex(insertIndex);
    setShowInsertModal(true);
    setContextMenu(null);
  };

  const handleContextDelete = () => {
    if (!contextMenu) return;

    if (selectedFrameIds.size === 0) {
      setContextMenu(null);
      return;
    }

    setAppState(prev => ({
      ...prev,
      frames: prev.frames.filter(f => !selectedFrameIds.has(f.id))
    }));

    setSelectedFrameIds(new Set());
    setContextMenu(null);
  };

  const handleResetFrameProperties = () => {
    if (selectedFrameIds.size === 0) {
      setContextMenu(null); // Just close context menu if open
      return;
    }

    setAppState(prev => ({
      ...prev,
      frames: prev.frames.map(f => {
        if (selectedFrameIds.has(f.id)) {
          return {
            ...f,
            width: f.originalWidth,
            height: f.originalHeight,
            x: 0,
            y: 0
          };
        }
        return f;
      })
    }));

    setContextMenu(null);
  };

  const handleSetColorTag = (color: string | undefined) => {
    if (selectedFrameIds.size === 0) {
      setContextMenu(null);
      return;
    }

    setAppState(prev => ({
      ...prev,
      frames: prev.frames.map(f => {
        if (selectedFrameIds.has(f.id)) {
          return {
            ...f,
            colorTag: color
          };
        }
        return f;
      })
    }));

    setContextMenu(null);
  };

  const handleInsertFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (insertTargetIndex === null) return;

    const newFrames: FrameData[] = [];
    let firstImageWidth = 0;
    let firstImageHeight = 0;

    // Expand file list: extract images from ZIP files first
    const allFiles: File[] = [];
    const fileDurationMap = new Map<string, number>(); // Track durations from metadata
    let metadataDefaultDuration: number | undefined;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isZip = file.type === 'application/zip' ||
        file.type === 'application/x-zip-compressed' ||
        file.name.toLowerCase().endsWith('.zip');

      if (isZip) {
        try {
          showLoadingNotification(t.extractingZip.replace('{current}', '0').replace('{total}', '?'));
          const extractionResult = await extractFramesFromZip(file, (current, total) => {
            showLoadingNotification(t.extractingZip.replace('{current}', current.toString()).replace('{total}', total.toString()));
          });

          if (extractionResult.files.length === 0) {
            showNotification(t.zipNoImages);
          } else {
            allFiles.push(...extractionResult.files);

            // Store duration metadata if present
            if (extractionResult.durationMap) {
              extractionResult.durationMap.forEach((duration, filename) => {
                fileDurationMap.set(filename, duration);
              });
              // Notify user that metadata was detected
              showNotification(t.zipMetadataDetected.replace('{count}', extractionResult.durationMap.size.toString()));
            }
            if (extractionResult.defaultDuration !== undefined) {
              metadataDefaultDuration = extractionResult.defaultDuration;
            }
          }
        } catch (e) {
          console.error("Failed to extract ZIP file", e);
          showNotification(t.zipNoImages);
        }
      } else {
        allFiles.push(file);
      }
    }

    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      if (!file.type.startsWith('image/')) continue;

      // Handle GIF files
      if (file.type === 'image/gif') {
        try {
          showLoadingNotification(t.importingGif.replace('{current}', '0').replace('{total}', '?'));
          const gifFrames = await parseGifFrames(file, (current, total) => {
            showLoadingNotification(t.importingGif.replace('{current}', current.toString()).replace('{total}', total.toString()));
          });
          if (gifFrames.length > 0) {
            for (let j = 0; j < gifFrames.length; j++) {
              const gifFrame = gifFrames[j];
              if (newFrames.length === 0 && firstImageWidth === 0) {
                firstImageWidth = gifFrame.width;
                firstImageHeight = gifFrame.height;
              }

              // Convert blob URL to File object for storage
              const response = await fetch(gifFrame.url);
              const blob = await response.blob();
              const frameFile = new File([blob], `${file.name.replace(/\.gif$/i, '')}_${j}.png`, { type: 'image/png' });

              newFrames.push({
                id: Math.random().toString(36).substr(2, 9),
                file: frameFile,
                previewUrl: gifFrame.url,
                duration: gifFrame.delay || globalDuration,
                x: 0,
                y: 0,
                width: gifFrame.width,
                height: gifFrame.height,
                originalWidth: gifFrame.width,
                originalHeight: gifFrame.height,
              });
            }
            continue;
          }
        } catch (e) {
          console.error("Failed to parse GIF frames, falling back to static image", e);
        }
      }

      showLoadingNotification(t.importingImages.replace('{current}', (i + 1).toString()).replace('{total}', allFiles.length.toString()));

      const url = URL.createObjectURL(file);

      const img = new Image();
      img.src = url;
      await new Promise((resolve) => { img.onload = resolve; });

      if (newFrames.length === 0 && firstImageWidth === 0) {
        firstImageWidth = img.naturalWidth;
        firstImageHeight = img.naturalHeight;
      }

      // Determine duration: metadata > metadata default > global
      const frameDuration = fileDurationMap.get(file.name) ?? metadataDefaultDuration ?? globalDuration;

      newFrames.push({
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: url,
        duration: frameDuration,
        x: 0,
        y: 0,
        width: img.naturalWidth,
        height: img.naturalHeight,
        originalWidth: img.naturalWidth,
        originalHeight: img.naturalHeight,
      });
    }

    hideNotification();

    if (newFrames.length > 0) {
      setAppState(prev => {
        const nextFrames = [...prev.frames];
        nextFrames.splice(insertTargetIndex, 0, ...newFrames);

        // If it was empty, update canvas size
        const shouldSetSize = prev.frames.length === 0;

        return {
          ...prev,
          frames: nextFrames,
          canvasConfig: shouldSetSize ? {
            ...prev.canvasConfig,
            width: firstImageWidth,
            height: firstImageHeight
          } : prev.canvasConfig
        };
      });

      // Select new frames
      const newIds = new Set(newFrames.map(f => f.id));
      setSelectedFrameIds(newIds);
    }

    setShowInsertModal(false);
    setInsertTargetIndex(null);
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Input protection: don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              if (canRedo) redo();
            } else {
              if (canUndo) undo();
            }
            break;
          case 'y':
            e.preventDefault();
            if (canRedo) redo();
            break;
          case 'd':
            e.preventDefault();
            handleDuplicate();
            break;
          case 'c':
            e.preventDefault();
            handleCopy();
            break;
          case 'v':
            e.preventDefault();
            handlePaste();
            break;
          case 'a':
            e.preventDefault();
            const allIds = new Set(frames.map(f => f.id));
            setSelectedFrameIds(allIds);
            break;
        }
      } else {
        // Non-modifier shortcuts
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (selectedFrameIds.size > 0) {
            e.preventDefault();
            setAppState(prev => ({
              ...prev,
              frames: prev.frames.filter(f => !selectedFrameIds.has(f.id))
            }));
            setSelectedFrameIds(new Set());
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo, handleDuplicate, handleCopy, handlePaste, frames]);


  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFrames: FrameData[] = [];
    let firstImageWidth = 0;
    let firstImageHeight = 0;
    let hasTransparency = false;

    // Expand file list: extract images from ZIP files first
    const allFiles: File[] = [];
    const fileDurationMap = new Map<string, number>(); // Track durations from metadata
    let metadataDefaultDuration: number | undefined;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isZip = file.type === 'application/zip' ||
        file.type === 'application/x-zip-compressed' ||
        file.name.toLowerCase().endsWith('.zip');

      if (isZip) {
        try {
          showLoadingNotification(t.extractingZip.replace('{current}', '0').replace('{total}', '?'));
          const extractionResult = await extractFramesFromZip(file, (current, total) => {
            showLoadingNotification(t.extractingZip.replace('{current}', current.toString()).replace('{total}', total.toString()));
          });

          if (extractionResult.files.length === 0) {
            showNotification(t.zipNoImages);
          } else {
            allFiles.push(...extractionResult.files);

            // Store duration metadata if present
            if (extractionResult.durationMap) {
              extractionResult.durationMap.forEach((duration, filename) => {
                fileDurationMap.set(filename, duration);
              });
              // Notify user that metadata was detected
              showNotification(t.zipMetadataDetected.replace('{count}', extractionResult.durationMap.size.toString()));
            }
            if (extractionResult.defaultDuration !== undefined) {
              metadataDefaultDuration = extractionResult.defaultDuration;
            }
          }
        } catch (e) {
          console.error("Failed to extract ZIP file", e);
          showNotification(t.zipNoImages);
        }
      } else {
        allFiles.push(file);
      }
    }

    // Process files
    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      if (!file.type.startsWith('image/')) continue;

      // Handle GIF files
      if (file.type === 'image/gif') {
        try {
          showLoadingNotification(t.importingGif.replace('{current}', '0').replace('{total}', '?'));
          const gifFrames = await parseGifFrames(file, (current, total) => {
            showLoadingNotification(t.importingGif.replace('{current}', current.toString()).replace('{total}', total.toString()));
          });
          if (gifFrames.length > 0) {
            // Check if any GIF frame has transparency
            if (!hasTransparency) {
              for (let j = 0; j < gifFrames.length; j++) {
                const gifFrame = gifFrames[j];
                // Convert blob URL to check transparency
                const response = await fetch(gifFrame.url);
                const blob = await response.blob();
                const frameFile = new File([blob], 'temp.png', { type: 'image/png' });
                const frameHasTransparency = await checkImageTransparency(frameFile);
                if (frameHasTransparency) {
                  hasTransparency = true;
                  break;
                }
              }
            }

            for (let j = 0; j < gifFrames.length; j++) {
              const gifFrame = gifFrames[j];
              if (newFrames.length === 0 && firstImageWidth === 0) {
                firstImageWidth = gifFrame.width;
                firstImageHeight = gifFrame.height;
              }

              // Convert blob URL to File object for storage
              const response = await fetch(gifFrame.url);
              const blob = await response.blob();
              const frameFile = new File([blob], `${file.name.replace(/\.gif$/i, '')}_${j}.png`, { type: 'image/png' });

              newFrames.push({
                id: Math.random().toString(36).substr(2, 9),
                file: frameFile, // Store individual frame file
                previewUrl: gifFrame.url,
                duration: gifFrame.delay || globalDuration,
                x: 0,
                y: 0,
                width: gifFrame.width,
                height: gifFrame.height,
                originalWidth: gifFrame.width,
                originalHeight: gifFrame.height,
              });
            }
            continue; // Skip standard image processing
          }
        } catch (e) {
          console.error("Failed to parse GIF frames, falling back to static image", e);
        }
      }

      showLoadingNotification(t.importingImages.replace('{current}', (i + 1).toString()).replace('{total}', allFiles.length.toString()));

      const url = URL.createObjectURL(file);

      const img = new Image();
      img.src = url;
      await new Promise((resolve) => { img.onload = resolve; });

      // Check for transparency in this image
      if (!hasTransparency) {
        hasTransparency = await checkImageTransparency(file);
      }

      if (newFrames.length === 0 && firstImageWidth === 0) {
        firstImageWidth = img.naturalWidth;
        firstImageHeight = img.naturalHeight;
      }

      // Determine duration: metadata > metadata default > global
      const frameDuration = fileDurationMap.get(file.name) ?? metadataDefaultDuration ?? globalDuration;

      newFrames.push({
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: url,
        duration: frameDuration,
        x: 0,
        y: 0,
        width: img.naturalWidth,
        height: img.naturalHeight,
        originalWidth: img.naturalWidth,
        originalHeight: img.naturalHeight,
      });
    }

    hideNotification();

    if (newFrames.length > 0) {
      setAppState(prev => {
        const isFirstImport = prev.frames.length === 0;
        const shouldAskForTransparent = !isFirstImport && hasTransparency && !prev.canvasConfig.transparent && !hasSeenTransparentPrompt;

        // First import: auto set background based on transparency
        if (isFirstImport) {
          const shouldAutoDisableTransparent = !hasTransparency;
          if (shouldAutoDisableTransparent) {
            showNotification(t.autoDisableTransparent);
          }

          return {
            ...prev,
            frames: [...prev.frames, ...newFrames],
            canvasConfig: {
              ...prev.canvasConfig,
              width: firstImageWidth,
              height: firstImageHeight,
              transparent: hasTransparency ? 'rgba(0,0,0,0)' : null
            }
          };
        }

        // Non-first import: scale frames to fit canvas while maintaining aspect ratio
        const canvasWidth = prev.canvasConfig.width;
        const canvasHeight = prev.canvasConfig.height;

        const scaledFrames = newFrames.map(frame => {
          // Calculate scale to fit within canvas while maintaining aspect ratio
          const scaleX = canvasWidth / frame.originalWidth;
          const scaleY = canvasHeight / frame.originalHeight;
          const scale = Math.min(scaleX, scaleY);

          const scaledWidth = Math.round(frame.originalWidth * scale);
          const scaledHeight = Math.round(frame.originalHeight * scale);

          // Center the frame on canvas
          const x = Math.round((canvasWidth - scaledWidth) / 2);
          const y = Math.round((canvasHeight - scaledHeight) / 2);

          return {
            ...frame,
            width: scaledWidth,
            height: scaledHeight,
            x,
            y
          };
        });

        // Non-first import: ask user if they want to enable transparency
        if (shouldAskForTransparent) {
          setShowTransparentConfirm(true);
          setPendingTransparentSwitch(true);
          setHasSeenTransparentPrompt(true);
        }

        return {
          ...prev,
          frames: [...prev.frames, ...scaledFrames]
        };
      }, 'addFrames');

      // Always select the first imported frame
      setSelectedFrameIds(new Set([newFrames[0].id]));
      lastSelectedIdRef.current = newFrames[0].id;

      // Force reset scroll after a short delay to allow for layout updates
      // This fixes the issue where the page scrolls up when importing the first image
      setTimeout(() => {
        window.scrollTo(0, 0);
        const mainLayout = document.getElementById('main-layout-container');
        if (mainLayout) mainLayout.scrollTop = 0;
      }, 50);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Disable global drag overlay if modal is open to prevent conflict
    if (showInsertModal) return;

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleInsertDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleInsertFiles(e.dataTransfer.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id.toString());
    // Close context menu if open
    setContextMenu(null);

    // Start gathering animation for multi-select
    if (selectedFrameIds.size > 1 && selectedFrameIds.has(event.active.id.toString())) {
      setIsGathering(true);
      // Enable layout animation for the list
      setIsLayoutAnimating(true);

      // After gathering animation completes, remove items from list
      setTimeout(() => {
        setIsGathering(false);
      }, 300);
    } else {
      setIsLayoutAnimating(true);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setIsGathering(false);

    // Keep layout animation active for a bit to show the "insert" animation
    setTimeout(() => {
      setIsLayoutAnimating(false);
    }, 500);

    if (over && active.id !== over.id) {
      setAppState(prev => {
        // Multi-drag support
        if (selectedFrameIds.has(active.id.toString()) && selectedFrameIds.size > 1) {

          const selectedIds = Array.from(selectedFrameIds);
          // Sort selected items by their current index to maintain relative order
          selectedIds.sort((a, b) => {
            return prev.frames.findIndex(f => f.id === a) - prev.frames.findIndex(f => f.id === b);
          });

          const framesWithoutSelected = prev.frames.filter(f => !selectedFrameIds.has(f.id));

          let insertIndex = framesWithoutSelected.findIndex(f => f.id === over.id);

          if (insertIndex === -1) {
            const oldIndex = prev.frames.findIndex(f => f.id === active.id);
            const newIndex = prev.frames.findIndex(f => f.id === over.id);
            return { ...prev, frames: arrayMove(prev.frames, oldIndex, newIndex) };
          }

          const activeIndex = prev.frames.findIndex(f => f.id === active.id);
          const overIndex = prev.frames.findIndex(f => f.id === over.id);

          if (activeIndex < overIndex) {
            insertIndex += 1;
          }

          const framesToInsert = selectedIds.map(id => prev.frames.find(f => f.id === id)!);
          const newFrames = [...framesWithoutSelected];
          newFrames.splice(insertIndex, 0, ...framesToInsert);

          return { ...prev, frames: newFrames };

        } else {
          // Single item move
          const oldIndex = prev.frames.findIndex(f => f.id === active.id);
          const newIndex = prev.frames.findIndex(f => f.id === over.id);
          return {
            ...prev,
            frames: arrayMove(prev.frames, oldIndex, newIndex)
          };
        }
      }, 'reorderFrames');
    }
  };

  const removeFrame = (id: string) => {
    setAppState(prev => ({
      ...prev,
      frames: prev.frames.filter(f => f.id !== id)
    }), 'removeFrame');
    if (selectedFrameIds.has(id)) {
      setSelectedFrameIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Absolute update (from Sidebar or Inputs)
  const handleBatchUpdate = (updates: Partial<FrameData>) => {
    setAppState(prev => ({
      ...prev,
      frames: prev.frames.map(f => {
        if (selectedFrameIds.has(f.id)) {
          return { ...f, ...updates };
        }
        return f;
      })
    }), 'batchUpdate');
  };

  const handleBatchInputChange = (field: keyof typeof batchInputValues, value: string) => {
    setBatchInputValues(prev => ({ ...prev, [field]: value }));
  };

  const applyBatchUpdates = () => {
    const updates: Partial<FrameData> = {};
    if (batchInputValues.x !== '') updates.x = parseInt(batchInputValues.x);
    if (batchInputValues.y !== '') updates.y = parseInt(batchInputValues.y);
    if (batchInputValues.width !== '') updates.width = parseInt(batchInputValues.width);
    if (batchInputValues.height !== '') updates.height = parseInt(batchInputValues.height);
    if (batchInputValues.duration !== '') updates.duration = parseInt(batchInputValues.duration);

    if (Object.keys(updates).length > 0) {
      handleBatchUpdate(updates);
    }
  };

  // Single update (FrameItem input)
  const updateFrame = (id: string, updates: Partial<FrameData>) => {
    setAppState(prev => ({
      ...prev,
      frames: prev.frames.map(f => f.id === id ? { ...f, ...updates } : f)
    }), 'updateFrame');
  };

  const handleResetFrame = (id: string) => {
    setAppState(prev => ({
      ...prev,
      frames: prev.frames.map(f => {
        if (f.id === id) {
          return {
            ...f,
            x: 0,
            y: 0,
            width: f.originalWidth,
            height: f.originalHeight,
          };
        }
        return f;
      })
    }), 'resetFrame');
  };

  // Canvas Editor Updates
  // Receives absolute new attributes for the active frame.
  // Calculates the delta and applies it to all selected frames.
  const handleCanvasUpdate = (newAttrs: Partial<FrameData>, commit: boolean = true) => {
    const updateFn = (prev: AppState) => {
      // Find the active frame (the one being edited in the canvas)
      // We assume it's the last selected one as that's what we pass to CanvasEditor
      const activeId = Array.from(selectedFrameIds).pop();
      if (!activeId) return prev;

      const activeFrame = prev.frames.find(f => f.id === activeId);
      if (!activeFrame) return prev;

      // Calculate deltas based on the difference between the requested new attributes
      // and the current state of the active frame.
      const dx = newAttrs.x !== undefined ? newAttrs.x - activeFrame.x : 0;
      const dy = newAttrs.y !== undefined ? newAttrs.y - activeFrame.y : 0;
      const dw = newAttrs.width !== undefined ? newAttrs.width - activeFrame.width : 0;
      const dh = newAttrs.height !== undefined ? newAttrs.height - activeFrame.height : 0;

      // Rotation is absolute, not delta, and only applies to the active frame usually,
      // but for batch operations we might want to apply it to all?
      // For now, let's apply rotation change as a delta too if needed, or absolute if it's a set operation.
      // Since rotation is usually a toggle (90deg), let's treat it as absolute for the active frame
      // and apply the same absolute rotation to others? Or delta?
      // Let's stick to absolute for rotation if provided.
      const newRotation = newAttrs.rotation;

      return {
        ...prev,
        frames: prev.frames.map(f => {
          if (selectedFrameIds.has(f.id)) {
            const updatedFrame = {
              ...f,
              x: Math.round(f.x + dx),
              y: Math.round(f.y + dy),
              width: Math.max(1, Math.round(f.width + dw)),
              height: Math.max(1, Math.round(f.height + dh)),
            };

            if (newRotation !== undefined) {
              updatedFrame.rotation = newRotation;
            }

            return updatedFrame;
          }
          return f;
        })
      };
    };

    if (commit) {
      setAppState(updateFn, 'transformFrame');
    } else {
      overwriteAppState(updateFn);
    }
  };

  const clearAll = useCallback(async () => {
    if (clearFramesConfirm) {
      setAppState(prev => ({ ...prev, frames: [] }));
      setGeneratedGif(null);
      setSelectedFrameIds(new Set());
      setClearFramesConfirm(false);
    } else {
      setClearFramesConfirm(true);
      setTimeout(() => setClearFramesConfirm(false), 2000);
    }
  }, [clearFramesConfirm, setAppState]);

  const sortByFilename = (direction: 'asc' | 'desc') => {
    setAppState(prev => {
      const sorted = [...prev.frames].sort((a, b) => {
        const nameA = a.file.name;
        const nameB = b.file.name;
        return direction === 'asc'
          ? nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' })
          : nameB.localeCompare(nameA, undefined, { numeric: true, sensitivity: 'base' });
      });
      return { ...prev, frames: sorted };
    });
  };

  // Convert FPS to milliseconds per frame
  const fpsToMs = (fps: number): number => {
    return Math.round(1000 / fps);
  };

  // Convert milliseconds to FPS
  const msToFps = (ms: number): number => {
    return Math.round(1000 / ms * 10) / 10; // Round to 1 decimal place
  };

  const updateGlobalDuration = () => {
    // Calculate duration based on current mode
    const duration = durationMode === 'fps' ? fpsToMs(fpsValue) : globalDuration;

    setAppState(prev => ({
      ...prev,
      frames: prev.frames.map(f => ({ ...f, duration }))
    }));

    // Sync the other mode's value
    if (durationMode === 'fps') {
      setGlobalDuration(duration);
    } else {
      setFpsValue(msToFps(duration));
    }
  };

  const handleAutoFit = () => {
    const { width: canvasW, height: canvasH } = canvasConfig;

    setAppState(prev => ({
      ...prev,
      frames: prev.frames.map(frame => {
        let newWidth = frame.originalWidth;
        let newHeight = frame.originalHeight;
        let newX = 0;
        let newY = 0;

        if (fitMode === 'fill') {
          newWidth = canvasW;
          newHeight = canvasH;
        } else {
          // Contain logic
          const scale = Math.min(canvasW / frame.originalWidth, canvasH / frame.originalHeight);
          newWidth = Math.round(frame.originalWidth * scale);
          newHeight = Math.round(frame.originalHeight * scale);
          newX = Math.round((canvasW - newWidth) / 2);
          newY = Math.round((canvasH - newHeight) / 2);
        }

        return {
          ...frame,
          width: newWidth,
          height: newHeight,
          x: newX,
          y: newY
        };
      })
    }), 'batchUpdate');
  };

  const handleAlignCenter = (target: 'all' | 'selected') => {
    const { width: canvasW, height: canvasH } = canvasConfig;

    setAppState(prev => ({
      ...prev,
      frames: prev.frames.map(frame => {
        if (target === 'selected' && !selectedFrameIds.has(frame.id)) {
          return frame;
        }

        const newX = Math.round((canvasW - frame.width) / 2);
        const newY = Math.round((canvasH - frame.height) / 2);

        return {
          ...frame,
          x: newX,
          y: newY
        };
      })
    }), 'batchUpdate');
  };

  const handleFitSelected = (mode: 'fill' | 'contain') => {
    const { width: canvasW, height: canvasH } = canvasConfig;

    setAppState(prev => ({
      ...prev,
      frames: prev.frames.map(frame => {
        if (!selectedFrameIds.has(frame.id)) return frame;

        let newWidth = frame.originalWidth;
        let newHeight = frame.originalHeight;
        let newX = 0;
        let newY = 0;

        if (mode === 'fill') {
          newWidth = canvasW;
          newHeight = canvasH;
        } else {
          // Contain logic
          const scale = Math.min(canvasW / frame.originalWidth, canvasH / frame.originalHeight);
          newWidth = Math.round(frame.originalWidth * scale);
          newHeight = Math.round(frame.originalHeight * scale);
          newX = Math.round((canvasW - newWidth) / 2);
          newY = Math.round((canvasH - newHeight) / 2);
        }

        return {
          ...frame,
          width: newWidth,
          height: newHeight,
          x: newX,
          y: newY
        };
      })
    }), 'batchUpdate');
  };

  const saveSnapshot = useCallback(async (providedName?: string, thumbnail?: string, thumbnailBlob?: Blob) => {
    const name = providedName || prompt(translations[language].promptSave, `Version ${snapshots.length + 1}`);
    if (name) {
      const snapshot: HistorySnapshot = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        name,
        frames: [...frames],
        canvasConfig: { ...canvasConfig },
        thumbnail: thumbnail
      };

      setSnapshots(prev => [snapshot, ...prev]);
      if (!providedName) {
        setShowSnapshots(true);
      }

      try {
        await saveSnapshotToDB(snapshot, thumbnailBlob);
      } catch (e) {
        console.error("Failed to save snapshot to IndexedDB", e);
      }
    }
  }, [frames, canvasConfig, language, snapshots.length]);

  const restoreSnapshot = (snapshot: HistorySnapshot) => {
    if (restoreConfirmId === snapshot.id) {
      setAppState({
        frames: snapshot.frames,
        canvasConfig: snapshot.canvasConfig
      });
      setShowSnapshots(false);
      setRestoreConfirmId(null);
      setSelectedFrameIds(new Set());
    } else {
      setRestoreConfirmId(snapshot.id);
      setTimeout(() => setRestoreConfirmId(null), 2000);
    }
  };

  const deleteSnapshot = async (id: string) => {
    setSnapshots(prev => prev.filter(s => s.id !== id));
    try {
      await deleteSnapshotFromDB(id);
    } catch (e) {
      console.error("Failed to delete snapshot from DB", e);
    }
  };

  const clearHistoryRecords = async () => {
    if (clearHistoryConfirm) {
      setSnapshots([]);
      setClearHistoryConfirm(false);
      try {
        await clearSnapshotsFromDB();
      } catch (e) {
        console.error("Failed to clear DB", e);
      }
    } else {
      setClearHistoryConfirm(true);
      setTimeout(() => setClearHistoryConfirm(false), 2000);
    }
  };

  const handleGithubLinkClick = () => {
    if (githubLinkConfirm) {
      window.open('https://github.com/Arminosi/GifBuilder/', '_blank', 'noopener,noreferrer');
      setGithubLinkConfirm(false);
    } else {
      setGithubLinkConfirm(true);
      setTimeout(() => setGithubLinkConfirm(false), 2000);
    }
  };

  const handleCanvasWidthChange = (width: number) => {
    setAppState(prev => {
      const newWidth = width || 100;
      const newHeight = isAspectRatioLocked ? Math.round(newWidth / aspectRatio) : prev.canvasConfig.height;

      // Calculate scale ratios
      const scaleX = newWidth / prev.canvasConfig.width;
      const scaleY = newHeight / prev.canvasConfig.height;

      // Scale all frames
      const scaledFrames = prev.frames.map(frame => ({
        ...frame,
        x: Math.round(frame.x * scaleX),
        y: Math.round(frame.y * scaleY),
        width: Math.round(frame.width * scaleX),
        height: Math.round(frame.height * scaleY)
      }));

      return {
        ...prev,
        frames: scaledFrames,
        canvasConfig: { ...prev.canvasConfig, width: newWidth, height: newHeight }
      };
    });
  };

  const handleCanvasHeightChange = (height: number) => {
    setAppState(prev => {
      const newHeight = height || 100;
      const newWidth = isAspectRatioLocked ? Math.round(newHeight * aspectRatio) : prev.canvasConfig.width;

      // Calculate scale ratios
      const scaleX = newWidth / prev.canvasConfig.width;
      const scaleY = newHeight / prev.canvasConfig.height;

      // Scale all frames
      const scaledFrames = prev.frames.map(frame => ({
        ...frame,
        x: Math.round(frame.x * scaleX),
        y: Math.round(frame.y * scaleY),
        width: Math.round(frame.width * scaleX),
        height: Math.round(frame.height * scaleY)
      }));

      return {
        ...prev,
        frames: scaledFrames,
        canvasConfig: { ...prev.canvasConfig, width: newWidth, height: newHeight }
      };
    });
  };

  const toggleAspectRatioLock = () => {
    if (!isAspectRatioLocked) {
      // Locking: save current aspect ratio
      setAspectRatio(canvasConfig.width / canvasConfig.height);
    }
    setIsAspectRatioLocked(!isAspectRatioLocked);
  };

  const handleGenerate = async () => {
    if (frames.length === 0) return;
    setIsGenerating(true);
    setProgress(0);
    setProgressText(t.generation.preparing);
    setGeneratedGif(null);

    try {
      const targetMB = parseFloat(targetSizeMB);
      const blob = await generateGIF(
        frames,
        {
          ...canvasConfig,
          enableColorSmoothing
        },
        (p) => setProgress(p * 100),
        !isNaN(targetMB) && targetMB > 0 ? targetMB : undefined,
        (status) => setProgressText(status),
        t.generation,
        isGifTransparentEnabled ? gifTransparentColor : null
      );
      const url = URL.createObjectURL(blob);
      setGeneratedGif(url);

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      saveSnapshot(`${t.autoSaved} - ${timeStr}`, url, blob);

    } catch (error) {
      console.error(error);
      alert(t.failed);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportZip = async (sourceFrames = frames) => {
    if (sourceFrames.length === 0) return;
    setIsZipping(true);

    try {
      const blob = await generateFrameZip(sourceFrames);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `images_seq_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      // Save to history (only if we are packing the current frames)
      if (sourceFrames === frames) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        // Use first frame as thumbnail or no thumbnail
        saveSnapshot(`${t.zipSaved} - ${timeStr}`, undefined, undefined);
      }

    } catch (error) {
      console.error(error);
      alert("Failed to create ZIP");
    } finally {
      setIsZipping(false);
    }
  };

  const handleBgColorChange = (color: string) => {
    setAppState(prev => ({
      ...prev,
      canvasConfig: {
        ...prev.canvasConfig,
        backgroundColor: color,
        transparent: null
      }
    }));
  };

  const handleTransparentChange = (checked: boolean) => {
    setAppState(prev => ({
      ...prev,
      canvasConfig: {
        ...prev.canvasConfig,
        transparent: checked ? 'rgba(0,0,0,0)' : null
      }
    }));
  };

  // Handle transparent background confirmation dialog
  const handleConfirmTransparentSwitch = (switchToTransparent: boolean) => {
    setDialogClosing(true);
    setTimeout(() => {
      setShowTransparentConfirm(false);
      setDialogClosing(false);
      setPendingTransparentSwitch(false);

      if (switchToTransparent) {
        setAppState(prev => ({
          ...prev,
          canvasConfig: {
            ...prev.canvasConfig,
            transparent: 'rgba(0,0,0,0)'
          }
        }));
        showNotification(t.transparentConfirm.switch);
      }
    }, 250);
  };

  const handleRemoveBackground = async () => {
    if (!removeColor || selectedFrameIds.size === 0) return;

    // Convert hex to rgb
    const r = parseInt(removeColor.slice(1, 3), 16);
    const g = parseInt(removeColor.slice(3, 5), 16);
    const b = parseInt(removeColor.slice(5, 7), 16);

    // Threshold calculation: tolerance (0-100) maps to distance
    // Max Euclidean distance is sqrt(255^2 * 3) approx 441
    const maxDist = 441;
    const threshold = (tolerance / 100) * maxDist;

    const newFrames = await Promise.all(frames.map(async (frame) => {
      if (!selectedFrameIds.has(frame.id)) return frame;

      const img = new Image();
      img.src = frame.previewUrl;
      await new Promise(resolve => img.onload = resolve);

      const canvas = document.createElement('canvas');
      canvas.width = frame.originalWidth;
      canvas.height = frame.originalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return frame;

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const pr = data[i];
        const pg = data[i + 1];
        const pb = data[i + 2];

        const dist = Math.sqrt(
          Math.pow(pr - r, 2) +
          Math.pow(pg - g, 2) +
          Math.pow(pb - b, 2)
        );

        if (dist <= threshold) {
          data[i + 3] = 0; // Transparent
        }
      }

      ctx.putImageData(imageData, 0, 0);

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return frame;

      const newFile = new File([blob], frame.file.name, { type: 'image/png' });
      const newUrl = URL.createObjectURL(newFile);

      return {
        ...frame,
        file: newFile,
        previewUrl: newUrl
      };
    }));

    setAppState(prev => ({ ...prev, frames: newFrames }));
  };

  const handleMergeDuplicates = async () => {
    if (frames.length < 2) return;

    showNotification(t.merging);
    // Allow UI to update
    await new Promise(resolve => setTimeout(resolve, 50));

    const newFrames: FrameData[] = [];
    if (frames.length === 0) return;

    newFrames.push(frames[0]);
    let lastFrameBuffer = await frames[0].file.arrayBuffer();

    let mergedCount = 0;

    for (let i = 1; i < frames.length; i++) {
      const currentFrame = frames[i];

      // Optimistic check: if files are exactly the same object, they are duplicates
      // But here we likely have different file objects.

      // Size check first
      const currentSize = currentFrame.file.size;
      const lastSize = newFrames[newFrames.length - 1].file.size;

      if (currentSize !== lastSize) {
        newFrames.push(currentFrame);
        lastFrameBuffer = await currentFrame.file.arrayBuffer();
        continue;
      }

      try {
        const currentFrameBuffer = await currentFrame.file.arrayBuffer();

        if (lastFrameBuffer.byteLength !== currentFrameBuffer.byteLength) {
          newFrames.push(currentFrame);
          lastFrameBuffer = currentFrameBuffer;
          continue;
        }

        const view1 = new Uint8Array(lastFrameBuffer);
        const view2 = new Uint8Array(currentFrameBuffer);
        let areEqual = true;

        for (let j = 0; j < view1.length; j++) {
          if (view1[j] !== view2[j]) {
            areEqual = false;
            break;
          }
        }

        if (areEqual) {
          // Merge into the last frame of newFrames
          const lastFrame = newFrames[newFrames.length - 1];
          newFrames[newFrames.length - 1] = {
            ...lastFrame,
            duration: lastFrame.duration + currentFrame.duration
          };
          mergedCount++;
        } else {
          newFrames.push(currentFrame);
          lastFrameBuffer = currentFrameBuffer;
        }
      } catch (e) {
        console.error("Error comparing frames", e);
        newFrames.push(currentFrame);
        // Update buffer for next iteration just in case
        lastFrameBuffer = await currentFrame.file.arrayBuffer();
      }
    }

    if (mergedCount > 0) {
      setAppState(prev => ({
        ...prev,
        frames: newFrames
      }));
      showNotification(t.mergeSuccess.replace('{count}', mergedCount.toString()));
    } else {
      showNotification(t.noDuplicates);
    }
  };



  const handleReduceFrames = () => {
    if (reduceKeep <= 0 || reduceRemove <= 0) {
      showNotification(t.reduceFrames.invalid);
      return;
    }

    const total = reduceKeep + reduceRemove;
    const newFrames = frames.filter((_, index) => {
      const pos = index % total;
      return pos < reduceKeep;
    });

    const removedCount = frames.length - newFrames.length;

    if (removedCount > 0) {
      setAppState(prev => ({ ...prev, frames: newFrames }));
      showNotification(t.reduceFrames.success.replace('{count}', removedCount.toString()));
    }
  };

  // Find the primary selected frame for the editor (last selected usually)
  const lastSelectedId = Array.from(selectedFrameIds).pop();
  const selectedFrame = frames.find(f => f.id === lastSelectedId) || null;
  const selectedFrameIndex = frames.findIndex(f => f.id === lastSelectedId);
  const activeDragFrame = activeDragId ? frames.find(f => f.id === activeDragId) : null;

  // --- Resizing Logic ---
  const isResizingSidebar = useRef(false);
  const isResizingEditor = useRef(false);

  const handleSidebarResizeStart = useCallback(() => {
    isResizingSidebar.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleEditorResizeStart = useCallback(() => {
    isResizingEditor.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    isResizingSidebar.current = false;
    isResizingEditor.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizingSidebar.current) {
      const newWidth = e.clientX;
      // Limit min width to 260px to prevent layout breaking
      if (newWidth > 260 && newWidth < 600) {
        setSidebarWidth(newWidth);
      }
    }
    if (isResizingEditor.current) {
      const headerHeight = 64;
      const newHeight = e.clientY - headerHeight;
      if (newHeight > 200 && newHeight < 800) {
        setEditorHeight(newHeight);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  // --- Render Helpers ---

  // Calculate visible frames for drag and drop
  // When multi-dragging, hide other selected frames to simulate them being "picked up" into the stack
  const visibleFrames = React.useMemo(() => {
    // If gathering (animation playing), show all frames
    if (isGathering) return frames;

    if (activeDragId && selectedFrameIds.has(activeDragId) && selectedFrameIds.size > 1) {
      return frames.filter(f => !selectedFrameIds.has(f.id) || f.id === activeDragId);
    }
    return frames;
  }, [frames, activeDragId, selectedFrameIds, isGathering]);

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-200 overflow-hidden" onDragEnter={handleDrag}>
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideOutDown {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(20px);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        @keyframes scaleOut {
          from {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          to {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
        }
        .animate-slide-in-up {
          animation: slideInUp 0.3s ease-out forwards;
        }
        .animate-slide-out-down {
          animation: slideOutDown 0.25s ease-in forwards;
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-fade-out {
          animation: fadeOut 0.2s ease-in forwards;
        }
        .animate-scale-in {
          animation: scaleIn 0.3s ease-out forwards;
        }
        .animate-scale-out {
          animation: scaleOut 0.25s ease-in forwards;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #4b5563 transparent;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #374151;
          border-radius: 20px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #4b5563;
        }

        /* Number Input Spin Buttons Style Optimization for Dark Mode */
        input[type="number"] {
          color-scheme: dark;
        }
        
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          opacity: 0.2;
          transition: opacity 0.2s;
          cursor: pointer;
          margin-left: 2px;
        }
        
        input[type="number"]:hover::-webkit-inner-spin-button,
        input[type="number"]:hover::-webkit-outer-spin-button,
        input[type="number"]:focus::-webkit-inner-spin-button,
        input[type="number"]:focus::-webkit-outer-spin-button {
          opacity: 1;
        }
      `}</style>

      {/* Header */}
      <header className="h-14 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between px-3 lg:px-6 shrink-0 z-20 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-lg hover:bg-gray-800 transition-colors ${!isSidebarOpen ? 'bg-gray-800 text-blue-400' : 'text-gray-400'}`}
            title={t.toggleSidebar}
          >
            <PanelLeft size={20} />
          </button>

          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm hidden sm:flex">
            <Film size={18} className="stroke-[2.5]" />
          </div>
          <h1 className="text-lg lg:text-xl font-bold bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent tracking-tight hidden sm:block">
            GifBuilder
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="h-9 px-3 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white flex items-center gap-2 border border-transparent hover:border-gray-700"
            title={language === 'en' ? "Switch to Chinese" : "Switch to English"}
          >
            <Languages size={16} />
            <span className="text-xs font-semibold hidden sm:inline tracking-wide">{language === 'en' ? 'EN' : '中文'}</span>
          </button>

          <div className="h-6 w-px bg-gray-800 mx-0.5"></div>

          {/* History Controls */}
          <div className="relative">
            <div className="flex items-center bg-gray-800/80 rounded-lg p-1 border border-gray-700 h-9">
              <button
                onClick={undo} disabled={!canUndo}
                className="w-7 h-7 flex items-center justify-center hover:bg-gray-700 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title={t.undo}
              >
                <Undo2 size={14} />
              </button>
              <div className="w-px h-3.5 bg-gray-700 mx-0.5" />
              <button
                onClick={redo} disabled={!canRedo}
                className="w-7 h-7 flex items-center justify-center hover:bg-gray-700 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title={t.redo}
              >
                <Redo2 size={14} />
              </button>
              <div className="w-px h-3.5 bg-gray-700 mx-0.5" />
              <button
                onClick={() => setShowHistoryStack(!showHistoryStack)}
                className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${showHistoryStack ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-400'}`}
                title="History Stack"
              >
                <List size={14} />
              </button>
            </div>

            {/* History Stack Panel */}
          </div>

          <button
            onClick={() => setShowSnapshots(!showSnapshots)}
            className={`h-9 px-3 rounded-lg border transition-all flex items-center gap-2 ${showSnapshots ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300'}`}
          >
            <History size={16} />
            <span className="hidden md:inline text-xs font-semibold tracking-wide">{t.records}</span>
            {snapshots.length > 0 && (
              <span className="bg-blue-500 text-white text-[10px] px-1.5 h-4 flex items-center rounded-full font-bold">{snapshots.length}</span>
            )}
          </button>

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportZip(frames)}
              disabled={frames.length === 0 || isZipping}
              className="h-9 px-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 border border-gray-700 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all"
              title={t.exportZip}
            >
              {isZipping ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
              <span className="hidden xl:inline">{t.exportZip}</span>
            </button>

            <button
              onClick={handleGenerate}
              disabled={frames.length === 0 || isGenerating}
              className="h-9 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all tracking-wide"
            >
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
              <span className="hidden sm:inline">{t.generate}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div id="main-layout-container" className="flex flex-col lg:flex-row flex-1 overflow-hidden relative min-h-0">

        {/* Drag Overlay */}
        {dragActive && (
          <div
            className="absolute inset-0 bg-blue-500/20 border-4 border-blue-500 border-dashed z-[100] flex items-center justify-center backdrop-blur-sm"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="bg-gray-900 p-8 rounded-xl shadow-2xl flex flex-col items-center pointer-events-none">
              <Upload size={48} className="text-blue-400 mb-4" />
              <h2 className="text-2xl font-bold text-white">{t.dropHere}</h2>
            </div>
          </div>
        )}

        {/* Left Sidebar: Controls & Upload */}
        {/* Mobile Overlay */}
        {!isLargeScreen && isSidebarOpen && (
          <div
            className="fixed inset-0 top-14 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <aside
          className={`bg-gray-900 lg:border-r border-b lg:border-b-0 border-gray-800 flex flex-col overflow-y-auto overflow-x-hidden shrink-0 custom-scrollbar transition-all duration-300 ease-in-out z-50 ${isLargeScreen
            ? (isSidebarOpen ? 'opacity-100' : 'opacity-0 lg:border-r-0 border-b-0 overflow-hidden')
            : (isSidebarOpen ? 'fixed top-14 bottom-0 left-0 w-[85%] max-w-[320px] shadow-2xl translate-x-0' : 'fixed top-14 bottom-0 left-0 w-[85%] max-w-[320px] shadow-2xl -translate-x-full')
            }`}
          style={{ width: isLargeScreen ? (isSidebarOpen ? sidebarWidth : 0) : '100%' }}
        >
          <div style={{ width: isLargeScreen ? sidebarWidth : '100%' }}>
            <div className="p-4 space-y-8">

              {/* Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(true);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFileUpload(e.dataTransfer.files);
                  }
                }}
                className="border-2 border-dashed border-gray-700 hover:border-blue-500 hover:bg-gray-800/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group"
              >
                <input
                  type="file"
                  multiple
                  accept="image/*,.zip,application/zip"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <ImagePlus className="text-gray-400 group-hover:text-blue-400" size={24} />
                </div>
                <p className="text-sm font-medium text-gray-300 text-center">{t.clickDrag}</p>
                <p className="text-xs text-gray-500 mt-1">{t.supports}</p>
              </div>

              {/* Section: Canvas Environment */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">{t.sections.canvas}</h3>

                <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 space-y-4">
                  {/* Dimensions */}
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 mb-1 block uppercase">{t.width}</label>
                      <input
                        type="number"
                        value={canvasConfig.width}
                        onChange={(e) => handleCanvasWidthChange(parseInt(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <button
                      onClick={toggleAspectRatioLock}
                      className={`p-2 rounded border transition-all shrink-0 mb-[1px] ${isAspectRatioLocked
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                        }`}
                      title={isAspectRatioLocked ? t.unlockAspectRatio : t.lockAspectRatio}
                    >
                      {isAspectRatioLocked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 mb-1 block uppercase">{t.height}</label>
                      <input
                        type="number"
                        value={canvasConfig.height}
                        onChange={(e) => handleCanvasHeightChange(parseInt(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Background */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-gray-500 uppercase">{t.backgroundColor}</label>
                      <Palette size={12} className="text-gray-600" />
                    </div>

                    <div className="flex rounded-lg border border-gray-700 bg-gray-800/50 p-0.5">
                      <button
                        onClick={() => handleTransparentChange(true)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${canvasConfig.transparent === 'rgba(0,0,0,0)' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
                      >
                        {t.transparent}
                      </button>
                      <button
                        onClick={() => handleTransparentChange(false)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${!canvasConfig.transparent ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
                      >
                        {t.backgroundColor}
                      </button>
                    </div>

                    {canvasConfig.transparent ? (
                      <div className="space-y-2 pt-1 px-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">{t.bgRemoval.gifTransparent}</span>
                          <div className="flex bg-gray-800 rounded border border-gray-700 p-0.5 scale-90 origin-right">
                            <button
                              onClick={() => setIsGifTransparentEnabled(false)}
                              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${!isGifTransparentEnabled ? 'bg-gray-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                              {t.bgRemoval.auto}
                            </button>
                            <button
                              onClick={() => setIsGifTransparentEnabled(true)}
                              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${isGifTransparentEnabled ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                              {t.bgRemoval.manual}
                            </button>
                          </div>
                        </div>

                        {isGifTransparentEnabled && (
                          <div className="flex gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex-1 flex items-center gap-2 bg-gray-800 border border-gray-700 rounded px-2 py-1.5">
                              <div
                                className="w-4 h-4 rounded border border-gray-600 shadow-sm"
                                style={{ backgroundColor: gifTransparentColor }}
                              />
                              <input
                                type="text"
                                value={gifTransparentColor}
                                onChange={(e) => setGifTransparentColor(e.target.value)}
                                className="flex-1 bg-transparent border-none text-xs focus:outline-none min-w-0 font-mono"
                              />
                              <input
                                type="color"
                                value={gifTransparentColor}
                                onChange={(e) => setGifTransparentColor(e.target.value)}
                                className="w-6 h-6 opacity-0 absolute cursor-pointer"
                                title="Picker"
                              />
                            </div>
                            <button
                              onClick={() => setIsGifEyeDropperActive(!isGifEyeDropperActive)}
                              className={`p-2 rounded border transition-colors ${isGifEyeDropperActive ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                              title={t.bgRemoval.eyeDropper}
                            >
                              <Pipette size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200 pt-1">
                        <div className="flex-1 flex items-center gap-2 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 transition-colors hover:border-gray-600">
                          <div
                            className="w-4 h-4 rounded border border-gray-600 shadow-sm"
                            style={{ backgroundColor: canvasConfig.backgroundColor || '#ffffff' }}
                          />
                          <input
                            type="text"
                            value={canvasConfig.backgroundColor || '#ffffff'}
                            onChange={(e) => handleBgColorChange(e.target.value)}
                            className="flex-1 bg-transparent border-none text-xs focus:outline-none min-w-0 font-mono"
                          />
                          <input
                            type="color"
                            value={canvasConfig.backgroundColor || '#ffffff'}
                            onChange={(e) => handleBgColorChange(e.target.value)}
                            className="w-6 h-6 opacity-0 absolute cursor-pointer"
                          />
                        </div>
                        <button
                          onClick={() => setIsBgColorEyeDropperActive(!isBgColorEyeDropperActive)}
                          className={`p-2 rounded border transition-colors ${isBgColorEyeDropperActive ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                          title={t.bgRemoval.eyeDropper}
                        >
                          <Pipette size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section: Export Settings */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">{t.sections.export}</h3>
                <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 font-medium">{t.outputControl.targetSize}:</span>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        placeholder={t.outputControl.unlimited}
                        value={targetSizeMB}
                        onChange={(e) => setTargetSizeMB(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm min-w-0 focus:border-blue-500 focus:outline-none pr-8"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">MB</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-2 leading-relaxed">{t.outputControl.autoAdjust}</p>

                  {/* Color Smoothing Toggle */}
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="text-xs text-gray-400 font-medium cursor-pointer" htmlFor="color-smoothing-toggle">
                          {language === 'zh' ? '颜色平滑' : 'Color Smoothing'}
                        </label>
                        <p className="text-[10px] text-gray-600 mt-1 leading-relaxed">
                          {language === 'zh'
                            ? '自动识别并平滑相邻帧之间的相似颜色，减少播放时的色彩抖动'
                            : 'Automatically smooth similar colors between frames to reduce color flickering'}
                        </p>
                      </div>
                      <button
                        id="color-smoothing-toggle"
                        onClick={() => setEnableColorSmoothing(!enableColorSmoothing)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${enableColorSmoothing ? 'bg-blue-600' : 'bg-gray-700'
                          }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enableColorSmoothing ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Batch Operations */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">{t.sections.batch}</h3>

                <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 space-y-4">
                  {/* Duration */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-gray-500 uppercase block">{t.setDuration}</label>
                      {/* Mode Toggle */}
                      <div className="flex rounded-md border border-gray-700 bg-gray-800/50 overflow-hidden p-0.5">
                        <button
                          onClick={() => {
                            setDurationMode('ms');
                            // Sync FPS value when switching to ms mode
                            setFpsValue(msToFps(globalDuration));
                          }}
                          className={`px-2 py-0.5 text-[9px] font-medium rounded transition-colors ${durationMode === 'ms'
                            ? 'bg-gray-700 text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-400'
                            }`}
                        >
                          MS
                        </button>
                        <button
                          onClick={() => {
                            setDurationMode('fps');
                            // Sync ms value when switching to fps mode
                            setGlobalDuration(fpsToMs(fpsValue));
                          }}
                          className={`px-2 py-0.5 text-[9px] font-medium rounded transition-colors ${durationMode === 'fps'
                            ? 'bg-gray-700 text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-400'
                            }`}
                        >
                          FPS
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {durationMode === 'ms' ? (
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            value={globalDuration}
                            onChange={(e) => {
                              const ms = parseInt(e.target.value) || 100;
                              setGlobalDuration(ms);
                              setFpsValue(msToFps(ms));
                            }}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm pr-8 focus:border-blue-500 focus:outline-none"
                            min="10"
                            step="10"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">ms</span>
                        </div>
                      ) : (
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            value={fpsValue === 0 ? '' : fpsValue}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '') {
                                setFpsValue(0); // Temporarily set to 0 when empty
                              } else {
                                const fps = parseInt(value) || 0;
                                setFpsValue(fps);
                                if (fps > 0) {
                                  setGlobalDuration(fpsToMs(fps));
                                }
                              }
                            }}
                            onBlur={(e) => {
                              // Validate on blur - set to 10 if empty or invalid
                              const value = e.target.value;
                              if (value === '' || parseInt(value) <= 0) {
                                setFpsValue(10);
                                setGlobalDuration(fpsToMs(10));
                              }
                            }}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm pr-10 focus:border-blue-500 focus:outline-none"
                            min="1"
                            step="1"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">fps</span>
                        </div>
                      )}
                      <button
                        onClick={updateGlobalDuration}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs font-medium transition-colors"
                      >
                        {t.apply}
                      </button>
                    </div>
                    {/* Show conversion hint */}
                    <p className="text-[9px] text-gray-600">
                      {durationMode === 'ms'
                        ? `≈ ${msToFps(globalDuration)} fps`
                        : fpsValue > 0
                          ? `≈ ${fpsToMs(fpsValue)} ms`
                          : '请输入 FPS 值'
                      }
                    </p>
                  </div>

                  <div className="w-full h-px bg-gray-800" />

                  {/* Auto Fit */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-gray-500 uppercase">{t.autoFit}</label>
                      <Scaling size={12} className="text-gray-600" />
                    </div>
                    <div className="flex rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden p-0.5">
                      <button
                        onClick={() => setFitMode('fill')}
                        className={`flex-1 py-1 text-[10px] font-medium rounded-md transition-colors ${fitMode === 'fill' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-400'}`}
                      >
                        {t.fitFill}
                      </button>
                      <button
                        onClick={() => setFitMode('contain')}
                        className={`flex-1 py-1 text-[10px] font-medium rounded-md transition-colors ${fitMode === 'contain' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-400'}`}
                      >
                        {t.fitContain}
                      </button>
                    </div>
                    <button
                      onClick={handleAutoFit}
                      className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 text-gray-300"
                    >
                      <Maximize size={12} /> {t.applyFit}
                    </button>
                  </div>

                  <div className="w-full h-px bg-gray-800" />

                  {/* Positioning & Merge */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAlignCenter('all')}
                      className="py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs font-medium transition-colors flex flex-col items-center justify-center gap-1.5 text-gray-300"
                      title={t.alignCenter}
                    >
                      <AlignCenter size={14} />
                      <span className="text-[10px]">{t.alignCenter}</span>
                    </button>
                    <button
                      onClick={handleMergeDuplicates}
                      className="py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs font-medium transition-colors flex flex-col items-center justify-center gap-1.5 text-gray-300"
                      title={t.mergeDuplicates}
                    >
                      <Merge size={14} />
                      <span className="text-[10px]">{t.mergeDuplicates}</span>
                    </button>
                  </div>

                  {/* Sorting */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => sortByFilename('asc')}
                      className="py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs transition-colors flex items-center justify-center gap-1.5 text-gray-400 hover:text-gray-200"
                    >
                      <ArrowDownAZ size={14} />
                      <span className="text-[10px] uppercase">A-Z</span>
                    </button>
                    <button
                      onClick={() => sortByFilename('desc')}
                      className="py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs transition-colors flex items-center justify-center gap-1.5 text-gray-400 hover:text-gray-200"
                    >
                      <ArrowUpAZ size={14} />
                      <span className="text-[10px] uppercase">Z-A</span>
                    </button>
                  </div>

                  <div className="w-full h-px bg-gray-800" />

                  {/* Reduce Frames */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Scissors size={12} className="text-gray-500" />
                      <label className="text-[10px] text-gray-500 uppercase">{t.reduceFrames.title}</label>
                    </div>
                    <div className="flex items-center justify-between gap-1 text-xs text-gray-400 bg-gray-800/50 p-1.5 rounded-lg border border-gray-700/50">
                      <span className="text-[10px]">{t.reduceFrames.every}</span>
                      <input
                        type="number"
                        min="1"
                        value={reduceKeep}
                        onChange={(e) => setReduceKeep(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-10 bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-center text-xs"
                      />
                      <span className="text-[10px]">{t.reduceFrames.remove}</span>
                      <input
                        type="number"
                        min="1"
                        value={reduceRemove}
                        onChange={(e) => setReduceRemove(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-10 bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-center text-xs"
                      />
                    </div>
                    <button
                      onClick={handleReduceFrames}
                      className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs font-medium transition-colors flex items-center justify-center gap-2 text-gray-300"
                    >
                      {t.reduceFrames.apply}
                    </button>
                  </div>

                </div>
              </div>

              {/* Section: Image Processing */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">{t.sections.image}</h3>
                <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-gray-500 uppercase">{t.bgRemoval.title}</label>
                    <Eraser size={12} className="text-gray-600" />
                  </div>

                  <div className="flex gap-2 items-center">
                    <div className="flex-1 flex items-center gap-2 bg-gray-800 border border-gray-700 rounded px-2 py-1.5">
                      <div
                        className="w-4 h-4 rounded border border-gray-600 shadow-sm"
                        style={{ backgroundColor: removeColor }}
                      />
                      <input
                        type="text"
                        value={removeColor}
                        onChange={(e) => setRemoveColor(e.target.value)}
                        className="flex-1 bg-transparent border-none text-xs focus:outline-none min-w-0 font-mono"
                      />
                      <input
                        type="color"
                        value={removeColor}
                        onChange={(e) => setRemoveColor(e.target.value)}
                        className="w-6 h-6 opacity-0 absolute cursor-pointer"
                      />
                    </div>
                    <button
                      onClick={() => setIsEyeDropperActive(!isEyeDropperActive)}
                      className={`p-2 rounded border transition-colors ${isEyeDropperActive ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                      title={t.bgRemoval.eyeDropper}
                    >
                      <Pipette size={14} />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-gray-500 font-medium">
                      <span>{t.bgRemoval.tolerance}</span>
                      <span>{tolerance}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={tolerance}
                      onChange={(e) => setTolerance(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleRemoveBackground}
                    disabled={selectedFrameIds.size === 0}
                    className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700 rounded text-xs font-medium transition-colors flex items-center justify-center gap-2 text-gray-300"
                  >
                    <Eraser size={12} /> {t.bgRemoval.applySelected}
                  </button>
                </div>
              </div>

              {/* Section: Danger Zone */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">{t.sections.actions}</h3>
                <button
                  onClick={clearAll}
                  className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all shadow-sm ${clearFramesConfirm
                    ? 'bg-red-600 text-white border-red-500 shadow-red-900/30'
                    : 'bg-gray-900/50 hover:bg-red-900/10 text-red-400 border-gray-800 hover:border-red-900/30'
                    }`}
                >
                  {clearFramesConfirm ? <AlertCircle size={14} /> : <Trash2 size={14} />}
                  {clearFramesConfirm ? t.confirmAction : t.removeAll}
                </button>
              </div>

              <div className="pt-2"></div>


              {/* Author Info */}
              <div className="pt-4 border-t border-gray-800 space-y-2">
                {/* 制图匠网站按钮 */}
                <a
                  href="https://www.qwq.team"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/30 hover:to-blue-600/30 border border-purple-500/30 hover:border-purple-500/50 text-purple-400 hover:text-purple-300 text-xs font-medium transition-all flex items-center justify-center gap-2"
                >
                  <Monitor size={14} />
                  {t.craftWebsite}
                </a>

                {/* GitHub按钮 */}
                <button
                  onClick={handleGithubLinkClick}
                  className={`w-full px-3 py-2 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-2 ${githubLinkConfirm
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800/50 hover:bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-400 hover:text-gray-300'
                    }`}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                  {githubLinkConfirm ? t.confirmAction : t.githubRepo}
                </button>

                <p className="text-[10px] text-gray-600 px-2 text-center">{t.localProcessing}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Sidebar Resizer */}
        {isSidebarOpen && (
          <div
            className="hidden lg:block w-1 bg-gray-950 hover:bg-blue-600 cursor-col-resize z-20 transition-colors border-r border-gray-800"
            onMouseDown={handleSidebarResizeStart}
          />
        )}

        {/* Center: Split View (Canvas Editor + Frame List) */}
        <main className={`flex-1 flex flex-col min-w-0 min-h-0 bg-gray-950`}>

          {/* Top: Canvas Editor */}
          {(isLargeScreen ? showCanvasEditor : activeMobileTab === 'editor') && (
            <div
              style={{ height: isLargeScreen ? editorHeight : '100%' }}
              className={`flex flex-col bg-gray-900/50 relative ${!isLargeScreen ? 'flex-1' : ''}`}
            >
              <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layout size={16} className="text-blue-400" />
                  <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{t.canvasEditor}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {frames.length > 0 && (
                    <>
                      <button
                        onClick={() => setSyncPreviewSelection(!syncPreviewSelection)}
                        className={`p-1.5 rounded transition-colors flex items-center gap-1.5 text-xs font-medium ${syncPreviewSelection
                          ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                          : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'
                          }`}
                        title={syncPreviewSelection ? t.unlinkSelection : t.linkSelection}
                      >
                        <ScanEye size={16} />
                      </button>
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`p-1.5 rounded transition-colors flex items-center gap-1.5 text-xs font-medium ${isPlaying
                          ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                          }`}
                        title={isPlaying ? t.preview.pause : t.preview.play}
                      >
                        {isPlaying ? <div className="w-3 h-3 bg-current rounded-sm" /> : <Play size={12} fill="currentColor" />}
                        {isPlaying ? t.preview.pause : t.preview.play}
                      </button>
                    </>
                  )}
                  {isLargeScreen && (
                    <button
                      onClick={() => setShowCanvasEditor(false)}
                      className="text-gray-500 hover:text-white p-1"
                      title={t.hideEditor}
                    >
                      <Minimize2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              <CanvasEditor
                frame={isPlaying && previewFrameIndex !== null ? frames[previewFrameIndex] : selectedFrame}
                frameIndex={isPlaying && previewFrameIndex !== null ? previewFrameIndex : (selectedFrameIndex !== -1 ? selectedFrameIndex : undefined)}
                config={canvasConfig}
                onUpdate={handleCanvasUpdate}
                labels={{ ...t.frame, frameInfo: t.frameInfo }}
                emptyMessage={t.selectFrameToEdit}
                isPreview={isPlaying}
                isEyeDropperActive={isEyeDropperActive || isGifEyeDropperActive || isBgColorEyeDropperActive}
                onColorPick={(color) => {
                  if (isEyeDropperActive) {
                    setRemoveColor(color);
                    setIsEyeDropperActive(false);
                  } else if (isGifEyeDropperActive) {
                    setGifTransparentColor(color);
                    setIsGifEyeDropperActive(false);
                  } else if (isBgColorEyeDropperActive) {
                    handleBgColorChange(color);
                    setIsBgColorEyeDropperActive(false);
                  }
                }}
                gifTransparentColor={gifTransparentColor}
                isGifTransparentEnabled={isGifTransparentEnabled}
              />
              {/* Selection Indicator Overlay */}
              {selectedFrameIds.size > 1 && (
                <div className="absolute bottom-14 left-4 bg-blue-900/80 text-blue-200 px-3 py-1 rounded-full text-xs border border-blue-700 backdrop-blur-sm shadow-lg pointer-events-none">
                  {t.selectedFrames.replace('{count}', selectedFrameIds.size.toString())} ({t.batchMode})
                </div>
              )}



              {/* Timeline Preview */}
              {frames.length > 0 && (
                <Timeline
                  frames={frames}
                  selectedFrameIds={selectedFrameIds}
                  onSelect={handleSelection}
                  transparentColor={gifTransparentColor}
                  isTransparentEnabled={isGifTransparentEnabled}
                />
              )}
            </div>
          )}

          {/* Editor Resizer */}
          {isLargeScreen && showCanvasEditor && (
            <div
              className="h-1 bg-gray-950 hover:bg-blue-500 cursor-row-resize z-30 transition-colors border-y border-gray-800"
              onMouseDown={handleEditorResizeStart}
            />
          )}

          {/* Bottom: Frame List */}
          <div
            className={`flex-1 min-h-0 overflow-hidden p-0 flex flex-col ${!isLargeScreen && activeMobileTab !== 'frames' ? 'hidden' : ''}`}
            onContextMenu={handleBackgroundContextMenu}
            onClick={handleBackgroundClick}
          >
            <div className="flex flex-col w-full h-full">
              <div className="flex flex-col border-b border-gray-800 bg-gray-900/30">
                <div className="flex items-center justify-between px-4 py-2 overflow-x-auto custom-scrollbar">
                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <h2 className="text-sm font-medium text-gray-300 whitespace-nowrap">
                      {t.frames} <span className="text-gray-500">({frames.length})</span>
                    </h2>

                    <div className="h-4 w-px bg-gray-700 hidden sm:block"></div>

                    {/* Frame Size Slider */}
                    <div className="flex items-center gap-1 sm:gap-2 group">
                      <ZoomOut size={14} className="text-gray-500 hidden sm:block" />
                      <input
                        type="range"
                        min="60"
                        max="300"
                        value={frameSize}
                        onChange={(e) => setFrameSize(parseInt(e.target.value))}
                        className="w-16 sm:w-20 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        title={t.frameSize}
                      />
                      <ZoomIn size={14} className="text-gray-500 hidden sm:block" />
                    </div>

                    {/* Compact Mode Toggle */}
                    <button
                      onClick={() => setCompactMode(!compactMode)}
                      className={`p-1.5 lg:px-2.5 rounded hover:bg-gray-800 transition-colors flex items-center gap-2 ${compactMode ? 'text-blue-400 bg-blue-900/20' : 'text-gray-500'}`}
                      title={t.compactMode}
                    >
                      <Monitor size={16} />
                      <span className="hidden lg:inline text-xs font-medium">{t.compactMode}</span>
                    </button>

                    {/* Layout Mode Toggle */}
                    <button
                      onClick={() => {
                        const modes: ('auto' | 'vertical' | 'horizontal')[] = ['auto', 'vertical', 'horizontal'];
                        const nextIndex = (modes.indexOf(layoutMode) + 1) % modes.length;
                        setLayoutMode(modes[nextIndex]);
                      }}
                      className={`p-1.5 lg:px-2.5 rounded hover:bg-gray-800 transition-colors flex items-center gap-2 ${layoutMode !== 'auto' ? 'text-blue-400 bg-blue-900/20' : 'text-gray-500'}`}
                      title={layoutMode === 'auto' ? t.layoutMode.auto : (layoutMode === 'vertical' ? t.layoutMode.vertical : t.layoutMode.horizontal)}
                    >
                      {layoutMode === 'auto' && <Layout size={16} />}
                      {layoutMode === 'vertical' && <Rows size={16} />}
                      {layoutMode === 'horizontal' && <Columns size={16} />}
                      <span className="hidden lg:inline text-xs font-medium">
                        {layoutMode === 'auto' ? t.layoutMode.auto : (layoutMode === 'vertical' ? t.layoutMode.vertical : t.layoutMode.horizontal)}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setIsBatchSelectMode(!isBatchSelectMode)}
                      className={`p-1.5 lg:px-2.5 rounded transition-colors flex items-center gap-1.5 ${isBatchSelectMode
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-blue-900/30 hover:text-blue-400'
                        }`}
                      title={t.batchSelectMode}
                    >
                      <CheckSquare size={16} />
                      <span className="hidden lg:inline text-xs font-medium">{t.batchSelectMode}</span>
                    </button>

                    <button
                      onClick={() => setIsBatchEditOpen(!isBatchEditOpen)}
                      disabled={selectedFrameIds.size === 0}
                      className={`p-1.5 lg:px-2.5 rounded transition-colors flex items-center gap-1.5 ${isBatchEditOpen
                        ? 'bg-blue-600 text-white'
                        : selectedFrameIds.size > 0
                          ? 'text-blue-400 hover:bg-blue-900/30'
                          : 'text-gray-600 cursor-not-allowed'
                        }`}
                      title={t.selectionProperties}
                    >
                      <SlidersHorizontal size={16} />
                      <span className="hidden lg:inline text-xs font-medium">{t.selectionProperties}</span>
                      {selectedFrameIds.size > 0 && (
                        <span className={`text-xs font-bold px-1.5 rounded-full ${isBatchEditOpen ? 'bg-white/20' : 'bg-blue-500/20'}`}>{selectedFrameIds.size}</span>
                      )}
                    </button>

                    <button
                      onClick={() => setShowCanvasEditor(!showCanvasEditor)}
                      className={`p-1.5 rounded hover:bg-gray-800 transition-colors hidden lg:block ${showCanvasEditor ? 'text-blue-400 bg-blue-900/20' : 'text-gray-500'}`}
                      title={showCanvasEditor ? t.hideEditor : t.showEditor}
                    >
                      <Layout size={16} />
                    </button>
                  </div>
                </div>

                {/* Collapsible Batch Edit Panel */}
                {isBatchEditOpen && selectedFrameIds.size > 0 && (
                  <div className="px-6 py-3 bg-blue-950/20 border-t border-blue-900/30 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
                      <div>
                        <label className="text-xs text-blue-300/70 mb-1 block">{t.frame.x}</label>
                        <input type="number"
                          value={batchInputValues.x}
                          placeholder="-"
                          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                          onChange={(e) => handleBatchInputChange('x', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-blue-300/70 mb-1 block">{t.frame.y}</label>
                        <input type="number"
                          value={batchInputValues.y}
                          placeholder="-"
                          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                          onChange={(e) => handleBatchInputChange('y', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-blue-300/70 mb-1 block">{t.frame.w}</label>
                        <input type="number"
                          value={batchInputValues.width}
                          placeholder="-"
                          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                          onChange={(e) => handleBatchInputChange('width', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-blue-300/70 mb-1 block">{t.frame.h}</label>
                        <input type="number"
                          value={batchInputValues.height}
                          placeholder="-"
                          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                          onChange={(e) => handleBatchInputChange('height', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <label className="text-xs text-blue-300/70 mb-1 block">{t.frame.time}</label>
                        <input type="number"
                          value={batchInputValues.duration}
                          placeholder="-"
                          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                          onChange={(e) => handleBatchInputChange('duration', e.target.value)}
                        />
                      </div>

                      <div className="col-span-2 md:col-span-1 flex gap-2">
                        <button
                          onClick={applyBatchUpdates}
                          className="flex-1 flex items-center justify-center gap-1 p-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs transition-colors shadow-sm font-medium h-[30px]"
                          title={t.apply}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={handleDuplicate}
                          className="flex-1 flex items-center justify-center gap-1 p-1.5 rounded bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 border border-blue-900/50 text-xs transition-colors h-[30px]"
                          title={t.duplicate}
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={handleResetFrameProperties}
                          className="flex-1 flex items-center justify-center gap-1 p-1.5 rounded bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 border border-blue-900/50 text-xs transition-colors h-[30px]"
                          title={t.resetProperties}
                        >
                          <RotateCcw size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {frames.length === 0 ? (
                <div
                  className="border-2 border-dashed border-gray-800 rounded-xl m-4 flex-1 flex flex-col items-center justify-center text-gray-500 gap-4 cursor-pointer hover:bg-gray-900/50 hover:border-blue-500/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <ImagePlus size={40} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                  </div>
                  <div className="text-center px-4">
                    <p className="text-xl font-medium text-gray-300 mb-2">{t.noFrames}</p>
                    <p className="text-sm text-gray-500">{t.uploadStart}</p>
                  </div>
                  <button className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-full font-medium flex items-center gap-2 mt-4 shadow-lg shadow-blue-900/20 transition-all hover:scale-105">
                    <Upload size={20} />
                    {t.clickDrag}
                  </button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToWindowEdges]}
                  autoScroll={{
                    layoutShiftCompensation: false
                  }}
                >
                  <SortableContext
                    items={visibleFrames.map(f => f.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div id="virtual-list-container" className="flex-1 h-full min-h-0">
                      <VirtualFrameList
                        ref={virtualListRef}
                        frames={visibleFrames}
                        frameSize={frameSize}
                        compactMode={compactMode}
                        selectedFrameIds={selectedFrameIds}
                        onRemove={removeFrame}
                        onUpdate={updateFrame}
                        onReset={handleResetFrame}
                        onSelect={handleSelection}
                        onContextMenu={handleFrameContextMenu}
                        labels={t.frame}
                        confirmResetText={t.confirmReset}
                        activeDragId={activeDragId}
                        isGathering={isGathering}
                        isLayoutAnimating={isLayoutAnimating}
                        layoutMode={layoutMode}
                        onCompactModeChange={setCompactMode}
                        transparentColor={gifTransparentColor}
                        isTransparentEnabled={isGifTransparentEnabled}
                      />
                    </div>
                  </SortableContext>

                  {/* Custom Drag Overlay for Better Visuals & Multi-drag */}
                  <DragOverlay>
                    {activeDragFrame ? (
                      selectedFrameIds.has(activeDragFrame.id) && selectedFrameIds.size > 1 ? (
                        // Multi-drag Stack Visual
                        <div className="relative" style={{ width: frameSize + 'px' }}>
                          <div className="absolute top-3 left-3 w-full h-full bg-gray-800 border border-gray-600 rounded-lg shadow-sm rotate-6 opacity-40 z-0"></div>
                          <div className="absolute top-1.5 left-1.5 w-full h-full bg-gray-800 border border-gray-600 rounded-lg shadow-sm rotate-3 opacity-60 z-0"></div>
                          <div className="relative z-10">
                            <FrameCard
                              frame={activeDragFrame}
                              index={frames.findIndex(f => f.id === activeDragFrame.id)}
                              labels={t.frame}
                              compact={compactMode}
                              isSelected={true}
                              style={{ width: '100%', opacity: 1, cursor: 'grabbing', boxShadow: '0 20px  25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)' }}
                            />
                          </div>
                          <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full min-w-[24px] h-6 px-1.5 flex items-center justify-center text-xs font-bold border-2 border-gray-900 shadow-xl z-20">
                            {selectedFrameIds.size}
                          </div>
                        </div>
                      ) : (
                        // Single Drag Visual
                        <div style={{ width: frameSize + 'px' }}>
                          <FrameCard
                            frame={activeDragFrame}
                            index={frames.findIndex(f => f.id === activeDragFrame.id)}
                            labels={t.frame}
                            compact={compactMode}
                            isSelected={true}
                            style={{ opacity: 1, cursor: 'grabbing', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)' }}
                          />
                        </div>
                      )
                    ) : null}
                  </DragOverlay>

                </DndContext>
              )}
            </div>
          </div>

          {/* Mobile Bottom Tab Bar */}
          {!isLargeScreen && (
            <div className="bg-gray-900 border-t border-gray-800 shrink-0 z-30 pb-[env(safe-area-inset-bottom)] transition-all duration-200">
              <div className="h-14 flex items-center justify-around">
                <button
                  onClick={() => setActiveMobileTab('frames')}
                  className={`flex flex-col items-center justify-center w-full h-full gap-1 ${activeMobileTab === 'frames' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <Layers size={20} />
                  <span className="text-[10px]">{t.frames}</span>
                </button>
                <button
                  onClick={() => setActiveMobileTab('editor')}
                  className={`flex flex-col items-center justify-center w-full h-full gap-1 ${activeMobileTab === 'editor' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <Layout size={20} />
                  <span className="text-[10px]">{t.canvasEditor}</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer - Moved to Sidebar */}
        </main>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-gray-900 border border-gray-700 shadow-xl rounded-lg py-1 w-48 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: contextMenu.y > window.innerHeight - 450 ? 'auto' : contextMenu.y,
            bottom: contextMenu.y > window.innerHeight - 450 ? window.innerHeight - contextMenu.y : 'auto',
            left: Math.min(contextMenu.x, window.innerWidth - 200)
          }}
        >
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white flex items-center gap-2 transition-colors"
            onClick={handleContextCopy}
          >
            <ClipboardCopy size={14} />
            {t.contextMenu.copy}
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white flex items-center gap-2 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
            onClick={handleContextPaste}
            disabled={clipboard.length === 0}
          >
            <ClipboardPaste size={14} />
            {t.contextMenu.paste}
          </button>

          <div className="h-px bg-gray-700 my-1"></div>

          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white flex items-center gap-2 transition-colors"
            onClick={handleContextDuplicate}
          >
            <Copy size={14} />
            {t.contextMenu.duplicateHere}
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white flex items-center gap-2 transition-colors"
            onClick={handleContextInsert}
          >
            <FilePlus size={14} />
            {t.contextMenu.insertHere}
          </button>

          <div className="h-px bg-gray-700 my-1"></div>

          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white flex items-center gap-2 transition-colors"
            onClick={() => {
              handleAlignCenter('selected');
              setContextMenu(null);
            }}
          >
            <AlignCenter size={14} />
            {t.contextMenu.alignCenter}
          </button>

          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white flex items-center gap-2 transition-colors"
            onClick={() => {
              handleFitSelected('contain');
              setContextMenu(null);
            }}
          >
            <Scaling size={14} />
            {t.contextMenu.fitCanvas}
          </button>

          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white flex items-center gap-2 transition-colors"
            onClick={() => {
              handleFitSelected('fill');
              setContextMenu(null);
            }}
          >
            <Maximize size={14} />
            {t.contextMenu.fillCanvas}
          </button>

          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white flex items-center gap-2 transition-colors"
            onClick={handleResetFrameProperties}
          >
            <RotateCcw size={14} />
            {t.contextMenu.resetProperties}
          </button>

          <div className="h-px bg-gray-700 my-1"></div>

          <div className="px-4 py-2">
            <div className="text-xs text-gray-500 mb-2">{t.contextMenu.setColor}</div>
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => handleSetColorTag(undefined)}
                className="w-4 h-4 rounded-full border border-gray-600 bg-transparent hover:border-white transition-colors relative"
                title={t.contextMenu.noColor}
              >
                <div className="absolute inset-0.5 border-t border-red-500 transform rotate-45"></div>
              </button>
              {TAG_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => handleSetColorTag(color)}
                  className="w-4 h-4 rounded-full hover:scale-110 transition-transform border border-transparent hover:border-white"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white flex items-center gap-2 transition-colors"
            onClick={handleContextDownload}
          >
            <Download size={14} />
            {t.contextMenu.downloadSelected}
          </button>

          <div className="h-px bg-gray-700 my-1"></div>

          <button
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-600 hover:text-white flex items-center gap-2 transition-colors"
            onClick={handleContextDelete}
          >
            <Trash2 size={14} />
            {t.contextMenu.deleteSelected}
          </button>

          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            onClick={() => setContextMenu(null)}
          >
            {t.contextMenu.cancel}
          </button>
        </div>
      )}

      {/* Insert Images Modal */}
      {showInsertModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
          <div className="bg-gray-900 rounded-xl shadow-2xl max-w-md w-full border border-gray-700 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-850">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Plus size={18} className="text-blue-400" />
                {t.insertModal.title}
              </h3>
              <button
                onClick={() => setShowInsertModal(false)}
                className="text-gray-500 hover:text-white p-1"
              >
                <XIcon size={18} />
              </button>
            </div>
            <div className="p-6">
              <div
                onClick={() => insertFileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-700 hover:border-blue-500 hover:bg-gray-800/50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group h-48"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={handleInsertDrop}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*,.zip,application/zip"
                  className="hidden"
                  ref={insertFileInputRef}
                  onChange={(e) => handleInsertFiles(e.target.files)}
                />
                <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <ImagePlus className="text-gray-400 group-hover:text-blue-400" size={24} />
                </div>
                <p className="text-sm font-medium text-gray-300 text-center">{t.insertModal.dropText}</p>
              </div>
            </div>
            <div className="p-4 border-t border-gray-800 bg-gray-850 flex justify-end">
              <button
                onClick={() => setShowInsertModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white text-sm"
              >
                {t.insertModal.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generation Modal */}
      <GenerationModal
        isOpen={!!generatedGif || isGenerating}
        progress={progress}
        progressText={progressText}
        generatedGif={generatedGif}
        onClose={() => setGeneratedGif(null)}
        t={{
          close: t.close,
          download: t.download,
          title: t.generation.title,
          resultTitle: t.generation.resultTitle
        }}
      />

      {/* History Snapshots Drawer */}
      {showSnapshots && (
        <div className="absolute top-16 right-0 bottom-0 w-80 bg-gray-900 border-l border-gray-800 z-30 shadow-2xl transform transition-transform p-4 overflow-y-auto custom-scrollbar flex flex-col">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="font-bold text-white">{t.historyTitle}</h3>
            <button onClick={() => setShowSnapshots(false)} className="text-gray-500 hover:text-white"><XIcon size={24} /></button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto pb-4">
            {snapshots.length === 0 && <p className="text-gray-500 text-sm italic">{t.noRecords}</p>}
            {snapshots.map(snap => (
              <div key={snap.id} className="bg-gray-800 p-3 rounded border border-gray-700 hover:border-blue-500 transition-colors group">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm text-gray-200 truncate pr-2">{snap.name}</span>
                  <button
                    onClick={() => deleteSnapshot(snap.id)}
                    className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Thumbnail */}
                {snap.thumbnail ? (
                  <div className="mb-2 w-full h-24 bg-gray-900 rounded overflow-hidden flex items-center justify-center border border-gray-800 relative group/thumb">
                    <img src={snap.thumbnail} alt={snap.name} className="max-w-full max-h-full" />
                    <a
                      href={snap.thumbnail}
                      download={`gif_builder_${snap.timestamp}.gif`}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-all duration-200"
                      title={t.download}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download size={24} className="text-white drop-shadow-md transform scale-90 hover:scale-110 transition-transform" />
                    </a>
                  </div>
                ) : (
                  <div className="mb-2 w-full h-12 bg-gray-900 rounded border border-gray-800 flex items-center justify-center text-xs text-gray-500">
                    ZIP Archive
                  </div>
                )}

                <div className="text-xs text-gray-500 mb-2">
                  {new Date(snap.timestamp).toLocaleTimeString()} • {snap.frames.length} {t.frames}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => restoreSnapshot(snap)}
                    className={`py-1.5 text-xs rounded transition-colors flex items-center justify-center gap-1 ${restoreConfirmId === snap.id
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                  >
                    {restoreConfirmId === snap.id ? <Check size={12} /> : <Undo2 size={12} />}
                    {restoreConfirmId === snap.id ? t.confirmAction : t.restore}
                  </button>
                  <button
                    onClick={() => handleExportZip(snap.frames)}
                    className="py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors flex items-center justify-center gap-1"
                    title={t.downloadZip}
                  >
                    <Package size={12} /> ZIP
                  </button>
                </div>
              </div>
            ))}
          </div>

          {snapshots.length > 0 && (
            <div className="pt-4 border-t border-gray-800 shrink-0">
              <button
                onClick={clearHistoryRecords}
                className={`w-full py-2 rounded text-xs transition-colors flex items-center justify-center gap-2 border ${clearHistoryConfirm ? 'bg-red-600 text-white border-red-500' : 'bg-transparent text-red-500 border-red-900/30 hover:bg-red-900/20'}`}
              >
                <Trash2 size={14} />
                {clearHistoryConfirm ? t.confirmAction : t.clearHistory}
              </button>
            </div>
          )}
        </div>
      )}

      {/* History Stack Panel - Rendered at Root Level for Z-Index Safety */}
      {showHistoryStack && (
        <>
          {/* Backdrop to close on click outside (only if not pinned) */}
          {!isHistoryPinned && (
            <div className="fixed inset-0 z-[90]" onClick={() => setShowHistoryStack(false)} />
          )}

          <div className="fixed top-16 right-2 sm:right-6 mt-2 w-72 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl z-[100] flex flex-col max-h-[min(500px,80vh)] animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-3 border-b border-gray-800 font-medium text-sm text-gray-200 flex justify-between items-center bg-gray-900/50 rounded-t-xl">
              <div className="flex items-center gap-2">
                <History size={14} className="text-blue-400" />
                <span>{t.history}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsHistoryPinned(!isHistoryPinned)}
                  className={`p-1 rounded transition-colors ${isHistoryPinned ? 'text-blue-400 bg-blue-900/30' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}
                  title={isHistoryPinned ? "Unpin" : "Pin"}
                >
                  {isHistoryPinned ? <PinOff size={14} /> : <Pin size={14} />}
                </button>
                <button onClick={() => setShowHistoryStack(false)} className="text-gray-500 hover:text-white p-1 hover:bg-gray-800 rounded transition-colors"><XIcon size={14} /></button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
              {historyStack.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs">{t.noHistory}</div>
              ) : (
                historyStack.map((item, idx) => {
                  // Translate description
                  const descKey = item.description as keyof typeof t.historyActions;
                  const description = t.historyActions?.[descKey] || item.description;

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        jumpToHistory(idx);
                        if (!isHistoryPinned) setShowHistoryStack(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 mb-1 text-xs rounded-lg flex items-center gap-3 transition-all group ${idx === historyIndex
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                        } ${idx > historyIndex ? 'opacity-40 hover:opacity-100 grayscale' : ''}`}
                    >
                      <span className={`font-mono w-5 shrink-0 ${idx === historyIndex ? 'text-blue-200' : 'text-gray-600 group-hover:text-gray-500'}`}>
                        {idx + 1}.
                      </span>
                      <span className="flex-1 truncate font-medium">{description}</span>
                      <span className={`text-[10px] shrink-0 ${idx === historyIndex ? 'text-blue-200' : 'text-gray-600 group-hover:text-gray-500'}`}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </button>
                  );
                })
              )}
              {/* Future/Redo Indicator */}
              <div ref={(el) => {
                // Auto scroll to active item
                if (el && showHistoryStack) {
                  const activeBtn = el.parentElement?.children[historyIndex] as HTMLElement;
                  if (activeBtn) {
                    activeBtn.scrollIntoView({ block: 'center', behavior: 'smooth' });
                  }
                }
              }} />
            </div>
          </div>
        </>
      )}

      {/* Transparent Background Confirmation Dialog */}
      {showTransparentConfirm && (
        <>
          {/* Backdrop */}
          <div className={`fixed inset-0 bg-black/50 z-[120] ${dialogClosing ? 'animate-fade-out' : 'animate-fade-in'}`} />

          {/* Dialog */}
          <div className="fixed inset-0 z-[121] flex items-center justify-center p-4">
            <div className={`fixed top-1/2 left-1/2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-md w-full ${dialogClosing ? 'animate-scale-out' : 'animate-scale-in'}`}>
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                    <AlertCircle size={20} className="text-blue-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-200">{t.transparentConfirm.title}</h3>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-5">
                <p className="text-gray-400 text-sm leading-relaxed">
                  {t.transparentConfirm.message}
                </p>
              </div>

              {/* Actions */}
              <div className="px-6 pb-5 flex gap-3">
                <button
                  onClick={() => handleConfirmTransparentSwitch(false)}
                  className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white rounded-lg transition-all text-sm font-medium border border-gray-700 hover:border-gray-600"
                >
                  {t.transparentConfirm.keep}
                </button>
                <button
                  onClick={() => handleConfirmTransparentSwitch(true)}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all text-sm font-medium"
                >
                  {t.transparentConfirm.switch}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Notification Toast */}
      {notificationMessage && (
        <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[110] ${notificationClosing ? 'animate-slide-out-down' : 'animate-slide-in-up'}`}>
          <div className="bg-gray-800 border border-gray-700 text-gray-200 px-5 py-3 rounded-lg shadow-xl flex items-center gap-3 max-w-md">
            <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center shrink-0">
              <AlertCircle size={16} className="text-blue-400" />
            </div>
            <span className="text-sm">{notificationMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
