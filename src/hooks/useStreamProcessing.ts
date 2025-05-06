import { useCallback, useRef, useState } from 'react';
import type { UnifiedProgress } from '@/types/progress-types';

/**
 * A hook for handling streaming server actions that return progress updates
 * Works with the new UnifiedProgress type for standardized progress reporting
 */
export function useStreamProcessing<T extends UnifiedProgress>() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<T | null>(null);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [reader, setReader] =
    useState<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const readerActiveRef = useRef(false);

  // Helper function to safely clean up a reader
  const cleanupReader = useCallback(
    async (readerToCleanup: ReadableStreamDefaultReader<Uint8Array> | null) => {
      if (!readerToCleanup) return;

      if (!readerToCleanup.closed) {
        await readerToCleanup.cancel();
      }

      readerActiveRef.current = false; // Mark as inactive after cancel attempt

      try {
        readerToCleanup.releaseLock();
      } catch (_releaseError) {
        // Ignore errors if the lock was already released
      }

      setReader(null); // Clear the reader state
    },
    [], // Add empty dependency array for useCallback
  );

  // Function to cancel the current processing
  const stopProcessing = useCallback(async () => {
    readerActiveRef.current = false;

    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }

    if (reader) {
      await cleanupReader(reader);
    }

    setIsProcessing(false);
  }, [abortController, reader, cleanupReader]);

  // Standardized error recovery function
  const handleStreamError = useCallback(
    async (
      error: unknown,
      options: {
        onCompleted?: () => void;
        onError?: (error: any, errorDetails?: any) => void;
      },
      reader: ReadableStreamDefaultReader<Uint8Array> | null,
    ) => {
      await cleanupReader(reader);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown processing error';

      setProgress((prev) =>
        prev
          ? {
              ...prev,
              status: 'failure',
              message: `Processing failed: ${errorMessage}`,
            }
          : null,
      );

      if (options.onError) {
        options.onError(errorMessage, error);
      }

      setIsProcessing(false);
    },
    [cleanupReader],
  );

  // Function to handle reading from a streaming server action
  const startProcessing = useCallback(
    async (
      streamFunc: () => Promise<ReadableStream<Uint8Array>>,
      options: {
        onCompleted?: () => void;
        onError?: (error: any, errorDetails?: any) => void;
      } = {},
    ) => {
      // Check if already processing
      if (isProcessing) {
        console.warn(
          'Already processing a stream, canceling previous and starting new request.',
        );
        // Clean up existing processing before starting a new one
        await stopProcessing();
      }

      const newAbortController = new AbortController();
      setAbortController(newAbortController);
      setIsProcessing(true);
      setProgress(null);

      readerActiveRef.current = false;

      // Helper to process parsed data, update state, and check for completion
      const processParsedData = (data: any): boolean => {
        let completed = false;
        setProgress((prev) => {
          const newState = {
            ...(prev || {}),
            ...data,
          } as T;

          return newState;
        });

        const isComplete = data.status === 'complete';
        const isFinal = data.isFinalBatch;

        if (isComplete || isFinal) {
          if (options.onCompleted) {
            options.onCompleted();
          }
          setIsProcessing(false);
          setAbortController(null);
          completed = true;
        }
        return completed;
      };

      try {
        const stream = await streamFunc();

        if (!stream || typeof stream.getReader !== 'function') {
          throw new Error('streamFunc did not return a valid ReadableStream');
        }

        const newReader = stream.getReader();
        setReader(newReader);
        readerActiveRef.current = true;

        const decoder = new TextDecoder();

        try {
          let done = false;

          while (!done && readerActiveRef.current) {
            if (newAbortController.signal.aborted) {
              break;
            }

            try {
              const { value, done: streamDone } = await newReader.read();
              done = streamDone;

              if (streamDone) {
                readerActiveRef.current = false;

                if (options.onCompleted) {
                  options.onCompleted();
                }

                setIsProcessing(false);
                setAbortController(null);
                await cleanupReader(newReader);
              } else if (value && readerActiveRef.current) {
                const text = decoder.decode(value);
                const messages = text.split('data: ');

                for (const message of messages) {
                  const cleanedMessage = message
                    .trim()
                    .replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');

                  if (!cleanedMessage) continue;

                  try {
                    const jsonString = cleanedMessage
                      .replace(/^[^{]*/, '')
                      .replace(/[^}]*$/, '');

                    const data = JSON.parse(jsonString);

                    if (processParsedData(data)) {
                      await cleanupReader(newReader);
                      done = true;
                      break;
                    }
                  } catch (parseError) {
                    console.error(
                      'Error parsing message:',
                      parseError,
                      cleanedMessage,
                    );
                  }
                  if (done) break;
                }
              }
            } catch (readError: unknown) {
              await handleStreamError(readError, options, newReader);
              break;
            }
          }
        } catch (error) {
          await handleStreamError(error, options, newReader);
        } finally {
          if (readerActiveRef.current === false && isProcessing) {
            setIsProcessing(false);
          }
        }
      } catch (error) {
        await handleStreamError(error, options, null);
      }
    },
    [cleanupReader, stopProcessing, isProcessing, handleStreamError],
  );

  return {
    isProcessing,
    progress,
    startProcessing,
    stopProcessing,
  };
}
