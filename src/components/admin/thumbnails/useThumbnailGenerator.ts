'use client';

import { useCallback } from 'react';
import { getThumbnailStats } from '@/actions/thumbnails/get-thumbnail-stats';
import { streamThumbnails } from '@/actions/thumbnails/streamThumbnails';
import { useProcessorBase } from '@/hooks/useProcessorBase';
import type { UnifiedProgress } from '@/types/progress-types';
import type { Method, UnifiedStats } from '@/types/unified-stats';

// Extend progress to include method
interface ThumbnailProgress extends UnifiedProgress {
  method?: Method;
}

export function useThumbnailGenerator() {
  // Define stream function generator
  const getStreamFunction = useCallback(
    (options: { batchSize: number; method?: Method }) => {
      return () => streamThumbnails(options);
    },
    [],
  );

  // Use the processor base hook
  const {
    isProcessing,
    progress,
    hasError,
    errorSummary,
    batchSize,
    setBatchSize,
    processingStartTime,
    stats,
    method,
    setMethod,
    handleStartProcessing,
    handleCancel,
    refreshStats,
  } = useProcessorBase<ThumbnailProgress, UnifiedStats>({
    fetchStats: async () => {
      const { data, error } = await getThumbnailStats();

      if (error || !data) {
        throw error;
      }

      return data;
    },
    getStreamFunction,
    defaultBatchSize: Number.POSITIVE_INFINITY,
    defaultMethod: 'default' as Method,
  });

  // Handle thumbnail generation with option to process all
  const handleGenerateThumbnails = async ({ processAll = false }) => {
    try {
      await handleStartProcessing({ processAll });
    } catch (error) {
      console.error(
        '[Thumbnail Generator] Error initiating thumbnail generation:',
        error,
      );
    }
  };

  return {
    // State
    stats,
    isProcessing,
    progress,
    hasError,
    errorSummary,
    batchSize,
    setBatchSize,
    processingStartTime,
    method,
    setMethod,

    // Actions
    handleGenerateThumbnails,
    handleCancel,
    fetchStats: refreshStats,
  };
}
