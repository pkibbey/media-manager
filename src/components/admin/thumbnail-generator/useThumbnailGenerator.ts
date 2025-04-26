'use client';

import { useCallback, useState } from 'react';
import {
  countMissingThumbnails,
  getThumbnailStats,
} from '@/app/actions/thumbnails';
import { streamThumbnails } from '@/app/actions/thumbnails/streamThumbnails';
import { useProcessorBase } from '@/hooks/useProcessorBase';
import { BATCH_SIZE } from '@/lib/consts';
import type { UnifiedProgress } from '@/types/progress-types';
import type { UnifiedStats } from '@/types/unified-stats';

export type ThumbnailStats = {
  totalCompatibleFiles: number;
  filesWithThumbnails: number;
  filesPending: number;
} | null;

export function useThumbnailGenerator() {
  // Track if we're processing all items
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  // Track total processed items
  const [totalProcessed, setTotalProcessed] = useState(0);
  // Custom reference to stats to avoid circular reference
  const [thumbnailStatsRef, setThumbnailStatsRef] =
    useState<UnifiedStats | null>(null);
  // Track the actual total count of files to process
  const [totalCount, setTotalCount] = useState(0);

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
    errorSummary,
    batchSize,
    setBatchSize,
    processingStartTime,
    stats,
    refreshStats,
    handleStartProcessing,
    handleCancel,
  } = useProcessorBase<UnifiedProgress, UnifiedStats | null>({
    fetchStats: async () => {
      const result = await getThumbnailStats();
      if (result) setThumbnailStatsRef(result);
      return result;
    },
    getStreamFunction,
    defaultBatchSize: BATCH_SIZE,
    successMessage: {
      start: 'Starting thumbnail generation...',
      batchComplete: (processed: number): string =>
        `Batch complete: Generated ${processed} thumbnails`,
      allComplete: (): string => {
        const currentStats = thumbnailStatsRef;
        return `All processing complete! Generated ${currentStats?.counts.success} thumbnails (${currentStats?.counts.failed} failed)`;
      },
    },
  });

  // Handle thumbnail generation with the option to process all
  const handleGenerateThumbnails = async (processAll = false) => {
    try {
      setIsProcessingAll(processAll);
      setTotalProcessed(0);

      // Check if there are thumbnails to generate
      const totalToProcess = await countMissingThumbnails();

      // Set the total count for proper display
      setTotalCount(totalToProcess);

      if (totalToProcess === 0) {
        return;
      }

      // Start processing with the processAll flag
      await handleStartProcessing(processAll);
    } catch (error: any) {
      console.error('Error initiating thumbnail generation:', error);
    }
  };

  // Update total processed count when progress changes
  if (progress?.processedCount && progress.processedCount > totalProcessed) {
    setTotalProcessed(progress.processedCount);
  }

  // Ensure we have a valid total count for progress display
  const calculatedTotal = progress?.totalCount || totalCount || batchSize;

  // Return all needed values and functions
  return {
    isProcessing,
    isProcessingAll,
    progress: progress
      ? {
          ...progress,
          total: calculatedTotal,
          totalCount: calculatedTotal,
        }
      : null,
    errorSummary,
    stats: stats || thumbnailStatsRef,
    processingStartTime,
    batchSize,
    setBatchSize,
    totalProcessed,
    handleGenerateThumbnails,
    handleCancel,
    fetchThumbnailStats: refreshStats,
  };
}
