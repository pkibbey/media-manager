import {
  countMissingThumbnails,
  getThumbnailStats,
  streamUnprocessedThumbnails,
} from '@/app/actions/thumbnails';
import { categorizeError } from '@/lib/errors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export type ThumbnailProgress = {
  status: 'processing' | 'completed' | 'error';
  message: string;
  currentFilePath?: string;
  fileType?: string;
  error?: string;
};

export type ErrorSummary = {
  [errorType: string]: {
    count: number;
    examples: string[];
  };
};

export type ThumbnailStats = {
  totalCompatibleFiles: number;
  filesWithThumbnails: number;
  filesPending: number;
  skippedLargeFiles: number;
} | null;

export function useThumbnailGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [skipLargeFiles, setSkipLargeFiles] = useState(true);
  const [largeFilesSkipped, setLargeFilesSkipped] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errorSummary, setErrorSummary] = useState<ErrorSummary>({});
  const [detailProgress, setDetailProgress] =
    useState<ThumbnailProgress | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [thumbnailStats, setThumbnailStats] = useState<ThumbnailStats>(null);
  const [processingStartTime, setProcessingStartTime] = useState<
    number | undefined
  >(undefined);
  const [batchSize, setBatchSize] = useState<number>(25); // Default batch size
  const [totalProcessed, setTotalProcessed] = useState(0);

  const shouldContinueProcessingRef = useRef(false);
  const overallProgressRef = useRef({
    totalProcessed: 0,
    totalSuccess: 0,
    totalFailed: 0,
    totalSkipped: 0,
  });

  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
      shouldContinueProcessingRef.current = false;
    };
  }, [abortController]);

  const fetchThumbnailStats = useCallback(async () => {
    try {
      const result = await getThumbnailStats();

      if (result.success && result.stats) {
        setThumbnailStats(result.stats);
      } else {
        console.error('Error fetching thumbnail stats:', result.error);
      }
    } catch (error) {
      console.error('Error fetching thumbnail stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchThumbnailStats();
  }, [fetchThumbnailStats]);

  useEffect(() => {
    if (!isGenerating) {
      fetchThumbnailStats();
    }
  }, [isGenerating, fetchThumbnailStats]);

  const processBatch = async () => {
    try {
      const stream = await streamUnprocessedThumbnails({
        skipLargeFiles,
        batchSize,
      });

      if (!stream) {
        throw new Error('Failed to start thumbnail processing stream');
      }

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      let batchProcessed = 0;
      let batchSuccess = 0;
      let batchFailed = 0;
      let batchSkipped = 0;
      let batchComplete = false;

      try {
        while (true) {
          if (abortController?.signal.aborted) {
            reader.cancel('Operation cancelled by user');
            setDetailProgress({
              status: 'error',
              message: 'Thumbnail generation cancelled by user',
            });
            break;
          }

          const { done, value } = await reader.read();

          if (done) {
            batchComplete = true;

            if (isProcessingAll) {
              overallProgressRef.current.totalProcessed += batchProcessed;
              overallProgressRef.current.totalSuccess += batchSuccess;
              overallProgressRef.current.totalFailed += batchFailed;
              overallProgressRef.current.totalSkipped += batchSkipped;
              setTotalProcessed(overallProgressRef.current.totalProcessed);

              await fetchThumbnailStats();

              const statsResult = await getThumbnailStats();
              if (statsResult.success && statsResult.stats) {
                setThumbnailStats(statsResult.stats);

                const remainingFiles = statsResult.stats.filesPending;

                if (remainingFiles > 0 && shouldContinueProcessingRef.current) {
                  setDetailProgress({
                    status: 'processing',
                    message: `Processed ${overallProgressRef.current.totalProcessed} files so far. Starting next batch...`,
                  });

                  setProgress(0);
                  setProcessed(0);
                  setLargeFilesSkipped(0);
                  setSuccessCount(0);
                  setFailedCount(0);

                  setTimeout(() => {
                    processBatch().catch((error) => {
                      console.error('Error in batch processing:', error);
                      setIsGenerating(false);
                      setIsProcessingAll(false);
                      setAbortController(null);
                    });
                  }, 1000);
                } else {
                  const completionMessage = `All processing complete! Generated ${overallProgressRef.current.totalSuccess} thumbnails (${overallProgressRef.current.totalFailed} failed, ${overallProgressRef.current.totalSkipped} skipped)`;
                  toast.success(completionMessage);

                  setDetailProgress({
                    status: 'completed',
                    message: completionMessage,
                  });

                  setIsGenerating(false);
                  setIsProcessingAll(false);
                  setAbortController(null);
                  shouldContinueProcessingRef.current = false;
                }
              } else {
                setIsGenerating(false);
                setIsProcessingAll(false);
                setAbortController(null);
              }
            } else {
              setIsGenerating(false);
              setAbortController(null);

              if (detailProgress?.status === 'completed') {
                const completionMessage = `Batch complete: Generated ${batchProcessed} thumbnails`;
                toast.success(completionMessage);
              }
            }

            fetchThumbnailStats();
            break;
          }

          const text = decoder.decode(value);
          const messages = text.split('\n\n');

          for (const message of messages) {
            if (!message.startsWith('data: ')) continue;

            try {
              const data = JSON.parse(message.substring(6));

              if (data.status === 'error') {
                setHasError(true);
                if (data.error) {
                  const errorType = categorizeError(data.error);
                  setErrorSummary((prev) => {
                    const newSummary = { ...prev };
                    if (!newSummary[errorType]) {
                      newSummary[errorType] = { count: 0, examples: [] };
                    }
                    newSummary[errorType].count += 1;
                    if (newSummary[errorType].examples.length < 3) {
                      newSummary[errorType].examples.push(data.error);
                    }
                    return newSummary;
                  });
                }
              }

              if (data.totalItems) {
                setTotal(data.totalItems);
              }

              if (data.processed !== undefined) {
                setProcessed(data.processed);
                batchProcessed = data.processed;

                if (data.totalItems) {
                  const progressPercent = Math.round(
                    (data.processed / Math.min(batchSize, data.totalItems)) *
                      100,
                  );
                  setProgress(progressPercent);
                }
              }

              if (data.successCount !== undefined) {
                setSuccessCount(data.successCount);
                batchSuccess = data.successCount;
              }

              if (data.failedCount !== undefined) {
                setFailedCount(data.failedCount);
                batchFailed = data.failedCount;
              }

              if (data.skippedLargeFiles !== undefined) {
                setLargeFilesSkipped(data.skippedLargeFiles);
                batchSkipped = data.skippedLargeFiles;
              }

              if (data.currentFilePath || data.currentFileName) {
                setDetailProgress((prev) => ({
                  ...prev!,
                  message: isProcessingAll
                    ? `Processing batch ${Math.ceil(
                        (overallProgressRef.current.totalProcessed +
                          (data.processed || 0)) /
                          batchSize,
                      )}: ${data.message || prev?.message}`
                    : data.message || prev?.message,
                  currentFilePath:
                    data.currentFilePath || prev?.currentFilePath,
                  fileType: data.fileType || prev?.fileType,
                }));
              } else if (data.message) {
                setDetailProgress((prev) => ({
                  ...prev!,
                  message: isProcessingAll
                    ? `Processing batch ${Math.ceil(
                        (overallProgressRef.current.totalProcessed +
                          (data.processed || 0)) /
                          batchSize,
                      )}: ${data.message}`
                    : data.message,
                }));
              }

              if (data.status === 'completed') {
                setDetailProgress((prev) => ({
                  ...prev!,
                  status: 'completed',
                }));
              }
            } catch (parseError) {
              console.error('Error parsing stream data:', parseError);
            }
          }
        }
      } catch (streamError) {
        console.error('Error reading from stream:', streamError);
        setHasError(true);
        throw streamError;
      } finally {
        reader.releaseLock();

        if (!batchComplete) {
          setIsGenerating(false);
          setIsProcessingAll(false);
          setAbortController(null);
          shouldContinueProcessingRef.current = false;
        }
      }
    } catch (error) {
      console.error('Error processing batch:', error);
      setIsGenerating(false);
      setIsProcessingAll(false);
      setAbortController(null);
      shouldContinueProcessingRef.current = false;
      throw error;
    }
  };

  const handleGenerateThumbnails = async (processAll = false) => {
    try {
      setIsProcessingAll(processAll);

      if (processAll) {
        overallProgressRef.current = {
          totalProcessed: 0,
          totalSuccess: 0,
          totalFailed: 0,
          totalSkipped: 0,
        };
        shouldContinueProcessingRef.current = true;
        setTotalProcessed(0);
      }

      setIsGenerating(true);
      setProgress(0);
      setProcessed(0);
      setLargeFilesSkipped(0);
      setSuccessCount(0);
      setFailedCount(0);
      setErrorSummary({});
      setHasError(false);
      setDetailProgress({
        status: 'processing',
        message: processAll
          ? 'Starting thumbnail generation for all files...'
          : 'Starting thumbnail generation...',
      });

      const controller = new AbortController();
      setAbortController(controller);

      const startTime = Date.now();
      setProcessingStartTime(startTime);

      const countResult = await countMissingThumbnails();
      if (!countResult.success) {
        throw new Error(
          countResult.error || 'Failed to count missing thumbnails',
        );
      }

      const totalToProcess = countResult.count || 0;
      setTotal(totalToProcess);

      if (totalToProcess === 0) {
        toast.success('No thumbnails to generate');
        setIsGenerating(false);
        setIsProcessingAll(false);
        setAbortController(null);
        setDetailProgress({
          status: 'completed',
          message: 'All thumbnails already generated.',
        });
        return;
      }

      const currentBatchSize = processAll
        ? batchSize
        : Math.min(batchSize, totalToProcess);

      const toastMessage = processAll
        ? `Starting to generate all ${totalToProcess} thumbnails in batches of ${batchSize}`
        : `Generating thumbnails for ${currentBatchSize} of ${totalToProcess} media items${
            skipLargeFiles ? ' (skipping large files)' : ''
          }.`;

      toast.success(toastMessage);

      await processBatch();
    } catch (error: any) {
      const errorMessage = error.message || 'An unknown error occurred';
      toast.error(`Error generating thumbnails: ${errorMessage}`);
      console.error('Error generating thumbnails:', error);
      setHasError(true);

      setDetailProgress({
        status: 'error',
        message: `Error: ${errorMessage}`,
        error: errorMessage,
      });

      const errorType = categorizeError(errorMessage);
      setErrorSummary((prev) => {
        const newSummary = { ...prev };
        if (!newSummary[errorType]) {
          newSummary[errorType] = { count: 0, examples: [] };
        }
        newSummary[errorType].count += 1;
        if (newSummary[errorType].examples.length < 3) {
          newSummary[errorType].examples.push('General processing error');
        }
        return newSummary;
      });
    } finally {
      if (!isProcessingAll) {
        setIsGenerating(false);
        setAbortController(null);
        fetchThumbnailStats();
      }
    }
  };

  const handleCancel = async () => {
    if (abortController) {
      toast.info('Cancelling thumbnail generation...', {
        id: 'cancel-toast',
        duration: 3000,
      });

      shouldContinueProcessingRef.current = false;

      abortController.abort();

      setIsGenerating(false);
      setIsProcessingAll(false);
      setAbortController(null);

      setDetailProgress({
        status: 'error',
        message: 'Thumbnail generation cancelled by user',
      });

      fetchThumbnailStats();
    }
  };

  return {
    isGenerating,
    isProcessingAll,
    progress,
    total,
    processed,
    skipLargeFiles,
    setSkipLargeFiles,
    largeFilesSkipped,
    hasError,
    errorSummary,
    detailProgress,
    successCount,
    failedCount,
    thumbnailStats,
    processingStartTime,
    batchSize,
    setBatchSize,
    totalProcessed,
    handleGenerateThumbnails,
    handleCancel,
    fetchThumbnailStats,
  };
}
