'use client';

import { useState } from 'react';
import type { ExtractionMethod } from '@/types/exif';
import { UnifiedProgressDisplay } from '../ui/unified-progress-display';
import { UnifiedStatsDisplay } from '../ui/unified-stats-display';
import { ExifActionButtons } from './exif-processor/ExifActionButtons';
import { ExifErrorSummary } from './exif-processor/ExifErrorSummary';
import { ExifProcessOptions } from './exif-processor/ExifProcessOptions';
import { useExifProcessor } from './exif-processor/useExifProcessor';
export default function ExifProcessor() {
  const [extractionMethod, setExtractionMethod] =
    useState<ExtractionMethod>('default');
  const {
    stats,
    isProcessing,
    progress,
    errorSummary,
    batchSize,
    setBatchSize,
    processingStartTime,
    handleProcess,
    handleCancel,
  } = useExifProcessor();

  return (
    <div className="overflow-hidden grid gap-4 space-y-4">
      {!isProcessing && (
        <UnifiedStatsDisplay
          stats={stats}
          title="Exif Processor"
          description="Process EXIF data for image files and store them in Supabase Storage. This helps improve performance by pre-processing EXIF data instead of creating it on-demand."
          labels={{
            success: 'files with exif',
            pending: 'files need processing',
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
          title="Generating Thumbnails"
          itemsLabel={progress?.metadata?.fileType || 'files'}
          rateUnit="thumbnails/sec"
        />
      )}

      {!isProcessing && (
        <ExifProcessOptions
          progress={progress}
          extractionMethod={extractionMethod}
          setExtractionMethod={setExtractionMethod}
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
        extractionMethod={extractionMethod}
        handleProcess={handleProcess}
        handleCancel={handleCancel}
      />

      <ExifErrorSummary progress={progress} errorSummary={errorSummary} />
    </div>
  );
}
