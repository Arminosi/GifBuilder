import React from 'react';
import { Eraser, Pipette } from 'lucide-react';
import type { TranslationSchema } from '../utils/translations';

interface SidebarImageProcessingPanelProps {
  title: string;
  labels: TranslationSchema['bgRemoval'];
  removeColor: string;
  tolerance: number;
  isEyeDropperActive: boolean;
  selectedCount: number;
  onRemoveColorChange: (color: string) => void;
  onToleranceChange: (tolerance: number) => void;
  onEyeDropperToggle: () => void;
  onRemoveBackground: () => void;
}

export const SidebarImageProcessingPanel: React.FC<SidebarImageProcessingPanelProps> = ({
  title,
  labels,
  removeColor,
  tolerance,
  isEyeDropperActive,
  selectedCount,
  onRemoveColorChange,
  onToleranceChange,
  onEyeDropperToggle,
  onRemoveBackground,
}) => (
  <div className="space-y-3">
    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">{title}</h3>
    <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-gray-500 uppercase">{labels.title}</label>
        <Eraser size={12} className="text-gray-600" />
      </div>

      <div className="flex gap-2 items-center">
        <div className="flex-1 flex items-center gap-2 bg-gray-800 border border-gray-700 rounded px-2 py-1.5">
          <div
            className="w-4 h-4 rounded border border-gray-600 shadow-sm"
            style={{ backgroundColor: removeColor }}
          />
          <input
            type="text"
            value={removeColor}
            onChange={(event) => onRemoveColorChange(event.target.value)}
            className="flex-1 bg-transparent border-none text-xs focus:outline-none min-w-0 font-mono"
          />
          <input
            type="color"
            value={removeColor}
            onChange={(event) => onRemoveColorChange(event.target.value)}
            className="w-6 h-6 opacity-0 absolute cursor-pointer"
          />
        </div>
        <button
          onClick={onEyeDropperToggle}
          className={`p-2 rounded border transition-colors ${isEyeDropperActive ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
          title={labels.eyeDropper}
        >
          <Pipette size={14} />
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-gray-500 font-medium">
          <span>{labels.tolerance}</span>
          <span>{tolerance}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={tolerance}
          onChange={(event) => onToleranceChange(parseInt(event.target.value))}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      <button
        onClick={onRemoveBackground}
        disabled={selectedCount === 0}
        className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700 rounded text-xs font-medium transition-colors flex items-center justify-center gap-2 text-gray-300"
      >
        <Eraser size={12} /> {labels.applySelected}
      </button>
    </div>
  </div>
);
