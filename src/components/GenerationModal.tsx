import React, { useEffect, useState } from 'react';
import { Loader2, XIcon } from 'lucide-react';
import type { ExportTimingSnapshot } from '../utils/exportStatusTimer';

interface GenerationModalProps {
  isOpen: boolean;
  progress: number;
  progressText: string;
  exportTiming?: ExportTimingSnapshot | null;
  generatedGif: string | null;
  format?: 'gif' | 'apng' | 'webp';
  timingLabels?: {
    stage: string;
    total: string;
  };
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
  exportTiming,
  generatedGif,
  format = 'gif',
  timingLabels = { stage: 'Stage', total: 'Total' },
  onClose,
  t
}) => {
  const getNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const [clockNow, setClockNow] = useState(getNow);

  useEffect(() => {
    setClockNow(getNow());

    if (!isOpen || generatedGif || !exportTiming || exportTiming.completedAt) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setClockNow(getNow());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isOpen, generatedGif, exportTiming?.stageKey, exportTiming?.totalStartedAt, exportTiming?.completedAt]);

  if (!isOpen) return null;

  const downloadLabel = format === 'apng'
    ? t.download.replace(/GIF/gi, 'APNG')
    : format === 'webp'
      ? t.download.replace(/GIF/gi, 'WebP')
      : t.download;
  const titleLabel = format === 'apng'
    ? t.title.replace(/GIF/gi, 'APNG')
    : format === 'webp'
      ? t.title.replace(/GIF/gi, 'WebP')
      : t.title;
  const formatSeconds = (startedAt: number, endedAt: number) => `${Math.max(0, (endedAt - startedAt) / 1000).toFixed(1)}s`;
  const timingNow = exportTiming?.completedAt ?? clockNow;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <h3 className="text-lg font-semibold text-white">
            {!generatedGif ? titleLabel : t.resultTitle}
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
            <div className="text-center space-y-5 w-full max-w-md px-6">
              <div className="flex items-baseline justify-center gap-1 py-2">
                <span className="text-4xl font-semibold text-gray-100">
                  {Math.round(progress)}
                </span>
                <span className="text-base font-medium text-gray-500">%</span>
              </div>

              <div className="space-y-3">
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700/70">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(0, progress)}%` }}
                  />
                </div>
                <p className="text-sm font-medium text-gray-400 min-h-6 flex items-center justify-center gap-2 leading-5 text-center flex-wrap">
                  {progress < 100 && <Loader2 size={14} className="animate-spin text-blue-400" />}
                  {progressText}
                </p>
                {exportTiming && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="rounded-md border border-gray-800 bg-gray-900/70 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wide text-gray-500">{timingLabels.stage}</div>
                      <div className="mt-0.5 font-mono text-sm font-semibold text-blue-300">
                        {formatSeconds(exportTiming.stageStartedAt, timingNow)}
                      </div>
                    </div>
                    <div className="rounded-md border border-gray-800 bg-gray-900/70 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wide text-gray-500">{timingLabels.total}</div>
                      <div className="mt-0.5 font-mono text-sm font-semibold text-gray-200">
                        {formatSeconds(exportTiming.totalStartedAt, timingNow)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <img
              src={generatedGif}
              alt="Generated GIF"
              className="max-w-full max-h-[60vh] object-contain shadow-2xl rounded-lg border border-gray-800"
              style={{
                backgroundImage: 'conic-gradient(#ffffff 25%, #d1d5db 0 50%, #ffffff 0 75%, #d1d5db 0)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0',
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
              download={`animation-${Date.now()}.${format === 'apng' ? 'png' : format}`}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20 flex items-center gap-2"
            >
              {downloadLabel}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
