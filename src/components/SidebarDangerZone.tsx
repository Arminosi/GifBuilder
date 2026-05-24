import React from 'react';
import { AlertCircle, Trash2 } from 'lucide-react';

interface SidebarDangerZoneProps {
  title: string;
  removeAllLabel: string;
  confirmLabel: string;
  isConfirming: boolean;
  onClearAll: () => void;
}

export const SidebarDangerZone: React.FC<SidebarDangerZoneProps> = ({
  title,
  removeAllLabel,
  confirmLabel,
  isConfirming,
  onClearAll,
}) => (
  <div className="space-y-3">
    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">{title}</h3>
    <button
      onClick={onClearAll}
      className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all shadow-sm ${isConfirming
        ? 'bg-red-600 text-white border-red-500 shadow-red-900/30'
        : 'bg-gray-900/50 hover:bg-red-900/10 text-red-400 border-gray-800 hover:border-red-900/30'
        }`}
    >
      {isConfirming ? <AlertCircle size={14} /> : <Trash2 size={14} />}
      {isConfirming ? confirmLabel : removeAllLabel}
    </button>
  </div>
);
