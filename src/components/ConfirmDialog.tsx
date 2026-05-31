import React from 'react';
import { AlertCircle } from 'lucide-react';

type ConfirmDialogTone = 'blue' | 'danger';

interface ConfirmDialogProps {
  isOpen: boolean;
  isClosing?: boolean;
  title: string;
  message?: string;
  cancelLabel: string;
  confirmLabel: string;
  tone?: ConfirmDialogTone;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}

const toneClasses: Record<ConfirmDialogTone, {
  icon: string;
  confirm: string;
}> = {
  blue: {
    icon: 'bg-blue-600/20 text-blue-400',
    confirm: 'bg-blue-600 hover:bg-blue-500 text-white',
  },
  danger: {
    icon: 'bg-red-600/20 text-red-400',
    confirm: 'bg-red-600 hover:bg-red-500 text-white',
  },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  isClosing = false,
  title,
  message,
  cancelLabel,
  confirmLabel,
  tone = 'blue',
  icon,
  children,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const classes = toneClasses[tone];

  return (
    <>
      <div className={`fixed inset-0 z-[130] bg-black/55 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`} />

      <div className="fixed inset-0 z-[131]">
        <div className={`fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-md rounded-xl border border-gray-700 bg-gray-900 shadow-2xl ${isClosing ? 'animate-scale-out' : 'animate-scale-in'}`}>
          <div className="border-b border-gray-800 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${classes.icon}`}>
                {icon ?? <AlertCircle size={20} />}
              </div>
              <h3 className="text-base font-semibold text-gray-200">{title}</h3>
            </div>
          </div>

          <div className="space-y-4 px-6 py-5">
            {message && (
              <p className="text-sm leading-relaxed text-gray-400">{message}</p>
            )}
            {children}
          </div>

          <div className="flex gap-3 px-6 pb-5">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-all hover:border-gray-600 hover:bg-gray-750 hover:text-white"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${classes.confirm}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
