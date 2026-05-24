import React from 'react';
import { History, Pin, PinOff, X } from 'lucide-react';
import type { HistoryItem } from '../hooks/useHistory';
import type { TranslationSchema } from '../utils/translations';

interface HistoryStackPanelProps {
  isOpen: boolean;
  isPinned: boolean;
  historyStack: HistoryItem<unknown>[];
  currentIndex: number;
  labels: Pick<TranslationSchema, 'history' | 'noHistory' | 'historyActions'>;
  onClose: () => void;
  onPinnedChange: (isPinned: boolean) => void;
  onJumpToHistory: (index: number) => void;
}

export const HistoryStackPanel: React.FC<HistoryStackPanelProps> = ({
  isOpen,
  isPinned,
  historyStack,
  currentIndex,
  labels,
  onClose,
  onPinnedChange,
  onJumpToHistory,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {!isPinned && (
        <div className="fixed inset-0 z-[90]" onClick={onClose} />
      )}

      <div className="fixed top-16 right-2 sm:right-6 mt-2 w-72 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl z-[100] flex flex-col max-h-[min(500px,80vh)] animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="p-3 border-b border-gray-800 font-medium text-sm text-gray-200 flex justify-between items-center bg-gray-900/50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <History size={14} className="text-blue-400" />
            <span>{labels.history}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPinnedChange(!isPinned)}
              className={`p-1 rounded transition-colors ${isPinned ? 'text-blue-400 bg-blue-900/30' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}
              title={isPinned ? 'Unpin' : 'Pin'}
            >
              {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-white p-1 hover:bg-gray-800 rounded transition-colors"><X size={14} /></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
          {historyStack.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-xs">{labels.noHistory}</div>
          ) : (
            historyStack.map((item, index) => {
              const descKey = item.description as keyof typeof labels.historyActions;
              const description = labels.historyActions?.[descKey] || item.description;

              return (
                <button
                  key={index}
                  onClick={() => {
                    onJumpToHistory(index);
                    if (!isPinned) onClose();
                  }}
                  className={`w-full text-left px-3 py-2.5 mb-1 text-xs rounded-lg flex items-center gap-3 transition-all group ${index === currentIndex
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    } ${index > currentIndex ? 'opacity-40 hover:opacity-100 grayscale' : ''}`}
                >
                  <span className={`font-mono w-5 shrink-0 ${index === currentIndex ? 'text-blue-200' : 'text-gray-600 group-hover:text-gray-500'}`}>
                    {index + 1}.
                  </span>
                  <span className="flex-1 truncate font-medium">{description}</span>
                  <span className={`text-[10px] shrink-0 ${index === currentIndex ? 'text-blue-200' : 'text-gray-600 group-hover:text-gray-500'}`}>
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </button>
              );
            })
          )}
          <div ref={(element) => {
            if (element && isOpen) {
              const activeButton = element.parentElement?.children[currentIndex] as HTMLElement;
              activeButton?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
          }} />
        </div>
      </div>
    </>
  );
};
