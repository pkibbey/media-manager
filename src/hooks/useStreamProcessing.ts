import { useCallback, useState } from 'react';
import { updateProcessingState } from '@/lib/query-helpers';
import type { UnifiedProgress } from '@/types/progress-types';

type StreamOptions<T> = {
  onCompleted?: (result: T) => void;
  onError?: (error: Error | string, errorDetails?: string[]) => void;
  onBatchComplete?: (processedCount: number) => void;
};

/**
 * A hook for handling streaming server actions that return progress updates
 * Works with the new UnifiedProgress type for standardized progress reporting
 */
export function useStreamProcessing<T extends UnifiedProgress>() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<T | null>(null);
  const [reader, setReader] = useState<ReadableStreamDefaultReader | null>(
    null,
  );
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  const processStream = useCallback(
    async (
      stream: ReadableStream,
      options: StreamOptions<T> = {},
    ): Promise<void> => {
      // Set up a new reader for this stream
      const newReader = stream.getReader();
      setReader(newReader);
      const decoder = new TextDecoder();
      const errorDetails: string[] = [];

      try {
        // Start reading from the stream
        let done = false;
        while (!done) {
          const { value, done: streamDone } = await newReader.read();
          done = streamDone;

          if (value) {
            // Extract and parse all 'data:' messages in the chunk
            const text = decoder.decode(value);
            const messages = text.split('data: ');

            for (const message of messages) {
              const cleanedMessage = message.trim().replace(/^\s+|\s+$/g, '');

              // Skip empty messages
              if (!cleanedMessage) continue;

              try {
                // Try to extract just the JSON part from the message
                // This will find the first occurrence of an object (starting with { and ending with })
                const jsonMatch = cleanedMessage.match(/(\{.*\})/);
                if (!jsonMatch) continue;

                // Parse the JSON data
                const data = JSON.parse(jsonMatch[0]) as T;
                console.log('data: ', data);

                // Update progress state
                setProgress(data);

                // Handle completed status
                if (data.status === 'success') {
                  if (options.onCompleted) {
                    options.onCompleted(data);
                  }

                  // Also check if a batch was completed
                  if (
                    data.isBatchComplete &&
                    options.onBatchComplete &&
                    data.processedCount
                  ) {
                    options.onBatchComplete(data.processedCount);
                  }
                }
                // Handle failure status
                else if (data.status === 'failure') {
                  if (data.message) {
                    errorDetails.push(data.message);
                  }
                }
                // Handle batch completion within ongoing process
                else if (
                  data.isBatchComplete &&
                  options.onBatchComplete &&
                  data.processedCount
                ) {
                  options.onBatchComplete(data.processedCount);
                }
              } catch (parseError) {
                console.error('Error parsing message:', parseError, message);
              }
            }
          }
        }

        // Clean up reader
        newReader.releaseLock();
        setReader(null);
      } catch (error) {
        console.error('Stream reading error:', error);

        // Check if this was an abort error, which we don't want to report as an error
        const isAbortError =
          error instanceof Error &&
          (error.name === 'AbortError' || error.message.includes('abort'));

        if (!isAbortError && options.onError) {
          options.onError(error as Error, errorDetails);
        }
      } finally {
        setIsProcessing(false);
        if (abortController) {
          setAbortController(null);
        }
      }
    },
    [abortController],
  );

  /**
   * Start a streaming process
   */
  const startProcessing = useCallback(
    async (
      streamFn: () => Promise<ReadableStream>,
      options: StreamOptions<T> = {},
    ): Promise<void> => {
      if (isProcessing) {
        console.warn('Already processing a stream, ignoring new request');
        return;
      }

      setIsProcessing(true);
      setProgress(null);

      try {
        // Create new abort controller for this operation
        const controller = new AbortController();
        setAbortController(controller);

        // Get the stream and begin processing
        const stream = await streamFn();
        await processStream(stream, options);
      } catch (error) {
        console.error('Error starting stream process:', error);
        if (options.onError) {
          options.onError(error as Error);
        }
        setIsProcessing(false);
      }
    },
    [isProcessing, processStream],
  );

  /**
   * Stop the current streaming process
   */
  const stopProcessing = useCallback(async (): Promise<void> => {
    if (!isProcessing) return;

    // Update progress state to indicate abortion
    setProgress((prev) =>
      prev
        ? { ...prev, status: 'failure', message: 'Processing aborted by user' }
        : null,
    );

    // Mark the current processing item as failure
    try {
      // If we have a specific currentItem identifier
      if (progress?.mediaItemId) {
        await updateProcessingState({
          media_item_id: progress.mediaItemId,
          status: 'failure',
          type: progress.metadata?.processingType || 'unknown',
          error_message: 'Processing aborted by user',
        });
      }
    } catch (error) {
      console.error('Failed to update processing state to failure:', error);
    }

    // Cancel the stream if we have an abort controller
    if (abortController) {
      abortController.abort();
    }

    // Release the reader if we have one
    if (reader) {
      try {
        await reader.cancel();
        reader.releaseLock();
      } catch (error) {
        console.error('Error releasing reader:', error);
      }
      setReader(null);
    }

    setIsProcessing(false);
  }, [isProcessing, reader, abortController, progress]);

  return {
    isProcessing,
    progress,
    startProcessing,
    stopProcessing,
  };
}
