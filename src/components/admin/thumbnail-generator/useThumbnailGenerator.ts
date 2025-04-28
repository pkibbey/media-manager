'use client';

import { useCallback } from 'react';
import { getThumbnailStats } from '@/actions/thumbnails/get-thumbnail-stats';
import { streamThumbnails } from '@/actions/thumbnails/stream-thumbnails';
import { useProcessorBase } from '@/hooks/useProcessorBase';
import type { UnifiedProgress } from '@/types/progress-types';
import type { UnifiedStats } from '@/types/unified-stats';

export function useThumbnailGenerator() {
  // Define stream function generator
  const getStreamFunction = useCallback(
    (options: { batchSize: number; method?: string }) => {
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
    handleStartProcessing,
    handleCancel,
    refreshStats,
  } = useProcessorBase<UnifiedProgress, UnifiedStats>({
    fetchStats: async () => {
      const { data, error } = await getThumbnailStats();

      if (error || !data) {
        throw error;
      }

      return data;
    },
    getStreamFunction,
    defaultBatchSize: Number.POSITIVE_INFINITY,
    successMessage: {
      start: 'Starting thumbnail generation...',
      onBatchComplete: (processed: number): string =>
        `Batch complete: Generated ${processed} thumbnails`,
      onCompleteEach: (): string =>
        'Thumbnail generation completed successfully',
    },
  });

  // Handle thumbnail generation with option to process all
  const handleGenerateThumbnails = async (processAll = false) => {
    try {
      await handleStartProcessing(processAll);
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

    // Actions
    handleGenerateThumbnails,
    handleCancel,
    fetchStats: refreshStats,
  };
}
