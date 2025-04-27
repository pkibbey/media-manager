'use client';

import { useCallback } from 'react';
import { getExifStats } from '@/app/actions/exif/get-exif-stats';
import { streamExifData } from '@/app/actions/exif/streamExifData';
import { useProcessorBase } from '@/hooks/useProcessorBase';
import { BATCH_SIZE } from '@/lib/consts';
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
      console.log(
        '[EXIF DEBUG] Creating stream function with options:',
        options,
      );
      return () => {
        console.log(
          '[EXIF DEBUG] Stream function called with method:',
          options.method,
          'batchSize:',
          options.batchSize,
        );
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
      console.log('[EXIF DEBUG] Fetching EXIF stats');
      try {
        const result = await getExifStats();
        console.log('[EXIF DEBUG] Stats fetched successfully:', result);
        return result;
      } catch (error) {
        console.error('[EXIF DEBUG] Error fetching stats:', error);
        throw error;
      }
    },
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
    console.log(
      '[EXIF DEBUG] handleProcess called with batchSize:',
      batchSize,
      'method:',
      extractionMethod,
    );
    try {
      await handleStartProcessing(false);
      console.log('[EXIF DEBUG] handleStartProcessing completed');
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
