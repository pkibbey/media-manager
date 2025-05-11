import { useCallback, useRef, useState } from 'react';

interface ProcessingOptions<T> {
  /**
   * The batch processing function that will be called repeatedly
   */
  processBatchFn: (batchSize: number) => Promise<T>;

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
  },
>({
  processBatchFn,
  hasRemainingItemsFn,
  onBatchComplete,
  initialBatchSize = 1,
}: ProcessingOptions<T>) {
  const [isContinuousProcessing, setIsContinuousProcessing] = useState(false);
  const [batchSize, setBatchSize] = useState<number>(initialBatchSize);
  const processingRef = useRef(false);

  /**
   * Process a single batch
   */
  const processSingleBatch = useCallback(async (): Promise<
    ProcessingResult<T>
  > => {
    try {
      const result = await processBatchFn(batchSize);

      if (onBatchComplete) {
        await onBatchComplete(result);
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
  }, [processBatchFn, batchSize, onBatchComplete]);

  /**
   * Process all remaining items continuously
   */
  const processAllRemaining = useCallback(async (): Promise<
    ProcessingResult<unknown>
  > => {
    try {
      setIsContinuousProcessing(true);
      processingRef.current = true;

      let processedTotal = 0;
      const batchResults = [];

      while (hasRemainingItemsFn() && processingRef.current) {
        const result = await processBatchFn(batchSize);
        batchResults.push(result);

        // Calculate items processed in this batch
        let batchProcessed = 0;
        // Update processed count (assuming the result has a processed property)
        if (result && typeof result === 'object' && 'processed' in result) {
          batchProcessed = (result as any).processed || 0;
          processedTotal += batchProcessed;
        } else {
          batchProcessed = 1; // Default to incrementing by 1
          processedTotal += 1;
        }

        // Break out of the loop if no items were processed in this batch
        // This helps prevent infinite loops if hasRemainingItemsFn() is not accurate
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
  }, [processBatchFn, batchSize, hasRemainingItemsFn, onBatchComplete]);

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
  };
}
