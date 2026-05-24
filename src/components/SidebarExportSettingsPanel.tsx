import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { CanvasConfig } from '../types';
import type { Language, TranslationSchema } from '../utils/translations';

type ExportFormat = 'gif' | 'apng' | 'webp';
type DitherOptionValue = Exclude<CanvasConfig['dither'], false> | 'none';

export interface DitherOption {
  value: DitherOptionValue;
  label: Record<Language, string>;
  description: Record<Language, string>;
  pros: Record<Language, string>;
  cons: Record<Language, string>;
}

interface SidebarExportSettingsPanelProps {
  title: string;
  language: Language;
  exportFormat: ExportFormat;
  outputLabels: TranslationSchema['outputControl'];
  targetSizeMB: string;
  enableColorSmoothing: boolean;
  enableGlobalPalette: boolean;
  ditherMethod: CanvasConfig['dither'];
  ditherOptions: DitherOption[];
  isDitherMenuOpen: boolean;
  ditherMenuRef: React.RefObject<HTMLDivElement>;
  webpLossless: boolean;
  webpQuality: number;
  onTargetSizeChange: (value: string) => void;
  onColorSmoothingChange: (enabled: boolean) => void;
  onGlobalPaletteChange: (enabled: boolean) => void;
  onDitherMethodChange: (method: CanvasConfig['dither']) => void;
  onDitherMenuOpenChange: (isOpen: boolean) => void;
  onWebpLosslessChange: (lossless: boolean) => void;
  onWebpQualityChange: (quality: number) => void;
}

const ToggleSwitch: React.FC<{
  id: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}> = ({ id, enabled, onChange }) => (
  <button
    id={id}
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

export const SidebarExportSettingsPanel: React.FC<SidebarExportSettingsPanelProps> = ({
  title,
  language,
  exportFormat,
  outputLabels,
  targetSizeMB,
  enableColorSmoothing,
  enableGlobalPalette,
  ditherMethod,
  ditherOptions,
  isDitherMenuOpen,
  ditherMenuRef,
  webpLossless,
  webpQuality,
  onTargetSizeChange,
  onColorSmoothingChange,
  onGlobalPaletteChange,
  onDitherMethodChange,
  onDitherMenuOpenChange,
  onWebpLosslessChange,
  onWebpQualityChange,
}) => {
  const selectedDither = ditherOptions.find((option) => option.value === (ditherMethod || 'none')) || ditherOptions[0];

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">{title}</h3>
      {exportFormat === 'gif' ? (
        <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-medium">{outputLabels.targetSize}:</span>
            <div className="flex-1 relative">
              <input
                type="number"
                placeholder={outputLabels.unlimited}
                value={targetSizeMB}
                onChange={(event) => onTargetSizeChange(event.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm min-w-0 focus:border-blue-500 focus:outline-none pr-8"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">MB</span>
            </div>
          </div>
          <p className="text-[10px] text-gray-600 mt-2 leading-relaxed">{outputLabels.autoAdjust}</p>

          <div className="mt-4 pt-4 border-t border-gray-800">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 font-medium cursor-pointer" htmlFor="color-smoothing-toggle">
                    {language === 'zh' ? '颜色平滑' : 'Color Smoothing'}
                  </label>
                  <p className="text-[10px] text-gray-600 mt-1 leading-relaxed">
                    {language === 'zh'
                      ? '自动识别并平滑相邻帧之间的相似颜色，减少播放时的色彩抖动'
                      : 'Automatically smooth similar colors between frames to reduce color flickering'}
                  </p>
                </div>
                <ToggleSwitch id="color-smoothing-toggle" enabled={enableColorSmoothing} onChange={onColorSmoothingChange} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-3">
                  <label className="text-xs text-gray-400 font-medium cursor-pointer" htmlFor="global-palette-toggle">
                    {language === 'zh' ? '全局调色板' : 'Global Palette'}
                  </label>
                  <p className="text-[10px] text-gray-600 mt-1 leading-relaxed">
                    {language === 'zh'
                      ? '所有帧共用同一套调色板，减少同色在帧间跳色'
                      : 'Use one palette across frames to reduce color shifts between frames'}
                  </p>
                </div>
                <ToggleSwitch id="global-palette-toggle" enabled={enableGlobalPalette} onChange={onGlobalPaletteChange} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium" htmlFor="dither-method-button">
                  {language === 'zh' ? '抖动策略' : 'Dithering'}
                </label>
                <div ref={ditherMenuRef} className="relative">
                  <button
                    id="dither-method-button"
                    type="button"
                    onClick={() => onDitherMenuOpenChange(!isDitherMenuOpen)}
                    className={`w-full min-h-[48px] rounded border px-2.5 py-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${isDitherMenuOpen ? 'border-blue-500 bg-gray-800' : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-gray-200 truncate">{selectedDither.label[language]}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{selectedDither.description[language]}</div>
                      </div>
                      <ChevronDown
                        size={14}
                        className={`shrink-0 text-gray-500 transition-transform ${isDitherMenuOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>

                  {isDitherMenuOpen && (
                    <div className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded border border-gray-700 bg-gray-900 shadow-xl shadow-black/40">
                      {ditherOptions.map((option) => {
                        const isSelected = option.value === selectedDither.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              onDitherMethodChange(option.value === 'none' ? false : option.value as CanvasConfig['dither']);
                              onDitherMenuOpenChange(false);
                            }}
                            className={`w-full px-3 py-2.5 text-left transition-colors ${isSelected ? 'bg-blue-600/20' : 'hover:bg-gray-800'
                              }`}
                          >
                            <div className="flex items-start gap-2">
                              <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                                {isSelected && <Check size={13} className="text-blue-400" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className={`text-xs font-medium ${isSelected ? 'text-blue-200' : 'text-gray-200'}`}>
                                  {option.label[language]}
                                </div>
                                <div className="mt-1 text-[10px] leading-relaxed text-gray-500">
                                  {option.description[language]}
                                </div>
                                <div className="mt-1 grid gap-1 text-[10px] leading-relaxed sm:grid-cols-2">
                                  <div className="rounded bg-emerald-950/30 px-2 py-1 text-emerald-300/90">
                                    <span className="font-medium">{language === 'zh' ? '优势：' : 'Pros: '}</span>
                                    {option.pros[language]}
                                  </div>
                                  <div className="rounded bg-amber-950/30 px-2 py-1 text-amber-300/90">
                                    <span className="font-medium">{language === 'zh' ? '代价：' : 'Cons: '}</span>
                                    {option.cons[language]}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-gray-600 leading-relaxed">
                  {language === 'zh'
                    ? '统一选择一种策略会让所有帧使用同一抖动算法；不等于统一调色板，可与全局调色板一起使用。'
                    : 'The selected method is applied to every frame. It is separate from Global Palette and can be used together.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : exportFormat === 'webp' ? (
        <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 space-y-4">
          <div className="flex rounded-lg border border-gray-700 bg-gray-800/50 p-0.5">
            <button
              onClick={() => onWebpLosslessChange(false)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${!webpLossless ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
            >
              {language === 'zh' ? '有损' : 'Lossy'}
            </button>
            <button
              onClick={() => onWebpLosslessChange(true)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${webpLossless ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
            >
              {language === 'zh' ? '无损' : 'Lossless'}
            </button>
          </div>

          {!webpLossless ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-gray-500 font-medium">
                <span>{language === 'zh' ? '质量' : 'Quality'}</span>
                <span>{webpQuality}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={webpQuality}
                onChange={(event) => onWebpQualityChange(parseInt(event.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <p className="text-[10px] text-gray-600 leading-relaxed">
                {language === 'zh'
                  ? '质量越高颜色损失越少，但文件更大。默认 92% 适合多数动画。'
                  : 'Higher quality reduces color loss but increases file size. The default 92% works well for most animations.'}
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 leading-relaxed">
              {language === 'zh'
                ? '无损模式会尽量保留像素和透明通道，但编码更慢，文件通常更大。'
                : 'Lossless mode preserves pixels and alpha more faithfully, but encoding is slower and files are usually larger.'}
            </p>
          )}
        </div>
      ) : (
        <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800">
          <p className="text-xs text-gray-400 leading-relaxed">
            {language === 'zh'
              ? 'APNG 会保留完整颜色和 Alpha 透明度，不使用 GIF 的调色板、抖动、透明色键或目标大小压缩设置。'
              : 'APNG preserves full color and alpha, so GIF palette, dithering, transparency key, and target-size compression settings are hidden.'}
          </p>
        </div>
      )}
    </div>
  );
};
