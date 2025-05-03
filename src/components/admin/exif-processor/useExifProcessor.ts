'use client';

import { useCallback } from 'react';
import { getExifStats } from '@/actions/exif/get-exif-stats';
import { streamExifData } from '@/actions/exif/streamExifData';
import { useProcessorBase } from '@/hooks/useProcessorBase';
import type { UnifiedProgress } from '@/types/progress-types';
import type { Method } from '@/types/unified-stats';
import type { UnifiedStats } from '@/types/unified-stats';

interface ExifProgress extends UnifiedProgress {
  method?: Method;
}

export function useExifProcessor() {
  // Define stream function generator with extraction method
  const getStreamFunction = useCallback(
    (options: { batchSize: number; method: Method }) => {
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
    defaultMethod: 'default' as Method,
    successMessage: {
      start: 'Starting EXIF processing...',
      onBatchComplete: (processed) =>
        `Batch complete: ${processed} files processed`,
    },
  });

  // Handle process method with the simplified interface
  const handleProcess = async () => {
    try {
      await handleStartProcessing({ processAll: false });
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
