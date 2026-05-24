import React from 'react';
import { Layers, Layout } from 'lucide-react';

type MobileTab = 'frames' | 'editor' | 'settings';

interface MobileBottomTabBarProps {
  isLargeScreen: boolean;
  activeTab: MobileTab;
  labels: {
    frames: string;
    canvasEditor: string;
  };
  onTabChange: (tab: MobileTab) => void;
}

export const MobileBottomTabBar: React.FC<MobileBottomTabBarProps> = ({
  isLargeScreen,
  activeTab,
  labels,
  onTabChange,
}) => {
  if (isLargeScreen) return null;

  return (
    <div className="bg-gray-900 border-t border-gray-800 shrink-0 z-30 pb-[env(safe-area-inset-bottom)] transition-all duration-200">
      <div className="h-14 flex items-center justify-around">
        <button
          onClick={() => onTabChange('frames')}
          className={`flex flex-col items-center justify-center w-full h-full gap-1 ${activeTab === 'frames' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Layers size={20} />
          <span className="text-[10px]">{labels.frames}</span>
        </button>
        <button
          onClick={() => onTabChange('editor')}
          className={`flex flex-col items-center justify-center w-full h-full gap-1 ${activeTab === 'editor' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Layout size={20} />
          <span className="text-[10px]">{labels.canvasEditor}</span>
        </button>
      </div>
    </div>
  );
};
