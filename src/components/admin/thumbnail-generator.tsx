'use client';

import { ThumbnailActionButtons } from './thumbnail-generator/ThumbnailActionButtons';
import { ThumbnailBatchControls } from './thumbnail-generator/ThumbnailBatchControls';
import { ThumbnailErrorSummary } from './thumbnail-generator/ThumbnailErrorSummary';
import { ThumbnailProgressDisplay } from './thumbnail-generator/ThumbnailProgressDisplay';
import { ThumbnailStats } from './thumbnail-generator/ThumbnailStats';
import { useThumbnailGenerator } from './thumbnail-generator/useThumbnailGenerator';

export default function ThumbnailGenerator() {
  const {
    isGenerating,
    isProcessingAll,
    progress,
    total,
    processed,
    hasError,
    errorSummary,
    detailProgress,
    successCount,
    failedCount,
    thumbnailStats,
    processingStartTime,
    batchSize,
    setBatchSize,
    totalProcessed,
    handleGenerateThumbnails,
    handleCancel,
  } = useThumbnailGenerator();

  return (
    <div className="flex flex-col overflow-hidden gap-4 space-y-4">
      {!isGenerating && <ThumbnailStats thumbnailStats={thumbnailStats} />}

      {isGenerating && (
        <ThumbnailProgressDisplay
          isProcessingAll={isProcessingAll}
          progress={progress}
          processed={processed}
          total={total} // this total is incorrect
          batchSize={batchSize}
          totalProcessed={totalProcessed}
          successCount={successCount}
          failedCount={failedCount}
          detailProgress={detailProgress}
          processingStartTime={processingStartTime}
          hasError={hasError}
        />
      )}

      {!isGenerating && (
        <ThumbnailBatchControls
          batchSize={batchSize}
          setBatchSize={setBatchSize}
          isGenerating={isGenerating}
        />
      )}

      <ThumbnailActionButtons
        isGenerating={isGenerating}
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
