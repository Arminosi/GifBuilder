
import { FrameData, CanvasConfig } from '../types';
import GIF from 'gif.js';

// Cache the worker blob URL to avoid fetching it every time
let workerBlobUrl: string | null = null;

const getWorkerUrl = async (): Promise<string> => {
  if (workerBlobUrl) return workerBlobUrl;

  try {
    const response = await fetch('https://unpkg.com/gif.js@0.2.0/dist/gif.worker.js');
    if (!response.ok) throw new Error('Network response was not ok');
    const scriptContent = await response.text();
    const blob = new Blob([scriptContent], { type: 'application/javascript' });
    workerBlobUrl = URL.createObjectURL(blob);
    return workerBlobUrl;
  } catch (error) {
    console.error("Failed to load local worker script, falling back to CDN", error);
    // Fallback if fetch fails, though likely to fail with same security error
    return 'https://unpkg.com/gif.js@0.2.0/dist/gif.worker.js';
  }
};

// Helper to load image
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((r, e) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => r(img);
    img.onerror = e;
    img.src = url;
  });
};

// Helper to find an unused color for transparency key for a single frame
const findUnusedColorForFrame = async (frameUrl: string, frameIndex: number, alphaThreshold: number = 128): Promise<{ hex: number, str: string, hasTransparency: boolean, imageData?: ImageData }> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { hex: 0x00FF00, str: '#00FF00', hasTransparency: false }; // Fallback

  try {
    const img = await loadImage(frameUrl);

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;

    // First pass: check if there's any transparency and build color set
    let hasTransparency = false;
    const usedColors = new Set<number>();

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];

      // Check for transparency
      if (alpha < alphaThreshold) {
        hasTransparency = true;
      }

      // Only consider opaque pixels (using configurable threshold)
      if (alpha >= alphaThreshold) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const colorKey = (r << 16) | (g << 8) | b;
        usedColors.add(colorKey);
      }
    }

    // If no transparency, no need to find unused color
    if (!hasTransparency) {
      console.log(`Frame ${frameIndex}: No transparency detected, skipping transparent key search`);
      return { hex: 0x00FF00, str: '#00FF00', hasTransparency: false, imageData };
    }

    // Try up to 10 random colors
    const maxAttempts = 10;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate random color (avoiding pure black/white)
      const r = Math.floor(Math.random() * 256);
      const g = Math.floor(Math.random() * 256);
      const b = Math.floor(Math.random() * 256);

      if ((r === 0 && g === 0 && b === 0) || (r === 255 && g === 255 && b === 255)) {
        continue;
      }

      const colorKey = (r << 16) | (g << 8) | b;

      if (!usedColors.has(colorKey)) {
        const hexStr = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        console.log(`Frame ${frameIndex}: Found unused transparent key color: ${hexStr}`);
        return { hex: colorKey, str: hexStr, hasTransparency: true, imageData };
      }
    }

    // If random attempts failed, try systematic search for unused color
    // Improved: smaller step size for better coverage
    for (let r = 1; r < 255; r += 11) {
      for (let g = 1; g < 255; g += 11) {
        for (let b = 1; b < 255; b += 11) {
          const colorKey = (r << 16) | (g << 8) | b;
          if (!usedColors.has(colorKey)) {
            const hexStr = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            console.log(`Frame ${frameIndex}: Found unused transparent key color (systematic): ${hexStr}`);
            return { hex: colorKey, str: hexStr, hasTransparency: true, imageData };
          }
        }
      }
    }
  } catch (e) {
    console.warn(`Failed to analyze frame ${frameIndex} for color usage`, e);
  }

  // Fallback to green
  console.warn(`Frame ${frameIndex}: Could not find unused color, falling back to green`);
  return { hex: 0x00FF00, str: '#00FF00', hasTransparency: true };
};

export interface StatusTexts {
  initializing: string;
  rendering: string; // Expects {0} for percentage
  processingFrames: string;
  processingFrameN: string; // Expects {0} for current, {1} for total
  compressing: string; // Expects {0} for current size, {1} for target, {2} for attempt
  compressionAttempt: string; // Expects {0} for attempt number
  completed: string;
}

export const generateGIF = async (
  frames: FrameData[],
  config: CanvasConfig,
  onProgress: (progress: number) => void,
  targetSizeMB?: number,
  onStatus?: (status: string) => void,
  texts?: StatusTexts,
  customTransparentColor?: string | null
): Promise<Blob> => {

  const t = texts || {
    initializing: "Initializing GIF encoder...",
    rendering: "Rendering GIF... {0}%",
    processingFrames: "Processing frames...",
    processingFrameN: "Processing frame {0}/{1}...",
    compressing: "File too large ({0}MB > {1}MB), compressing attempt {2}...",
    compressionAttempt: "[Compression {0}] ",
    completed: "Generation complete!"
  };

  // Helper for simple string formatting
  const format = (str: string, ...args: (string | number)[]) => {
    return str.replace(/{(\d+)}/g, (match, number) => {
      return typeof args[number] !== 'undefined' ? String(args[number]) : match;
    });
  };

  // Load worker script before starting
  if (onStatus) onStatus(t.initializing);
  const workerScript = await getWorkerUrl();

  const createGif = async (currentConfig: CanvasConfig, statusPrefix: string = '', progressOffset: number = 0, progressScale: number = 1): Promise<Blob> => {

    // For custom transparent color mode, calculate it once globally
    let globalTransparentKey: { hex: number, str: string } | null = null;

    if (customTransparentColor) {
      // Use user specified color
      const r = parseInt(customTransparentColor.slice(1, 3), 16);
      const g = parseInt(customTransparentColor.slice(3, 5), 16);
      const b = parseInt(customTransparentColor.slice(5, 7), 16);
      globalTransparentKey = {
        hex: (r << 16) | (g << 8) | b,
        str: customTransparentColor
      };
    }

    return new Promise((resolve, reject) => {
      const gif = new GIF({
        workers: 2,
        quality: currentConfig.quality,
        width: currentConfig.width,
        height: currentConfig.height,
        workerScript: workerScript,
        repeat: currentConfig.repeat,
        // For custom transparent color, set it globally
        // For per-frame transparency, we don't set a global transparent color
        transparent: globalTransparentKey ? (globalTransparentKey.hex as any) : null,
        background: currentConfig.transparent ? undefined : currentConfig.backgroundColor
      });

      gif.on('progress', (p) => {
        const globalProgress = progressOffset + (p * progressScale);
        onProgress(globalProgress);
        if (onStatus) onStatus(`${statusPrefix}${format(t.rendering, (globalProgress * 100).toFixed(0))}`);
      });

      gif.on('finished', (blob) => {
        resolve(blob);
      });

      const processFrames = async () => {
        if (onStatus) onStatus(`${statusPrefix}${t.processingFrames}`);
        const canvas = document.createElement('canvas');
        canvas.width = currentConfig.width;
        canvas.height = currentConfig.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          reject(new Error("Could not create canvas context"));
          return;
        }

        for (let i = 0; i < frames.length; i++) {
          const frame = frames[i];
          if (onStatus) onStatus(`${statusPrefix}${format(t.processingFrameN, i + 1, frames.length)}`);

          // Calculate per-frame transparency key if needed
          let frameTransparentKey: { hex: number, str: string } | null = null;
          let hasFrameTransparency = false;
          let cachedImageData: ImageData | undefined = undefined;
          const alphaThreshold = currentConfig.alphaThreshold ?? 128;

          if (currentConfig.transparent) {
            if (globalTransparentKey) {
              // Use global custom transparent color
              frameTransparentKey = globalTransparentKey;
              hasFrameTransparency = true; // Assume transparency when using custom color
            } else {
              // Calculate unused color for this specific frame
              const result = await findUnusedColorForFrame(frame.previewUrl, i, alphaThreshold);
              frameTransparentKey = { hex: result.hex, str: result.str };
              hasFrameTransparency = result.hasTransparency;
              cachedImageData = result.imageData;
            }
          }

          try {
            const img = await loadImage(frame.previewUrl);

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Handle background
            if (currentConfig.transparent && frameTransparentKey) {
              // If transparent mode, fill with this frame's key color first
              ctx.fillStyle = frameTransparentKey.str;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else {
              // Otherwise fill with user selected background color
              ctx.fillStyle = currentConfig.backgroundColor || '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Draw background image if present
            if (currentConfig.backgroundImage && !currentConfig.transparent) {
              try {
                const bgImg = await loadImage(currentConfig.backgroundImage);
                const scaleX = currentConfig.width / config.width;
                const scaleY = currentConfig.height / config.height;

                const bgX = (currentConfig.backgroundImageX || 0) * scaleX;
                const bgY = (currentConfig.backgroundImageY || 0) * scaleY;
                const bgWidth = (currentConfig.backgroundImageDisplayWidth || currentConfig.width) * scaleX;
                const bgHeight = (currentConfig.backgroundImageDisplayHeight || currentConfig.height) * scaleY;

                ctx.drawImage(bgImg, bgX, bgY, bgWidth, bgHeight);
              } catch (e) {
                console.warn("Failed to draw background image", e);
              }
            }

            // Prepare image to draw (handle transparency properly)
            let imageToDraw: CanvasImageSource = img;

            // Process transparency to preserve alpha channel information
            // Only process if frame actually has transparency
            if (currentConfig.transparent && frameTransparentKey && hasFrameTransparency) {
              // Create temp canvas to process image transparency
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = img.width;
              tempCanvas.height = img.height;
              const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
              if (tempCtx) {
                let imageData: ImageData;

                // Reuse cached imageData if available (from transparency detection)
                if (cachedImageData && cachedImageData.width === img.width && cachedImageData.height === img.height) {
                  // Clone the cached imageData to avoid modifying the original
                  imageData = new ImageData(
                    new Uint8ClampedArray(cachedImageData.data),
                    cachedImageData.width,
                    cachedImageData.height
                  );
                } else {
                  // Load image data if not cached
                  tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                  tempCtx.drawImage(img, 0, 0);
                  imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                }

                const data = imageData.data;

                // Replace transparent/semi-transparent pixels with the transparency key color
                // Keep opaque pixels as-is to preserve their original colors
                for (let k = 0; k < data.length; k += 4) {
                  const alpha = data[k + 3];

                  if (alpha < alphaThreshold) {
                    // Transparent or semi-transparent pixel: replace with key color and make fully transparent
                    data[k] = (frameTransparentKey.hex >> 16) & 0xFF;     // R
                    data[k + 1] = (frameTransparentKey.hex >> 8) & 0xFF;  // G
                    data[k + 2] = frameTransparentKey.hex & 0xFF;         // B
                    data[k + 3] = 0;  // Fully transparent
                  } else if (alpha < 255) {
                    // Semi-transparent pixel that's above threshold
                    // Keep the color but make it fully opaque
                    // This preserves anti-aliasing edges better
                    data[k + 3] = 255;
                  }
                  // Fully opaque pixels (alpha === 255) are kept as-is
                }

                tempCtx.putImageData(imageData, 0, 0);
                imageToDraw = tempCanvas;
              }
            } else if (customTransparentColor) {
              // Custom transparent color mode (legacy behavior)
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = img.width;
              tempCanvas.height = img.height;
              const tempCtx = tempCanvas.getContext('2d');
              if (tempCtx) {
                tempCtx.drawImage(img, 0, 0);
                const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                const data = imageData.data;
                const rTarget = parseInt(customTransparentColor.slice(1, 3), 16);
                const gTarget = parseInt(customTransparentColor.slice(3, 5), 16);
                const bTarget = parseInt(customTransparentColor.slice(5, 7), 16);

                for (let k = 0; k < data.length; k += 4) {
                  if (data[k] === rTarget && data[k + 1] === gTarget && data[k + 2] === bTarget) {
                    data[k + 3] = 0;
                  }
                }
                tempCtx.putImageData(imageData, 0, 0);
                imageToDraw = tempCanvas;
              }
            }

            // Draw image at specified position and size
            // We need to scale the frame position/size if the canvas size has changed (for compression)
            const scaleX = currentConfig.width / config.width;
            const scaleY = currentConfig.height / config.height;

            if (frame.rotation) {
              ctx.save();
              const cx = (frame.x + frame.width / 2) * scaleX;
              const cy = (frame.y + frame.height / 2) * scaleY;
              ctx.translate(cx, cy);
              ctx.rotate((frame.rotation * Math.PI) / 180);

              if (Math.abs(frame.rotation % 180) === 90) {
                ctx.drawImage(imageToDraw, (-frame.height / 2) * scaleX, (-frame.width / 2) * scaleY, frame.height * scaleX, frame.width * scaleY);
              } else {
                ctx.drawImage(imageToDraw, (-frame.width / 2) * scaleX, (-frame.height / 2) * scaleY, frame.width * scaleX, frame.height * scaleY);
              }
              ctx.restore();
            } else {
              ctx.drawImage(imageToDraw, frame.x * scaleX, frame.y * scaleY, frame.width * scaleX, frame.height * scaleY);
            }

            // Add frame with per-frame transparency if applicable
            const addFrameOptions: any = {
              copy: true,
              delay: frame.duration
            };

            // If using per-frame transparency (not global), specify transparent color for this frame
            if (currentConfig.transparent && frameTransparentKey && !globalTransparentKey) {
              addFrameOptions.transparent = frameTransparentKey.hex;
            }

            gif.addFrame(ctx, addFrameOptions);
          } catch (error) {
            console.error("Error loading frame image:", error);
          }
        }

        if (onStatus) onStatus(`${statusPrefix}${format(t.rendering, 0)}`);
        gif.render();
      };

      processFrames().catch(reject);
    });
  };

  // Initial generation
  let blob;
  if (targetSizeMB && targetSizeMB > 0) {
    // If compression might be needed, reserve first 70% for initial pass
    blob = await createGif(config, '', 0, 0.7);
  } else {
    // Otherwise use full range
    blob = await createGif(config, '', 0, 1);
  }

  // If target size is set, try to compress
  if (targetSizeMB && targetSizeMB > 0) {
    const targetBytes = targetSizeMB * 1024 * 1024;
    let attempts = 0;
    let currentConfig = { ...config };

    // Simple iterative compression strategy
    while (blob.size > targetBytes && attempts < 5) {
      attempts++;
      const currentSizeMB = (blob.size / 1024 / 1024).toFixed(2);
      if (onStatus) onStatus(format(t.compressing, currentSizeMB, targetSizeMB, attempts));

      const ratio = targetBytes / blob.size;

      // Reduce dimensions (sqrt of ratio to maintain aspect ratio roughly)
      // Don't go below 50% of previous size in one step to avoid over-compression
      const scaleFactor = Math.max(0.7, Math.sqrt(ratio));

      currentConfig.width = Math.max(100, Math.floor(currentConfig.width * scaleFactor));
      currentConfig.height = Math.max(100, Math.floor(currentConfig.height * scaleFactor));

      // Also reduce quality slightly (increase number)
      // gif.js quality: 1 (best) - 30 (worst)
      currentConfig.quality = Math.min(30, currentConfig.quality + 5);

      console.log(`Compression attempt ${attempts}: Size ${blob.size / 1024 / 1024}MB > Target ${targetSizeMB}MB. New size: ${currentConfig.width}x${currentConfig.height}, Quality: ${currentConfig.quality}`);

      const prefix = format(t.compressionAttempt, attempts);
      // Distribute remaining 30% across 5 potential attempts (6% each)
      const baseProgress = 0.7 + ((attempts - 1) * 0.06);
      blob = await createGif(currentConfig, prefix, baseProgress, 0.06);
    }
  }

  if (onStatus) onStatus(t.completed);
  onProgress(1);
  return blob;
};
