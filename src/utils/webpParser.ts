export interface WebPFrame {
  url: string;
  delay: number;
  width: number;
  height: number;
}

interface ParsedWebPFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  duration: number;
  blend: number;
  dispose: number;
  data: Uint8Array;
}

const ascii = (value: string) => {
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) {
    bytes[i] = value.charCodeAt(i);
  }
  return bytes;
};

const readFourCC = (bytes: Uint8Array, offset: number) => {
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
};

const readUint24LE = (bytes: Uint8Array, offset: number) => {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
};

const readUint32LE = (bytes: Uint8Array, offset: number) => {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
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

const makeSingleFrameWebP = (frame: ParsedWebPFrame) => {
  let hasAlpha = false;
  let offset = 0;

  while (offset + 8 <= frame.data.length) {
    const fourCC = readFourCC(frame.data, offset);
    const size = readUint32LE(frame.data, offset + 4);
    if (fourCC === 'ALPH' || fourCC === 'VP8L') {
      hasAlpha = true;
    }
    offset += 8 + size + (size % 2);
  }

  const vp8xPayload = new Uint8Array(10);
  vp8xPayload[0] = hasAlpha ? 0x10 : 0;
  writeUint24LE(vp8xPayload, 4, frame.width - 1);
  writeUint24LE(vp8xPayload, 7, frame.height - 1);

  const payload = concatBytes([ascii('WEBP'), makeChunk('VP8X', vp8xPayload), frame.data]);
  const output = new Uint8Array(8 + payload.length);
  output.set(ascii('RIFF'), 0);
  writeUint32LE(output, 4, payload.length);
  output.set(payload, 8);

  return new Blob([output], { type: 'image/webp' });
};

const loadImageFromBlob = (blob: Blob) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode WebP frame'));
    };
    img.src = url;
  });
};

const canvasToPngUrl = (canvas: HTMLCanvasElement) => {
  return new Promise<string>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to export decoded WebP frame'));
        return;
      }
      resolve(URL.createObjectURL(blob));
    }, 'image/png');
  });
};

export const parseWebPFrames = async (
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<WebPFrame[]> => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length < 12 || readFourCC(bytes, 0) !== 'RIFF' || readFourCC(bytes, 8) !== 'WEBP') {
    throw new Error('Invalid WebP file');
  }

  let width = 0;
  let height = 0;
  let background = { r: 0, g: 0, b: 0, a: 0 };
  const parsedFrames: ParsedWebPFrame[] = [];
  let offset = 12;

  while (offset + 8 <= bytes.length) {
    const fourCC = readFourCC(bytes, offset);
    const size = readUint32LE(bytes, offset + 4);
    const payloadOffset = offset + 8;
    const paddedSize = size + (size % 2);

    if (fourCC === 'VP8X') {
      width = readUint24LE(bytes, payloadOffset + 4) + 1;
      height = readUint24LE(bytes, payloadOffset + 7) + 1;
    } else if (fourCC === 'ANIM') {
      background = {
        b: bytes[payloadOffset],
        g: bytes[payloadOffset + 1],
        r: bytes[payloadOffset + 2],
        a: bytes[payloadOffset + 3]
      };
    } else if (fourCC === 'ANMF') {
      const flags = bytes[payloadOffset + 15];
      parsedFrames.push({
        x: readUint24LE(bytes, payloadOffset) * 2,
        y: readUint24LE(bytes, payloadOffset + 3) * 2,
        width: readUint24LE(bytes, payloadOffset + 6) + 1,
        height: readUint24LE(bytes, payloadOffset + 9) + 1,
        duration: readUint24LE(bytes, payloadOffset + 12),
        dispose: flags & 1,
        blend: (flags >> 1) & 1,
        data: bytes.slice(payloadOffset + 16, payloadOffset + size)
      });
    }

    offset = payloadOffset + paddedSize;
  }

  if (width <= 0 || height <= 0 || parsedFrames.length <= 1) {
    return [];
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get WebP canvas context');

  const fillBackground = (x: number, y: number, w: number, h: number) => {
    ctx.clearRect(x, y, w, h);
    if (background.a > 0) {
      ctx.fillStyle = `rgba(${background.r}, ${background.g}, ${background.b}, ${background.a / 255})`;
      ctx.fillRect(x, y, w, h);
    }
  };

  fillBackground(0, 0, width, height);

  const frames: WebPFrame[] = [];

  for (let i = 0; i < parsedFrames.length; i++) {
    const frame = parsedFrames[i];
    if (onProgress) {
      onProgress(i + 1, parsedFrames.length);
    }

    if (i > 0) {
      const prevFrame = parsedFrames[i - 1];
      if (prevFrame.dispose === 1) {
        fillBackground(prevFrame.x, prevFrame.y, prevFrame.width, prevFrame.height);
      }
    }

    const frameImage = await loadImageFromBlob(makeSingleFrameWebP(frame));
    if (frame.blend === 1) {
      ctx.clearRect(frame.x, frame.y, frame.width, frame.height);
    }
    ctx.drawImage(frameImage, frame.x, frame.y, frame.width, frame.height);

    frames.push({
      url: await canvasToPngUrl(canvas),
      delay: frame.duration || 100,
      width,
      height
    });
  }

  return frames;
};
