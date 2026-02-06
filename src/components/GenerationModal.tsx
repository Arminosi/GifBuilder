import React from 'react';
import { Loader2, XIcon } from 'lucide-react';

interface GenerationModalProps {
  isOpen: boolean;
  progress: number;
  progressText: string;
  generatedGif: string | null;
  onClose: () => void;
  t: {
    close: string;
    download: string;
    title: string;
    resultTitle: string;
  };
}

export const GenerationModal: React.FC<GenerationModalProps> = ({
  isOpen,
  progress,
  progressText,
  generatedGif,
  onClose,
  t
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <h3 className="text-lg font-semibold text-white">
            {!generatedGif ? t.title : t.resultTitle}
          </h3>
          {generatedGif && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <XIcon size={20} />
            </button>
          )}
        </div>

        <div className="p-8 flex-1 overflow-auto custom-scrollbar flex items-center justify-center bg-gray-950/50 min-h-[300px]">
          {!generatedGif ? (
            <div className="text-center space-y-6 w-full max-w-md px-6">
              <div className="relative flex items-center justify-center py-4">
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <Loader2 size={120} className="animate-spin text-blue-500" />
                </div>
                <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-purple-400 drop-shadow-sm">
                  {Math.round(progress)}<span className="text-2xl text-gray-500 ml-1">%</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="h-3 bg-gray-800/80 rounded-full overflow-hidden backdrop-blur-sm border border-gray-700 shadow-inner p-[1px]">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    style={{ width: `${Math.max(2, progress)}%` }}
                  />
                </div>
                <p className="text-sm font-medium text-gray-400 h-6 flex items-center justify-center gap-2">
                  {progress < 100 && <Loader2 size={14} className="animate-spin text-blue-400" />}
                  {progressText}
                </p>
              </div>
            </div>
          ) : (
            <img
              src={generatedGif}
              alt="Generated GIF"
              className="max-w-full max-h-[60vh] object-contain shadow-2xl rounded-lg border border-gray-800"
              style={{
                backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                backgroundColor: '#fff'
              }}
            />
          )}
        </div>

        {generatedGif && (
          <div className="p-6 border-t border-gray-800 bg-gray-900/50 flex justify-end gap-3 rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              {t.close}
            </button>
            <a
              href={generatedGif}
              download={`animation-${Date.now()}.gif`}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20 flex items-center gap-2"
            >
              {t.download}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
