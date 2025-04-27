'use client';

import { useCallback } from 'react';
import { getExifStats } from '@/app/actions/exif/get-exif-stats';
import { streamExifData } from '@/app/actions/exif/streamExifData';
import { useProcessorBase } from '@/hooks/useProcessorBase';
import type { ExtractionMethod } from '@/types/exif';
import type { UnifiedProgress } from '@/types/progress-types';
import type { UnifiedStats } from '@/types/unified-stats';

interface ExifProgress extends UnifiedProgress {
  method?: ExtractionMethod;
}

export function useExifProcessor() {
  // Define stream function generator with extraction method
  const getStreamFunction = useCallback(
    (options: { batchSize: number; method: string }) => {
      return () => {
        return streamExifData({
          extractionMethod: options.method as ExtractionMethod,
          batchSize: options.batchSize,
        });
      };
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
    fetchStats: async () => {
      try {
        const result = await getExifStats();
        return result;
      } catch (error) {
        console.error('[EXIF DEBUG] Error fetching stats:', error);
        throw error;
      }
    },
    getStreamFunction,
    defaultBatchSize: Number.POSITIVE_INFINITY,
    defaultMethod: 'default',
    successMessage: {
      start: 'Starting EXIF processing...',
      onBatchComplete: (processed) =>
        `Batch complete: ${processed} files processed`,
    },
  });

  // Handle process method with the simplified interface
  const handleProcess = async () => {
    try {
      await handleStartProcessing(false);
    } catch (error) {
      console.error('[EXIF DEBUG] Error in handleProcess:', error);
    }
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
