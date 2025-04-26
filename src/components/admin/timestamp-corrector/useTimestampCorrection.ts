'use client';

import { useCallback } from 'react';
import { getMediaStats } from '@/app/actions/stats';
import { useProcessorBase } from '@/hooks/useProcessorBase';
import type { UnifiedProgress } from '@/types/progress-types';
import type { UnifiedStats } from '@/types/unified-stats';
import { updateMediaDatesFromFilenames } from './updateMediaDatesFromFilenames';

/**
 * Hook for handling timestamp correction operations
 */
export function useTimestampCorrection() {
  // Use the common processor base hook with timestamp correction specifics
  const {
    stats,
    isProcessing,
    progress,
    processingStartTime,
    handleStartProcessing,
    handleCancel: handleStopProcessing,
  } = useProcessorBase<UnifiedProgress, UnifiedStats | undefined>({
    // Initialize with the initial value and fetch updated stats
    fetchStats: async () => {
      try {
        const data = await getMediaStats();
        return data;
      } catch (error) {
        console.error('Error fetching timestamp correction stats:', error);
        return undefined;
      }
    },

    // Return the function to process timestamps
    getStreamFunction: ({ batchSize }) => {
      return async () => {
        const result = await updateMediaDatesFromFilenames({
          itemCount: batchSize,
          updateAll: batchSize === Number.POSITIVE_INFINITY,
        });

        // For compatibility with the stream processing hooks,
        // we convert the one-time response to a simple stream
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        if (result.success) {
          // Success case - write a progress update and complete
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({
                status: 'success',
                message: `Updated ${result.updated} timestamps successfully`,
                processedCount: result.processed,
                successCount: result.updated,
                failureCount: result.processed - result.updated,
                percentComplete:
                  result.processed > 0
                    ? Math.round((result.updated / result.processed) * 100)
                    : 0,
              })}\n\n`,
            ),
          );
        } else {
          // Error case
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({
                status: 'error',
                message: result.error || 'Failed to update timestamps',
                error: result.error,
              })}\n\n`,
            ),
          );
        }

        // Close the stream
        if (!writer.closed) {
          await writer.close();
        }
        return readable;
      };
    },

    // Default batch size
    defaultBatchSize: 500,

    // Success messages
    successMessage: {
      start: 'Starting timestamp correction...',
      batchComplete: (processed) =>
        `Updated ${processed} timestamps successfully`,
      allComplete: () => 'Timestamp correction completed successfully',
    },
  });

  /**
   * Handle updating timestamps
   */
  const handleUpdateTimestamps = useCallback(async () => {
    if (isProcessing) return;
    await handleStartProcessing(false);
  }, [isProcessing, handleStartProcessing]);

  return {
    stats: stats || null,
    isProcessing,
    progress,
    processingStartTime,
    handleStopProcessing,
    handleUpdateTimestamps,
  };
}
