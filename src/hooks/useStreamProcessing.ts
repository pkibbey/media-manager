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
  // Add a ref to track if the reader is active
  const readerActiveRef = useRef(false);

  // Function to handle reading from a streaming server action
  const startProcessing = useCallback(
    async (
      streamFunc: () => Promise<ReadableStream<Uint8Array>>,
      options: {
        onCompleted?: () => void;
        onError?: (error: any, errorDetails?: any) => void;
        onBatchComplete?: (processedCount: number) => void;
      } = {},
    ) => {
      // Create a new AbortController for this request
      const newAbortController = new AbortController();
      setAbortController(newAbortController);
      setIsProcessing(true);

      // Reset reader state at the start
      readerActiveRef.current = false;

      try {
        // Call the server action to get a readable stream
        const stream = await streamFunc();
        const newReader = stream.getReader();
        setReader(newReader);
        readerActiveRef.current = true; // Mark reader as active

        // Set up TextDecoder to decode the stream
        const decoder = new TextDecoder();
        const errorDetails: string[] = [];

        try {
          // Start reading from the stream
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
              }

              // Process the value only if we have one and reader is still active
              if (value && readerActiveRef.current) {
                // Extract and parse all 'data:' messages in the chunk
                const text = decoder.decode(value);
                const messages = text.split('data: ');

                for (const message of messages) {
                  // If reader is no longer active, break the message processing
                  if (!readerActiveRef.current) break;

                  const cleanedMessage = message
                    .trim()
                    .replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');

                  // Skip empty messages
                  if (!cleanedMessage) continue;

                  try {
                    // Try to extract just the JSON part from the message
                    const jsonString = cleanedMessage
                      .replace(/^[^{]*/, '')
                      .replace(/[^}]*$/, '');

                    try {
                      // First try simple JSON parsing
                      const data = JSON.parse(jsonString);

                      // Update the progress state with the parsed data
                      setProgress((prev) => {
                        const newState = {
                          ...(prev || {}),
                          ...data,
                        } as T;
                        return newState;
                      });

                      const isComplete = data.status === 'complete';

                      const isBatchComplete = data.status === 'batch_complete';

                      const isError =
                        data.status === 'error' || data.status === 'failure';

                      if (isComplete) {
                        // Final completion
                        if (options.onCompleted) {
                          options.onCompleted();
                        }
                        // Make sure to clean up and set processing to false when complete
                        setIsProcessing(false);
                        setAbortController(null);
                        cleanupReader(newReader);
                      } else if (
                        isBatchComplete &&
                        options.onBatchComplete &&
                        data.processedCount
                      ) {
                        // Batch completion
                        options.onBatchComplete(data.processedCount);
                      } else if (isError) {
                        // Error handling
                        if (options.onError) {
                          options.onError(data.message, errorDetails);
                        }
                        if (data.message) {
                          errorDetails.push(data.message);
                        }
                      }

                      // For backwards compatibility - can be removed after refactoring all code
                      if (data.isFinalBatch) {
                        if (options.onCompleted) {
                          options.onCompleted();
                        }
                        // Clean up after completion
                        setIsProcessing(false);
                        setAbortController(null);
                        cleanupReader(newReader);
                      } else if (
                        data.isBatchComplete &&
                        !data.isFinalBatch &&
                        options.onBatchComplete &&
                        data.processedCount
                      ) {
                        options.onBatchComplete(data.processedCount);
                      }
                    } catch (_jsonParseError) {
                      // If the simple extraction didn't work, try a more complex approach
                      // Find the outermost valid JSON object in the message
                      try {
                        let validJson = null;
                        let stack = 0;
                        let startIdx = -1;

                        for (let i = 0; i < cleanedMessage.length; i++) {
                          if (cleanedMessage[i] === '{') {
                            if (stack === 0) {
                              startIdx = i;
                            }
                            stack++;
                          } else if (cleanedMessage[i] === '}') {
                            stack--;
                            if (stack === 0 && startIdx !== -1) {
                              const potentialJson = cleanedMessage.substring(
                                startIdx,
                                i + 1,
                              );
                              try {
                                const data = JSON.parse(potentialJson);
                                validJson = data;
                              } catch {
                                // Not valid JSON, keep looking
                              }
                            }
                          }
                        }

                        // If we found valid JSON, update the progress
                        if (validJson) {
                          setProgress(
                            (prev) =>
                              ({
                                ...(prev || {}),
                                ...validJson,
                              }) as T,
                          );

                          // Handle different statuses in the fallback method too
                          const isComplete = validJson.status === 'complete';

                          const isBatchComplete =
                            validJson.status === 'batch_complete';

                          const isError =
                            validJson.status === 'error' ||
                            validJson.status === 'failure';

                          if (isComplete) {
                            if (options.onCompleted) {
                              options.onCompleted();
                            }
                            // Clean up after completion
                            setIsProcessing(false);
                            setAbortController(null);
                            cleanupReader(newReader);
                          } else if (
                            isBatchComplete &&
                            options.onBatchComplete &&
                            validJson.processedCount
                          ) {
                            options.onBatchComplete(validJson.processedCount);
                          } else if (isError && validJson.message) {
                            errorDetails.push(validJson.message);
                          }

                          // Backward compatibility
                          if (validJson.isFinalBatch) {
                            if (options.onCompleted) {
                              options.onCompleted();
                            }
                            // Clean up after completion
                            setIsProcessing(false);
                            setAbortController(null);
                            cleanupReader(newReader);
                          } else if (
                            validJson.isBatchComplete &&
                            !validJson.isFinalBatch &&
                            options.onBatchComplete &&
                            validJson.processedCount
                          ) {
                            options.onBatchComplete(validJson.processedCount);
                          }
                        }
                      } catch (fallbackError) {
                        console.error(
                          '[STREAM DEBUG] Failed to parse message with fallback method:',
                          fallbackError,
                          cleanedMessage,
                        );
                      }
                    }
                  } catch (parseError) {
                    console.error(
                      '[STREAM DEBUG] Error parsing message:',
                      parseError,
                      cleanedMessage,
                    );
                  }
                }
              }
            } catch (readError: unknown) {
              console.error(
                '[STREAM DEBUG] Error reading from stream:',
                readError,
              );

              // Check if this is a "reader released" type error
              if (
                typeof readError === 'object' &&
                readError !== null &&
                'message' in readError &&
                typeof readError.message === 'string' &&
                (readError.message.includes('released') ||
                  readError.message.includes('locked'))
              ) {
                readerActiveRef.current = false;
                break;
              }

              // For other errors, we might want to continue
              if (options.onError) {
                options.onError(readError);
              }
            }
          }

          // Clean up reader
          cleanupReader(newReader);
          // Stream completed normally, set processing to false
          setIsProcessing(false);
        } catch (error) {
          console.error('[STREAM DEBUG] Stream reading error:', error);
          if (options.onError) {
            options.onError(error);
          }
        } finally {
          // Safe cleanup in finally block
          cleanupReader(newReader);
          setAbortController(null);
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('[STREAM DEBUG] Error starting stream:', error);
        if (options.onError) {
          options.onError(error);
        }
        setAbortController(null);
        setIsProcessing(false);
      }
    },
    [],
  );

  // Helper function to safely clean up a reader
  const cleanupReader = useCallback(
    async (readerToCleanup: ReadableStreamDefaultReader<Uint8Array> | null) => {
      if (!readerToCleanup) return;

      readerActiveRef.current = false;

      try {
        if (!readerToCleanup.closed) {
          readerToCleanup.cancel().catch((e) => {
            console.error('[STREAM DEBUG] Error during reader cancel:', e);
          });
        }

        await readerToCleanup.read();
        if (!readerToCleanup.closed) {
          readerToCleanup.releaseLock();
        }
      } catch (e) {
        console.error('[STREAM DEBUG] Error during reader cleanup:', e);
      }

      setReader(null);
    },
    [],
  );

  // Function to cancel the current processing
  const stopProcessing = useCallback(async () => {
    // Mark reader as inactive first to prevent further read attempts
    readerActiveRef.current = false;

    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }

    if (reader) {
      cleanupReader(reader);
    }

    setIsProcessing(false);
  }, [abortController, reader, cleanupReader]);

  return {
    isProcessing,
    progress,
    startProcessing,
    stopProcessing,
  };
}
