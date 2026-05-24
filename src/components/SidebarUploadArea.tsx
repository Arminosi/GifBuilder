import React from 'react';
import { ImagePlus } from 'lucide-react';
import type { Language } from '../utils/translations';

interface SidebarUploadAreaProps {
  inputRef: React.RefObject<HTMLInputElement>;
  language: Language;
  clickDragLabel: string;
  onDragActiveChange: (active: boolean) => void;
  onFilesSelected: (files: FileList | null) => void;
}

export const SidebarUploadArea: React.FC<SidebarUploadAreaProps> = ({
  inputRef,
  language,
  clickDragLabel,
  onDragActiveChange,
  onFilesSelected,
}) => (
  <div
    onClick={() => inputRef.current?.click()}
    onDragOver={(event) => {
      event.preventDefault();
      event.stopPropagation();
      onDragActiveChange(true);
    }}
    onDrop={(event) => {
      event.preventDefault();
      event.stopPropagation();
      onDragActiveChange(false);
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        onFilesSelected(event.dataTransfer.files);
      }
    }}
    className="border-2 border-dashed border-gray-700 hover:border-blue-500 hover:bg-gray-800/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group"
  >
    <input
      type="file"
      multiple
      accept="image/*,video/*,.mp4,.webm,.mov,.m4v,.ogv,.zip,application/zip"
      className="hidden"
      ref={inputRef}
      onChange={(event) => onFilesSelected(event.target.files)}
    />
    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
      <ImagePlus className="text-gray-400 group-hover:text-blue-400" size={24} />
    </div>
    <p className="text-sm font-medium text-gray-300 text-center">{clickDragLabel}</p>
    <p className="text-xs text-gray-500 mt-1">
      {language === 'zh' ? '支持 PNG, JPG, WEBP, GIF, APNG, MP4, WebM, MOV, ZIP' : 'Supports PNG, JPG, WEBP, GIF, APNG, MP4, WebM, MOV, ZIP'}
    </p>
  </div>
);
