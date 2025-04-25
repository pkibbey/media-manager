import { useCallback } from 'react';
import {
  getExifStats,
  streamProcessUnprocessedItems,
} from '@/app/actions/exif';
import { useProcessorBase } from '@/hooks/useProcessorBase';
import { BATCH_SIZE } from '@/lib/consts';
import type { ExifStatsResult } from '@/types/db-types';
import type { ExtractionMethod } from '@/types/exif';
import type { UnifiedProgress } from '@/types/progress-types';

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
        streamProcessUnprocessedItems({
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
  } = useProcessorBase<ExifProgress, ExifStatsResult>({
    fetchStats: async () => {
      try {
        const response = await getExifStats();
        if (response.success && response.stats) {
          return response.stats;
        }
        console.error(
          'Failed to fetch EXIF stats:',
          response.message || 'Unknown error',
        );
        return {
          with_exif: 0,
          with_errors: 0,
          total: 0,
          skipped: 0,
        };
      } catch (error) {
        console.error('Exception when fetching EXIF stats:', error);
        return {
          with_exif: 0,
          with_errors: 0,
          total: 0,
          skipped: 0,
        };
      }
    },
    getStreamFunction,
    defaultBatchSize: BATCH_SIZE,
    defaultMethod: 'default',
    successMessage: {
      start: 'Starting EXIF processing...',
      batchComplete: (processed) =>
        `Batch complete: ${processed} files processed`,
      allComplete: () => 'EXIF processing completed successfully',
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
