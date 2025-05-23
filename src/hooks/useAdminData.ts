import { useCallback, useEffect, useState } from 'react';
import useContinuousProcessing from './useContinuousProcessing';

// Standard interfaces for admin processing
export interface ProcessingStats {
  total: number;
  processed: number;
  remaining: number;
  percentComplete: number;
}

export interface BatchResult {
  success: boolean;
  processed: number;
  failed: number;
  total: number;
  error?: string;
  message?: string;
  batchProcessingTime?: number;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
  count?: number;
  message?: string;
}

export interface AdminDataResponse<T> {
  stats: T;
  error?: string;
}

// Enhanced useAdminData props for full admin page functionality
interface UseAdminDataProps<T extends ProcessingStats> {
  fetchFunction: () => Promise<AdminDataResponse<T>>;
  processFunction: (batchSize: number) => Promise<BatchResult>;
  deleteFunction?: () => Promise<DeleteResult>;
  defaultValue?: T;
  initialBatchSize?: number;
}

export function useAdminData<T extends ProcessingStats>({
  fetchFunction,
  processFunction,
  deleteFunction,
  defaultValue,
  initialBatchSize = 8,
}: UseAdminDataProps<T>) {
  const [data, setData] = useState<T | null>(defaultValue || null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchFunction();

      if (response.stats) {
        setData(response.stats);
      } else if (response.error) {
        setError(response.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [fetchFunction]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh function for internal use
  const refresh = useCallback(async () => {
    try {
      const response = await fetchFunction();

      if (response.stats) {
        setData(response.stats);
      } else if (response.error) {
        setError(response.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh data');
    }
  }, [fetchFunction]);

  // Enhanced batch processing function that automatically refreshes stats
  const processBatchFunction = useCallback(
    async (size: number) => {
      const result = await processFunction(size);
      await refresh();
      return result;
    },
    [processFunction, refresh],
  );

  // Manual batch processing with error handling
  const processBatch = useCallback(
    async (batchSize: number) => {
      try {
        const result = await processFunction(batchSize);

        if (result.success) {
          await refresh();
          return {
            success: true,
            message: `Processed ${result.processed} items (${result.failed || 0} failed)`,
          };
        }

        return { success: false, error: result.error };
      } catch (e) {
        return {
          success: false,
          error:
            e instanceof Error ? e.message : 'Unknown error processing batch',
        };
      }
    },
    [processFunction, refresh],
  );

  // Reset/delete data function with optimistic updates
  const resetData = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }> => {
    if (!deleteFunction) {
      return { success: false, error: 'Delete function not provided' };
    }

    try {
      const result = await deleteFunction();

      if (result.error) {
        return { success: false, error: result.error };
      }

      // Optimistic update: adjust stats based on deleted count
      if (result.count && data) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            total: prev.total - result.count!,
            processed: prev.processed - result.count!,
            remaining: prev.remaining + result.count!,
          } as T;
        });
      }

      // Refresh stats after resetting
      await refresh();

      return {
        success: true,
        message: result.message || `Reset ${result.count || 0} items`,
      };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';

      return { success: false, error: errorMessage };
    }
  }, [deleteFunction, data, refresh]);

  // Handle batch completion for continuous processing
  const handleBatchComplete = useCallback(async () => {
    await refresh();
  }, [refresh]);

  // Set up continuous processing integration
  const continuousProcessing = useContinuousProcessing({
    processBatchFn: processBatchFunction,
    onBatchComplete: handleBatchComplete,
    initialBatchSize,
    getTotalRemainingItemsFn: () => data?.remaining || 0,
  });

  return {
    // Original data management
    data,
    setData,
    isLoading,
    error,
    setError,
    refresh,

    // Enhanced batch processing
    processBatch: (batchSize: number = continuousProcessing.batchSize) =>
      processBatch(batchSize),
    resetData: deleteFunction ? resetData : undefined,

    // Continuous processing integration
    ...continuousProcessing,
  };
}
