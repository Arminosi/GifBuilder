
import JSZip from 'jszip';
import { FrameData } from '../types';

// Supported image extensions for ZIP extraction
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'];

/**
 * Natural sort comparator for filenames.
 * Handles numeric sequences so that "frame_2.png" comes before "frame_10.png".
 */
const naturalCompare = (a: string, b: string): number => {
  const ax: (string | number)[] = [];
  const bx: (string | number)[] = [];

  a.replace(/(\d+)|(\D+)/g, (_, d, s) => {
    ax.push(d ? parseInt(d, 10) : s);
    return '';
  });
  b.replace(/(\d+)|(\D+)/g, (_, d, s) => {
    bx.push(d ? parseInt(d, 10) : s);
    return '';
  });

  const len = Math.max(ax.length, bx.length);
  for (let i = 0; i < len; i++) {
    const ai = ax[i] ?? '';
    const bi = bx[i] ?? '';

    if (typeof ai === 'number' && typeof bi === 'number') {
      if (ai !== bi) return ai - bi;
    } else {
      const cmp = String(ai).localeCompare(String(bi));
      if (cmp !== 0) return cmp;
    }
  }
  return 0;
};

/**
 * Extract image files from a ZIP archive.
 * Scans all files inside the ZIP (including nested directories),
 * filters for supported image formats, sorts them by natural filename order,
 * and returns them as File objects.
 *
 * @param zipFile The ZIP file (File / Blob) to extract from
 * @param onProgress Optional callback for progress updates (current, total)
 * @returns Array of File objects for each image found
 */
export const extractFramesFromZip = async (
  zipFile: File,
  onProgress?: (current: number, total: number) => void
): Promise<File[]> => {
  const zip = await JSZip.loadAsync(zipFile);

  // Collect all image file entries (skip directories and macOS resource forks)
  const imageEntries: { path: string; entry: JSZip.JSZipObject }[] = [];

  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return;

    // Skip macOS __MACOSX resource fork files
    if (relativePath.startsWith('__MACOSX/') || relativePath.includes('/__MACOSX/')) return;
    // Skip hidden files (starting with .)
    const fileName = relativePath.split('/').pop() || '';
    if (fileName.startsWith('.')) return;

    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    if (IMAGE_EXTENSIONS.includes(ext)) {
      imageEntries.push({ path: relativePath, entry: zipEntry });
    }
  });

  // Sort by full path using natural sort (handles numbered sequences)
  imageEntries.sort((a, b) => naturalCompare(a.path, b.path));

  const total = imageEntries.length;
  const files: File[] = [];

  for (let i = 0; i < imageEntries.length; i++) {
    const { path, entry } = imageEntries[i];
    const fileName = path.split('/').pop() || `frame_${i}.png`;

    // Determine MIME type from extension
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    let mimeType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.bmp') mimeType = 'image/bmp';

    const blob = await entry.async('blob');
    const file = new File([blob], fileName, { type: mimeType });
    files.push(file);

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return files;
};

export const generateFrameZip = async (frames: FrameData[]): Promise<Blob> => {
  const zip = new JSZip();
  
  // Iterate through frames and add them to the zip
  // The frames are already sorted in the array passed to this function
  frames.forEach((frame, index) => {
    // Determine extension from original file name, default to png
    const originalName = frame.file.name;
    const extension = originalName.substring(originalName.lastIndexOf('.')) || '.png';
    
    // Create sequential name: frame_001.png, frame_002.png, etc.
    const sequentialName = `frame_${String(index + 1).padStart(3, '0')}${extension}`;
    
    zip.file(sequentialName, frame.file);
  });

  // Generate the zip file as a Blob
  return await zip.generateAsync({ type: 'blob' });
};
