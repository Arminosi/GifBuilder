import type { FrameData, FrameTrack } from '../types';

export interface FrameTimeSegment {
  frame: FrameData;
  index: number;
  start: number;
  duration: number;
  end: number;
}

export interface TimelineSegment {
  start: number;
  duration: number;
  end: number;
}

export const getFrameDuration = (frame: FrameData): number => Math.max(1, frame.duration || 1);

export const getTrackFrameSegments = (frames: FrameData[]): FrameTimeSegment[] => {
  let cursor = 0;

  return frames.map((frame, index) => {
    const start = typeof frame.startTime === 'number' && Number.isFinite(frame.startTime)
      ? Math.max(0, frame.startTime)
      : cursor;
    const duration = getFrameDuration(frame);
    const end = start + duration;
    cursor = Math.max(cursor, end);

    return { frame, index, start, duration, end };
  });
};

export const getFrameStartTime = (frames: FrameData[], frameIndex: number): number => {
  return getTrackFrameSegments(frames)[frameIndex]?.start ?? 0;
};

export const getTrackDuration = (frames: FrameData[]): number => {
  return getTrackFrameSegments(frames).reduce((max, segment) => Math.max(max, segment.end), 0);
};

export const getCompositionDuration = (tracks: FrameTrack[], fallbackFrames: FrameData[] = []): number => {
  const trackDuration = tracks.reduce((max, track) => Math.max(max, getTrackDuration(track.frames)), 0);
  return Math.max(trackDuration, getTrackDuration(fallbackFrames), 1);
};

export const findFrameAtTime = (frames: FrameData[], timeMs: number): FrameTimeSegment | null => {
  const time = Math.max(0, timeMs);
  return getTrackFrameSegments(frames).find(segment => time >= segment.start && time < segment.end) ?? null;
};

export const createCompositionTimeline = (tracks: FrameTrack[], fallbackFrames: FrameData[] = []): TimelineSegment[] => {
  const points = new Set<number>([0]);
  const sourceTracks = tracks.length > 0
    ? tracks.filter(track => track.visible)
    : [{ frames: fallbackFrames } as FrameTrack];

  sourceTracks.forEach(track => {
    getTrackFrameSegments(track.frames).forEach(segment => {
      points.add(segment.start);
      points.add(segment.end);
    });
  });

  const sorted = Array.from(points).filter(point => point >= 0).sort((a, b) => a - b);
  if (sorted.length <= 1) {
    return [{ start: 0, duration: 1, end: 1 }];
  }

  return sorted.slice(0, -1).map((start, index) => {
    const end = sorted[index + 1];
    return {
      start,
      duration: Math.max(1, end - start),
      end,
    };
  });
};

export const getTimelineSegmentIndexAtTime = (segments: TimelineSegment[], timeMs: number): number => {
  const time = Math.max(0, timeMs);
  const index = segments.findIndex(segment => time >= segment.start && time < segment.end);
  return index === -1 ? Math.max(0, segments.length - 1) : index;
};
