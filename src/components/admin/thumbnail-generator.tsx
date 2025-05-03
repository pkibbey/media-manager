'use client';

import { UnifiedProgressDisplay } from '../ui/unified-progress-display';
import { UnifiedStatsDisplay } from '../ui/unified-stats-display';
import { ThumbnailActionButtons } from './thumbnail-generator/ThumbnailActionButtons';
import { ThumbnailErrorSummary } from './thumbnail-generator/ThumbnailErrorSummary';
import { ThumbnailProcessOptions } from './thumbnail-generator/ThumbnailProcessOptions';
import { ThumbnailValidator } from './thumbnail-generator/ThumbnailValidator';
import { useThumbnailGenerator } from './thumbnail-generator/useThumbnailGenerator';

export default function ThumbnailGenerator() {
  const {
    isProcessing,
    progress,
    errorSummary,
    stats,
    processingStartTime,
    batchSize,
    setBatchSize,
    method,
    setMethod,
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

      {isProcessing && stats && (
        <UnifiedProgressDisplay
          stats={stats}
          isProcessing={isProcessing}
          progress={progress}
          processingStartTime={processingStartTime}
          title="Generating Thumbnails"
          itemsLabel="files"
          rateUnit="thumbnails/sec"
        />
      )}

      {!isProcessing && (
        <div className="flex flex-col gap-4">
          <ThumbnailProcessOptions
            progress={progress}
            method={method}
            setMethod={setMethod}
            batchSize={batchSize}
            setBatchSize={setBatchSize}
            isProcessing={isProcessing}
          />
        </div>
      )}

      <ThumbnailActionButtons
        isProcessing={isProcessing}
        stats={stats}
        batchSize={batchSize}
        method={method}
        onGenerateThumbnails={handleGenerateThumbnails}
        onCancel={handleCancel}
      />

      <ThumbnailErrorSummary
        failureCount={progress?.failureCount || 0}
        errorSummary={errorSummary}
      />

      {!isProcessing && <ThumbnailValidator />}
    </div>
  );
}
