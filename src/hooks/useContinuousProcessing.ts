import { useCallback, useRef, useState } from 'react';
import type { ThresholdType } from '@/types/analysis';

interface ProcessingOptions<T> {
  /**
   * The batch processing function that will be called repeatedly
   */
  processBatchFn: (batchSize: number, thresholds: ThresholdType) => Promise<T>;

  /**
   * Function to check if there are remaining items to process
   * Returns true if there are more items to process
   */
  hasRemainingItemsFn: () => boolean;

  /**
   * Optional callback function after each batch is processed
   */
  onBatchComplete?: (result: T) => Promise<void> | void;

  /**
   * Initial batch size
   */
  initialBatchSize?: number;

  /**
   * Function to get the total number of items remaining to process
   */
  getTotalRemainingItemsFn: () => Promise<number> | number;
}

interface ProcessingResult<T> {
  /**
   * Whether the processing was successful
   */
  success: boolean;

  /**
   * Optional error message if processing failed
   */
  error?: string;

  /**
   * Additional data returned by the processing function
   */
  data?: T;

  /**
   * Message to display to the user
   */
  message?: string;
}

export default function useContinuousProcessing<
  T = {
    success: boolean;
    processed: number;
    failed: number;
    total: number;
    error?: string;
    batchProcessingTime?: number; // Added to track batch processing time
  },
>({
  processBatchFn,
  hasRemainingItemsFn,
  onBatchComplete,
  initialBatchSize = 1,
  getTotalRemainingItemsFn,
}: ProcessingOptions<T>) {
  const [isContinuousProcessing, setIsContinuousProcessing] = useState(false);
  const [batchSize, setBatchSize] = useState<number>(initialBatchSize);
  const processingRef = useRef(false);
  const [totalProcessingTime, setTotalProcessingTime] = useState(0);
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState<number | null>(
    null,
  );
  const [itemsProcessedThisSession, setItemsProcessedThisSession] = useState(0);

  /**
   * Process a single batch
   */
  const processSingleBatch = useCallback(
    async (thresholds: ThresholdType): Promise<ProcessingResult<T>> => {
      try {
        const startTime = Date.now();
        console.log('startTime: ', startTime);
        const result = await processBatchFn(batchSize, thresholds);
        const endTime = Date.now();
        const currentBatchProcessingTime = endTime - startTime;

        // Update total processing time
        const newTotalProcessingTime =
          totalProcessingTime + currentBatchProcessingTime;
        setTotalProcessingTime(newTotalProcessingTime);

        // Calculate items in this batch
        let itemsInBatch = 0;
        if (result && typeof result === 'object' && 'processed' in result) {
          itemsInBatch = (result as any).processed || 0;
        }

        // Calculate the updated total count of processed items
        const updatedItemsProcessed = itemsProcessedThisSession + itemsInBatch;
        setItemsProcessedThisSession(updatedItemsProcessed);

        if (onBatchComplete) {
          await onBatchComplete(result);
        }

        // Estimate time left using the updated values instead of state values
        console.log('updatedItemsProcessed: ', updatedItemsProcessed);
        if (updatedItemsProcessed > 0) {
          const totalRemainingItems = await getTotalRemainingItemsFn();
          if (totalRemainingItems > 0) {
            // Calculate average time per batch instead of per item
            const averageTimePerBatch =
              newTotalProcessingTime /
              Math.ceil(updatedItemsProcessed / batchSize);
            // Calculate number of batches remaining
            const batchesRemaining = Math.ceil(totalRemainingItems / batchSize);
            // Estimate total time remaining
            setEstimatedTimeLeft(averageTimePerBatch * batchesRemaining);
          } else {
            setEstimatedTimeLeft(0);
          }
        }

        return {
          success: true,
          data: result,
          message: 'Batch processed successfully',
        };
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : 'An unknown error occurred',
        };
      }
    },
    [
      processBatchFn,
      batchSize,
      onBatchComplete,
      totalProcessingTime,
      getTotalRemainingItemsFn,
      itemsProcessedThisSession,
    ],
  );

  /**
   * Process all remaining items continuously
   */
  const processAllRemaining = useCallback(
    async (thresholds: ThresholdType): Promise<ProcessingResult<unknown>> => {
      try {
        setIsContinuousProcessing(true);
        processingRef.current = true;
        setItemsProcessedThisSession(0); // Reset for the new session
        setTotalProcessingTime(0); // Reset for the new session
        setEstimatedTimeLeft(null);

        let processedTotal = 0;
        const batchResults = [];
        let accumulatedProcessingTime = 0;
        let batchesProcessed = 0;

        while (hasRemainingItemsFn() && processingRef.current) {
          const batchStartTime = Date.now();
          const result = await processBatchFn(batchSize, thresholds);
          const batchEndTime = Date.now();
          const currentBatchProcessingTime = batchEndTime - batchStartTime;

          accumulatedProcessingTime += currentBatchProcessingTime;
          setTotalProcessingTime(accumulatedProcessingTime);
          batchesProcessed++;

          batchResults.push(result);

          // Calculate items processed in this batch
          let batchProcessed = 0;
          if (result && typeof result === 'object' && 'processed' in result) {
            batchProcessed = (result as any).processed || 0;
            processedTotal += batchProcessed;
          }

          // Update the running total of processed items
          const updatedItemsProcessed = processedTotal;
          setItemsProcessedThisSession(updatedItemsProcessed);

          // Estimate time left using the updated value directly
          if (getTotalRemainingItemsFn && batchesProcessed > 0) {
            const totalRemainingItems = await getTotalRemainingItemsFn();
            if (totalRemainingItems > 0) {
              // Calculate average time per batch
              const averageTimePerBatch =
                accumulatedProcessingTime / batchesProcessed;
              // Calculate number of batches remaining
              const batchesRemaining = Math.ceil(
                totalRemainingItems / batchSize,
              );
              // Estimate total time remaining
              setEstimatedTimeLeft(averageTimePerBatch * batchesRemaining);
            } else {
              setEstimatedTimeLeft(0);
            }
          }

          if (batchProcessed === 0) {
            break;
          }

          if (onBatchComplete) {
            await onBatchComplete(result);
          }
        }

        processingRef.current = false;
        setIsContinuousProcessing(false);

        return {
          success: true,
          message: `Successfully processed ${processedTotal} items`,
          data: batchResults,
        };
      } catch (e) {
        processingRef.current = false;
        setIsContinuousProcessing(false);
        return {
          success: false,
          error: e instanceof Error ? e.message : 'An unknown error occurred',
        };
      }
    },
    [
      processBatchFn,
      batchSize,
      hasRemainingItemsFn,
      onBatchComplete,
      getTotalRemainingItemsFn,
    ],
  );

  /**
   * Stop the continuous processing
   */
  const stopProcessing = useCallback(async (): Promise<
    ProcessingResult<null>
  > => {
    processingRef.current = false;
    setIsContinuousProcessing(false);
    return {
      success: true,
      message: 'Processing stopped',
    };
  }, []);

  return {
    isContinuousProcessing,
    processSingleBatch,
    processAllRemaining,
    stopProcessing,
    batchSize,
    setBatchSize,
    totalProcessingTime,
    estimatedTimeLeft,
    itemsProcessedThisSession,
  };
}
