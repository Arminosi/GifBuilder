import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ImagePlus, Upload } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { FrameData, CanvasConfig, HistorySnapshot, PendingVideoImport, FrameContextMenuState } from './types';
import { FrameCard } from './components/FrameItem';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { FileDropOverlay } from './components/FileDropOverlay';
import { FrameContextMenu } from './components/FrameContextMenu';
import { FrameListControls } from './components/FrameListControls';
import { VirtualFrameList, VirtualFrameListHandle } from './components/VirtualFrameList';
import { AppHeader } from './components/AppHeader';
import { useHistory } from './hooks/useHistory';
import { generateGIF } from './utils/gifHelper';
import { generateAPNG } from './utils/apngHelper';
import { generateFrameZip, extractFramesFromZip } from './utils/zipHelper';
import { translations, Language } from './utils/translations';
import {
  saveSnapshotToDB,
  getSnapshotsFromDB,
  deleteSnapshotFromDB,
  clearSnapshotsFromDB
} from './utils/storage';
import { GenerationModal } from './components/GenerationModal';
import { HistorySnapshotsDrawer } from './components/HistorySnapshotsDrawer';
import { HistoryStackPanel } from './components/HistoryStackPanel';
import { InsertFilesModal } from './components/InsertFilesModal';
import { MobileBottomTabBar } from './components/MobileBottomTabBar';
import { NotificationToast } from './components/NotificationToast';
import { SidebarBatchOperationsPanel } from './components/SidebarBatchOperationsPanel';
import { SidebarCanvasSettingsPanel } from './components/SidebarCanvasSettingsPanel';
import { SidebarDangerZone } from './components/SidebarDangerZone';
import { SidebarExportSettingsPanel } from './components/SidebarExportSettingsPanel';
import { SidebarFooterLinks } from './components/SidebarFooterLinks';
import { SidebarImageProcessingPanel } from './components/SidebarImageProcessingPanel';
import { SidebarUploadArea } from './components/SidebarUploadArea';
import { TransparentConfirmDialog } from './components/TransparentConfirmDialog';
import { VideoImportModal } from './components/VideoImportModal';
import { parseGifFrames } from './utils/gifParser';
import { parseAPNGFrames } from './utils/apngParser';
import { parseWebPFrames } from './utils/webpParser';
import { extractVideoFrames, getVideoMetadata } from './utils/videoHelper';

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
const QUICK_MARK_COLOR = TAG_COLORS[4]; // blue

type DitherOptionValue = Exclude<CanvasConfig['dither'], false> | 'none';

const DITHER_OPTIONS: Array<{
  value: DitherOptionValue;
  label: Record<Language, string>;
  description: Record<Language, string>;
  pros: Record<Language, string>;
  cons: Record<Language, string>;
}> = [
  {
    value: 'none',
    label: { en: 'Off', zh: '关闭' },
    description: { en: 'No dithering. Keeps flat colors clean and predictable.', zh: '不启用抖动，保持纯色区域干净稳定。' },
    pros: { en: 'Least frame noise, smallest flicker risk.', zh: '噪点最少，帧间闪烁风险最低。' },
    cons: { en: 'Gradients may show stronger color bands.', zh: '渐变区域更容易出现色带。' }
  },
  {
    value: 'FloydSteinberg',
    label: { en: 'Floyd Steinberg', zh: 'Floyd Steinberg' },
    description: { en: 'Classic error diffusion with strong gradient detail.', zh: '经典误差扩散算法，渐变细节保留较强。' },
    pros: { en: 'Good for photos and smooth gradients.', zh: '适合照片和柔和渐变。' },
    cons: { en: 'Can create animated grain between frames.', zh: '可能产生帧间颗粒跳动。' }
  },
  {
    value: 'FloydSteinberg-serpentine',
    label: { en: 'Floyd Steinberg Serpentine', zh: 'Floyd Steinberg 蛇形' },
    description: { en: 'Alternates scan direction to reduce directional texture.', zh: '交替扫描方向，降低固定方向纹理。' },
    pros: { en: 'More balanced texture than standard Floyd.', zh: '纹理比标准算法更均衡。' },
    cons: { en: 'Still may shimmer on motion.', zh: '运动画面仍可能闪烁。' }
  },
  {
    value: 'FalseFloydSteinberg',
    label: { en: 'False Floyd Steinberg', zh: '简化 Floyd Steinberg' },
    description: { en: 'A lighter diffusion pattern with less processing.', zh: '更轻量的误差扩散模式。' },
    pros: { en: 'Faster, softer than full Floyd.', zh: '速度更快，颗粒感较轻。' },
    cons: { en: 'Less accurate on complex gradients.', zh: '复杂渐变还原较弱。' }
  },
  {
    value: 'Stucki',
    label: { en: 'Stucki', zh: 'Stucki' },
    description: { en: 'Spreads error over a wider area for smoother tonal transitions.', zh: '把误差扩散到更大范围，色调过渡更平滑。' },
    pros: { en: 'Smooth gradients, richer perceived detail.', zh: '渐变更顺，感知细节更丰富。' },
    cons: { en: 'More visible texture and larger files.', zh: '纹理更明显，文件可能更大。' }
  },
  {
    value: 'Stucki-serpentine',
    label: { en: 'Stucki Serpentine', zh: 'Stucki 蛇形' },
    description: { en: 'Stucki with alternating scan direction.', zh: '蛇形扫描版本的 Stucki 算法。' },
    pros: { en: 'Smoother large gradients with less directional bias.', zh: '大面积渐变更顺，方向性更弱。' },
    cons: { en: 'Can be noisy in animation.', zh: '动画中可能出现较多噪点。' }
  },
  {
    value: 'Atkinson',
    label: { en: 'Atkinson', zh: 'Atkinson' },
    description: { en: 'A restrained diffusion style with a crisp, retro look.', zh: '较克制的扩散方式，观感清爽偏复古。' },
    pros: { en: 'Crisp edges, often less muddy.', zh: '边缘清晰，不容易发灰。' },
    cons: { en: 'May lose subtle shadow detail.', zh: '暗部和细微层次可能丢失。' }
  },
  {
    value: 'Atkinson-serpentine',
    label: { en: 'Atkinson Serpentine', zh: 'Atkinson 蛇形' },
    description: { en: 'Atkinson with alternating scan direction.', zh: '蛇形扫描版本的 Atkinson 算法。' },
    pros: { en: 'Crisp result with more even texture.', zh: '结果清晰且纹理更均匀。' },
    cons: { en: 'Less faithful for soft photos.', zh: '柔和照片的还原度较低。' }
  }
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
  const [generatedFormat, setGeneratedFormat] = useState<'gif' | 'apng' | 'webp'>('gif');
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
  const [exportFormat, setExportFormat] = useState<'gif' | 'apng' | 'webp'>('gif');
  const [webpLossless, setWebpLossless] = useState(false);
  const [webpQuality, setWebpQuality] = useState(92);

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
  const [enableGlobalPalette, setEnableGlobalPalette] = useState(true);
  const [ditherMethod, setDitherMethod] = useState<CanvasConfig['dither']>(false);
  const [isDitherMenuOpen, setIsDitherMenuOpen] = useState(false);

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
  const [contextMenu, setContextMenu] = useState<FrameContextMenuState | null>(null);
  // Insert Modal State
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [insertTargetIndex, setInsertTargetIndex] = useState<number | null>(null);
  const [pendingVideoImport, setPendingVideoImport] = useState<PendingVideoImport | null>(null);
  const [isImportingVideo, setIsImportingVideo] = useState(false);
  const [videoPreviewTime, setVideoPreviewTime] = useState(0);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const videoPreviewUrlRef = useRef<string | null>(null);
  const [showFooter, setShowFooter] = useState(true);

  // Canvas Aspect Ratio Lock
  const [isAspectRatioLocked, setIsAspectRatioLocked] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [shouldScaleExistingFrames, setShouldScaleExistingFrames] = useState(false);
  const [isAutoCroppingCanvas, setIsAutoCroppingCanvas] = useState(false);

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
  const [syncPreviewSelection, setSyncPreviewSelection] = useState(true);
  const [exportInFrameIndex, setExportInFrameIndex] = useState<number | null>(null);
  const [exportOutFrameIndex, setExportOutFrameIndex] = useState<number | null>(null);

  // Refs for preview loop to access latest state without restarting loop
  const selectedFrameIdsRef = useRef(selectedFrameIds);
  const syncPreviewSelectionRef = useRef(syncPreviewSelection);
  const ditherMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    selectedFrameIdsRef.current = selectedFrameIds;
  }, [selectedFrameIds]);

  useEffect(() => {
    syncPreviewSelectionRef.current = syncPreviewSelection;
  }, [syncPreviewSelection]);

  useEffect(() => {
    setExportInFrameIndex(prev => {
      if (prev === null) return prev;
      return frames.length === 0 ? null : Math.min(prev, frames.length - 1);
    });
    setExportOutFrameIndex(prev => {
      if (prev === null) return prev;
      return frames.length === 0 ? null : Math.min(prev, frames.length - 1);
    });
  }, [frames.length]);

  useEffect(() => {
    if (!isDitherMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (ditherMenuRef.current && !ditherMenuRef.current.contains(event.target as Node)) {
        setIsDitherMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDitherMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDitherMenuOpen]);

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

  const addDecodedAnimationFrames = async (
    targetFrames: FrameData[],
    sourceFile: File,
    decodedFrames: Array<{ url: string; delay: number; width: number; height: number }>,
    extensionPattern: RegExp,
    fallbackDuration: number,
    dimensions: { width: number; height: number }
  ) => {
    for (let j = 0; j < decodedFrames.length; j++) {
      const decodedFrame = decodedFrames[j];
      if (targetFrames.length === 0 && dimensions.width === 0) {
        dimensions.width = decodedFrame.width;
        dimensions.height = decodedFrame.height;
      }

      const response = await fetch(decodedFrame.url);
      const blob = await response.blob();
      const frameFile = new File([blob], `${sourceFile.name.replace(extensionPattern, '')}_${j}.png`, { type: 'image/png' });

      targetFrames.push({
        id: Math.random().toString(36).substr(2, 9),
        file: frameFile,
        previewUrl: decodedFrame.url,
        duration: decodedFrame.delay || fallbackDuration,
        x: 0,
        y: 0,
        width: decodedFrame.width,
        height: decodedFrame.height,
        originalWidth: decodedFrame.width,
        originalHeight: decodedFrame.height,
      });
    }
  };

  const isVideoFile = (file: File) => {
    const name = file.name.toLowerCase();
    return file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv)$/i.test(name);
  };

  const sortFilesByFilenameAsc = (files: File[]) => {
    return [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: 'base',
    }));
  };

  const openVideoImportSettings = async (
    files: File[],
    mode: 'append' | 'insert',
    insertIndex: number | null = null
  ) => {
    if (files.length === 0) return;

    try {
      showLoadingNotification(language === 'zh' ? '正在读取视频信息...' : 'Reading video info...');
      const metadata = await getVideoMetadata(files[0]);
      const endTime = Math.min(metadata.duration || 5, 5);
      const previewUrl = URL.createObjectURL(files[0]);

      if (videoPreviewUrlRef.current) {
        URL.revokeObjectURL(videoPreviewUrlRef.current);
      }
      videoPreviewUrlRef.current = previewUrl;

      setPendingVideoImport({
        files,
        mode,
        insertIndex,
        metadata,
        previewUrl,
        settings: {
          fps: 12,
          startTime: 0,
          endTime: endTime > 0 ? endTime : 5,
          maxWidth: Math.min(metadata.width || 500, 720),
        },
      });
      setVideoPreviewTime(0);
      hideNotification();
    } catch (error) {
      console.error('Failed to read video metadata', error);
      showNotification(language === 'zh' ? '无法读取视频文件' : 'Unable to read video file');
    }
  };

  const updatePendingVideoSettings = (updates: Partial<PendingVideoImport['settings']>) => {
    setPendingVideoImport(prev => prev ? {
      ...prev,
      settings: {
        ...prev.settings,
        ...updates,
      },
    } : prev);
  };

  const closeVideoImportSettings = () => {
    if (isImportingVideo) return;
    if (videoPreviewUrlRef.current) {
      URL.revokeObjectURL(videoPreviewUrlRef.current);
      videoPreviewUrlRef.current = null;
    }
    setPendingVideoImport(null);
    setVideoPreviewTime(0);
  };

  const seekVideoPreview = (time: number) => {
    const video = videoPreviewRef.current;
    const duration = pendingVideoImport?.metadata.duration || 0;
    const nextTime = Math.max(0, Math.min(time, duration));

    setVideoPreviewTime(nextTime);
    if (video) {
      video.currentTime = nextTime;
    }
  };

  const setVideoImportInPoint = () => {
    if (!pendingVideoImport) return;
    const currentTime = videoPreviewRef.current?.currentTime ?? videoPreviewTime;
    const duration = pendingVideoImport.metadata.duration || currentTime;
    const startTime = Math.max(0, Math.min(currentTime, duration));
    updatePendingVideoSettings({ startTime: Number(startTime.toFixed(3)) });
  };

  const setVideoImportOutPoint = () => {
    if (!pendingVideoImport) return;
    const currentTime = videoPreviewRef.current?.currentTime ?? videoPreviewTime;
    const duration = pendingVideoImport.metadata.duration || currentTime;
    const endTime = Math.max(0, Math.min(currentTime, duration));
    updatePendingVideoSettings({
      endTime: Number(endTime.toFixed(3))
    });
  };

  useEffect(() => {
    return () => {
      if (videoPreviewUrlRef.current) {
        URL.revokeObjectURL(videoPreviewUrlRef.current);
        videoPreviewUrlRef.current = null;
      }
    };
  }, []);

  const handleConfirmVideoImport = async () => {
    if (!pendingVideoImport || isImportingVideo) return;

    const importConfig = pendingVideoImport;
    const normalizedSettings = {
      fps: Math.max(1, Math.min(60, Math.round(importConfig.settings.fps || 12))),
      startTime: Math.max(0, importConfig.settings.startTime || 0),
      endTime: Math.max(0, importConfig.settings.endTime || 0),
      maxWidth: Math.max(0, Math.round(importConfig.settings.maxWidth || 0)),
    };

    if (normalizedSettings.endTime <= normalizedSettings.startTime) {
      showNotification(language === 'zh' ? '出入点不合法：出点需要在入点之后' : 'Invalid in/out points: out point must be after in point');
      return;
    }

    setIsImportingVideo(true);

    try {
      const newFrames: FrameData[] = [];
      let firstImageWidth = 0;
      let firstImageHeight = 0;

      for (let i = 0; i < importConfig.files.length; i++) {
        const file = importConfig.files[i];
        showLoadingNotification(language === 'zh' ? `正在导入视频 ${i + 1}/${importConfig.files.length}...` : `Importing video ${i + 1}/${importConfig.files.length}...`);

        const videoFrames = await extractVideoFrames(file, normalizedSettings, (current, total) => {
          showLoadingNotification(language === 'zh'
            ? `正在抽帧 ${current}/${total}...`
            : `Extracting frames ${current}/${total}...`);
        });

        const dimensions = { width: firstImageWidth, height: firstImageHeight };
        await addDecodedAnimationFrames(newFrames, file, videoFrames, /\.(mp4|webm|mov|m4v|ogv)$/i, Math.round(1000 / normalizedSettings.fps), dimensions);
        firstImageWidth = dimensions.width;
        firstImageHeight = dimensions.height;
      }

      hideNotification();

      if (newFrames.length === 0) {
        showNotification(language === 'zh' ? '没有从视频中抽取到帧' : 'No frames were extracted from the video');
        return;
      }

      if (importConfig.mode === 'insert' && importConfig.insertIndex !== null) {
        const insertIndex = importConfig.insertIndex;
        setAppState(prev => {
          const nextFrames = [...prev.frames];
          nextFrames.splice(insertIndex, 0, ...newFrames);
          const shouldSetSize = prev.frames.length === 0;

          return {
            ...prev,
            frames: nextFrames,
            canvasConfig: shouldSetSize ? {
              ...prev.canvasConfig,
              width: firstImageWidth,
              height: firstImageHeight,
              transparent: null,
            } : prev.canvasConfig,
          };
        }, 'addFrames');
      } else {
        setAppState(prev => {
          const isFirstImport = prev.frames.length === 0;

          if (isFirstImport) {
            showNotification(t.autoDisableTransparent);
            return {
              ...prev,
              frames: [...prev.frames, ...newFrames],
              canvasConfig: {
                ...prev.canvasConfig,
                width: firstImageWidth,
                height: firstImageHeight,
                transparent: null,
              },
            };
          }

          const canvasWidth = prev.canvasConfig.width;
          const canvasHeight = prev.canvasConfig.height;

          const scaledFrames = newFrames.map(frame => {
            const scaleX = canvasWidth / frame.originalWidth;
            const scaleY = canvasHeight / frame.originalHeight;
            const scale = Math.min(scaleX, scaleY);
            const scaledWidth = Math.round(frame.originalWidth * scale);
            const scaledHeight = Math.round(frame.originalHeight * scale);

            return {
              ...frame,
              width: scaledWidth,
              height: scaledHeight,
              x: Math.round((canvasWidth - scaledWidth) / 2),
              y: Math.round((canvasHeight - scaledHeight) / 2),
            };
          });

          return {
            ...prev,
            frames: [...prev.frames, ...scaledFrames],
          };
        }, 'addFrames');
      }

      setSelectedFrameIds(new Set([newFrames[0].id]));
      lastSelectedIdRef.current = newFrames[0].id;
      if (videoPreviewUrlRef.current) {
        URL.revokeObjectURL(videoPreviewUrlRef.current);
        videoPreviewUrlRef.current = null;
      }
      setPendingVideoImport(null);
      setVideoPreviewTime(0);
      setShowInsertModal(false);
      setInsertTargetIndex(null);
    } catch (error) {
      console.error('Failed to import video frames', error);
      hideNotification();
      showNotification(language === 'zh' ? '视频导入失败' : 'Failed to import video');
    } finally {
      setIsImportingVideo(false);
    }
  };

  const selectFrameByIndex = useCallback((index: number) => {
    const frame = frames[index];
    if (!frame) return;

    lastSelectedIdRef.current = frame.id;
    setSelectedFrameIds(prev => {
      if (prev.size === 1 && prev.has(frame.id)) {
        return prev;
      }

      return new Set([frame.id]);
    });
    setPreviewFrameIndex(index);
  }, [frames]);

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

  const handleReverseSelectedFrames = () => {
    if (selectedFrameIds.size < 2) {
      setContextMenu(null);
      return;
    }

    setAppState(prev => {
      const selectedFramesInOrder = prev.frames.filter(frame => selectedFrameIds.has(frame.id));
      const reversedSelectedFrames = [...selectedFramesInOrder].reverse();
      let replacementIndex = 0;

      return {
        ...prev,
        frames: prev.frames.map(frame => {
          if (!selectedFrameIds.has(frame.id)) {
            return frame;
          }

          return reversedSelectedFrames[replacementIndex++];
        }),
      };
    }, 'reorderFrames');

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

    const incomingFiles = sortFilesByFilenameAsc(Array.from(files));
    const videoFiles = incomingFiles.filter(isVideoFile);
    if (videoFiles.length > 0) {
      await openVideoImportSettings(videoFiles, 'insert', insertTargetIndex);
      return;
    }

    const newFrames: FrameData[] = [];
    let firstImageWidth = 0;
    let firstImageHeight = 0;

    // Expand file list: extract images from ZIP files first
    const allFiles: File[] = [];
    const fileDurationMap = new Map<string, number>(); // Track durations from metadata
    let metadataDefaultDuration: number | undefined;

    for (let i = 0; i < incomingFiles.length; i++) {
      const file = incomingFiles[i];
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
            allFiles.push(...sortFilesByFilenameAsc(extractionResult.files));

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

      const isPngLike = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png') || file.name.toLowerCase().endsWith('.apng');
      const isWebPLike = file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');

      // Handle GIF files
      if (file.type === 'image/gif') {
        try {
          showLoadingNotification(t.importingGif.replace('{current}', '0').replace('{total}', '?'));
          const gifFrames = await parseGifFrames(file, (current, total) => {
            showLoadingNotification(t.importingGif.replace('{current}', current.toString()).replace('{total}', total.toString()));
          });
          if (gifFrames.length > 0) {
            const dimensions = { width: firstImageWidth, height: firstImageHeight };
            await addDecodedAnimationFrames(newFrames, file, gifFrames, /\.gif$/i, globalDuration, dimensions);
            firstImageWidth = dimensions.width;
            firstImageHeight = dimensions.height;
            continue;
          }
        } catch (e) {
          console.error("Failed to parse GIF frames, falling back to static image", e);
        }
      }

      if (isPngLike) {
        try {
          showLoadingNotification(t.importingImages.replace('{current}', '0').replace('{total}', '?'));
          const apngFrames = await parseAPNGFrames(file, (current, total) => {
            showLoadingNotification(t.importingImages.replace('{current}', current.toString()).replace('{total}', total.toString()));
          });

          if (apngFrames.length > 0) {
            const dimensions = { width: firstImageWidth, height: firstImageHeight };
            await addDecodedAnimationFrames(newFrames, file, apngFrames, /\.(apng|png)$/i, globalDuration, dimensions);
            firstImageWidth = dimensions.width;
            firstImageHeight = dimensions.height;
            continue;
          }
        } catch (e) {
          console.error("Failed to parse APNG frames, falling back to static image", e);
        }
      }

      if (isWebPLike) {
        try {
          showLoadingNotification(t.importingImages.replace('{current}', '0').replace('{total}', '?'));
          const webpFrames = await parseWebPFrames(file, (current, total) => {
            showLoadingNotification(t.importingImages.replace('{current}', current.toString()).replace('{total}', total.toString()));
          });

          if (webpFrames.length > 0) {
            const dimensions = { width: firstImageWidth, height: firstImageHeight };
            await addDecodedAnimationFrames(newFrames, file, webpFrames, /\.webp$/i, globalDuration, dimensions);
            firstImageWidth = dimensions.width;
            firstImageHeight = dimensions.height;
            continue;
          }
        } catch (e) {
          console.error("Failed to parse WebP frames, falling back to static image", e);
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

  const getCurrentTimelineFrameIndex = useCallback(() => {
    if (frames.length === 0) return -1;
    if (isPlaying && previewFrameIndex !== null) {
      return previewFrameIndex;
    }

    const targetId = lastSelectedIdRef.current && selectedFrameIds.has(lastSelectedIdRef.current)
      ? lastSelectedIdRef.current
      : Array.from(selectedFrameIds).pop();

    return targetId ? frames.findIndex(frame => frame.id === targetId) : -1;
  }, [frames, isPlaying, previewFrameIndex, selectedFrameIds]);

  const setExportInPointFromCurrentFrame = useCallback(() => {
    const frameIndex = getCurrentTimelineFrameIndex();
    if (frameIndex < 0) return;

    setExportInFrameIndex(frameIndex);
    showNotification(`${t.exportInPoint}: #${frameIndex + 1}`);
  }, [getCurrentTimelineFrameIndex, t.exportInPoint]);

  const setExportOutPointFromCurrentFrame = useCallback(() => {
    const frameIndex = getCurrentTimelineFrameIndex();
    if (frameIndex < 0) return;

    setExportOutFrameIndex(frameIndex);
    showNotification(`${t.exportOutPoint}: #${frameIndex + 1}`);
  }, [getCurrentTimelineFrameIndex, t.exportOutPoint]);

  const clearExportRange = useCallback(() => {
    setExportInFrameIndex(null);
    setExportOutFrameIndex(null);
  }, []);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Input protection: don't trigger if user is typing in an input
      const target = e.target;
      const isEditableTarget = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || (target instanceof HTMLElement && target.isContentEditable);

      if (isEditableTarget) {
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
        const hasBlockingDialog = showInsertModal
          || Boolean(pendingVideoImport)
          || isImportingVideo
          || Boolean(generatedGif)
          || isGenerating
          || showSnapshots
          || showHistoryStack
          || showTransparentConfirm
          || clearHistoryConfirm
          || clearFramesConfirm
          || Boolean(restoreConfirmId)
          || githubLinkConfirm;

        if (e.code === 'Space') {
          if (!hasBlockingDialog && frames.length > 0) {
            e.preventDefault();
            setIsPlaying(prev => !prev);
          }
        } else if (e.key.toLowerCase() === 'm') {
          if (!hasBlockingDialog && selectedFrameIds.size > 0) {
            e.preventDefault();
            handleSetColorTag(QUICK_MARK_COLOR);
          }
        } else if (e.key.toLowerCase() === 'i' || e.key.toLowerCase() === 'o') {
          if (!hasBlockingDialog && frames.length > 0) {
            e.preventDefault();
            if (e.key.toLowerCase() === 'i') {
              setExportInPointFromCurrentFrame();
            } else {
              setExportOutPointFromCurrentFrame();
            }
          }
        } else if (e.key === '[' || e.key === ']') {
          const taggedFrameIndexes = frames
            .map((frame, index) => frame.colorTag ? index : -1)
            .filter(index => index !== -1);

          if (taggedFrameIndexes.length > 0) {
            e.preventDefault();

            const selectedIndex = frames.findIndex(frame => selectedFrameIds.has(frame.id));
            const currentIndex = selectedIndex === -1 ? 0 : selectedIndex;
            const targetIndex = e.key === ']'
              ? (taggedFrameIndexes.find(index => index > currentIndex) ?? taggedFrameIndexes[0])
              : ([...taggedFrameIndexes].reverse().find(index => index < currentIndex) ?? taggedFrameIndexes[taggedFrameIndexes.length - 1]);

            selectFrameByIndex(targetIndex);
          }
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
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
  }, [
    canUndo,
    canRedo,
    undo,
    redo,
    handleDuplicate,
    handleCopy,
    handlePaste,
    handleSetColorTag,
    frames,
    selectedFrameIds,
    selectFrameByIndex,
    setExportInPointFromCurrentFrame,
    setExportOutPointFromCurrentFrame,
    showInsertModal,
    pendingVideoImport,
    isImportingVideo,
    generatedGif,
    isGenerating,
    showSnapshots,
    showHistoryStack,
    showTransparentConfirm,
    clearHistoryConfirm,
    clearFramesConfirm,
    restoreConfirmId,
    githubLinkConfirm,
  ]);


  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const incomingFiles = sortFilesByFilenameAsc(Array.from(files));
    const videoFiles = incomingFiles.filter(isVideoFile);
    if (videoFiles.length > 0) {
      await openVideoImportSettings(videoFiles, 'append');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const newFrames: FrameData[] = [];
    let firstImageWidth = 0;
    let firstImageHeight = 0;
    let hasTransparency = false;

    // Expand file list: extract images from ZIP files first
    const allFiles: File[] = [];
    const fileDurationMap = new Map<string, number>(); // Track durations from metadata
    let metadataDefaultDuration: number | undefined;

    for (let i = 0; i < incomingFiles.length; i++) {
      const file = incomingFiles[i];
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
            allFiles.push(...sortFilesByFilenameAsc(extractionResult.files));

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
      const isPngLike = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png') || file.name.toLowerCase().endsWith('.apng');
      const isWebPLike = file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');

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

            const dimensions = { width: firstImageWidth, height: firstImageHeight };
            await addDecodedAnimationFrames(newFrames, file, gifFrames, /\.gif$/i, globalDuration, dimensions);
            firstImageWidth = dimensions.width;
            firstImageHeight = dimensions.height;
            continue; // Skip standard image processing
          }
        } catch (e) {
          console.error("Failed to parse GIF frames, falling back to static image", e);
        }
      }

      if (isPngLike) {
        try {
          showLoadingNotification(t.importingImages.replace('{current}', '0').replace('{total}', '?'));
          const apngFrames = await parseAPNGFrames(file, (current, total) => {
            showLoadingNotification(t.importingImages.replace('{current}', current.toString()).replace('{total}', total.toString()));
          });

          if (apngFrames.length > 0) {
            hasTransparency = true;
            const dimensions = { width: firstImageWidth, height: firstImageHeight };
            await addDecodedAnimationFrames(newFrames, file, apngFrames, /\.(apng|png)$/i, globalDuration, dimensions);
            firstImageWidth = dimensions.width;
            firstImageHeight = dimensions.height;
            continue;
          }
        } catch (e) {
          console.error("Failed to parse APNG frames, falling back to static image", e);
        }
      }

      if (isWebPLike) {
        try {
          showLoadingNotification(t.importingImages.replace('{current}', '0').replace('{total}', '?'));
          const webpFrames = await parseWebPFrames(file, (current, total) => {
            showLoadingNotification(t.importingImages.replace('{current}', current.toString()).replace('{total}', total.toString()));
          });

          if (webpFrames.length > 0) {
            hasTransparency = true;
            const dimensions = { width: firstImageWidth, height: firstImageHeight };
            await addDecodedAnimationFrames(newFrames, file, webpFrames, /\.webp$/i, globalDuration, dimensions);
            firstImageWidth = dimensions.width;
            firstImageHeight = dimensions.height;
            continue;
          }
        } catch (e) {
          console.error("Failed to parse WebP frames, falling back to static image", e);
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

    // Disable global drag overlay if a modal is open to prevent conflicts with sliders/previews.
    if (showInsertModal || pendingVideoImport) {
      setDragActive(false);
      return;
    }

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

  const stopModalDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
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

  const saveSnapshot = useCallback(async (
    providedName?: string,
    thumbnail?: string,
    thumbnailBlob?: Blob,
    format: HistorySnapshot['format'] = 'gif'
  ) => {
    const name = providedName || prompt(translations[language].promptSave, `Version ${snapshots.length + 1}`);
    if (name) {
      const snapshot: HistorySnapshot = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        name,
        frames: [...frames],
        canvasConfig: { ...canvasConfig },
        thumbnail,
        format
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

      return {
        ...prev,
        frames: shouldScaleExistingFrames
          ? prev.frames.map(frame => ({
            ...frame,
            x: Math.round(frame.x * (newWidth / prev.canvasConfig.width)),
            y: Math.round(frame.y * (newHeight / prev.canvasConfig.height)),
            width: Math.round(frame.width * (newWidth / prev.canvasConfig.width)),
            height: Math.round(frame.height * (newHeight / prev.canvasConfig.height))
          }))
          : prev.frames,
        canvasConfig: { ...prev.canvasConfig, width: newWidth, height: newHeight }
      };
    });
  };

  const handleCanvasHeightChange = (height: number) => {
    setAppState(prev => {
      const newHeight = height || 100;
      const newWidth = isAspectRatioLocked ? Math.round(newHeight * aspectRatio) : prev.canvasConfig.width;

      return {
        ...prev,
        frames: shouldScaleExistingFrames
          ? prev.frames.map(frame => ({
            ...frame,
            x: Math.round(frame.x * (newWidth / prev.canvasConfig.width)),
            y: Math.round(frame.y * (newHeight / prev.canvasConfig.height)),
            width: Math.round(frame.width * (newWidth / prev.canvasConfig.width)),
            height: Math.round(frame.height * (newHeight / prev.canvasConfig.height))
          }))
          : prev.frames,
        canvasConfig: { ...prev.canvasConfig, width: newWidth, height: newHeight }
      };
    });
  };

  const loadFrameImageForCrop = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load frame image for crop'));
      img.src = src;
    });
  };

  const handleAutoCropCanvas = async () => {
    if (frames.length === 0 || isAutoCroppingCanvas) return;

    const canvasWidth = Math.max(1, Math.round(canvasConfig.width));
    const canvasHeight = Math.max(1, Math.round(canvasConfig.height));
    const scanCanvas = document.createElement('canvas');
    scanCanvas.width = canvasWidth;
    scanCanvas.height = canvasHeight;
    const ctx = scanCanvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      showNotification(language === 'zh' ? '无法扫描画布像素' : 'Unable to scan canvas pixels');
      return;
    }

    setIsAutoCroppingCanvas(true);

    try {
      let cropLeft = canvasWidth;
      let cropTop = canvasHeight;
      let cropRight = -1;
      let cropBottom = -1;

      for (const frame of frames) {
        const img = await loadFrameImageForCrop(frame.previewUrl);

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        if (frame.rotation) {
          ctx.save();
          const cx = frame.x + frame.width / 2;
          const cy = frame.y + frame.height / 2;
          ctx.translate(cx, cy);
          ctx.rotate((frame.rotation * Math.PI) / 180);

          if (Math.abs(frame.rotation % 180) === 90) {
            ctx.drawImage(img, -frame.height / 2, -frame.width / 2, frame.height, frame.width);
          } else {
            ctx.drawImage(img, -frame.width / 2, -frame.height / 2, frame.width, frame.height);
          }
          ctx.restore();
        } else {
          ctx.drawImage(img, frame.x, frame.y, frame.width, frame.height);
        }

        const data = ctx.getImageData(0, 0, canvasWidth, canvasHeight).data;
        let frameLeft = canvasWidth;
        let frameTop = canvasHeight;
        let frameRight = -1;
        let frameBottom = -1;

        for (let y = 0; y < canvasHeight; y++) {
          for (let x = 0; x < canvasWidth; x++) {
            const alpha = data[(y * canvasWidth + x) * 4 + 3];
            if (alpha === 0) continue;

            if (x < frameLeft) frameLeft = x;
            if (x > frameRight) frameRight = x;
            if (y < frameTop) frameTop = y;
            if (y > frameBottom) frameBottom = y;
          }
        }

        if (frameRight === -1) continue;

        cropLeft = Math.min(cropLeft, frameLeft);
        cropTop = Math.min(cropTop, frameTop);
        cropRight = Math.max(cropRight, frameRight);
        cropBottom = Math.max(cropBottom, frameBottom);
      }

      if (cropRight === -1) {
        showNotification(t.autoCropCanvasEmpty);
        return;
      }

      const nextWidth = Math.max(1, cropRight - cropLeft + 1);
      const nextHeight = Math.max(1, cropBottom - cropTop + 1);

      setAppState(prev => ({
        ...prev,
        frames: prev.frames.map(frame => ({
          ...frame,
          x: frame.x - cropLeft,
          y: frame.y - cropTop,
        })),
        canvasConfig: {
          ...prev.canvasConfig,
          width: nextWidth,
          height: nextHeight,
          backgroundImageX: prev.canvasConfig.backgroundImageX === undefined
            ? prev.canvasConfig.backgroundImageX
            : prev.canvasConfig.backgroundImageX - cropLeft,
          backgroundImageY: prev.canvasConfig.backgroundImageY === undefined
            ? prev.canvasConfig.backgroundImageY
            : prev.canvasConfig.backgroundImageY - cropTop,
        },
      }), 'batchUpdate');

      if (isAspectRatioLocked) {
        setAspectRatio(nextWidth / nextHeight);
      }

      showNotification(t.autoCropCanvasSuccess);
    } catch (error) {
      console.error('Failed to auto crop canvas', error);
      showNotification(language === 'zh' ? '自动裁切画布失败' : 'Failed to auto crop canvas');
    } finally {
      setIsAutoCroppingCanvas(false);
    }
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
    const exportStartIndex = exportInFrameIndex ?? 0;
    const exportEndIndex = exportOutFrameIndex ?? frames.length - 1;

    if (exportStartIndex > exportEndIndex) {
      showNotification(t.exportRangeInvalid);
      return;
    }

    const framesToExport = frames.slice(exportStartIndex, exportEndIndex + 1);
    if (framesToExport.length === 0) return;

    setIsGenerating(true);
    setProgress(0);
    setProgressText(t.generation.preparing);
    setGeneratedGif(null);
    setGeneratedFormat(exportFormat);

    try {
      const targetMB = parseFloat(targetSizeMB);
      const exportConfig = {
        ...canvasConfig,
        enableColorSmoothing,
        enableGlobalPalette,
        dither: ditherMethod,
        webpLossless,
        webpQuality
      };
      const apngTexts = {
        ...t.generation,
        title: language === 'zh' ? '正在生成 APNG...' : 'Generating APNG...',
        initializing: language === 'zh' ? '正在初始化 APNG 编码器...' : 'Initializing APNG encoder...',
        rendering: language === 'zh' ? '正在渲染 APNG... {0}%' : 'Rendering APNG... {0}%'
      };
      const webpTexts = {
        ...t.generation,
        title: language === 'zh' ? '正在生成 WebP...' : 'Generating WebP...',
        initializing: language === 'zh' ? '正在初始化 WebP 编码器...' : 'Initializing WebP encoder...',
        rendering: language === 'zh' ? '正在渲染 WebP... {0}%' : 'Rendering WebP... {0}%'
      };
      const blob = exportFormat === 'apng'
        ? await generateAPNG(
          framesToExport,
          exportConfig,
          (p) => setProgress(p * 100),
          (status) => setProgressText(status),
          apngTexts
        )
        : exportFormat === 'webp'
          ? await (async () => {
            const { generateWebP } = await import('./utils/webpHelper');
            return generateWebP(
              framesToExport,
              exportConfig,
              (p) => setProgress(p * 100),
              (status) => setProgressText(status),
              webpTexts
            );
          })()
        : await generateGIF(
          framesToExport,
          exportConfig,
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
      saveSnapshot(`${t.autoSaved} - ${timeStr}`, url, blob, exportFormat);

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
      <AppHeader
        language={language}
        labels={{
          toggleSidebar: t.toggleSidebar,
          undo: t.undo,
          redo: t.redo,
          records: t.records,
          exportZip: t.exportZip,
          generate: t.generate,
        }}
        isSidebarOpen={isSidebarOpen}
        canUndo={canUndo}
        canRedo={canRedo}
        showHistoryStack={showHistoryStack}
        showSnapshots={showSnapshots}
        snapshotsCount={snapshots.length}
        exportFormat={exportFormat}
        frameCount={frames.length}
        isZipping={isZipping}
        isGenerating={isGenerating}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onToggleLanguage={toggleLanguage}
        onUndo={undo}
        onRedo={redo}
        onToggleHistoryStack={() => setShowHistoryStack(!showHistoryStack)}
        onToggleSnapshots={() => setShowSnapshots(!showSnapshots)}
        onExportFormatChange={setExportFormat}
        onExportZip={() => handleExportZip(frames)}
        onGenerate={handleGenerate}
      />

      {/* Main Content */}
      <div id="main-layout-container" className="flex flex-col lg:flex-row flex-1 overflow-hidden relative min-h-0">

        <FileDropOverlay
          isActive={dragActive}
          label={t.dropHere}
          onDrag={handleDrag}
          onDrop={handleDrop}
        />

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

              <SidebarUploadArea
                inputRef={fileInputRef}
                language={language}
                clickDragLabel={t.clickDrag}
                onDragActiveChange={setDragActive}
                onFilesSelected={handleFileUpload}
              />

              <SidebarCanvasSettingsPanel
                title={t.sections.canvas}
                labels={{
                  width: t.width,
                  height: t.height,
                  backgroundColor: t.backgroundColor,
                  transparent: t.transparent,
                  lockAspectRatio: t.lockAspectRatio,
                  unlockAspectRatio: t.unlockAspectRatio,
                  scaleExistingFrames: t.scaleExistingFrames,
                  scaleExistingFramesHint: t.scaleExistingFramesHint,
                  autoCropCanvas: t.autoCropCanvas,
                  autoCropCanvasHint: t.autoCropCanvasHint,
                }}
                bgRemovalLabels={t.bgRemoval}
                canvasConfig={canvasConfig}
                exportFormat={exportFormat}
                isAspectRatioLocked={isAspectRatioLocked}
                shouldScaleExistingFrames={shouldScaleExistingFrames}
                canAutoCropCanvas={frames.length > 0}
                isAutoCroppingCanvas={isAutoCroppingCanvas}
                isGifTransparentEnabled={isGifTransparentEnabled}
                gifTransparentColor={gifTransparentColor}
                isGifEyeDropperActive={isGifEyeDropperActive}
                isBgColorEyeDropperActive={isBgColorEyeDropperActive}
                onCanvasWidthChange={handleCanvasWidthChange}
                onCanvasHeightChange={handleCanvasHeightChange}
                onToggleAspectRatioLock={toggleAspectRatioLock}
                onScaleExistingFramesChange={setShouldScaleExistingFrames}
                onAutoCropCanvas={handleAutoCropCanvas}
                onTransparentChange={handleTransparentChange}
                onGifTransparentEnabledChange={setIsGifTransparentEnabled}
                onGifTransparentColorChange={setGifTransparentColor}
                onGifEyeDropperToggle={() => setIsGifEyeDropperActive(!isGifEyeDropperActive)}
                onBackgroundColorChange={handleBgColorChange}
                onBackgroundEyeDropperToggle={() => setIsBgColorEyeDropperActive(!isBgColorEyeDropperActive)}
              />

              <SidebarExportSettingsPanel
                title={t.sections.export}
                language={language}
                exportFormat={exportFormat}
                outputLabels={t.outputControl}
                targetSizeMB={targetSizeMB}
                enableColorSmoothing={enableColorSmoothing}
                enableGlobalPalette={enableGlobalPalette}
                ditherMethod={ditherMethod}
                ditherOptions={DITHER_OPTIONS}
                isDitherMenuOpen={isDitherMenuOpen}
                ditherMenuRef={ditherMenuRef}
                webpLossless={webpLossless}
                webpQuality={webpQuality}
                onTargetSizeChange={setTargetSizeMB}
                onColorSmoothingChange={setEnableColorSmoothing}
                onGlobalPaletteChange={setEnableGlobalPalette}
                onDitherMethodChange={setDitherMethod}
                onDitherMenuOpenChange={setIsDitherMenuOpen}
                onWebpLosslessChange={setWebpLossless}
                onWebpQualityChange={setWebpQuality}
              />

              <SidebarBatchOperationsPanel
                title={t.sections.batch}
                labels={{
                  setDuration: t.setDuration,
                  apply: t.apply,
                  autoFit: t.autoFit,
                  fitFill: t.fitFill,
                  fitContain: t.fitContain,
                  applyFit: t.applyFit,
                  alignCenter: t.alignCenter,
                  mergeDuplicates: t.mergeDuplicates,
                }}
                reduceLabels={t.reduceFrames}
                durationMode={durationMode}
                globalDuration={globalDuration}
                fpsValue={fpsValue}
                fitMode={fitMode}
                reduceKeep={reduceKeep}
                reduceRemove={reduceRemove}
                onDurationModeChange={setDurationMode}
                onGlobalDurationChange={setGlobalDuration}
                onFpsValueChange={setFpsValue}
                onApplyDuration={updateGlobalDuration}
                onFitModeChange={setFitMode}
                onAutoFit={handleAutoFit}
                onAlignCenterAll={() => handleAlignCenter('all')}
                onMergeDuplicates={handleMergeDuplicates}
                onSortByFilename={sortByFilename}
                onReduceKeepChange={setReduceKeep}
                onReduceRemoveChange={setReduceRemove}
                onReduceFrames={handleReduceFrames}
              />

              <SidebarImageProcessingPanel
                title={t.sections.image}
                labels={t.bgRemoval}
                removeColor={removeColor}
                tolerance={tolerance}
                isEyeDropperActive={isEyeDropperActive}
                selectedCount={selectedFrameIds.size}
                onRemoveColorChange={setRemoveColor}
                onToleranceChange={setTolerance}
                onEyeDropperToggle={() => setIsEyeDropperActive(!isEyeDropperActive)}
                onRemoveBackground={handleRemoveBackground}
              />

              <SidebarDangerZone
                title={t.sections.actions}
                removeAllLabel={t.removeAll}
                confirmLabel={t.confirmAction}
                isConfirming={clearFramesConfirm}
                onClearAll={clearAll}
              />

              <div className="pt-2"></div>


              <SidebarFooterLinks
                craftWebsiteLabel={t.craftWebsite}
                githubRepoLabel={t.githubRepo}
                confirmLabel={t.confirmAction}
                localProcessingLabel={t.localProcessing}
                githubLinkConfirm={githubLinkConfirm}
                onGithubClick={handleGithubLinkClick}
              />
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

          <CanvasWorkspace
            isVisible={isLargeScreen ? showCanvasEditor : activeMobileTab === 'editor'}
            isLargeScreen={isLargeScreen}
            editorHeight={editorHeight}
            frames={frames}
            selectedFrameIds={selectedFrameIds}
            selectedFrame={selectedFrame}
            selectedFrameIndex={selectedFrameIndex}
            isPlaying={isPlaying}
            previewFrameIndex={previewFrameIndex}
            syncPreviewSelection={syncPreviewSelection}
            exportInFrameIndex={exportInFrameIndex}
            exportOutFrameIndex={exportOutFrameIndex}
            config={canvasConfig}
            gifTransparentColor={gifTransparentColor}
            isGifTransparentEnabled={isGifTransparentEnabled}
            isEyeDropperActive={isEyeDropperActive}
            isGifEyeDropperActive={isGifEyeDropperActive}
            isBgColorEyeDropperActive={isBgColorEyeDropperActive}
            labels={{
              canvasEditor: t.canvasEditor,
              unlinkSelection: t.unlinkSelection,
              linkSelection: t.linkSelection,
              hideEditor: t.hideEditor,
              selectFrameToEdit: t.selectFrameToEdit,
              frameInfo: t.frameInfo,
              selectedFrames: t.selectedFrames,
              batchMode: t.batchMode,
              frame: t.frame,
              preview: t.preview,
              exportInPoint: t.exportInPoint,
              exportOutPoint: t.exportOutPoint,
              clearExportRange: t.clearExportRange,
            }}
            onSyncPreviewSelectionChange={setSyncPreviewSelection}
            onPlayingChange={setIsPlaying}
            onHideEditor={() => setShowCanvasEditor(false)}
            onCanvasUpdate={handleCanvasUpdate}
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
            onSelectFrame={handleSelection}
            onSelectFrameByIndex={selectFrameByIndex}
            onSetExportInPoint={setExportInPointFromCurrentFrame}
            onSetExportOutPoint={setExportOutPointFromCurrentFrame}
            onClearExportRange={clearExportRange}
          />

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
              <FrameListControls
                frameCount={frames.length}
                selectedCount={selectedFrameIds.size}
                frameSize={frameSize}
                compactMode={compactMode}
                layoutMode={layoutMode}
                isBatchSelectMode={isBatchSelectMode}
                isBatchEditOpen={isBatchEditOpen}
                showCanvasEditor={showCanvasEditor}
                batchInputValues={batchInputValues}
                labels={{
                  frames: t.frames,
                  frameSize: t.frameSize,
                  compactMode: t.compactMode,
                  batchSelectMode: t.batchSelectMode,
                  selectionProperties: t.selectionProperties,
                  showEditor: t.showEditor,
                  hideEditor: t.hideEditor,
                  apply: t.apply,
                  duplicate: t.duplicate,
                  resetProperties: t.resetProperties,
                  frame: t.frame,
                  layoutMode: t.layoutMode,
                }}
                onFrameSizeChange={setFrameSize}
                onCompactModeChange={setCompactMode}
                onLayoutModeChange={setLayoutMode}
                onBatchSelectModeChange={setIsBatchSelectMode}
                onBatchEditOpenChange={setIsBatchEditOpen}
                onShowCanvasEditorChange={setShowCanvasEditor}
                onBatchInputChange={handleBatchInputChange}
                onApplyBatchUpdates={applyBatchUpdates}
                onDuplicate={handleDuplicate}
                onResetProperties={handleResetFrameProperties}
              />

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

          <MobileBottomTabBar
            isLargeScreen={isLargeScreen}
            activeTab={activeMobileTab}
            labels={{ frames: t.frames, canvasEditor: t.canvasEditor }}
            onTabChange={setActiveMobileTab}
          />

          {/* Footer - Moved to Sidebar */}
        </main>
      </div>

      <FrameContextMenu
        menu={contextMenu}
        labels={t.contextMenu}
        clipboardCount={clipboard.length}
        tagColors={TAG_COLORS}
        onCopy={handleContextCopy}
        onPaste={handleContextPaste}
        onDuplicate={handleContextDuplicate}
        onInsert={handleContextInsert}
        onReverseSelected={handleReverseSelectedFrames}
        onAlignCenter={() => handleAlignCenter('selected')}
        onFitContain={() => handleFitSelected('contain')}
        onFitFill={() => handleFitSelected('fill')}
        onResetProperties={handleResetFrameProperties}
        onSetColorTag={handleSetColorTag}
        onDownload={handleContextDownload}
        onDelete={handleContextDelete}
        onClose={() => setContextMenu(null)}
      />

      <InsertFilesModal
        isOpen={showInsertModal}
        inputRef={insertFileInputRef}
        labels={t.insertModal}
        onClose={() => setShowInsertModal(false)}
        onDrop={handleInsertDrop}
        onFilesSelected={handleInsertFiles}
      />

      <VideoImportModal
        pendingVideoImport={pendingVideoImport}
        language={language}
        isImportingVideo={isImportingVideo}
        videoPreviewRef={videoPreviewRef}
        videoPreviewTime={videoPreviewTime}
        onStopModalDrag={stopModalDrag}
        onClose={closeVideoImportSettings}
        onVideoPreviewTimeChange={setVideoPreviewTime}
        onSeekVideoPreview={seekVideoPreview}
        onSetInPoint={setVideoImportInPoint}
        onSetOutPoint={setVideoImportOutPoint}
        onUpdateSettings={updatePendingVideoSettings}
        onConfirm={handleConfirmVideoImport}
        closeLabel={t.close}
      />


      {/* Generation Modal */}
      <GenerationModal
        isOpen={!!generatedGif || isGenerating}
        progress={progress}
        progressText={progressText}
        generatedGif={generatedGif}
        format={generatedFormat}
        onClose={() => setGeneratedGif(null)}
        t={{
          close: t.close,
          download: t.download,
          title: t.generation.title,
          resultTitle: t.generation.resultTitle
        }}
      />

      <HistorySnapshotsDrawer
        isOpen={showSnapshots}
        snapshots={snapshots}
        language={language}
        restoreConfirmId={restoreConfirmId}
        clearHistoryConfirm={clearHistoryConfirm}
        labels={{
          historyTitle: t.historyTitle,
          noRecords: t.noRecords,
          download: t.download,
          confirmAction: t.confirmAction,
          restore: t.restore,
          downloadZip: t.downloadZip,
          clearHistory: t.clearHistory,
        }}
        onClose={() => setShowSnapshots(false)}
        onDeleteSnapshot={deleteSnapshot}
        onRestoreSnapshot={restoreSnapshot}
        onExportZip={handleExportZip}
        onClearHistory={clearHistoryRecords}
      />

      <HistoryStackPanel
        isOpen={showHistoryStack}
        isPinned={isHistoryPinned}
        historyStack={historyStack}
        currentIndex={historyIndex}
        labels={{
          history: t.history,
          noHistory: t.noHistory,
          historyActions: t.historyActions,
        }}
        onClose={() => setShowHistoryStack(false)}
        onPinnedChange={setIsHistoryPinned}
        onJumpToHistory={jumpToHistory}
      />

      <TransparentConfirmDialog
        isOpen={showTransparentConfirm}
        isClosing={dialogClosing}
        labels={t.transparentConfirm}
        onKeep={() => handleConfirmTransparentSwitch(false)}
        onSwitch={() => handleConfirmTransparentSwitch(true)}
      />

      <NotificationToast
        message={notificationMessage}
        isClosing={notificationClosing}
      />
    </div>
  );
};

export default App;
