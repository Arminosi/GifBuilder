import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { TranslationSchema } from '../utils/translations';

interface TransparentConfirmDialogProps {
  isOpen: boolean;
  isClosing: boolean;
  labels: TranslationSchema['transparentConfirm'];
  onKeep: () => void;
  onSwitch: () => void;
}

export const TransparentConfirmDialog: React.FC<TransparentConfirmDialogProps> = ({
  isOpen,
  isClosing,
  labels,
  onKeep,
  onSwitch,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className={`fixed inset-0 bg-black/50 z-[120] ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`} />

      <div className="fixed inset-0 z-[121] flex items-center justify-center p-4">
        <div className={`fixed top-1/2 left-1/2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-md w-full ${isClosing ? 'animate-scale-out' : 'animate-scale-in'}`}>
          <div className="px-6 py-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <AlertCircle size={20} className="text-blue-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-200">{labels.title}</h3>
            </div>
          </div>

          <div className="px-6 py-5">
            <p className="text-gray-400 text-sm leading-relaxed">
              {labels.message}
            </p>
          </div>

          <div className="px-6 pb-5 flex gap-3">
            <button
              onClick={onKeep}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white rounded-lg transition-all text-sm font-medium border border-gray-700 hover:border-gray-600"
            >
              {labels.keep}
            </button>
            <button
              onClick={onSwitch}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all text-sm font-medium"
            >
              {labels.switch}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
