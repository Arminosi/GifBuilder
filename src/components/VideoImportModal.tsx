import React from 'react';
import { Film, Loader2, X } from 'lucide-react';
import type { PendingVideoImport } from '../types';
import type { Language } from '../utils/translations';

interface VideoImportModalProps {
  pendingVideoImport: PendingVideoImport | null;
  language: Language;
  isImportingVideo: boolean;
  videoPreviewRef: React.RefObject<HTMLVideoElement | null>;
  videoPreviewTime: number;
  onStopModalDrag: (event: React.DragEvent) => void;
  onClose: () => void;
  onVideoPreviewTimeChange: (time: number) => void;
  onSeekVideoPreview: (time: number) => void;
  onSetInPoint: () => void;
  onSetOutPoint: () => void;
  onUpdateSettings: (updates: Partial<PendingVideoImport['settings']>) => void;
  onConfirm: () => void;
  closeLabel: string;
}

export const VideoImportModal: React.FC<VideoImportModalProps> = ({
  pendingVideoImport,
  language,
  isImportingVideo,
  videoPreviewRef,
  videoPreviewTime,
  onStopModalDrag,
  onClose,
  onVideoPreviewTimeChange,
  onSeekVideoPreview,
  onSetInPoint,
  onSetOutPoint,
  onUpdateSettings,
  onConfirm,
  closeLabel,
}) => {
  const modalRef = React.useRef<HTMLDivElement | null>(null);
  const isModalOpen = Boolean(pendingVideoImport);

  React.useEffect(() => {
    if (!isModalOpen) return;
    modalRef.current?.focus();
  }, [isModalOpen]);

  if (!pendingVideoImport) return null;

  const duration = Math.max(0.001, pendingVideoImport.metadata.duration);
  const startTime = pendingVideoImport.settings.startTime;
  const endTime = pendingVideoImport.settings.endTime;
  const selectedDuration = Math.max(0, endTime - startTime);
  const estimatedFrameCount = selectedDuration > 0
    ? Math.max(1, Math.ceil(selectedDuration * pendingVideoImport.settings.fps))
    : 0;
  const hasInvalidRange = endTime <= startTime;
  const getTimelinePercent = (time: number) => Math.min(100, Math.max(0, (time / duration) * 100));
  const startPercent = getTimelinePercent(startTime);
  const endPercent = getTimelinePercent(endTime);
  const rangeLeft = hasInvalidRange ? Math.min(startPercent, endPercent) : startPercent;
  const rangeWidth = hasInvalidRange ? Math.abs(startPercent - endPercent) : getTimelinePercent(selectedDuration);
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target;
    const isTextInputTarget = target instanceof HTMLInputElement && ![
      'button',
      'checkbox',
      'color',
      'file',
      'image',
      'radio',
      'range',
      'reset',
      'submit',
    ].includes(target.type);
    const isEditableTarget = isTextInputTarget
      || target instanceof HTMLTextAreaElement
      || target instanceof HTMLSelectElement
      || (target instanceof HTMLElement && target.isContentEditable);

    if (isImportingVideo || isEditableTarget || event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === 'i') {
      event.preventDefault();
      event.stopPropagation();
      onSetInPoint();
    } else if (key === 'o') {
      event.preventDefault();
      event.stopPropagation();
      onSetOutPoint();
    }
  };

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
      onDragEnter={onStopModalDrag}
      onDragOver={onStopModalDrag}
      onDragLeave={onStopModalDrag}
      onDrop={onStopModalDrag}
    >
      <div className="bg-gray-900 rounded-xl shadow-2xl max-w-3xl w-full border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Film size={18} className="text-blue-400" />
            {language === 'zh' ? '视频导入设置' : 'Video Import Settings'}
          </h3>
          <button
            onClick={onClose}
            disabled={isImportingVideo}
            className="text-gray-500 hover:text-white p-1 disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[78vh] overflow-y-auto custom-scrollbar">
          <div className="bg-black rounded-lg border border-gray-800 overflow-hidden">
            <video
              ref={videoPreviewRef as React.RefObject<HTMLVideoElement>}
              src={pendingVideoImport.previewUrl}
              controls
              playsInline
              className="w-full max-h-[360px] bg-black"
              onTimeUpdate={(event) => onVideoPreviewTimeChange(event.currentTarget.currentTime)}
              onLoadedMetadata={(event) => onVideoPreviewTimeChange(event.currentTarget.currentTime)}
            />
          </div>

          <div className="space-y-3">
            <div className="relative h-5">
              <div className="absolute left-0 right-0 top-2 h-2 rounded-full bg-gray-800 overflow-hidden border border-gray-700">
                <div
                  className={`absolute top-0 bottom-0 ${hasInvalidRange ? 'bg-red-500/60' : 'bg-blue-500/70'}`}
                  style={{
                    left: `${rangeLeft}%`,
                    width: `${rangeWidth}%`
                  }}
                />
              </div>
              <div
                className={`absolute top-0 bottom-0 w-0.5 ${hasInvalidRange ? 'bg-red-300' : 'bg-blue-300'}`}
                style={{
                  left: `${startPercent}%`
                }}
                title={language === 'zh' ? '入点' : 'In point'}
              >
                <span className={`absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 ${hasInvalidRange ? 'bg-red-300' : 'bg-blue-300'}`} />
              </div>
              <div
                className={`absolute top-0 bottom-0 w-0.5 ${hasInvalidRange ? 'bg-red-300' : 'bg-blue-300'}`}
                style={{
                  left: `${endPercent}%`
                }}
                title={language === 'zh' ? '出点' : 'Out point'}
              >
                <span className={`absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 ${hasInvalidRange ? 'bg-red-300' : 'bg-blue-300'}`} />
              </div>
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white"
                style={{
                  left: `${getTimelinePercent(videoPreviewTime)}%`
                }}
              />
            </div>

            <input
              type="range"
              min={0}
              max={duration}
              step={0.01}
              value={Math.min(videoPreviewTime, pendingVideoImport.metadata.duration || 0)}
              disabled={isImportingVideo}
              onChange={(event) => onSeekVideoPreview(parseFloat(event.target.value) || 0)}
              className="w-full accent-blue-500"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-gray-400">
                {language === 'zh' ? '当前位置' : 'Current'}: <span className="text-gray-100 font-semibold">{videoPreviewTime.toFixed(2)}s</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onSetInPoint}
                  disabled={isImportingVideo}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs font-semibold text-gray-200 disabled:opacity-40"
                >
                  {language === 'zh' ? '设为入点' : 'Set In'}
                  <kbd className="ml-2 rounded border border-gray-600 bg-gray-900 px-1 text-[10px] text-gray-400">I</kbd>
                </button>
                <button
                  onClick={onSetOutPoint}
                  disabled={isImportingVideo}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs font-semibold text-gray-200 disabled:opacity-40"
                >
                  {language === 'zh' ? '设为出点' : 'Set Out'}
                  <kbd className="ml-2 rounded border border-gray-600 bg-gray-900 px-1 text-[10px] text-gray-400">O</kbd>
                </button>
              </div>
            </div>
            {hasInvalidRange && (
              <p className="text-xs font-semibold text-red-300">
                {language === 'zh' ? '出入点不合法：出点需要在入点之后。' : 'Invalid in/out points: out point must be after in point.'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
              <div className="text-gray-500 mb-1">{language === 'zh' ? '尺寸' : 'Size'}</div>
              <div className="text-gray-200 font-semibold">{pendingVideoImport.metadata.width} x {pendingVideoImport.metadata.height}</div>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
              <div className="text-gray-500 mb-1">{language === 'zh' ? '选择区间' : 'Range'}</div>
              <div className={`font-semibold ${hasInvalidRange ? 'text-red-300' : 'text-gray-200'}`}>
                {hasInvalidRange ? (language === 'zh' ? '不合法' : 'Invalid') : `${selectedDuration.toFixed(2)}s`}
              </div>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
              <div className="text-gray-500 mb-1">{language === 'zh' ? '预计帧数' : 'Frames'}</div>
              <div className={`font-semibold ${hasInvalidRange ? 'text-red-300' : 'text-gray-200'}`}>
                {hasInvalidRange ? '--' : estimatedFrameCount}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-400 uppercase">FPS</label>
              <span className="text-xs text-gray-500">{pendingVideoImport.settings.fps}</span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              value={pendingVideoImport.settings.fps}
              disabled={isImportingVideo}
              onChange={(event) => onUpdateSettings({ fps: parseInt(event.target.value, 10) })}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-gray-600">
              <span>1</span>
              <span>12</span>
              <span>30</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase block mb-1">
                {language === 'zh' ? '入点' : 'In Point'}
              </label>
              <input
                type="number"
                min={0}
                max={pendingVideoImport.metadata.duration || undefined}
                step={0.01}
                value={pendingVideoImport.settings.startTime}
                disabled={isImportingVideo}
                onChange={(event) => {
                  const value = Math.max(0, parseFloat(event.target.value) || 0);
                  onUpdateSettings({ startTime: Math.min(value, pendingVideoImport.metadata.duration || value) });
                }}
                className={`w-full bg-gray-800 border rounded px-3 py-2 text-sm focus:outline-none ${hasInvalidRange ? 'border-red-500 focus:border-red-400' : 'border-gray-700 focus:border-blue-500'}`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase block mb-1">
                {language === 'zh' ? '出点' : 'Out Point'}
              </label>
              <input
                type="number"
                min={0}
                max={pendingVideoImport.metadata.duration || undefined}
                step={0.01}
                value={pendingVideoImport.settings.endTime}
                disabled={isImportingVideo}
                onChange={(event) => {
                  const value = Math.max(0, parseFloat(event.target.value) || 0);
                  onUpdateSettings({ endTime: Math.min(value, pendingVideoImport.metadata.duration || value) });
                }}
                className={`w-full bg-gray-800 border rounded px-3 py-2 text-sm focus:outline-none ${hasInvalidRange ? 'border-red-500 focus:border-red-400' : 'border-gray-700 focus:border-blue-500'}`}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase block mb-1">
              {language === 'zh' ? '最大宽度' : 'Max Width'}
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={pendingVideoImport.settings.maxWidth}
              disabled={isImportingVideo}
              onChange={(event) => onUpdateSettings({ maxWidth: Math.max(1, parseInt(event.target.value, 10) || 1) })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              {language === 'zh' ? '宽度超过该值会等比例缩小，降低内存占用和导出耗时。' : 'Videos wider than this will be scaled down to reduce memory and export time.'}
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-900 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isImportingVideo}
            className="px-4 py-2 text-gray-400 hover:text-white text-sm disabled:opacity-40"
          >
            {closeLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isImportingVideo}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
          >
            {isImportingVideo && <Loader2 size={16} className="animate-spin" />}
            {language === 'zh' ? '开始导入' : 'Import Video'}
          </button>
        </div>
      </div>
    </div>
  );
};
