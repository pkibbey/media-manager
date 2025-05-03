import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BATCH_SIZE } from '@/lib/consts';
import type { UnifiedProgress } from '@/types/progress-types';
import type { Method } from '@/types/unified-stats';
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
    method: Method;
  }) => () => Promise<ReadableStream>;

  /**
   * Default batch size for processing
   */
  defaultBatchSize?: number;

  /**
   * Default processing method
   */
  defaultMethod?: Method;

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
 * A base hook for all processor components (EXIF, thumbnails, etc.)
 * providing common functionality for streaming processing operations
 */
export function useProcessorBase<TProgress extends UnifiedProgress, TStats>({
  fetchStats,
  getStreamFunction,
  defaultBatchSize = BATCH_SIZE,
  defaultMethod = 'default' as Method,
  successMessage = {
    start: 'Starting processing...',
    // onBatchComplete: (processed) => `Processed ${processed} items`,
    // onCompleteEach: () => 'Processing completed',
  },
}: ProcessorOptions<TStats>) {
  // State management
  const [batchSize, setBatchSize] = useState(defaultBatchSize);
  const [method, setMethod] = useState<Method>(defaultMethod);
  const [stats, setStats] = useState<TStats>({
    counts: {
      total: 0,
      success: 0,
      failed: 0,
    },
    progress: {
      current: 0,
      total: 0,
    },
  } as TStats);
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

  // Refresh stats function
  const refreshStats = useCallback(async () => {
    try {
      const stats = await fetchStats();
      setStats(stats);
    } catch (error) {
      console.error('[PROCESSOR DEBUG] Error fetching stats:', error);

      // Provide more details about the error
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error occurred while fetching stats';

      toast.error(`Failed to fetch processing stats: ${errorMessage}`);

      // Optionally update stats with error state
      setStats(
        (prev) =>
          ({
            ...prev,
            status: 'failure',
            message: errorMessage,
          }) as TStats,
      );
    }
  }, [fetchStats]);

  // Fetch initial stats on mount - without dependency on refreshStats
  // biome-ignore lint/correctness/useExhaustiveDependencies: This is a one-time fetch
  useEffect(() => {
    const fetchInitialStats = async () => {
      try {
        const initialStats = await fetchStats();
        setStats(initialStats);
      } catch (error) {
        console.error(
          '[PROCESSOR DEBUG] Error during initial stats fetch:',
          error,
        );

        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Unknown error occurred during initial stats load';

        toast.error(`Failed to load initial stats: ${errorMessage}`);

        // Set an error state in stats
        setStats({
          status: 'failure',
          message: 'Failed to load initial stats',
          counts: {
            total: 0,
            success: 0,
            failed: 0,
          },
        } as unknown as TStats);
      }
    };

    fetchInitialStats();
  }, []);

  // Refresh stats when processing completes
  const [wasProcessing, setWasProcessing] = useState(false);

  useEffect(() => {
    if (isProcessing) {
      setWasProcessing(true);
    } else if (wasProcessing) {
      // Only refresh stats when transitioning from processing to not processing
      refreshStats();
      setWasProcessing(false);
    }
  }, [isProcessing, refreshStats, wasProcessing]);

  // Start processing handler
  const handleStartProcessing = useCallback(
    async ({ processAll = false }) => {
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
            console.error(
              '[PROCESSOR DEBUG] Stream processing error:',
              error,
              'details:',
              errorDetails,
            );
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
        console.error('[PROCESSOR DEBUG] Failed to start processing:', error);
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
