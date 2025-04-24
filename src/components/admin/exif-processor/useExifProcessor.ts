import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  getExifStats,
  streamProcessUnprocessedItems,
} from '@/app/actions/exif';
import { BATCH_SIZE } from '@/lib/consts';
import { categorizeError } from '@/lib/errors';
import type { ExifStatsResult } from '@/types/db-types';
import type { ExtractionMethod } from '@/types/exif';
import type { ExifProgress } from '@/types/exif';

// Type for tracking error frequencies
export type ErrorSummary = {
  [errorType: string]: {
    count: number;
    examples: string[];
  };
};

export function useExifProcessor() {
  const [stats, setStats] = useState<ExifStatsResult>({
    with_exif: 0,
    with_errors: 0,
    total: 0,
    skipped: 0,
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState<ExifProgress | null>(null);
  const [hasError, setHasError] = useState(false);
  const [errorSummary, setErrorSummary] = useState<ErrorSummary>({});
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [extractionMethod, setExtractionMethod] =
    useState<ExtractionMethod>('default');
  const [batchSize, setBatchSize] = useState<number>(BATCH_SIZE);
  const [processingStartTime, setProcessingStartTime] = useState<
    number | undefined
  >(undefined);

  // Load stats on component mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Clean up abortController on unmount
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  const fetchStats = async () => {
    try {
      const response = await getExifStats();
      const { success, stats: exifStats, message } = response;

      if (success && exifStats) {
        setStats(exifStats);
      } else {
        console.error(
          'Failed to fetch EXIF stats:',
          message || 'Unknown error',
        );
      }
    } catch (error) {
      console.error('Exception when fetching EXIF stats:', error);
    }
  };

  const handleProcess = async () => {
    try {
      setIsStreaming(true);
      setHasError(false);
      setErrorSummary({}); // Reset error summary when starting a new processing run
      setProcessingStartTime(Date.now()); // Set the start time for estimation
      setProgress({
        status: 'processing',
        message: `Starting EXIF processing (max ${batchSize} files)...`,
        filesDiscovered: 0,
        filesProcessed: 0,
        successCount: 0,
        failedCount: 0,
        method: extractionMethod,
      });

      // Create a new AbortController for this operation
      const controller = new AbortController();
      setAbortController(controller);

      // Call the server action to get a ReadableStream
      const stream = await streamProcessUnprocessedItems({
        extractionMethod,
        batchSize,
      });

      if (!stream) {
        throw new Error('Failed to start EXIF processing stream');
      }

      // Create a new ReadableStream and TextDecoder to handle the response
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      // Process stream data
      const processStreamData = async () => {
        try {
          while (true) {
            // Check if we should abort
            if (controller.signal.aborted) {
              reader.cancel('Operation cancelled by user');
              break;
            }

            const { done, value } = await reader.read();

            if (done) {
              // Stream is complete - update UI
              setIsStreaming(false);
              setAbortController(null);

              // If we have a successful completion status in progress, show a toast
              if (progress?.status === 'completed') {
                toast.success('EXIF processing completed successfully');
              }

              // Refresh stats after completion
              fetchStats();
              break;
            }

            // Process the chunk - it may contain multiple events
            const text = decoder.decode(value, { stream: true });
            const lines = text.split('\n\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.substring(6)) as ExifProgress;
                  setProgress(data);

                  // Track error information when available
                  if (data.error) {
                    // Store the error with its file path
                    const errorType = categorizeError(data.error);
                    const filePath = data.currentFilePath || 'Unknown file';

                    setErrorSummary((prevSummary) => {
                      const newSummary = { ...prevSummary };
                      if (!newSummary[errorType]) {
                        newSummary[errorType] = {
                          count: 0,
                          examples: [],
                        };
                      }

                      newSummary[errorType].count += 1;

                      // Keep up to 3 examples of each error type
                      if (
                        newSummary[errorType].examples.length < 3 &&
                        filePath !== 'Unknown file'
                      ) {
                        newSummary[errorType].examples.push(filePath);
                      }

                      return newSummary;
                    });
                  }

                  if (data.status === 'completed') {
                    // Use the count from the current data event rather than the stale progress state
                    const processedCount = data.filesProcessed || 0;
                    toast.success(
                      `Batch complete: ${processedCount} files processed`,
                    );
                    setProgress((progress) => ({
                      ...progress!,
                      status: 'completed',
                      message: `Completed processing batch of ${processedCount} files`,
                      successCount: (progress?.successCount || 0) + 1,
                      method: extractionMethod,
                    }));
                  } else if (data.status === 'error') {
                    setIsStreaming(false);
                    setAbortController(null);
                    setHasError(true);
                    setProgress((progress) => ({
                      ...progress!,
                      status: 'completed',
                      message: 'Completed EXIF processing...',
                      failedCount: (progress?.failedCount || 0) + 1,
                      method: extractionMethod,
                    }));

                    // Ensure there's always a meaningful error message
                    const errorMessage =
                      data.error || 'Unknown error occurred during processing';
                    toast.error(`Error processing EXIF data: ${errorMessage}`);
                  }
                } catch (error) {
                  console.error('Error parsing event data:', error, line);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error reading stream:', error);

          setIsStreaming(false);
          setAbortController(null);
          setHasError(true);
          toast.error('Error processing EXIF data stream');
        } finally {
          // Ensure we release the reader lock
          reader.releaseLock();
        }
      };

      // Start processing the stream
      processStreamData();
    } catch (error) {
      setIsStreaming(false);
      setAbortController(null);
      setHasError(true);
      toast.error('Failed to start EXIF processing');

      console.error('Error starting EXIF processing:', error);
    }
  };

  // Handler to cancel processing
  const handleCancel = () => {
    if (abortController) {
      toast.info('Cancelling EXIF processing...');

      // Simply abort the controller which will trigger client-side cleanup
      abortController.abort();

      setIsStreaming(false);
      setAbortController(null);

      // Update UI state
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              status: 'error',
              message: 'Processing cancelled by user',
            }
          : null,
      );
    }
  };

  // Calculate derived values
  const totalProcessed = stats.with_errors + stats.with_exif + stats.skipped;
  const totalUnprocessed = stats.total - totalProcessed;
  const processedPercentage =
    stats.total > 0 ? (totalProcessed / stats.total) * 100 : 0;
  const streamingProgressPercentage =
    progress?.filesDiscovered && progress.filesDiscovered > 0
      ? ((progress.filesProcessed || 0) / progress.filesDiscovered) * 100
      : 0;

  return {
    // State
    stats,
    isStreaming,
    progress,
    hasError,
    errorSummary,
    extractionMethod,
    setExtractionMethod,
    batchSize,
    setBatchSize,
    processingStartTime,

    // Derived values
    totalProcessed,
    totalUnprocessed,
    processedPercentage,
    streamingProgressPercentage,

    // Actions
    handleProcess,
    handleCancel,
    fetchStats,
  };
}
