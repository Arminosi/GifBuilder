import React from 'react';
import { ImagePlus, Plus, X } from 'lucide-react';
import type { TranslationSchema } from '../utils/translations';

interface InsertFilesModalProps {
  isOpen: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  labels: TranslationSchema['insertModal'];
  onClose: () => void;
  onDrop: (event: React.DragEvent) => void;
  onFilesSelected: (files: FileList | null) => void;
}

export const InsertFilesModal: React.FC<InsertFilesModalProps> = ({
  isOpen,
  inputRef,
  labels,
  onClose,
  onDrop,
  onFilesSelected,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
      <div className="bg-gray-900 rounded-xl shadow-2xl max-w-md w-full border border-gray-700 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-850">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Plus size={18} className="text-blue-400" />
            {labels.title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white p-1"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 hover:border-blue-500 hover:bg-gray-800/50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group h-48"
            onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); }}
            onDrop={onDrop}
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
            <p className="text-sm font-medium text-gray-300 text-center">{labels.dropText}</p>
          </div>
        </div>
        <div className="p-4 border-t border-gray-800 bg-gray-850 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white text-sm"
          >
            {labels.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};
