const getNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export interface ExportTimingSnapshot {
  stageKey: string;
  stageStartedAt: number;
  totalStartedAt: number;
  completedAt?: number;
}

export const createExportStatusTimer = (
  onStatus?: (status: string) => void,
  onTiming?: (timing: ExportTimingSnapshot) => void
) => {
  const totalStartedAt = getNow();
  let currentStageKey = '';
  let stageStartedAt = totalStartedAt;

  const emitTiming = (completedAt?: number) => {
    onTiming?.({
      stageKey: currentStageKey,
      stageStartedAt,
      totalStartedAt,
      completedAt,
    });
  };

  const report = (status: string, stageKey = status) => {
    const previousStageKey = currentStageKey;
    if (stageKey !== currentStageKey) {
      currentStageKey = stageKey;
      stageStartedAt = getNow();
    }

    onStatus?.(status);
    if (stageKey !== previousStageKey) {
      emitTiming();
    }
  };

  const complete = (status: string) => {
    onStatus?.(status);
    emitTiming(getNow());
  };

  return { report, complete };
};
