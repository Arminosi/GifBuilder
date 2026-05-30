import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, Lock, Magnet, MoreVertical, Plus, Trash2, Unlock } from 'lucide-react';
import type { FrameTrack } from '../types';
import { getCompositionDuration, getFrameDuration, getTrackFrameSegments } from '../utils/frameTrackTiming';

interface FrameTrackPanelProps {
  tracks: FrameTrack[];
  activeTrackId: string | null;
  currentFrameIndex: number;
  currentTimeMs: number;
  labels: {
    title: string;
    empty: string;
    track: string;
    opacity: string;
    visible: string;
    hidden: string;
    locked: string;
    unlocked: string;
    add: string;
    delete: string;
  };
  onSelectTrack: (trackId: string) => void;
  onSelectFrame: (index: number) => void;
  onSelectTime: (timeMs: number) => void;
  onUpdateTrack: (trackId: string, updates: Partial<FrameTrack>) => void;
  onAddTrack: () => void;
  onDeleteTrack: (trackId: string) => void;
}

export const FrameTrackPanel: React.FC<FrameTrackPanelProps> = ({
  tracks,
  activeTrackId,
  currentFrameIndex,
  currentTimeMs,
  labels,
  onSelectTrack,
  onSelectFrame,
  onSelectTime,
  onUpdateTrack,
  onAddTrack,
  onDeleteTrack,
}) => {
  const SNAP_THRESHOLD_MS = 80;
  const activePointerIdRef = useRef<number | null>(null);
  const movingFrameRef = useRef<{
    pointerId: number;
    trackId: string;
    frameId: string;
    startX: number;
    rowWidth: number;
    originalStart: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [openMenuTrackId, setOpenMenuTrackId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const [isSnapEnabled, setIsSnapEnabled] = useState(true);
  const totalDuration = getCompositionDuration(tracks);
  const playheadPercent = totalDuration > 0
    ? (Math.min(totalDuration, Math.max(0, currentTimeMs)) / totalDuration) * 100
    : 0;

  useEffect(() => {
    if (!openMenuTrackId) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuTrackId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuTrackId(null);
      }
    };
    const closeMenu = () => setOpenMenuTrackId(null);

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [openMenuTrackId]);

  useEffect(() => {
    if (!openMenuTrackId) {
      setMenuPosition(null);
    }
  }, [openMenuTrackId]);

  const getTimeFromPointer = (target: HTMLButtonElement, clientX: number) => {
    if (totalDuration <= 0) return 0;

    const rect = target.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(ratio * totalDuration);
  };

  const selectTimeFromPointer = (trackId: string, target: HTMLButtonElement, clientX: number) => {
    const targetTime = getTimeFromPointer(target, clientX);
    if (trackId !== activeTrackId) {
      onSelectTrack(trackId);
    }
    onSelectTime(targetTime);
  };

  const handleTrackPointerDown = (trackId: string, event: React.PointerEvent<HTMLButtonElement>) => {
    activePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    selectTimeFromPointer(trackId, event.currentTarget, event.clientX);
    event.preventDefault();
  };

  const handleTrackPointerMove = (trackId: string, event: React.PointerEvent<HTMLButtonElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    selectTimeFromPointer(trackId, event.currentTarget, event.clientX);
    event.preventDefault();
  };

  const stopTrackDragging = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    activePointerIdRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const getConstrainedFrameStart = (track: FrameTrack, frameId: string, proposedStart: number) => {
    const frameIndex = track.frames.findIndex(frame => frame.id === frameId);
    if (frameIndex === -1) return Math.max(0, Math.round(proposedStart));

    const segments = getTrackFrameSegments(track.frames);
    const frame = track.frames[frameIndex];
    const duration = getFrameDuration(frame);
    const previousEnd = frameIndex > 0 ? segments[frameIndex - 1].end : 0;
    const nextStart = frameIndex < segments.length - 1 ? segments[frameIndex + 1].start : Infinity;
    const minStart = previousEnd;
    const maxStart = Number.isFinite(nextStart)
      ? Math.max(minStart, nextStart - duration)
      : Infinity;
    let nextStartTime = Math.max(minStart, Math.round(proposedStart));

    if (Number.isFinite(maxStart)) {
      nextStartTime = Math.min(maxStart, nextStartTime);
    }

    if (isSnapEnabled) {
      const snapTargets = [previousEnd, Number.isFinite(nextStart) ? nextStart - duration : null, 0]
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

      for (const target of snapTargets) {
        if (Math.abs(nextStartTime - target) <= SNAP_THRESHOLD_MS) {
          nextStartTime = target;
          break;
        }
      }
    }

    nextStartTime = Math.max(minStart, nextStartTime);
    return Number.isFinite(maxStart) ? Math.min(maxStart, nextStartTime) : nextStartTime;
  };

  const handleFramePointerDown = (
    track: FrameTrack,
    frameId: string,
    start: number,
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    const row = event.currentTarget.closest('[data-track-row="true"]') as HTMLButtonElement | null;
    if (!row) return;

    movingFrameRef.current = {
      pointerId: event.pointerId,
      trackId: track.id,
      frameId,
      startX: event.clientX,
      rowWidth: row.getBoundingClientRect().width,
      originalStart: start,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelectTrack(track.id);
    onSelectTime(start);
    event.preventDefault();
    event.stopPropagation();
  };

  const handleFramePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const moving = movingFrameRef.current;
    if (!moving || moving.pointerId !== event.pointerId || moving.rowWidth <= 0) return;

    const deltaTime = (event.clientX - moving.startX) / moving.rowWidth * totalDuration;
    const targetTrack = tracks.find(track => track.id === moving.trackId);
    if (!targetTrack) return;
    const proposedStart = moving.originalStart + deltaTime;
    const nextStart = getConstrainedFrameStart(targetTrack, moving.frameId, proposedStart);

    onUpdateTrack(moving.trackId, {
      frames: targetTrack.frames.map(frame => (
        frame.id === moving.frameId ? { ...frame, startTime: nextStart } : frame
      )),
    });
    onSelectTime(nextStart);
    event.preventDefault();
    event.stopPropagation();
  };

  const stopFrameDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    const moving = movingFrameRef.current;
    if (!moving || moving.pointerId !== event.pointerId) return;

    movingFrameRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    event.stopPropagation();
  };

  const renderedTracks = [...tracks].reverse();
  const openTrack = openMenuTrackId
    ? tracks.find(track => track.id === openMenuTrackId) ?? null
    : null;
  const openTrackVisualIndex = openTrack
    ? renderedTracks.findIndex(track => track.id === openTrack.id)
    : -1;
  const openTrackNumber = openTrackVisualIndex >= 0 ? tracks.length - openTrackVisualIndex : 1;

  const openTrackMenu = openTrack && menuPosition
    ? createPortal(
      <div
        ref={menuRef}
        className="fixed z-[9999] w-56 rounded border border-gray-700 bg-gray-900 p-2 shadow-xl shadow-black/40"
        style={{ left: menuPosition.left, top: menuPosition.top }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          {labels.track} {openTrackNumber}
        </label>
        <input
          value={openTrack.name}
          onChange={(event) => onUpdateTrack(openTrack.id, { name: event.target.value })}
          className="mb-2 w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs font-medium text-gray-200 focus:border-blue-500 focus:outline-none"
        />
        <div className="mb-2 flex items-center gap-2 text-[10px] text-gray-500">
          <span className="w-12 shrink-0 whitespace-nowrap">{labels.opacity}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(openTrack.opacity * 100)}
            onChange={(event) => onUpdateTrack(openTrack.id, { opacity: parseInt(event.target.value) / 100 })}
            className="h-1 flex-1 accent-blue-500"
          />
          <span className="w-8 text-right font-mono">{Math.round(openTrack.opacity * 100)}%</span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => onUpdateTrack(openTrack.id, { visible: !openTrack.visible })}
            className="flex items-center gap-1.5 rounded border border-gray-800 bg-gray-950 px-2 py-1 text-left text-[11px] text-gray-300 hover:border-blue-500 hover:text-white"
            title={openTrack.visible ? labels.visible : labels.hidden}
          >
            {openTrack.visible ? <Eye size={13} /> : <EyeOff size={13} />}
            {openTrack.visible ? labels.visible : labels.hidden}
          </button>
          <button
            type="button"
            onClick={() => onUpdateTrack(openTrack.id, { locked: !openTrack.locked })}
            className="flex items-center gap-1.5 rounded border border-gray-800 bg-gray-950 px-2 py-1 text-left text-[11px] text-gray-300 hover:border-blue-500 hover:text-white"
            title={openTrack.locked ? labels.locked : labels.unlocked}
          >
            {openTrack.locked ? <Lock size={13} /> : <Unlock size={13} />}
            {openTrack.locked ? labels.locked : labels.unlocked}
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            onDeleteTrack(openTrack.id);
            setOpenMenuTrackId(null);
          }}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-red-500/20 bg-red-500/10 px-2 py-1 text-[11px] text-red-300 hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-30"
          title={labels.delete}
          disabled={tracks.length <= 1}
        >
          <Trash2 size={13} />
          {labels.delete}
        </button>
      </div>,
      document.body
    )
    : null;

  return (
    <div className="shrink-0 border-t border-gray-800 bg-gray-950/95 px-4 py-1.5">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">{labels.title}</div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsSnapEnabled(value => !value)}
            className={`flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-semibold transition-colors ${isSnapEnabled
              ? 'border-blue-500/60 bg-blue-500/15 text-blue-300 hover:bg-blue-500/25'
              : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-white'
              }`}
            title={isSnapEnabled ? '吸附开启' : '吸附关闭'}
          >
            <Magnet size={12} />
            吸附
          </button>
          <button
            type="button"
            onClick={onAddTrack}
            className="flex items-center gap-1 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-[11px] font-semibold text-gray-300 hover:border-blue-500 hover:text-white"
          >
            <Plus size={12} />
            {labels.add}
          </button>
        </div>
      </div>

      {tracks.length === 0 ? (
        <div className="rounded border border-dashed border-gray-800 px-3 py-2 text-xs text-gray-500">
          {labels.empty}
        </div>
      ) : (
        <div className="max-h-56 overflow-y-auto rounded border border-gray-800 bg-gray-950 custom-scrollbar">
          {renderedTracks.map((track, visualIndex) => {
            const isActive = track.id === activeTrackId;
            const trackNumber = tracks.length - visualIndex;
            const isMenuOpen = openMenuTrackId === track.id;

            return (
              <div
                key={track.id}
                className={`group relative grid grid-cols-[164px_minmax(0,1fr)] border-b border-gray-800 last:border-b-0 ${isActive ? 'bg-blue-500/10' : 'bg-gray-900/70'}`}
              >
                <div className={`relative flex min-w-0 items-center border-r border-gray-800 ${isActive ? 'shadow-[inset_3px_0_0_rgba(59,130,246,0.95)]' : ''}`}>
                  <button
                    type="button"
                    onClick={() => onSelectTrack(track.id)}
                    className="flex h-7 min-w-0 flex-1 items-center gap-1.5 px-2 text-left hover:bg-gray-800/70"
                  >
                    <span className={`shrink-0 font-mono text-[10px] ${isActive ? 'text-blue-300' : 'text-gray-500'}`}>
                      {labels.track} {trackNumber}
                    </span>
                    <span className={`min-w-0 flex-1 truncate text-xs font-medium ${track.visible ? 'text-gray-300' : 'text-gray-600'}`}>
                      {track.name}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (isMenuOpen) {
                        setOpenMenuTrackId(null);
                        return;
                      }

                      const rect = event.currentTarget.getBoundingClientRect();
                      const menuWidth = 224;
                      const menuHeight = 178;
                      const left = Math.min(window.innerWidth - menuWidth - 8, Math.max(8, rect.right - menuWidth));
                      const preferredTop = rect.bottom + 6;
                      const top = preferredTop + menuHeight > window.innerHeight
                        ? Math.max(8, rect.top - menuHeight - 6)
                        : preferredTop;
                      setMenuPosition({ left, top });
                      setOpenMenuTrackId(track.id);
                    }}
                    className={`mr-1 rounded p-0.5 text-gray-500 hover:bg-gray-800 hover:text-white ${isMenuOpen ? 'bg-gray-800 text-white' : ''}`}
                    title="Track menu"
                  >
                    <MoreVertical size={14} />
                  </button>
                </div>

                <button
                  type="button"
                  data-track-row="true"
                  onPointerDown={(event) => handleTrackPointerDown(track.id, event)}
                  onPointerMove={(event) => handleTrackPointerMove(track.id, event)}
                  onPointerUp={stopTrackDragging}
                  onPointerCancel={stopTrackDragging}
                  className="relative h-7 w-full cursor-pointer select-none touch-none bg-gray-900 px-0 py-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/40"
                >
                  <div className="relative h-full overflow-hidden bg-gray-800">
                    {getTrackFrameSegments(track.frames).map((segment) => {
                      const left = `${(segment.start / totalDuration) * 100}%`;
                      const width = `${(segment.duration / totalDuration) * 100}%`;

                      return (
                        <div
                          key={segment.frame.id}
                          className={`absolute top-0 h-full border-r border-gray-950/60 transition-colors ${isActive ? 'bg-blue-500/75' : 'bg-gray-700'}`}
                          style={{ left, width }}
                          title={`Frame ${segment.index + 1} - ${segment.start}ms / ${segment.duration}ms`}
                          onPointerDown={(event) => handleFramePointerDown(track, segment.frame.id, segment.start, event)}
                          onPointerMove={handleFramePointerMove}
                          onPointerUp={stopFrameDragging}
                          onPointerCancel={stopFrameDragging}
                        />
                      );
                    })}
                  </div>

                  {isActive && (
                    <div
                      className="pointer-events-none absolute top-0 z-30 h-full w-px bg-white shadow-[0_0_0_1px_rgba(59,130,246,0.7)]"
                      style={{ left: `calc(${playheadPercent}% - 0.5px)` }}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
      {openTrackMenu}
    </div>
  );
};
