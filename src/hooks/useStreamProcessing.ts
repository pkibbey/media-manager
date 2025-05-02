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

      readerActiveRef.current = false; // Mark as inactive

        if (readerActiveRef.current && !readerToCleanup.closed) {
          await readerToCleanup.cancel().catch((e) => {
            // console.error('[STREAM DEBUG] Error during reader cancel:', e);
          });
        }
        try {
          readerToCleanup.releaseLock();
        } catch (releaseError) {
          // Ignore errors if the lock was already released
        }
        
      setReader(null); // Clear the reader state
    },
    [], // Add empty dependency array for useCallback
  );

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
      const newAbortController = new AbortController();
      setAbortController(newAbortController);
      setIsProcessing(true);
      setProgress(null);

      readerActiveRef.current = false;

      try {
        const stream = await streamFunc();

        if (!stream || typeof stream.getReader !== 'function') {
          throw new Error('streamFunc did not return a valid ReadableStream');
        }

        const newReader = stream.getReader();
        setReader(newReader);
        readerActiveRef.current = true;

        const decoder = new TextDecoder();
        const errorDetails: string[] = [];

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

                    try {
                      const data = JSON.parse(jsonString);

                      setProgress((prev) => {
                        const newState = {
                          ...(prev || {}),
                          ...data,
                        } as T;
                        return newState;
                      });

                      const isComplete = data.status === 'complete';

                      if (isComplete) {
                        if (options.onCompleted) {
                          options.onCompleted();
                        }
                        setIsProcessing(false);
                        setAbortController(null);
                        await cleanupReader(newReader);
                        done = true;
                        break;
                      } else if (data.isFinalBatch) {
                        if (options.onCompleted) {
                          options.onCompleted();
                        }
                        setIsProcessing(false);
                        setAbortController(null);
                        await cleanupReader(newReader);
                        done = true;
                        break;
                      }
                    } catch (_jsonParseError) {
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

                        if (validJson) {
                          setProgress(
                            (prev) => {
                              const newState = {
                                ...(prev || {}),
                                ...validJson,
                              } as T;
                              return newState;
                            },
                          );

                          const isComplete = validJson.status === 'complete';

                          if (isComplete) {
                            if (options.onCompleted) {
                              options.onCompleted();
                            }
                            setIsProcessing(false);
                            setAbortController(null);
                            await cleanupReader(newReader);
                            done = true;
                            break;
                          } else if (validJson.isFinalBatch) {
                            if (options.onCompleted) {
                              options.onCompleted();
                            }
                            setIsProcessing(false);
                            setAbortController(null);
                            await cleanupReader(newReader);
                            done = true;
                            break;
                          }
                        }
                      } catch (fallbackError) {
                        console.error(
                          'Failed to parse message with fallback method:',
                          fallbackError,
                          cleanedMessage,
                        );
                      }
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
              console.error('Error reading from stream:', readError);
              readerActiveRef.current = false;
              done = true;
              if (options.onError) {
                options.onError(readError);
              }
              setIsProcessing(false);
              setAbortController(null);
              await cleanupReader(newReader);
              break;
            }
          }
        } catch (error) {
          console.error('Stream processing error:', error);
          if (options.onError) {
            options.onError(error);
          }
          setIsProcessing(false);
          setAbortController(null);
          await cleanupReader(newReader);
        } finally {
          if (readerActiveRef.current === false && isProcessing) {
            setIsProcessing(false);
          }
        }
      } catch (error) {
        console.error('Error starting stream:', error);
        if (options.onError) {
          options.onError(error);
        }
        setIsProcessing(false);
        setAbortController(null);
      }
    },
    [cleanupReader], // Keep dependency array minimal
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

  return {
    isProcessing,
    progress,
    startProcessing,
    stopProcessing,
  };
}
