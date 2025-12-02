
import JSZip from 'jszip';
import { FrameData } from '../types';

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
