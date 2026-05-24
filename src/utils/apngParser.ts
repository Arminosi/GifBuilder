export interface APNGFrame {
  url: string;
  delay: number;
  width: number;
  height: number;
}

export const parseAPNGFrames = async (
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<APNGFrame[]> => {
  const { default: UPNG } = await import('upng-js');
  const arrayBuffer = await file.arrayBuffer();
  const decoded = UPNG.decode(arrayBuffer);

  if (!decoded.tabs.acTL || decoded.frames.length <= 1) {
    return [];
  }

  const rgbaFrames = UPNG.toRGBA8(decoded);
  const frames: APNGFrame[] = [];

  const canvas = document.createElement('canvas');
  canvas.width = decoded.width;
  canvas.height = decoded.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get APNG canvas context');

  for (let i = 0; i < rgbaFrames.length; i++) {
    if (onProgress) {
      onProgress(i + 1, rgbaFrames.length);
    }

    const rgba = new Uint8ClampedArray(rgbaFrames[i]);
    const imageData = new ImageData(rgba, decoded.width, decoded.height);
    ctx.putImageData(imageData, 0, 0);

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (blob) {
      frames.push({
        url: URL.createObjectURL(blob),
        delay: decoded.frames[i]?.delay || 100,
        width: decoded.width,
        height: decoded.height
      });
    }
  }

  return frames;
};
