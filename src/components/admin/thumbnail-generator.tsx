'use client';

import { ThumbnailActionButtons } from './thumbnail-generator/ThumbnailActionButtons';
import { ThumbnailBatchControls } from './thumbnail-generator/ThumbnailBatchControls';
import { ThumbnailErrorSummary } from './thumbnail-generator/ThumbnailErrorSummary';
import { ThumbnailProgressDisplay } from './thumbnail-generator/ThumbnailProgressDisplay';
import { ThumbnailStats } from './thumbnail-generator/ThumbnailStats';
import { useThumbnailGenerator } from './thumbnail-generator/useThumbnailGenerator';

export default function ThumbnailGenerator() {
  const {
    isProcessing,
    isProcessingAll,
    progress,
    hasError,
    errorSummary,
    detailProgress,
    successCount,
    failedCount,
    thumbnailStats,
    processingStartTime,
    batchSize,
    setBatchSize,
    handleGenerateThumbnails,
    handleCancel,
  } = useThumbnailGenerator();

  const totalProcessed = progress?.processedCount || 0;

  return (
    <div className="flex flex-col overflow-hidden gap-4 space-y-4">
      {!isProcessing && <ThumbnailStats thumbnailStats={thumbnailStats} />}

      {isProcessing && (
        <ThumbnailProgressDisplay
          isProcessingAll={isProcessingAll}
          progress={progress}
          batchSize={batchSize}
          totalProcessed={totalProcessed}
          successCount={successCount}
          failedCount={failedCount}
          detailProgress={detailProgress}
          processingStartTime={processingStartTime}
          hasError={hasError}
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
        thumbnailStats={thumbnailStats}
        batchSize={batchSize}
        onGenerateThumbnails={handleGenerateThumbnails}
        onCancel={handleCancel}
      />

      <ThumbnailErrorSummary
        failedCount={failedCount}
        errorSummary={errorSummary}
      />
    </div>
  );
}
