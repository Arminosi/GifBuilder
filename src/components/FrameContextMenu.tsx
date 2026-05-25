import React from 'react';
import {
  AlignCenter,
  ClipboardCopy,
  ClipboardPaste,
  Copy,
  Download,
  FilePlus,
  Maximize,
  ArrowDownUp,
  RotateCcw,
  Scaling,
  Trash2,
} from 'lucide-react';
import type { FrameContextMenuState } from '../types';
import type { TranslationSchema } from '../utils/translations';

interface FrameContextMenuProps {
  menu: FrameContextMenuState | null;
  labels: TranslationSchema['contextMenu'];
  clipboardCount: number;
  tagColors: string[];
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onInsert: () => void;
  onReverseSelected: () => void;
  onAlignCenter: () => void;
  onFitContain: () => void;
  onFitFill: () => void;
  onResetProperties: () => void;
  onSetColorTag: (color: string | undefined) => void;
  onDownload: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const menuButtonClass = 'w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white flex items-center gap-2 transition-colors';

export const FrameContextMenu: React.FC<FrameContextMenuProps> = ({
  menu,
  labels,
  clipboardCount,
  tagColors,
  onCopy,
  onPaste,
  onDuplicate,
  onInsert,
  onReverseSelected,
  onAlignCenter,
  onFitContain,
  onFitFill,
  onResetProperties,
  onSetColorTag,
  onDownload,
  onDelete,
  onClose,
}) => {
  if (!menu) return null;

  return (
    <div
      className="fixed z-50 bg-gray-900 border border-gray-700 shadow-xl rounded-lg py-1 w-48 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      style={{
        top: menu.y > window.innerHeight - 450 ? 'auto' : menu.y,
        bottom: menu.y > window.innerHeight - 450 ? window.innerHeight - menu.y : 'auto',
        left: Math.min(menu.x, window.innerWidth - 200)
      }}
    >
      <button
        className={menuButtonClass}
        onClick={onCopy}
      >
        <ClipboardCopy size={14} />
        {labels.copy}
      </button>
      <button
        className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white flex items-center gap-2 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
        onClick={onPaste}
        disabled={clipboardCount === 0}
      >
        <ClipboardPaste size={14} />
        {labels.paste}
      </button>

      <div className="h-px bg-gray-700 my-1"></div>

      <button
        className={menuButtonClass}
        onClick={onDuplicate}
      >
        <Copy size={14} />
        {labels.duplicateHere}
      </button>
      <button
        className={menuButtonClass}
        onClick={onInsert}
      >
        <FilePlus size={14} />
        {labels.insertHere}
      </button>
      <button
        className={menuButtonClass}
        onClick={onReverseSelected}
      >
        <ArrowDownUp size={14} />
        {labels.reverseSelected}
      </button>

      <div className="h-px bg-gray-700 my-1"></div>

      <button
        className={menuButtonClass}
        onClick={() => {
          onAlignCenter();
          onClose();
        }}
      >
        <AlignCenter size={14} />
        {labels.alignCenter}
      </button>

      <button
        className={menuButtonClass}
        onClick={() => {
          onFitContain();
          onClose();
        }}
      >
        <Scaling size={14} />
        {labels.fitCanvas}
      </button>

      <button
        className={menuButtonClass}
        onClick={() => {
          onFitFill();
          onClose();
        }}
      >
        <Maximize size={14} />
        {labels.fillCanvas}
      </button>

      <button
        className={menuButtonClass}
        onClick={onResetProperties}
      >
        <RotateCcw size={14} />
        {labels.resetProperties}
      </button>

      <div className="h-px bg-gray-700 my-1"></div>

      <div className="px-4 py-2">
        <div className="text-xs text-gray-500 mb-2">{labels.setColor}</div>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => onSetColorTag(undefined)}
            className="w-4 h-4 rounded-full border border-gray-600 bg-transparent hover:border-white transition-colors relative"
            title={labels.noColor}
          >
            <div className="absolute inset-0.5 border-t border-red-500 transform rotate-45"></div>
          </button>
          {tagColors.map((color) => (
            <button
              key={color}
              onClick={() => onSetColorTag(color)}
              className="w-4 h-4 rounded-full hover:scale-110 transition-transform border border-transparent hover:border-white"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <button
        className={menuButtonClass}
        onClick={onDownload}
      >
        <Download size={14} />
        {labels.downloadSelected}
      </button>

      <div className="h-px bg-gray-700 my-1"></div>

      <button
        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-600 hover:text-white flex items-center gap-2 transition-colors"
        onClick={onDelete}
      >
        <Trash2 size={14} />
        {labels.deleteSelected}
      </button>

      <button
        className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        onClick={onClose}
      >
        {labels.cancel}
      </button>
    </div>
  );
};
