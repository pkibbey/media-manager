'use client';

import { ExifActionButtons } from './exif-processor/ExifActionButtons';
import { ExifErrorSummary } from './exif-processor/ExifErrorSummary';
import { ExifProcessOptions } from './exif-processor/ExifProcessOptions';
import { ExifProgressDisplay } from './exif-processor/ExifProgressDisplay';
import { ExifStats } from './exif-processor/ExifStats';
import { useExifProcessor } from './exif-processor/useExifProcessor';

export default function ExifProcessor() {
  const {
    stats,
    isStreaming,
    progress,
    hasError,
    errorSummary,
    extractionMethod,
    setExtractionMethod,
    batchSize,
    setBatchSize,
    processingStartTime,
    totalProcessed,
    totalUnprocessed,
    processedPercentage,
    streamingProgressPercentage,
    handleProcess,
    handleCancel,
  } = useExifProcessor();

  return (
    <div className="overflow-hidden grid gap-4 space-y-4">
      {!isStreaming && (
        <ExifStats
          stats={stats}
          totalProcessed={totalProcessed}
          totalUnprocessed={totalUnprocessed}
          processedPercentage={processedPercentage}
        />
      )}

      <ExifProgressDisplay
        isStreaming={isStreaming}
        progress={progress}
        streamingProgressPercentage={streamingProgressPercentage}
        processingStartTime={processingStartTime}
        hasError={hasError}
      />

      {!isStreaming && (
        <ExifProcessOptions
          extractionMethod={extractionMethod}
          setExtractionMethod={setExtractionMethod}
          batchSize={batchSize}
          setBatchSize={setBatchSize}
          isStreaming={isStreaming}
          totalUnprocessed={totalUnprocessed}
        />
      )}

      <ExifActionButtons
        isStreaming={isStreaming}
        totalUnprocessed={totalUnprocessed}
        stats={stats}
        batchSize={batchSize}
        extractionMethod={extractionMethod}
        handleProcess={handleProcess}
        handleCancel={handleCancel}
      />

      <ExifErrorSummary progress={progress} errorSummary={errorSummary} />
    </div>
  );
}
