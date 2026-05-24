import React from 'react';
import { AlertCircle } from 'lucide-react';

interface NotificationToastProps {
  message: string | null;
  isClosing: boolean;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  message,
  isClosing,
}) => {
  if (!message) return null;

  return (
    <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[110] ${isClosing ? 'animate-slide-out-down' : 'animate-slide-in-up'}`}>
      <div className="bg-gray-800 border border-gray-700 text-gray-200 px-5 py-3 rounded-lg shadow-xl flex items-center gap-3 max-w-md">
        <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center shrink-0">
          <AlertCircle size={16} className="text-blue-400" />
        </div>
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
};
