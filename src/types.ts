export interface FrameData {
  id: string;
  file: File;
  previewUrl: string;
  duration: number; // in milliseconds
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // in degrees
  colorTag?: string; // hex color code
  originalWidth: number;
  originalHeight: number;
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
}

export interface HistorySnapshot {
  id: string;
  timestamp: number;
  name: string;
  frames: FrameData[];
  canvasConfig: CanvasConfig;
  thumbnail?: string; // Optional generated GIF blob URL
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
