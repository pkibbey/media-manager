'use client';

import { useCallback } from 'react';
import { getExifStats } from '@/actions/exif/get-exif-stats';
import { streamExifData } from '@/actions/exif/streamExifData';
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
    (options: { batchSize: number; method: ExtractionMethod }) => {
      return () => {
        return streamExifData(options);
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
    method,
    setMethod,
    batchSize,
    setBatchSize,
    processingStartTime,
    stats,
    refreshStats: fetchStats,
    handleStartProcessing,
    handleCancel,
  } = useProcessorBase<ExifProgress, UnifiedStats>({
    fetchStats: async () => {
      const { data, error } = await getExifStats();

      if (!data || error) {
        console.error('[EXIF DEBUG] Error fetching stats:', error);
        throw error;
      }

      return data;
    },
    getStreamFunction,
    defaultBatchSize: Number.POSITIVE_INFINITY,
    defaultMethod: 'default' as ExtractionMethod,
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
    method,
    setMethod,
    batchSize,
    setBatchSize,
    processingStartTime,

    // Actions
    handleProcess,
    handleCancel,
    fetchStats,
  };
}
