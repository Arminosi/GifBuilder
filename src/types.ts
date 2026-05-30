import type { VideoImportSettings, VideoMetadata } from './utils/videoHelper';

export interface FrameData {
  id: string;
  file: File;
  previewUrl: string;
  startTime?: number; // optional timeline position in milliseconds within its track
  duration: number; // in milliseconds
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // in degrees
  colorTag?: string; // hex color code
  originalWidth: number;
  originalHeight: number;
  layers?: LayerData[];
  activeLayerId?: string;
}

export type LayerType = 'image';

export interface LayerKeyframe {
  frame: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  visible?: boolean;
}

export interface ImageLayerSource {
  file?: File;
  previewUrl: string;
  originalWidth: number;
  originalHeight: number;
  name?: string;
}

export interface LayerData {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  startFrame: number;
  endFrame: number | null;
  opacity: number;
  blendMode?: GlobalCompositeOperation;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  source: ImageLayerSource;
  keyframes?: LayerKeyframe[];
}

export interface LayerTrack {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  clips: LayerData[];
}

export interface FrameTrack {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  frames: FrameData[];
}

export interface CanvasConfig {
  width: number;
  height: number;
  quality: number; // 1-30 (lower is better)
  repeat: number; // 0 for loop, -1 for no loop
  transparent: string | null;
  backgroundColor: string;
  backgroundImage?: string;
  backgroundImageX?: number;
  backgroundImageY?: number;
  backgroundImageDisplayWidth?: number;
  backgroundImageDisplayHeight?: number;
  alphaThreshold?: number; // 0-255, pixels with alpha below this become transparent (default: 128)

  // Compression optimization options
  enableFrameDeduplication?: boolean; // Remove duplicate consecutive frames (default: true)
  enableAdaptivePalette?: boolean; // Use optimal palette size based on colors (default: true)
  enableColorSmoothing?: boolean; // Smooth colors between frames to reduce flickering (default: false)
  enableGlobalPalette?: boolean; // Use one palette for all GIF frames (default: true)
  dither?: false | 'FloydSteinberg' | 'FloydSteinberg-serpentine' | 'FalseFloydSteinberg' | 'FalseFloydSteinberg-serpentine' | 'Stucki' | 'Stucki-serpentine' | 'Atkinson' | 'Atkinson-serpentine';
  webpLossless?: boolean; // Use lossless WebP frame encoding (default: false)
  webpQuality?: number; // 0-100 lossy WebP quality (default: 92)
}

export interface HistorySnapshot {
  id: string;
  timestamp: number;
  name: string;
  frames: FrameData[];
  frameTracks?: FrameTrack[];
  activeFrameTrackId?: string;
  globalLayers?: LayerData[];
  layerTracks?: LayerTrack[];
  canvasConfig: CanvasConfig;
  thumbnail?: string; // Optional generated animation blob URL
  format?: 'gif' | 'apng' | 'webp';
}

export interface PendingVideoImport {
  files: File[];
  mode: 'append' | 'insert';
  insertIndex: number | null;
  metadata: VideoMetadata;
  previewUrl: string;
  settings: VideoImportSettings;
}

export interface FrameContextMenuState {
  x: number;
  y: number;
  insertIndex: number;
}

// Minimal type definition for gif.js since we might not have the @types package installed
export interface GIFOptions {
  workers?: number;
  quality?: number;
  width?: number;
  height?: number;
  workerScript?: string;
  repeat?: number;
  background?: string;
  transparent?: string | null;
  dither?: boolean | string;
  globalPalette?: boolean | number[];
}

export interface AddFrameOptions {
  delay?: number;
  copy?: boolean;
}

export declare class GIF {
  constructor(options: GIFOptions);
  addFrame(image: HTMLImageElement | HTMLCanvasElement | CanvasRenderingContext2D, options?: AddFrameOptions): void;
  on(event: 'finished', callback: (blob: Blob) => void): void;
  on(event: 'progress', callback: (percentage: number) => void): void;
  render(): void;
}
