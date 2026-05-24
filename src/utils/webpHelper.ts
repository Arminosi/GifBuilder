import { FrameData, CanvasConfig } from '../types';

export interface WebPStatusTexts {
  initializing: string;
  processingFrames: string;
  processingFrameN: string;
  completed: string;
}

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

const ascii = (value: string) => {
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) {
    bytes[i] = value.charCodeAt(i);
  }
  return bytes;
};

const writeUint16LE = (target: Uint8Array, offset: number, value: number) => {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >> 8) & 0xff;
};

const writeUint24LE = (target: Uint8Array, offset: number, value: number) => {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >> 8) & 0xff;
  target[offset + 2] = (value >> 16) & 0xff;
};

const writeUint32LE = (target: Uint8Array, offset: number, value: number) => {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >> 8) & 0xff;
  target[offset + 2] = (value >> 16) & 0xff;
  target[offset + 3] = (value >> 24) & 0xff;
};

const concatBytes = (parts: Uint8Array[]) => {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
};

const makeChunk = (fourCC: string, payload: Uint8Array) => {
  const chunk = new Uint8Array(8 + payload.length + (payload.length % 2));
  chunk.set(ascii(fourCC), 0);
  writeUint32LE(chunk, 4, payload.length);
  chunk.set(payload, 8);
  return chunk;
};

const readFourCC = (bytes: Uint8Array, offset: number) => {
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
};

const readUint32LE = (bytes: Uint8Array, offset: number) => {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
};

const extractFrameChunks = async (blob: Blob) => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (readFourCC(bytes, 0) !== 'RIFF' || readFourCC(bytes, 8) !== 'WEBP') {
    throw new Error('Browser returned an invalid WebP frame');
  }

  const chunks: Uint8Array[] = [];
  let hasAlpha = false;
  let offset = 12;

  while (offset + 8 <= bytes.length) {
    const fourCC = readFourCC(bytes, offset);
    const size = readUint32LE(bytes, offset + 4);
    const paddedSize = size + (size % 2);
    const end = offset + 8 + paddedSize;

    if (fourCC === 'ALPH' || fourCC === 'VP8 ' || fourCC === 'VP8L') {
      chunks.push(bytes.slice(offset, end));
      if (fourCC === 'ALPH' || fourCC === 'VP8L') {
        hasAlpha = true;
      }
    }

    offset = end;
  }

  if (chunks.length === 0) {
    throw new Error('Could not find WebP frame image data');
  }

  return { bytes: concatBytes(chunks), hasAlpha };
};

const canvasToWebPBlob = (canvas: HTMLCanvasElement, quality: number) => {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('This browser could not encode WebP frames'));
        return;
      }
      resolve(blob);
    }, 'image/webp', quality);
  });
};

const imageDataToLosslessWebPBlob = async (imageData: ImageData) => {
  const { default: encode } = await import('@jsquash/webp/encode');
  const buffer = await encode(imageData, {
    lossless: 1,
    quality: 100,
    alpha_quality: 100,
    exact: 1,
    method: 4,
    near_lossless: 100
  });

  return new Blob([buffer], { type: 'image/webp' });
};

const parseHexColor = (hex: string) => {
  const value = /^#?[0-9a-f]{6}$/i.test(hex) ? hex.replace('#', '') : 'ffffff';
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
};

export const generateWebP = async (
  frames: FrameData[],
  config: CanvasConfig,
  onProgress: (progress: number) => void,
  onStatus?: (status: string) => void,
  texts?: WebPStatusTexts
): Promise<Blob> => {
  const t = texts || {
    initializing: 'Initializing WebP encoder...',
    processingFrames: 'Processing frames...',
    processingFrameN: 'Processing frame {0}/{1}...',
    completed: 'Generation complete!'
  };

  const format = (str: string, ...args: (string | number)[]) => {
    return str.replace(/{(\d+)}/g, (match, number) => {
      return typeof args[number] !== 'undefined' ? String(args[number]) : match;
    });
  };

  if (onStatus) onStatus(t.initializing);
  onProgress(0);

  const canvas = document.createElement('canvas');
  canvas.width = config.width;
  canvas.height = config.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Could not create canvas context');
  }

  let backgroundImage: HTMLImageElement | null = null;
  if (config.backgroundImage && !config.transparent) {
    try {
      backgroundImage = await loadImage(config.backgroundImage);
    } catch (error) {
      console.warn('Failed to load WebP background image', error);
    }
  }

  if (onStatus) onStatus(t.processingFrames);

  const frameChunks: Uint8Array[] = [];
  let hasAlpha = Boolean(config.transparent);
  const isLossless = config.webpLossless === true;
  const lossyQuality = Math.min(100, Math.max(0, config.webpQuality ?? 92)) / 100;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (onStatus) onStatus(format(t.processingFrameN, i + 1, frames.length));

    const img = await loadImage(frame.previewUrl);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!config.transparent) {
      ctx.fillStyle = config.backgroundColor || '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (backgroundImage) {
        const bgX = config.backgroundImageX || 0;
        const bgY = config.backgroundImageY || 0;
        const bgWidth = config.backgroundImageDisplayWidth || config.width;
        const bgHeight = config.backgroundImageDisplayHeight || config.height;
        ctx.drawImage(backgroundImage, bgX, bgY, bgWidth, bgHeight);
      }
    }

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

    const webpBlob = isLossless
      ? await imageDataToLosslessWebPBlob(ctx.getImageData(0, 0, canvas.width, canvas.height))
      : await canvasToWebPBlob(canvas, lossyQuality);
    const extracted = await extractFrameChunks(webpBlob);
    hasAlpha = hasAlpha || extracted.hasAlpha;

    const framePayload = new Uint8Array(16 + extracted.bytes.length);
    writeUint24LE(framePayload, 0, 0);
    writeUint24LE(framePayload, 3, 0);
    writeUint24LE(framePayload, 6, config.width - 1);
    writeUint24LE(framePayload, 9, config.height - 1);
    writeUint24LE(framePayload, 12, Math.max(10, frame.duration || 100));
    framePayload[15] = 0x02; // Do not blend; each frame is a full canvas snapshot.
    framePayload.set(extracted.bytes, 16);
    frameChunks.push(makeChunk('ANMF', framePayload));

    onProgress((i + 1) / frames.length);
  }

  const vp8xPayload = new Uint8Array(10);
  vp8xPayload[0] = 0x02 | (hasAlpha ? 0x10 : 0); // Animation flag, plus alpha when present.
  writeUint24LE(vp8xPayload, 4, config.width - 1);
  writeUint24LE(vp8xPayload, 7, config.height - 1);

  const bgColor = config.transparent ? { r: 0, g: 0, b: 0 } : parseHexColor(config.backgroundColor || '#ffffff');
  const animPayload = new Uint8Array(6);
  animPayload[0] = bgColor.b;
  animPayload[1] = bgColor.g;
  animPayload[2] = bgColor.r;
  animPayload[3] = config.transparent ? 0 : 255;
  writeUint16LE(animPayload, 4, config.repeat === -1 ? 1 : config.repeat);

  const chunks = [
    makeChunk('VP8X', vp8xPayload),
    makeChunk('ANIM', animPayload),
    ...frameChunks
  ];
  const riffPayload = concatBytes([ascii('WEBP'), ...chunks]);
  const output = new Uint8Array(8 + riffPayload.length);
  output.set(ascii('RIFF'), 0);
  writeUint32LE(output, 4, riffPayload.length);
  output.set(riffPayload, 8);

  onProgress(1);
  if (onStatus) onStatus(t.completed);

  return new Blob([output], { type: 'image/webp' });
};
