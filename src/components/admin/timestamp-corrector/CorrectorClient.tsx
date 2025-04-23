'use client';

import { CorrectionActions } from './CorrectionActions';
import { CorrectionProgress } from './CorrectionProgress';
import { useTimestampCorrection } from './useTimestampCorrection';

export type TimestampCorrectorClientProps = {
  initialNeedsCorrection?: number;
};

export function CorrectorClient({
  initialNeedsCorrection = 0,
}: TimestampCorrectorClientProps) {
  const {
    isProcessing,
    progress,
    processingStartTime,
    needsCorrection,
    handleStopProcessing,
    handleUpdateTimestamps,
  } = useTimestampCorrection(initialNeedsCorrection);

  return (
    <>
      <CorrectionProgress
        isProcessing={isProcessing}
        progress={progress}
        processingStartTime={processingStartTime}
      />

      <CorrectionActions
        isProcessing={isProcessing}
        needsCorrection={needsCorrection}
        onUpdateTimestamps={handleUpdateTimestamps}
        onStopProcessing={handleStopProcessing}
      />
    </>
  );
}
