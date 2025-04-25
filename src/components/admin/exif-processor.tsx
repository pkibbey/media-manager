'use client';

import { useState } from 'react';
import type { ExtractionMethod } from '@/types/exif';
import { ExifActionButtons } from './exif-processor/ExifActionButtons';
import { ExifErrorSummary } from './exif-processor/ExifErrorSummary';
import { ExifProcessOptions } from './exif-processor/ExifProcessOptions';
import { ExifProgressDisplay } from './exif-processor/ExifProgressDisplay';
import { ExifStats } from './exif-processor/ExifStats';
import { useExifProcessor } from './exif-processor/useExifProcessor';

export default function ExifProcessor() {
  const [extractionMethod, setExtractionMethod] =
    useState<ExtractionMethod>('default');
  const {
    stats,
    isProcessing,
    progress,
    hasError,
    errorSummary,
    batchSize,
    setBatchSize,
    processingStartTime,
    handleProcess,
    handleCancel,
  } = useExifProcessor();

  return (
    <div className="overflow-hidden grid gap-4 space-y-4">
      {!isProcessing && <ExifStats stats={stats} />}

      <ExifProgressDisplay
        isProcessing={isProcessing}
        progress={progress}
        processingStartTime={processingStartTime}
        hasError={hasError}
      />

      {!isProcessing && (
        <ExifProcessOptions
          stats={stats}
          extractionMethod={extractionMethod}
          setExtractionMethod={setExtractionMethod}
          batchSize={batchSize}
          setBatchSize={setBatchSize}
          isProcessing={isProcessing}
        />
      )}

      <ExifActionButtons
        isProcessing={isProcessing}
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
