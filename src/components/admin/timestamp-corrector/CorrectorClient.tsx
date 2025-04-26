'use client';

import { CorrectionActions } from './CorrectionActions';
import { CorrectionProgress } from './CorrectionProgress';
import { useTimestampCorrection } from './useTimestampCorrection';

export function CorrectorClient() {
  const {
    isProcessing,
    progress,
    processingStartTime,
    handleStopProcessing,
    handleUpdateTimestamps,
  } = useTimestampCorrection();

  return (
    <>
      <CorrectionProgress
        isProcessing={isProcessing}
        progress={progress}
        processingStartTime={processingStartTime}
      />

      <CorrectionActions
        isProcessing={isProcessing}
        onUpdateTimestamps={handleUpdateTimestamps}
        onStopProcessing={handleStopProcessing}
      />
    </>
  );
}
