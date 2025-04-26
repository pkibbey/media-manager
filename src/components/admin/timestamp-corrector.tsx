'use client';

import { UnifiedProgressDisplay } from '../ui/unified-progress-display';
import { UnifiedStatsDisplay } from '../ui/unified-stats-display';
import { CorrectionActions } from './timestamp-corrector/CorrectionActions';
import { useTimestampCorrection } from './timestamp-corrector/useTimestampCorrection';

export function TimestampCorrector() {
  const {
    stats,
    isProcessing,
    progress,
    processingStartTime,
    handleStopProcessing,
    handleUpdateTimestamps,
  } = useTimestampCorrection();

  return (
    <div className="space-y-4">
      {!isProcessing && (
        <UnifiedStatsDisplay
          stats={stats}
          title="Timestamp Corrector"
          description="Correct timestamps for media files based on EXIF data. This ensures that the timestamps are accurate and consistent across all media files."
          labels={{
            success: 'correct timestamps',
            failed: 'needs correcting',
          }}
          tooltipContent={
            <p>
              Compatible image formats: JPG, JPEG, PNG, WebP, GIF, TIFF, HEIC,
              AVIF, BMP. Excluded are files with extensions marked as "ignored"
              in file settings.
            </p>
          }
        />
      )}

      {isProcessing && (
        <UnifiedProgressDisplay
          isProcessing={isProcessing}
          progress={progress}
          processingStartTime={processingStartTime}
          title="Correcting Timestamps"
          itemsLabel='timestamps'
          rateUnit="files/sec"
        />
      )}

      <CorrectionActions
        isProcessing={isProcessing}
        onUpdateTimestamps={handleUpdateTimestamps}
        onStopProcessing={handleStopProcessing}
      />
    </div>
  );
}
