'use client';

import { UnifiedProgressDisplay } from '../ui/unified-progress-display';
import { UnifiedStatsDisplay } from '../ui/unified-stats-display';
import { ThumbnailActionButtons } from './thumbnail-generator/ThumbnailActionButtons';
import { ThumbnailBatchControls } from './thumbnail-generator/ThumbnailBatchControls';
import { ThumbnailErrorSummary } from './thumbnail-generator/ThumbnailErrorSummary';
import { useThumbnailGenerator } from './thumbnail-generator/useThumbnailGenerator';

export default function ThumbnailGenerator() {
  const {
    isProcessing,
    isProcessingAll,
    progress,
    errorSummary,
    stats,
    processingStartTime,
    batchSize,
    setBatchSize,
    handleGenerateThumbnails,
    handleCancel,
  } = useThumbnailGenerator();

  return (
    <div className="flex flex-col overflow-hidden gap-4 space-y-4">
      {!isProcessing && stats && (
        <UnifiedStatsDisplay
          stats={stats}
          title="Thumbnail Generator"
          description="Generate thumbnails for image files and store them in Supabase Storage. This helps improve performance by pre-generating thumbnails instead of creating them on-demand."
          labels={{
            success: 'files with images',
            failed: 'files failed',
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
          title="Generating Thumbnails"
          itemsLabel="files"
          rateUnit="thumbnails/sec"
        />
      )}

      {!isProcessing && (
        <ThumbnailBatchControls
          batchSize={batchSize}
          setBatchSize={setBatchSize}
          isProcessing={isProcessing}
        />
      )}

      <ThumbnailActionButtons
        isProcessing={isProcessing}
        isProcessingAll={isProcessingAll}
        stats={stats}
        batchSize={batchSize}
        onGenerateThumbnails={handleGenerateThumbnails}
        onCancel={handleCancel}
      />

      <ThumbnailErrorSummary
        failureCount={progress?.failureCount || 0}
        errorSummary={errorSummary}
      />
    </div>
  );
}
