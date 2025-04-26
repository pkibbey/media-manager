'use client';

import { useCallback } from 'react';
import { getExifStats } from '@/app/actions/exif';
import { streamExifData } from '@/app/actions/exif/streamExifData';
import { useProcessorBase } from '@/hooks/useProcessorBase';
import { BATCH_SIZE } from '@/lib/consts';
import type { ExtractionMethod } from '@/types/exif';
import type { UnifiedProgress } from '@/types/progress-types';
import type { UnifiedStats } from '@/types/unified-stats';

// Define the EXIF-specific progress type extending UnifiedProgress
export interface ExifProgress extends UnifiedProgress {
  // Additional EXIF-specific fields
  method?: ExtractionMethod;
}

export function useExifProcessor() {
  // Define stream function generator with extraction method
  const getStreamFunction = useCallback(
    (options: { batchSize: number; method: string }) => {
      return () =>
        streamExifData({
          extractionMethod: options.method as ExtractionMethod,
          batchSize: options.batchSize,
        });
    },
    [],
  );

  // Use the processor base hook
  const {
    isProcessing,
    progress,
    hasError,
    errorSummary,
    method: extractionMethod,
    setMethod: setExtractionMethod,
    batchSize,
    setBatchSize,
    processingStartTime,
    stats,
    refreshStats: fetchStats,
    handleStartProcessing,
    handleCancel,
  } = useProcessorBase<ExifProgress, UnifiedStats>({
    fetchStats: getExifStats,
    getStreamFunction,
    defaultBatchSize: BATCH_SIZE,
    defaultMethod: 'default',
    successMessage: {
      start: 'Starting EXIF processing...',
      onBatchComplete: (processed) =>
        `Batch complete: ${processed} files processed`,
    },
  });

  // Handle process method with the simplified interface
  const handleProcess = async () => {
    await handleStartProcessing(false);
  };

  return {
    // State
    stats,
    isProcessing,
    progress,
    hasError,
    errorSummary,
    extractionMethod,
    setExtractionMethod,
    batchSize,
    setBatchSize,
    processingStartTime,

    // Actions
    handleProcess,
    handleCancel,
    fetchStats,
  };
}
