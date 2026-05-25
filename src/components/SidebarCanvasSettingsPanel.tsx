import React from 'react';
import { Crop, Loader2, Lock, Palette, Pipette, Unlock } from 'lucide-react';
import type { CanvasConfig } from '../types';
import type { TranslationSchema } from '../utils/translations';

interface SidebarCanvasSettingsPanelProps {
  title: string;
  labels: Pick<
    TranslationSchema,
    | 'width'
    | 'height'
    | 'backgroundColor'
    | 'transparent'
    | 'lockAspectRatio'
    | 'unlockAspectRatio'
    | 'scaleExistingFrames'
    | 'scaleExistingFramesHint'
    | 'autoCropCanvas'
    | 'autoCropCanvasHint'
  >;
  bgRemovalLabels: TranslationSchema['bgRemoval'];
  canvasConfig: CanvasConfig;
  exportFormat: 'gif' | 'apng' | 'webp';
  isAspectRatioLocked: boolean;
  shouldScaleExistingFrames: boolean;
  canAutoCropCanvas: boolean;
  isAutoCroppingCanvas: boolean;
  isGifTransparentEnabled: boolean;
  gifTransparentColor: string;
  isGifEyeDropperActive: boolean;
  isBgColorEyeDropperActive: boolean;
  onCanvasWidthChange: (width: number) => void;
  onCanvasHeightChange: (height: number) => void;
  onToggleAspectRatioLock: () => void;
  onScaleExistingFramesChange: (enabled: boolean) => void;
  onAutoCropCanvas: () => void;
  onTransparentChange: (transparent: boolean) => void;
  onGifTransparentEnabledChange: (enabled: boolean) => void;
  onGifTransparentColorChange: (color: string) => void;
  onGifEyeDropperToggle: () => void;
  onBackgroundColorChange: (color: string) => void;
  onBackgroundEyeDropperToggle: () => void;
}

const ToggleSwitch: React.FC<{
  id: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}> = ({ id, enabled, onChange }) => (
  <button
    id={id}
    type="button"
    onClick={() => onChange(!enabled)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${enabled ? 'bg-blue-600' : 'bg-gray-700'
      }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
    />
  </button>
);

export const SidebarCanvasSettingsPanel: React.FC<SidebarCanvasSettingsPanelProps> = ({
  title,
  labels,
  bgRemovalLabels,
  canvasConfig,
  exportFormat,
  isAspectRatioLocked,
  shouldScaleExistingFrames,
  canAutoCropCanvas,
  isAutoCroppingCanvas,
  isGifTransparentEnabled,
  gifTransparentColor,
  isGifEyeDropperActive,
  isBgColorEyeDropperActive,
  onCanvasWidthChange,
  onCanvasHeightChange,
  onToggleAspectRatioLock,
  onScaleExistingFramesChange,
  onAutoCropCanvas,
  onTransparentChange,
  onGifTransparentEnabledChange,
  onGifTransparentColorChange,
  onGifEyeDropperToggle,
  onBackgroundColorChange,
  onBackgroundEyeDropperToggle,
}) => (
  <div className="space-y-3">
    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">{title}</h3>

    <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-gray-500 mb-1 block uppercase">{labels.width}</label>
          <input
            type="number"
            value={canvasConfig.width}
            onChange={(event) => onCanvasWidthChange(parseInt(event.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
        <button
          onClick={onToggleAspectRatioLock}
          className={`p-2 rounded border transition-all shrink-0 mb-[1px] ${isAspectRatioLocked
            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
            : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
            }`}
          title={isAspectRatioLocked ? labels.unlockAspectRatio : labels.lockAspectRatio}
        >
          {isAspectRatioLocked ? <Lock size={14} /> : <Unlock size={14} />}
        </button>
        <div className="flex-1">
          <label className="text-[10px] text-gray-500 mb-1 block uppercase">{labels.height}</label>
          <input
            type="number"
            value={canvasConfig.height}
            onChange={(event) => onCanvasHeightChange(parseInt(event.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 pr-3">
          <label className="text-xs text-gray-400 font-medium cursor-pointer" htmlFor="scale-existing-frames-toggle">
            {labels.scaleExistingFrames}
          </label>
          <p className="text-[10px] text-gray-600 mt-1 leading-relaxed">
            {labels.scaleExistingFramesHint}
          </p>
        </div>
        <ToggleSwitch
          id="scale-existing-frames-toggle"
          enabled={shouldScaleExistingFrames}
          onChange={onScaleExistingFramesChange}
        />
      </div>

      <button
        type="button"
        onClick={onAutoCropCanvas}
        disabled={!canAutoCropCanvas || isAutoCroppingCanvas}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-left transition-colors hover:border-gray-600 hover:bg-gray-800/80 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-700"
        title={labels.autoCropCanvasHint}
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2 text-xs font-medium text-gray-300">
            {isAutoCroppingCanvas ? <Loader2 size={13} className="animate-spin text-blue-400" /> : <Crop size={13} className="text-blue-400" />}
            {labels.autoCropCanvas}
          </span>
          <span className="mt-1 block text-[10px] leading-relaxed text-gray-600">
            {labels.autoCropCanvasHint}
          </span>
        </span>
      </button>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-gray-500 uppercase">{labels.backgroundColor}</label>
          <Palette size={12} className="text-gray-600" />
        </div>

        <div className="flex rounded-lg border border-gray-700 bg-gray-800/50 p-0.5">
          <button
            onClick={() => onTransparentChange(true)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${canvasConfig.transparent === 'rgba(0,0,0,0)' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
          >
            {labels.transparent}
          </button>
          <button
            onClick={() => onTransparentChange(false)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${!canvasConfig.transparent ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
          >
            {labels.backgroundColor}
          </button>
        </div>

        {canvasConfig.transparent ? (
          exportFormat === 'gif' ? (
            <div className="space-y-2 pt-1 px-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500">{bgRemovalLabels.gifTransparent}</span>
                <div className="flex bg-gray-800 rounded border border-gray-700 p-0.5 scale-90 origin-right">
                  <button
                    onClick={() => onGifTransparentEnabledChange(false)}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${!isGifTransparentEnabled ? 'bg-gray-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    {bgRemovalLabels.auto}
                  </button>
                  <button
                    onClick={() => onGifTransparentEnabledChange(true)}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${isGifTransparentEnabled ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    {bgRemovalLabels.manual}
                  </button>
                </div>
              </div>

              {isGifTransparentEnabled && (
                <div className="flex gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex-1 flex items-center gap-2 bg-gray-800 border border-gray-700 rounded px-2 py-1.5">
                    <div
                      className="w-4 h-4 rounded border border-gray-600 shadow-sm"
                      style={{ backgroundColor: gifTransparentColor }}
                    />
                    <input
                      type="text"
                      value={gifTransparentColor}
                      onChange={(event) => onGifTransparentColorChange(event.target.value)}
                      className="flex-1 bg-transparent border-none text-xs focus:outline-none min-w-0 font-mono"
                    />
                    <input
                      type="color"
                      value={gifTransparentColor}
                      onChange={(event) => onGifTransparentColorChange(event.target.value)}
                      className="w-6 h-6 opacity-0 absolute cursor-pointer"
                      title="Picker"
                    />
                  </div>
                  <button
                    onClick={onGifEyeDropperToggle}
                    className={`p-2 rounded border transition-colors ${isGifEyeDropperActive ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                    title={bgRemovalLabels.eyeDropper}
                  >
                    <Pipette size={14} />
                  </button>
                </div>
              )}
            </div>
          ) : null
        ) : (
          <div className="flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200 pt-1">
            <div className="flex-1 flex items-center gap-2 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 transition-colors hover:border-gray-600">
              <div
                className="w-4 h-4 rounded border border-gray-600 shadow-sm"
                style={{ backgroundColor: canvasConfig.backgroundColor || '#ffffff' }}
              />
              <input
                type="text"
                value={canvasConfig.backgroundColor || '#ffffff'}
                onChange={(event) => onBackgroundColorChange(event.target.value)}
                className="flex-1 bg-transparent border-none text-xs focus:outline-none min-w-0 font-mono"
              />
              <input
                type="color"
                value={canvasConfig.backgroundColor || '#ffffff'}
                onChange={(event) => onBackgroundColorChange(event.target.value)}
                className="w-6 h-6 opacity-0 absolute cursor-pointer"
              />
            </div>
            <button
              onClick={onBackgroundEyeDropperToggle}
              className={`p-2 rounded border transition-colors ${isBgColorEyeDropperActive ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
              title={bgRemovalLabels.eyeDropper}
            >
              <Pipette size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);
