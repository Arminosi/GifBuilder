import React from 'react';
import { Upload } from 'lucide-react';

interface FileDropOverlayProps {
  isActive: boolean;
  label: string;
  onDrag: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
}

export const FileDropOverlay: React.FC<FileDropOverlayProps> = ({
  isActive,
  label,
  onDrag,
  onDrop,
}) => {
  if (!isActive) return null;

  return (
    <div
      className="absolute inset-0 bg-blue-500/20 border-4 border-blue-500 border-dashed z-[100] flex items-center justify-center backdrop-blur-sm"
      onDragEnter={onDrag}
      onDragLeave={onDrag}
      onDragOver={onDrag}
      onDrop={onDrop}
    >
      <div className="bg-gray-900 p-8 rounded-xl shadow-2xl flex flex-col items-center pointer-events-none">
        <Upload size={48} className="text-blue-400 mb-4" />
        <h2 className="text-2xl font-bold text-white">{label}</h2>
      </div>
    </div>
  );
};
