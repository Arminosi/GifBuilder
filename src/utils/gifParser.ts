import { GifReader } from 'omggif';

export interface GifFrame {
  url: string;
  delay: number;
  width: number;
  height: number;
}

export const parseGifFrames = async (
  file: File, 
  onProgress?: (current: number, total: number) => void
): Promise<GifFrame[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const intArray = new Uint8Array(arrayBuffer);
  
  // Create GifReader
  let reader: GifReader;
  try {
    reader = new GifReader(intArray);
  } catch (e) {
    console.error("Failed to parse GIF", e);
    throw new Error("Invalid GIF file");
  }
  
  const width = reader.width;
  const height = reader.height;
  
  const frames: GifFrame[] = [];
  
  // Main canvas for composition
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get canvas context");
  
  // Temporary buffer and canvas for decoding individual frames
  const tempBuffer = new Uint8ClampedArray(width * height * 4);
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) throw new Error("Could not get temp canvas context");
  
  let savedState: ImageData | null = null;
  
  const totalFrames = reader.numFrames();
  
  for (let i = 0; i < totalFrames; i++) {
    // Report progress
    if (onProgress) {
      onProgress(i + 1, totalFrames);
    }
    
    const frameInfo = reader.frameInfo(i);
    
    // 1. Handle disposal of the PREVIOUS frame
    if (i > 0) {
      const prevInfo = reader.frameInfo(i - 1);
      if (prevInfo.disposal === 2) {
        // Restore to background (clear)
        // Note: GIF spec says restore to background color, but usually transparent for web
        ctx.clearRect(prevInfo.x, prevInfo.y, prevInfo.width, prevInfo.height);
      } else if (prevInfo.disposal === 3 && savedState) {
        // Restore to previous
        ctx.putImageData(savedState, 0, 0);
      }
    }
    
    // 2. Save state if current frame requires "Restore to Previous" later
    if (frameInfo.disposal === 3) {
      savedState = ctx.getImageData(0, 0, width, height);
    }
    
    // 3. Decode current frame
    // Clear temp buffer
    tempBuffer.fill(0);
    
    // Decode pixels into tempBuffer (omggif writes to the full buffer at correct x,y)
    reader.decodeAndBlitFrameRGBA(i, tempBuffer);
    
    // Put onto temp canvas
    const frameImageData = new ImageData(tempBuffer, width, height);
    tempCtx.putImageData(frameImageData, 0, 0);
    
    // 4. Draw temp canvas onto main canvas (handles alpha blending)
    ctx.drawImage(tempCanvas, 0, 0);
    
    // 5. Export frame
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (blob) {
      frames.push({
        url: URL.createObjectURL(blob),
        delay: frameInfo.delay * 10, // delay is in 100ths of a second, convert to ms
        width: width,
        height: height
      });
    }
  }
  
  return frames;
};
