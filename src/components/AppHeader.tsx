import React from 'react';
import {
  Film,
  History,
  Languages,
  List,
  Loader2,
  Package,
  PanelLeft,
  Play,
  Redo2,
  Undo2,
} from 'lucide-react';
import type { Language, TranslationSchema } from '../utils/translations';

type ExportFormat = 'gif' | 'apng' | 'webp';

interface AppHeaderProps {
  language: Language;
  labels: Pick<TranslationSchema, 'toggleSidebar' | 'undo' | 'redo' | 'records' | 'exportZip' | 'generate'>;
  isSidebarOpen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  showHistoryStack: boolean;
  showSnapshots: boolean;
  snapshotsCount: number;
  exportFormat: ExportFormat;
  frameCount: number;
  isZipping: boolean;
  isGenerating: boolean;
  onToggleSidebar: () => void;
  onToggleLanguage: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleHistoryStack: () => void;
  onToggleSnapshots: () => void;
  onExportFormatChange: (format: ExportFormat) => void;
  onExportZip: () => void;
  onGenerate: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  language,
  labels,
  isSidebarOpen,
  canUndo,
  canRedo,
  showHistoryStack,
  showSnapshots,
  snapshotsCount,
  exportFormat,
  frameCount,
  isZipping,
  isGenerating,
  onToggleSidebar,
  onToggleLanguage,
  onUndo,
  onRedo,
  onToggleHistoryStack,
  onToggleSnapshots,
  onExportFormatChange,
  onExportZip,
  onGenerate,
}) => (
  <header className="h-14 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between px-3 lg:px-6 shrink-0 z-20 overflow-x-auto no-scrollbar">
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={onToggleSidebar}
        className={`p-2 rounded-lg hover:bg-gray-800 transition-colors ${!isSidebarOpen ? 'bg-gray-800 text-blue-400' : 'text-gray-400'}`}
        title={labels.toggleSidebar}
      >
        <PanelLeft size={20} />
      </button>

      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm hidden sm:flex">
        <Film size={18} className="stroke-[2.5]" />
      </div>
      <h1 className="text-lg lg:text-xl font-bold bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent tracking-tight hidden sm:block">
        GifBuilder
      </h1>
    </div>

    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={onToggleLanguage}
        className="h-9 px-3 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white flex items-center gap-2 border border-transparent hover:border-gray-700"
        title={language === 'en' ? 'Switch to Chinese' : 'Switch to English'}
      >
        <Languages size={16} />
        <span className="text-xs font-semibold hidden sm:inline tracking-wide">{language === 'en' ? 'EN' : '中文'}</span>
      </button>

      <div className="h-6 w-px bg-gray-800 mx-0.5"></div>

      <div className="relative">
        <div className="flex items-center bg-gray-800/80 rounded-lg p-1 border border-gray-700 h-9">
          <button
            onClick={onUndo} disabled={!canUndo}
            className="w-7 h-7 flex items-center justify-center hover:bg-gray-700 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title={labels.undo}
          >
            <Undo2 size={14} />
          </button>
          <div className="w-px h-3.5 bg-gray-700 mx-0.5" />
          <button
            onClick={onRedo} disabled={!canRedo}
            className="w-7 h-7 flex items-center justify-center hover:bg-gray-700 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title={labels.redo}
          >
            <Redo2 size={14} />
          </button>
          <div className="w-px h-3.5 bg-gray-700 mx-0.5" />
          <button
            onClick={onToggleHistoryStack}
            className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${showHistoryStack ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-400'}`}
            title="History Stack"
          >
            <List size={14} />
          </button>
        </div>
      </div>

      <button
        onClick={onToggleSnapshots}
        className={`h-9 px-3 rounded-lg border transition-all flex items-center gap-2 ${showSnapshots ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300'}`}
      >
        <History size={16} />
        <span className="hidden md:inline text-xs font-semibold tracking-wide">{labels.records}</span>
        {snapshotsCount > 0 && (
          <span className="bg-blue-500 text-white text-[10px] px-1.5 h-4 flex items-center rounded-full font-bold">{snapshotsCount}</span>
        )}
      </button>

      <div className="flex items-center gap-2">
        <div className="flex h-9 rounded-lg border border-gray-700 bg-gray-800/80 p-1">
          <button
            onClick={() => onExportFormatChange('gif')}
            className={`px-2.5 text-xs font-semibold rounded transition-colors ${exportFormat === 'gif' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
          >
            GIF
          </button>
          <button
            onClick={() => onExportFormatChange('apng')}
            className={`px-2.5 text-xs font-semibold rounded transition-colors ${exportFormat === 'apng' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
          >
            APNG
          </button>
          <button
            onClick={() => onExportFormatChange('webp')}
            className={`px-2.5 text-xs font-semibold rounded transition-colors ${exportFormat === 'webp' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
          >
            WebP
          </button>
        </div>

        <button
          onClick={onExportZip}
          disabled={frameCount === 0 || isZipping}
          className="h-9 px-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 border border-gray-700 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all"
          title={labels.exportZip}
        >
          {isZipping ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
          <span className="hidden xl:inline">{labels.exportZip}</span>
        </button>

        <button
          onClick={onGenerate}
          disabled={frameCount === 0 || isGenerating}
          className="h-9 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all tracking-wide"
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
          <span className="hidden sm:inline">
            {exportFormat === 'gif'
              ? labels.generate
              : exportFormat === 'apng'
                ? (language === 'zh' ? '生成 APNG' : 'Generate APNG')
                : (language === 'zh' ? '生成 WebP' : 'Generate WebP')}
          </span>
        </button>
      </div>
    </div>
  </header>
);
