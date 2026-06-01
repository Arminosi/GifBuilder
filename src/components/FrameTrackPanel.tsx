import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, Eye, EyeOff, Lock, Magnet, MoreVertical, Plus, SlidersHorizontal, Trash2, Unlock } from 'lucide-react';
import type { FrameTrack, TimelineSpacingMode } from '../types';
import { getCompositionDuration, getFrameDuration, getTrackFrameSegments } from '../utils/frameTrackTiming';

interface FrameTrackPanelProps {
  tracks: FrameTrack[];
  activeTrackId: string | null;
  selectedFrameIds: Set<string>;
  currentFrameIndex: number;
  currentTimeMs: number;
  dragSpacingMode: TimelineSpacingMode;
  trackLabelWidth?: number;
  embedded?: boolean;
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
    moveUp: string;
    moveDown: string;
    inPoint: string;
    outPoint: string;
    clearRange: string;
  };
  exportControls?: {
    canSetRange: boolean;
    hasRange: boolean;
    onSetInPoint: () => void;
    onSetOutPoint: () => void;
    onClearRange: () => void;
  };
  onSelectTrack: (trackId: string) => void;
  onSelectFrame: (index: number) => void;
  onSelectFrameBlock: (frameId: string, modifiers?: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }) => void;
  onSelectTime: (timeMs: number) => void;
  onDragSpacingModeChange: (mode: TimelineSpacingMode) => void;
  onBeginTrackEdit: () => void;
  onUpdateTrack: (trackId: string, updates: Partial<FrameTrack>, options?: { historyMode?: 'push' | 'replace' }) => void;
  onMoveTrack: (trackId: string, direction: 'up' | 'down') => void;
  onAddTrack: () => void;
  onDeleteTrack: (trackId: string) => void;
}

export const FrameTrackPanel: React.FC<FrameTrackPanelProps> = ({
  tracks,
  activeTrackId,
  selectedFrameIds,
  currentFrameIndex,
  currentTimeMs,
  dragSpacingMode,
  trackLabelWidth = 164,
  embedded = false,
  labels,
  exportControls,
  onSelectTrack,
  onSelectFrame,
  onSelectFrameBlock,
  onSelectTime,
  onDragSpacingModeChange,
  onBeginTrackEdit,
  onUpdateTrack,
  onMoveTrack,
  onAddTrack,
  onDeleteTrack,
}) => {
  const SNAP_THRESHOLD_MS = 80;
  const activePointerIdRef = useRef<number | null>(null);
  const movingFrameRef = useRef<{
    pointerId: number;
    trackId: string;
    frameId: string;
    frameIds: string[];
    startX: number;
    rowWidth: number;
    originalStart: number;
    originalStarts: Map<string, number>;
    hasHistoryEntry: boolean;
    pendingDeleteFrameId: string | null;
    pendingDeleteStart: number | null;
    latestFrames: FrameTrack['frames'];
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [openMenuTrackId, setOpenMenuTrackId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const [isSnapEnabled, setIsSnapEnabled] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditableTarget = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || (target instanceof HTMLElement && target.isContentEditable);

      if (isEditableTarget || event.ctrlKey || event.metaKey || event.altKey || event.repeat) {
        return;
      }

      if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setIsSnapEnabled(value => !value);
      } else if (event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setIsPreviewMode(value => {
          if (!value) {
            movingFrameRef.current = null;
          }
          return !value;
        });
      } else if (event.key.toLowerCase() === 't') {
        event.preventDefault();
        onDragSpacingModeChange(dragSpacingMode === 'blank' ? 'previous' : 'blank');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dragSpacingMode, onDragSpacingModeChange]);

  const getTimeFromPointer = (target: HTMLButtonElement, clientX: number) => {
    if (totalDuration <= 0) return 0;

    const rect = target.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.min(Math.max(0, totalDuration - 1), Math.floor(ratio * totalDuration));
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
    const previousSegment = frameIndex > 0 ? segments[frameIndex - 1] : null;
    const previousEnd = previousSegment?.end ?? 0;
    const isResizingPreviousFrame = dragSpacingMode === 'previous' && Boolean(previousSegment);
    const previousBoundary = isResizingPreviousFrame
      ? (previousSegment?.start ?? 0)
      : previousSegment?.frame.isBlank ? previousSegment.start : previousEnd;
    const nextStart = frameIndex < segments.length - 1 ? segments[frameIndex + 1].start : Infinity;
    const minStart = previousBoundary;
    let nextStartTime = Math.max(minStart, Math.round(proposedStart));

    if (isSnapEnabled) {
      const boundaryTargets = new Set<number>([0, previousBoundary, previousEnd]);
      if (Number.isFinite(nextStart)) {
        boundaryTargets.add(nextStart);
      }

      tracks.forEach(candidateTrack => {
        getTrackFrameSegments(candidateTrack.frames).forEach(segment => {
          if (candidateTrack.id === track.id && segment.frame.id === frameId) return;
          boundaryTargets.add(segment.start);
          boundaryTargets.add(segment.end);
        });
      });

      const snapCandidates = Array.from(boundaryTargets)
        .filter(target => Number.isFinite(target))
        .flatMap(target => [
          { start: target, distance: Math.abs(nextStartTime - target) },
          { start: target - duration, distance: Math.abs((nextStartTime + duration) - target) },
        ])
        .filter(candidate => candidate.distance <= SNAP_THRESHOLD_MS)
        .sort((a, b) => a.distance - b.distance);

      const snapped = snapCandidates.find(candidate => {
        const start = Math.max(minStart, candidate.start);
        return start >= minStart;
      });

      if (snapped) {
        nextStartTime = Math.max(minStart, snapped.start);
      }
    }

    nextStartTime = Math.max(minStart, nextStartTime);
    return nextStartTime;
  };

  const updateDraggedFrameStart = (track: FrameTrack, frameId: string, nextStart: number) => {
    const frameIndex = track.frames.findIndex(frame => frame.id === frameId);
    if (frameIndex === -1) return track.frames;
    const segments = getTrackFrameSegments(track.frames);
    const currentSegment = segments[frameIndex];
    const delta = nextStart - (currentSegment?.start ?? nextStart);

    if (dragSpacingMode !== 'previous' || frameIndex === 0) {
      return track.frames.map((frame, index) => {
        if (index === frameIndex) {
          return { ...frame, startTime: nextStart };
        }

        if (index > frameIndex) {
          const segment = segments[index];
          return { ...frame, startTime: Math.max(0, (segment?.start ?? 0) + delta) };
        }

        return frame;
      });
    }

    const previousSegment = segments[frameIndex - 1];
    if (!previousSegment) {
      return track.frames.map((frame, index) => (
        index >= frameIndex
          ? { ...frame, startTime: Math.max(0, (segments[index]?.start ?? 0) + delta) }
          : frame
      ));
    }

    const nextPreviousDuration = Math.max(0, nextStart - previousSegment.start);

    if (nextPreviousDuration <= 0) {
      return track.frames.map((frame, index) => {
        if (index === frameIndex) {
          return { ...frame, startTime: previousSegment.start };
        }

        if (index === frameIndex - 1) {
          return { ...frame, duration: 1 };
        }

        if (index > frameIndex) {
          const segment = segments[index];
          return { ...frame, startTime: Math.max(0, (segment?.start ?? 0) + delta) };
        }

        return frame;
      });
    }

    return track.frames.map((frame, index) => {
      if (index === frameIndex - 1) {
        return { ...frame, duration: nextPreviousDuration };
      }

      if (index === frameIndex) {
        return { ...frame, startTime: nextStart };
      }

      if (index > frameIndex) {
        const segment = segments[index];
        return { ...frame, startTime: Math.max(0, (segment?.start ?? 0) + delta) };
      }

      return frame;
    });
  };

  const getConstrainedGroupDelta = (
    track: FrameTrack,
    frameIds: string[],
    originalStarts: Map<string, number>,
    proposedDelta: number
  ) => {
    const movingIds = new Set(frameIds);
    const segments = getTrackFrameSegments(track.frames);
    const movingSegments = segments.filter(segment => movingIds.has(segment.frame.id));
    const fixedSegments = segments.filter(segment => !movingIds.has(segment.frame.id));
    if (movingSegments.length === 0) return 0;

    let minDelta = -Math.min(...movingSegments.map(segment => originalStarts.get(segment.frame.id) ?? segment.start));
    let maxDelta = Infinity;

    movingSegments.forEach(segment => {
      const originalStart = originalStarts.get(segment.frame.id) ?? segment.start;
      const originalEnd = originalStart + segment.duration;

      fixedSegments.forEach(fixed => {
        if (fixed.end <= originalStart) {
          minDelta = Math.max(minDelta, fixed.end - originalStart);
        } else if (fixed.start >= originalEnd) {
          maxDelta = Math.min(maxDelta, fixed.start - originalEnd);
        }
      });
    });

    let nextDelta = Math.max(minDelta, Math.round(proposedDelta));
    if (Number.isFinite(maxDelta)) {
      nextDelta = Math.min(maxDelta, nextDelta);
    }

    if (isSnapEnabled) {
      const boundaryTargets = new Set<number>([0]);
      tracks.forEach(candidateTrack => {
        getTrackFrameSegments(candidateTrack.frames).forEach(segment => {
          if (candidateTrack.id === track.id && movingIds.has(segment.frame.id)) return;
          boundaryTargets.add(segment.start);
          boundaryTargets.add(segment.end);
        });
      });

      const snapCandidates = Array.from(boundaryTargets)
        .filter(target => Number.isFinite(target))
        .flatMap(target => movingSegments.flatMap(segment => {
          const originalStart = originalStarts.get(segment.frame.id) ?? segment.start;
          const originalEnd = originalStart + segment.duration;

          return [
            { delta: target - originalStart, distance: Math.abs((originalStart + nextDelta) - target) },
            { delta: target - originalEnd, distance: Math.abs((originalEnd + nextDelta) - target) },
          ];
        }))
        .filter(candidate => candidate.distance <= SNAP_THRESHOLD_MS)
        .sort((a, b) => a.distance - b.distance);

      const snapped = snapCandidates.find(candidate => {
        const delta = Math.max(minDelta, candidate.delta);
        return Number.isFinite(maxDelta) ? delta <= maxDelta : true;
      });

      if (snapped) {
        nextDelta = Math.max(minDelta, snapped.delta);
        if (Number.isFinite(maxDelta)) {
          nextDelta = Math.min(maxDelta, nextDelta);
        }
      }
    }

    return Number.isFinite(maxDelta) ? Math.min(maxDelta, nextDelta) : nextDelta;
  };

  const handleFramePointerDown = (
    track: FrameTrack,
    frameId: string,
    start: number,
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    const row = event.currentTarget.closest('[data-track-row="true"]') as HTMLButtonElement | null;
    if (!row) return;
    if (isPreviewMode) {
      activePointerIdRef.current = event.pointerId;
      row.setPointerCapture(event.pointerId);
      selectTimeFromPointer(track.id, row, event.clientX);
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const modifiers = {
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
    };

    if (track.id !== activeTrackId) {
      onSelectTrack(track.id);
    }
    if (!(selectedFrameIds.has(frameId) && selectedFrameIds.size > 1 && !event.ctrlKey && !event.metaKey && !event.shiftKey)) {
      onSelectFrameBlock(frameId, modifiers);
    }
    onSelectTime(start);

    const trackFrameIds = new Set(track.frames.map(frame => frame.id));
    const frameIds = selectedFrameIds.has(frameId)
      ? Array.from(selectedFrameIds).filter(id => trackFrameIds.has(id))
      : [frameId];
    const segments = getTrackFrameSegments(track.frames);
    const originalStarts = new Map<string, number>();
    frameIds.forEach(id => {
      const segment = segments.find(candidate => candidate.frame.id === id);
      if (segment) {
        originalStarts.set(id, segment.start);
      }
    });

    movingFrameRef.current = {
      pointerId: event.pointerId,
      trackId: track.id,
      frameId,
      frameIds,
      startX: event.clientX,
      rowWidth: row.getBoundingClientRect().width,
      originalStart: start,
      originalStarts,
      hasHistoryEntry: false,
      pendingDeleteFrameId: null,
      pendingDeleteStart: null,
      latestFrames: track.frames,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };

  const handleFramePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const moving = movingFrameRef.current;
    if (!moving || moving.pointerId !== event.pointerId || moving.rowWidth <= 0) return;

    const deltaTime = (event.clientX - moving.startX) / moving.rowWidth * totalDuration;
    const targetTrack = tracks.find(track => track.id === moving.trackId);
    if (!targetTrack) return;
    const frameIds = moving.frameIds.length > 0 ? moving.frameIds : [moving.frameId];

    if (!moving.hasHistoryEntry) {
      onBeginTrackEdit();
      moving.hasHistoryEntry = true;
    }

    if (frameIds.length > 1) {
      const nextDelta = getConstrainedGroupDelta(targetTrack, frameIds, moving.originalStarts, deltaTime);
      const nextPrimaryStart = (moving.originalStarts.get(moving.frameId) ?? moving.originalStart) + nextDelta;
      const nextFrames = targetTrack.frames.map(frame => (
        moving.originalStarts.has(frame.id)
          ? { ...frame, startTime: (moving.originalStarts.get(frame.id) ?? 0) + nextDelta }
          : frame
      ));
      moving.latestFrames = nextFrames;

      onUpdateTrack(moving.trackId, {
        frames: nextFrames,
      }, { historyMode: 'replace' });
      onSelectTime(nextPrimaryStart);
    } else {
      const proposedStart = moving.originalStart + deltaTime;
      const nextStart = getConstrainedFrameStart(targetTrack, moving.frameId, proposedStart);
      const frameIndex = targetTrack.frames.findIndex(frame => frame.id === moving.frameId);
      const segments = getTrackFrameSegments(targetTrack.frames);
      const previousSegment = frameIndex > 0 ? segments[frameIndex - 1] : null;
      const shouldDeletePreviousFrame = dragSpacingMode === 'previous'
        && previousSegment
        && nextStart <= previousSegment.start;

      moving.pendingDeleteFrameId = shouldDeletePreviousFrame ? previousSegment.frame.id : null;
      moving.pendingDeleteStart = shouldDeletePreviousFrame ? previousSegment.start : null;

      const nextFrames = updateDraggedFrameStart(targetTrack, moving.frameId, nextStart);
      moving.latestFrames = nextFrames;

      onUpdateTrack(moving.trackId, {
        frames: nextFrames,
      }, { historyMode: 'replace' });
      onSelectTime(nextStart);
    }
    event.preventDefault();
    event.stopPropagation();
  };

  const stopFrameDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    const moving = movingFrameRef.current;
    if (!moving || moving.pointerId !== event.pointerId) return;
    const shouldCommitDelete = event.type === 'pointerup' && moving.pendingDeleteFrameId !== null;

    if (shouldCommitDelete && moving.pendingDeleteFrameId) {
      const deleteFrameId = moving.pendingDeleteFrameId;
      const targetStart = moving.pendingDeleteStart ?? 0;

      onUpdateTrack(moving.trackId, {
        frames: moving.latestFrames
          .filter(frame => frame.id !== deleteFrameId)
          .map(frame => (
            frame.id === moving.frameId
              ? { ...frame, startTime: targetStart }
              : frame
          )),
      }, { historyMode: moving.hasHistoryEntry ? 'replace' : 'push' });
    }

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
  const openTrackIndex = openTrack
    ? tracks.findIndex(track => track.id === openTrack.id)
    : -1;
  const openTrackNumber = openTrackVisualIndex >= 0 ? tracks.length - openTrackVisualIndex : 1;
  const canMoveOpenTrackUp = openTrackIndex >= 0 && openTrackIndex < tracks.length - 1;
  const canMoveOpenTrackDown = openTrackIndex > 0;

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
          {openTrackNumber}
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
            onClick={() => onMoveTrack(openTrack.id, 'up')}
            disabled={!canMoveOpenTrackUp}
            className="flex items-center gap-1.5 rounded border border-gray-800 bg-gray-950 px-2 py-1 text-left text-[11px] text-gray-300 hover:border-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-gray-800 disabled:hover:text-gray-300"
            title={labels.moveUp}
          >
            <ArrowUp size={13} />
            {labels.moveUp}
          </button>
          <button
            type="button"
            onClick={() => onMoveTrack(openTrack.id, 'down')}
            disabled={!canMoveOpenTrackDown}
            className="flex items-center gap-1.5 rounded border border-gray-800 bg-gray-950 px-2 py-1 text-left text-[11px] text-gray-300 hover:border-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-gray-800 disabled:hover:text-gray-300"
            title={labels.moveDown}
          >
            <ArrowDown size={13} />
            {labels.moveDown}
          </button>
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
    <div className={embedded ? '' : 'shrink-0 border-t border-gray-800 bg-gray-950/95 px-4 py-1.5'}>
      <div className="mb-1.5 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">{labels.title}</div>
        <div className="flex items-center gap-1.5">
          {exportControls && (
            <div className="flex items-center gap-1 border-r border-gray-800 pr-1.5">
              <button
                type="button"
                onClick={exportControls.onSetInPoint}
                disabled={!exportControls.canSetRange}
                className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-[11px] font-semibold text-gray-300 transition-colors hover:border-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-700 disabled:hover:text-gray-300"
                title="将当前时间设置为导出入点"
              >
                设置入点
              </button>
              <button
                type="button"
                onClick={exportControls.onSetOutPoint}
                disabled={!exportControls.canSetRange}
                className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-[11px] font-semibold text-gray-300 transition-colors hover:border-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-700 disabled:hover:text-gray-300"
                title="将当前时间设置为导出出点"
              >
                设置出点
              </button>
              <button
                type="button"
                onClick={exportControls.onClearRange}
                disabled={!exportControls.hasRange}
                className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-[11px] font-semibold text-gray-300 transition-colors hover:border-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-700 disabled:hover:text-gray-300"
                title="清除已设置的导出入点和出点"
              >
                {labels.clearRange}
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setIsPreviewMode(value => {
                if (!value) {
                  movingFrameRef.current = null;
                }
                return !value;
              });
            }}
            className={`flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-semibold transition-colors ${isPreviewMode
              ? 'border-blue-500/60 bg-blue-500/15 text-blue-300 hover:bg-blue-500/25'
              : 'border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
              }`}
            title={isPreviewMode
              ? '预览模式：拖动任意轨道或帧块只移动预览时间，不调整帧位置（A）'
              : '调节模式：可拖动帧块调整开始时间；拖空白区域仍移动预览时间（A）'
            }
          >
            <SlidersHorizontal size={12} />
            {isPreviewMode ? '预览' : '调节'}
          </button>
          <button
            type="button"
            onClick={() => onDragSpacingModeChange(dragSpacingMode === 'blank' ? 'previous' : 'blank')}
            className={`flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-semibold transition-colors ${dragSpacingMode === 'previous'
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
              : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600 hover:text-white'
              }`}
            title={dragSpacingMode === 'previous'
              ? '联动模式：拖动或调节当前帧时，前后帧一起联动吸附（T）'
              : '拖动当前帧时在前方自动创建或调整空白帧（T）'
            }
          >
            {dragSpacingMode === 'previous' ? '联动' : '空白'}
          </button>
          <button
            type="button"
            onClick={() => setIsSnapEnabled(value => !value)}
            className={`flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-semibold transition-colors ${isSnapEnabled
              ? 'border-blue-500/60 bg-blue-500/15 text-blue-300 hover:bg-blue-500/25'
              : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-white'
              }`}
            title={isSnapEnabled ? '吸附开启（N）' : '吸附关闭（N）'}
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
        <div
          className={`max-h-56 overflow-x-hidden overflow-y-auto border border-gray-800 bg-gray-950 custom-scrollbar ${embedded ? 'rounded-t border-b-0' : 'rounded'}`}
        >
          {renderedTracks.map((track, visualIndex) => {
            const isActive = track.id === activeTrackId;
            const trackNumber = tracks.length - visualIndex;
            const isMenuOpen = openMenuTrackId === track.id;

            return (
              <div
                key={track.id}
                className={`group relative grid border-b border-gray-800 last:border-b-0 ${isActive ? 'bg-blue-500/10' : 'bg-gray-900/70'}`}
                style={{ gridTemplateColumns: `${trackLabelWidth}px minmax(0, 1fr)` }}
              >
                <div className={`relative flex min-w-0 items-center border-r border-gray-800 ${isActive ? 'shadow-[inset_3px_0_0_rgba(59,130,246,0.95)]' : ''}`}>
                  <button
                    type="button"
                    onClick={() => onSelectTrack(track.id)}
                    className="flex h-7 min-w-0 flex-1 items-center gap-1.5 px-2 text-left hover:bg-gray-800/70"
                  >
                    <span className={`shrink-0 font-mono text-[10px] ${isActive ? 'text-blue-300' : 'text-gray-500'}`}>
                      {trackNumber}
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
                      const menuHeight = 222;
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
                    {getTrackFrameSegments(track.frames).map((segment, segmentIndex, segments) => {
                      const left = `${(segment.start / totalDuration) * 100}%`;
                      const width = `${(segment.duration / totalDuration) * 100}%`;
                      const isLastSegment = segmentIndex === segments.length - 1;
                      const isCurrentSegment = currentTimeMs >= segment.start && currentTimeMs < segment.end;
                      const isSelected = selectedFrameIds.has(segment.frame.id);
                      const isBlank = Boolean(segment.frame.isBlank);

                      return (
                        <div
                          key={segment.frame.id}
                          className={`absolute top-0 h-full overflow-hidden ${isPreviewMode ? '' : 'cursor-grab active:cursor-grabbing'} ${isLastSegment ? '' : 'border-r border-gray-950/60'} ${isCurrentSegment ? 'bg-blue-500' : isSelected ? 'bg-blue-600/70' : isBlank ? 'bg-amber-500/20' : 'bg-gray-700'} ${isBlank ? 'border border-amber-400/30' : ''} ${isSelected ? 'ring-2 ring-inset ring-blue-200/80' : ''}`}
                          style={{
                            left,
                            width,
                            backgroundImage: isBlank && !isCurrentSegment && !isSelected
                              ? 'repeating-linear-gradient(45deg, rgba(245,158,11,0.18) 0 4px, rgba(245,158,11,0.05) 4px 8px)'
                              : undefined,
                          }}
                          title={`${isBlank ? 'Blank frame' : 'Frame'} ${segment.index + 1} - ${segment.start}ms / ${segment.duration}ms`}
                          onPointerDown={(event) => handleFramePointerDown(track, segment.frame.id, segment.start, event)}
                          onPointerMove={isPreviewMode ? undefined : handleFramePointerMove}
                          onPointerUp={isPreviewMode ? undefined : stopFrameDragging}
                          onPointerCancel={isPreviewMode ? undefined : stopFrameDragging}
                        >
                          {isBlank && (
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                              <span className="max-w-full truncate px-1 text-[9px] font-semibold uppercase tracking-wide text-amber-100/90">
                                Blank
                              </span>
                            </div>
                          )}
                          {segment.frame.colorTag && (
                            <div
                              className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5"
                              style={{ backgroundColor: segment.frame.colorTag }}
                            />
                          )}
                        </div>
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
