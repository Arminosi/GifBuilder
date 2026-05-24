import React from 'react';
import { Check, Download, Package, Trash2, Undo2, X } from 'lucide-react';
import type { FrameData, HistorySnapshot } from '../types';
import type { Language, TranslationSchema } from '../utils/translations';

type HistoryLabels = Pick<
  TranslationSchema,
  | 'historyTitle'
  | 'noRecords'
  | 'download'
  | 'confirmAction'
  | 'restore'
  | 'downloadZip'
  | 'clearHistory'
>;

interface HistorySnapshotsDrawerProps {
  isOpen: boolean;
  snapshots: HistorySnapshot[];
  language: Language;
  restoreConfirmId: string | null;
  clearHistoryConfirm: boolean;
  labels: HistoryLabels;
  onClose: () => void;
  onDeleteSnapshot: (id: string) => void;
  onRestoreSnapshot: (snapshot: HistorySnapshot) => void;
  onExportZip: (frames: FrameData[]) => void;
  onClearHistory: () => void;
}

export const HistorySnapshotsDrawer: React.FC<HistorySnapshotsDrawerProps> = ({
  isOpen,
  snapshots,
  language,
  restoreConfirmId,
  clearHistoryConfirm,
  labels,
  onClose,
  onDeleteSnapshot,
  onRestoreSnapshot,
  onExportZip,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-16 right-0 bottom-0 w-80 bg-gray-900 border-l border-gray-800 z-30 shadow-2xl transform transition-transform p-4 overflow-y-auto custom-scrollbar flex flex-col">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h3 className="font-bold text-white">{labels.historyTitle}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={24} /></button>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto pb-4">
        {snapshots.length === 0 && <p className="text-gray-500 text-sm italic">{labels.noRecords}</p>}
        {snapshots.map((snap) => (
          <div key={snap.id} className="bg-gray-800 p-3 rounded border border-gray-700 hover:border-blue-500 transition-colors group">
            <div className="flex justify-between items-start mb-1">
              <span className="font-medium text-sm text-gray-200 truncate pr-2">{snap.name}</span>
              <button
                onClick={() => onDeleteSnapshot(snap.id)}
                className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {snap.thumbnail ? (
              <div className="mb-2 w-full h-24 bg-gray-900 rounded overflow-hidden flex items-center justify-center border border-gray-800 relative group/thumb">
                <img src={snap.thumbnail} alt={snap.name} className="max-w-full max-h-full" />
                <a
                  href={snap.thumbnail}
                  download={`gif_builder_${snap.timestamp}.gif`}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-all duration-200"
                  title={labels.download}
                  onClick={(event) => event.stopPropagation()}
                >
                  <Download size={24} className="text-white drop-shadow-md transform scale-90 hover:scale-110 transition-transform" />
                </a>
              </div>
            ) : (
              <div className="mb-2 w-full h-12 bg-gray-900 rounded border border-gray-800 flex items-center justify-center text-xs text-gray-500">
                ZIP Archive
              </div>
            )}

            <div className="text-xs text-gray-500 mb-2">
              {new Date(snap.timestamp).toLocaleTimeString()} - {snap.frames.length} {language === 'zh' ? '帧' : snap.frames.length === 1 ? 'frame' : 'frames'}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onRestoreSnapshot(snap)}
                className={`py-1.5 text-xs rounded transition-colors flex items-center justify-center gap-1 ${restoreConfirmId === snap.id
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
              >
                {restoreConfirmId === snap.id ? <Check size={12} /> : <Undo2 size={12} />}
                {restoreConfirmId === snap.id ? labels.confirmAction : labels.restore}
              </button>
              <button
                onClick={() => onExportZip(snap.frames)}
                className="py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors flex items-center justify-center gap-1"
                title={labels.downloadZip}
              >
                <Package size={12} /> ZIP
              </button>
            </div>
          </div>
        ))}
      </div>

      {snapshots.length > 0 && (
        <div className="pt-4 border-t border-gray-800 shrink-0">
          <button
            onClick={onClearHistory}
            className={`w-full py-2 rounded text-xs transition-colors flex items-center justify-center gap-2 border ${clearHistoryConfirm ? 'bg-red-600 text-white border-red-500' : 'bg-transparent text-red-500 border-red-900/30 hover:bg-red-900/20'}`}
          >
            <Trash2 size={14} />
            {clearHistoryConfirm ? labels.confirmAction : labels.clearHistory}
          </button>
        </div>
      )}
    </div>
  );
};
