import { useCallback, useRef, useState } from 'react';

type BatchResult = {
  success: boolean;
  processed: number;
  failed: number;
  total: number;
  error?: string;
  batchProcessingTime?: number;
};

type ProcessingResult = {
  success: boolean;
  error?: string;
  data?: BatchResult[]; // Array of batch results for continuous
  message?: string;
};

interface ProcessingOptions {
  processBatchFn: (batchSize: number) => Promise<BatchResult>;
  onBatchComplete?: (result: BatchResult) => Promise<void> | void;
  initialBatchSize?: number;
  getTotalRemainingItemsFn: () => Promise<number> | number;
}

export default function useContinuousProcessing({
  processBatchFn,
  onBatchComplete,
  initialBatchSize = 8,
  getTotalRemainingItemsFn,
}: ProcessingOptions) {
  const [isContinuousProcessing, setIsContinuousProcessing] = useState(false);
  const [batchSize, setBatchSize] = useState<number>(initialBatchSize);
  const processingRef = useRef(false);
  const [totalProcessingTime, setTotalProcessingTime] = useState(0);
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState<number | null>(
    null,
  );
  const [itemsProcessedThisSession, setItemsProcessedThisSession] = useState(0);

  const processSingleBatch =
    useCallback(async (): Promise<ProcessingResult> => {
      try {
        const startTime = Date.now();
        const result = await processBatchFn(batchSize);
        const endTime = Date.now();
        setTotalProcessingTime((t) => t + (endTime - startTime));
        setItemsProcessedThisSession((n) => n + (result.processed || 0));

        if (onBatchComplete) await onBatchComplete(result);

        // Estimate time left
        const totalRemainingItems = await getTotalRemainingItemsFn();
        if (totalRemainingItems > 0 && result.processed > 0) {
          const avgTimePerBatch = endTime - startTime;
          const batchesRemaining = Math.ceil(totalRemainingItems / batchSize);
          setEstimatedTimeLeft(avgTimePerBatch * batchesRemaining);
        } else {
          setEstimatedTimeLeft(0);
        }

        return {
          success: true,
          data: [result],
          message: 'Batch processed successfully',
        };
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        };
      }
    }, [processBatchFn, batchSize, onBatchComplete, getTotalRemainingItemsFn]);

  const processAllRemaining =
    useCallback(async (): Promise<ProcessingResult> => {
      setIsContinuousProcessing(true);
      processingRef.current = true;
      setItemsProcessedThisSession(0);
      setTotalProcessingTime(0);
      setEstimatedTimeLeft(null);

      let processedTotal = 0;
      const batchResults: BatchResult[] = [];
      let accumulatedProcessingTime = 0;
      let batchesProcessed = 0;

      while (processingRef.current) {
        const batchStartTime = Date.now();
        const result = await processBatchFn(batchSize);
        const batchEndTime = Date.now();

        batchesProcessed++;
        accumulatedProcessingTime += batchEndTime - batchStartTime;
        setTotalProcessingTime(accumulatedProcessingTime);

        batchResults.push(result);

        processedTotal += result.processed || 0;
        setItemsProcessedThisSession(processedTotal);

        // Estimate time left
        const totalRemainingItems = await getTotalRemainingItemsFn();
        if (totalRemainingItems > 0 && result.processed > 0) {
          const avgTimePerBatch = accumulatedProcessingTime / batchesProcessed;
          const batchesRemaining = Math.ceil(totalRemainingItems / batchSize);
          setEstimatedTimeLeft(avgTimePerBatch * batchesRemaining);
        } else {
          setEstimatedTimeLeft(0);
        }

        if (onBatchComplete) await onBatchComplete(result);

        if (!result.processed) break;
      }

      processingRef.current = false;
      setIsContinuousProcessing(false);

      return {
        success: true,
        message: `Successfully processed ${processedTotal} items`,
        data: batchResults,
      };
    }, [processBatchFn, batchSize, getTotalRemainingItemsFn, onBatchComplete]);

  const stopProcessing = useCallback(async (): Promise<ProcessingResult> => {
    processingRef.current = false;
    setIsContinuousProcessing(false);
    return { success: true, message: 'Processing stopped' };
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
