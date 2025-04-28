'use client';

import { UnifiedProgressDisplay } from '../ui/unified-progress-display';
import { UnifiedStatsDisplay } from '../ui/unified-stats-display';
import { ExifActionButtons } from './exif-processor/ExifActionButtons';
import { ExifErrorSummary } from './exif-processor/ExifErrorSummary';
import { ExifProcessOptions } from './exif-processor/ExifProcessOptions';
import { useExifProcessor } from './exif-processor/useExifProcessor';

export default function ExifProcessor() {
  const {
    stats,
    isProcessing,
    progress,
    errorSummary,
    method,
    setMethod,
    batchSize,
    setBatchSize,
    processingStartTime,
    handleProcess,
    handleCancel,
  } = useExifProcessor();

  return (
    <div className="overflow-hidden grid gap-4 space-y-4">
      <div className="overflow-hidden bg-neutral-400/20 rounded-md p-4">
        {!isProcessing && stats && (
          <UnifiedStatsDisplay
            stats={stats}
            title="Exif Processor"
            description="Process EXIF data for image files and store them in Supabase Storage. This helps improve performance by pre-processing EXIF data instead of creating it on-demand."
            labels={{
              success: 'files with exif',
              failed: 'files failed',
            }}
            tooltipContent={
              <p>
                EXIF extraction processes files in batches. Large files or
                unsupported formats may take longer.
              </p>
            }
          />
        )}

        {isProcessing && (
          <UnifiedProgressDisplay
            isProcessing={isProcessing}
            progress={progress}
            processingStartTime={processingStartTime}
            title="Processing EXIF Data"
            itemsLabel="images"
            rateUnit="images/sec"
            className="overflow-hidden"
          />
        )}
      </div>

      {!isProcessing && (
        <ExifProcessOptions
          progress={progress}
          method={method}
          setMethod={setMethod}
          batchSize={batchSize}
          setBatchSize={setBatchSize}
          isProcessing={isProcessing}
        />
      )}

      {/* Action Buttons only need stats, not progress */}
      <ExifActionButtons
        stats={stats}
        isProcessing={isProcessing}
        batchSize={batchSize}
        method={method}
        handleProcess={handleProcess}
        handleCancel={handleCancel}
      />

      <ExifErrorSummary progress={progress} errorSummary={errorSummary} />
    </div>
  );
}
