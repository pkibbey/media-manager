import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { UnifiedProgress } from '@/types/progress-types';
import { useStreamProcessing } from './useStreamProcessing';

export type ProcessorOptions<TStats> = {
  /**
   * Function to fetch initial stats for the processor
   */
  fetchStats: () => Promise<TStats>;

  /**
   * Function that returns a stream function to process items
   */
  getStreamFunction: (options: {
    batchSize: number;
    method: string;
  }) => () => Promise<ReadableStream>;

  /**
   * Default batch size for processing
   */
  defaultBatchSize?: number;

  /**
   * Default processing method
   */
  defaultMethod?: string;

  /**
   * Success messages to display during processing
   */
  successMessage?: {
    start?: string;
    onBatchComplete?: (processed: number) => string;
    onCompleteEach?: () => string;
  };
};

/**
 * A base hook for all processor components (EXIF, thumbnails, timestamp correction)
 * providing common functionality for streaming processing operations
 */
export function useProcessorBase<TProgress extends UnifiedProgress, TStats>({
  fetchStats,
  getStreamFunction,
  defaultBatchSize = 100,
  defaultMethod = 'default',
  successMessage = {
    start: 'Starting processing...',
    // onBatchComplete: (processed) => `Processed ${processed} items`,
    // onCompleteEach: () => 'Processing completed',
  },
}: ProcessorOptions<TStats>) {
  // State management
  const [batchSize, setBatchSize] = useState(defaultBatchSize);
  const [method, setMethod] = useState(defaultMethod);
  const [stats, setStats] = useState<TStats | null>(null);
  const [processingStartTime, setProcessingStartTime] = useState<
    number | undefined
  >(undefined);
  const [hasError, setHasError] = useState(false);
  const [errorSummary, setErrorSummary] = useState<string[]>([]);

  // Setup streaming processor
  const {
    isProcessing,
    progress,
    startProcessing: startStream,
    stopProcessing: stopStream,
  } = useStreamProcessing<TProgress>();

  // Load stats on mount and after processing
  useEffect(() => {
    if (!isProcessing) {
      refreshStats();
    }
  }, [isProcessing]);

  // Refresh stats function
  const refreshStats = useCallback(async () => {
    try {
      const stats = await fetchStats();
      setStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to fetch processing stats');
    }
  }, [fetchStats]);

  // Start processing handler
  const handleStartProcessing = useCallback(
    async (processAll = false) => {
      try {
        setHasError(false);
        setErrorSummary([]);
        setProcessingStartTime(Date.now());

        // Display start message
        toast.info(successMessage.start || 'Starting processing...');

        // Get stream function with current settings
        const actualBatchSize = processAll
          ? Number.POSITIVE_INFINITY
          : batchSize;
        const streamFn = getStreamFunction({
          batchSize: actualBatchSize,
          method,
        });

        // Start streaming process
        await startStream(streamFn, {
          onCompleted: () => {
            // When complete, show success message
            if (successMessage.onCompleteEach) {
              toast.success(successMessage.onCompleteEach());
            }

            // Refresh stats after completion
            refreshStats();
          },
          onError: (error, errorDetails) => {
            console.error('Processing error:', error, errorDetails);
            setHasError(true);

            if (errorDetails && Array.isArray(errorDetails)) {
              setErrorSummary(errorDetails);
            } else if (typeof error === 'string') {
              setErrorSummary([error]);
            } else if (error instanceof Error) {
              setErrorSummary([error.message]);
            }

            toast.error('Error during processing. Check console for details.');
          },
          onBatchComplete: (processedCount) => {
            if (successMessage.onBatchComplete) {
              toast.success(successMessage.onBatchComplete(processedCount));
            }
          },
        });
      } catch (error) {
        console.error('Failed to start processing:', error);
        toast.error('Failed to start processing');
        setProcessingStartTime(undefined);
      }
    },
    [
      refreshStats,
      batchSize,
      method,
      startStream,
      getStreamFunction,
      successMessage,
    ],
  );

  // Cancel processing handler
  const handleCancel = useCallback(() => {
    stopStream();
    setProcessingStartTime(undefined);
    toast.info('Processing cancelled');
  }, [stopStream]);

  return {
    // State
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

    // Actions
    refreshStats,
    handleStartProcessing,
    handleCancel,
  };
}
