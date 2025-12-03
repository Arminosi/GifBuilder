
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

// Helper to find an unused color for transparency key
const findUnusedColor = async (frames: FrameData[], onStatus?: (status: string) => void): Promise<{ hex: number, str: string }> => {
    if (onStatus) onStatus("Analyzing colors for transparency...");
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { hex: 0x00FF00, str: '#00FF00' }; // Fallback

    // Try up to 5 random colors
    const maxAttempts = 5;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Generate random color (avoiding pure black/white just in case)
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        
        if ((r===0 && g===0 && b===0) || (r===255 && g===255 && b===255)) {
            attempt--;
            continue;
        }

        let isColorUsed = false;

        // Check every frame
        for (const frame of frames) {
            try {
                const img = await loadImage(frame.previewUrl);
                
                // Resize canvas to match image
                if (canvas.width !== img.width || canvas.height !== img.height) {
                    canvas.width = img.width;
                    canvas.height = img.height;
                }
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, img.width, img.height).data;
                
                // Scan pixels
                for (let i = 0; i < imageData.length; i += 4) {
                    // Ignore transparent pixels (alpha < 128)
                    if (imageData[i + 3] < 128) continue; 

                    if (imageData[i] === r && imageData[i + 1] === g && imageData[i + 2] === b) {
                        isColorUsed = true;
                        break;
                    }
                }
            } catch (e) {
                console.warn("Failed to check frame for color usage", e);
            }

            if (isColorUsed) break;
        }

        if (!isColorUsed) {
            const hexStr = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            const hexNum = (r << 16) | (g << 8) | b;
            console.log(`Found unused transparent key color: ${hexStr}`);
            return { hex: hexNum, str: hexStr };
        }
    }

    console.warn("Could not find unused color after attempts, falling back to green");
    return { hex: 0x00FF00, str: '#00FF00' };
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
      
      // Determine transparent key color if needed
      let transparentKey = { hex: 0x00FF00, str: '#00FF00' };
      
      if (customTransparentColor) {
          // Use user specified color
          const r = parseInt(customTransparentColor.slice(1, 3), 16);
          const g = parseInt(customTransparentColor.slice(3, 5), 16);
          const b = parseInt(customTransparentColor.slice(5, 7), 16);
          transparentKey = {
              hex: (r << 16) | (g << 8) | b,
              str: customTransparentColor
          };
      } else if (currentConfig.transparent) {
          transparentKey = await findUnusedColor(frames, onStatus);
      }

      return new Promise((resolve, reject) => {
        const gif = new GIF({
          workers: 2,
          quality: currentConfig.quality,
          width: currentConfig.width,
          height: currentConfig.height,
          workerScript: workerScript,
          repeat: currentConfig.repeat,
          // If transparent is requested, use our key color. 
          // If custom color is set but we are in solid mode, we do NOT want final GIF transparency (we want composition).
          transparent: currentConfig.transparent ? (transparentKey.hex as any) : null,
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
            try {
              const img = await loadImage(frame.previewUrl);
              
              // Clear canvas
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              
              // Handle background
              if (currentConfig.transparent) {
                 // If transparent mode, fill with key color first
                 ctx.fillStyle = transparentKey.str;
                 ctx.fillRect(0, 0, canvas.width, canvas.height);
              } else {
                 // Otherwise fill with user selected background color
                 ctx.fillStyle = currentConfig.backgroundColor || '#ffffff';
                 ctx.fillRect(0, 0, canvas.width, canvas.height);
              }

              // Prepare image to draw (handle custom transparency if needed)
              let imageToDraw: CanvasImageSource = img;

              if (customTransparentColor) {
                  // Create temp canvas to process image
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
                          if (data[k] === rTarget && data[k+1] === gTarget && data[k+2] === bTarget) {
                              data[k+3] = 0;
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

              gif.addFrame(ctx, {
                copy: true,
                delay: frame.duration
              });
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
