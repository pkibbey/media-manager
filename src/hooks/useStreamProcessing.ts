import { useCallback, useState } from 'react';
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
      console.log('[STREAM DEBUG] startProcessing called');

      // Create a new AbortController for this request
      const newAbortController = new AbortController();
      setAbortController(newAbortController);
      setIsProcessing(true);

      try {
        // Call the server action to get a readable stream
        console.log('[STREAM DEBUG] Calling streamFunc to get ReadableStream');
        const stream = await streamFunc();
        console.log(
          '[STREAM DEBUG] Stream received:',
          stream ? 'valid stream' : 'null/undefined',
        );

        const newReader = stream.getReader();
        console.log('[STREAM DEBUG] Got reader from stream');
        setReader(newReader);

        // Set up TextDecoder to decode the stream
        const decoder = new TextDecoder();
        const errorDetails: string[] = [];

        try {
          // Start reading from the stream
          console.log('[STREAM DEBUG] Starting to read from stream');
          let done = false;
          let msgCount = 0;

          while (!done) {
            console.log('[STREAM DEBUG] Reading chunk from stream');
            const { value, done: streamDone } = await newReader.read();
            done = streamDone;

            if (streamDone) {
              console.log('[STREAM DEBUG] Stream is done');
            }

            if (value) {
              // Extract and parse all 'data:' messages in the chunk
              const text = decoder.decode(value);
              console.log(
                '[STREAM DEBUG] Received chunk:',
                text.substring(0, 100) + (text.length > 100 ? '...' : ''),
              );

              const messages = text.split('data: ');
              console.log(
                '[STREAM DEBUG] Split into',
                messages.length,
                'messages',
              );

              for (const message of messages) {
                const cleanedMessage = message
                  .trim()
                  .replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');

                // Skip empty messages
                if (!cleanedMessage) continue;

                msgCount++;
                console.log('[STREAM DEBUG] Processing message', msgCount);

                try {
                  // Try to extract just the JSON part from the message
                  const jsonString = cleanedMessage
                    .replace(/^[^{]*/, '')
                    .replace(/[^}]*$/, '');
                  console.log(
                    '[STREAM DEBUG] Extracted JSON:',
                    jsonString.substring(0, 100) +
                      (jsonString.length > 100 ? '...' : ''),
                  );

                  try {
                    // First try simple JSON parsing
                    const data = JSON.parse(jsonString);
                    console.log('[STREAM DEBUG] Parsed data:', data);

                    // Update the progress state with the parsed data
                    setProgress((prev) => {
                      const newState = {
                        ...(prev || {}),
                        ...data,
                      } as T;
                      console.log(
                        '[STREAM DEBUG] Updated progress state:',
                        newState,
                      );
                      return newState;
                    });

                    // Handle different status/stage values
                    // Check both status and stage for compatibility with different API formats
                    const isComplete = 
                      data.status === 'complete' || 
                      data.stage === 'complete';
                      
                    const isBatchComplete = 
                      data.status === 'batch_complete' || 
                      data.stage === 'batch_complete';
                      
                    const isError = 
                      data.status === 'error' || 
                      data.status === 'failure' ||
                      data.stage === 'error' ||
                      data.stage === 'failure';

                    if (isComplete) {
                      // Final completion
                      console.log(
                        '[STREAM DEBUG] Complete status detected, triggering completion',
                      );
                      if (options.onCompleted) {
                        options.onCompleted();
                      }
                      // Make sure to clean up and set processing to false when complete
                      setIsProcessing(false);
                      setAbortController(null);
                      if (newReader) {
                        try {
                          newReader.releaseLock();
                        } catch (e) {
                          console.error('[STREAM DEBUG] Error releasing reader lock:', e);
                        }
                        setReader(null);
                      }
                    } else if (
                      isBatchComplete &&
                      options.onBatchComplete &&
                      data.processedCount
                    ) {
                      // Batch completion
                      console.log(
                        '[STREAM DEBUG] Batch complete status detected, processed:',
                        data.processedCount,
                      );
                      options.onBatchComplete(data.processedCount);
                    } else if (isError) {
                      // Error handling
                      console.log(
                        '[STREAM DEBUG] Error status detected:',
                        data.message,
                      );
                      if (options.onError) {
                        options.onError(data.message, errorDetails);
                      }
                      if (data.message) {
                        errorDetails.push(data.message);
                      }
                    }

                    // For backwards compatibility - can be removed after refactoring all code
                    if (data.isFinalBatch) {
                      console.log(
                        '[STREAM DEBUG] Legacy isFinalBatch detected, triggering completion',
                      );
                      if (options.onCompleted) {
                        options.onCompleted();
                      }
                      // Clean up after completion
                      setIsProcessing(false);
                      setAbortController(null);
                      if (newReader) {
                        try {
                          newReader.releaseLock();
                        } catch (e) {
                          console.error('[STREAM DEBUG] Error releasing reader lock:', e);
                        }
                        setReader(null);
                      }
                    } else if (
                      data.isBatchComplete &&
                      !data.isFinalBatch &&
                      options.onBatchComplete &&
                      data.processedCount
                    ) {
                      console.log(
                        '[STREAM DEBUG] Legacy batch complete detected, processed:',
                        data.processedCount,
                      );
                      options.onBatchComplete(data.processedCount);
                    }
                  } catch (_jsonParseError) {
                    console.log(
                      '[STREAM DEBUG] Simple JSON parse failed, trying fallback method',
                    );
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
                        console.log(
                          '[STREAM DEBUG] Found valid JSON with fallback method:',
                          validJson,
                        );
                        setProgress(
                          (prev) =>
                            ({
                              ...(prev || {}),
                              ...validJson,
                            }) as T,
                        );

                        // Handle different statuses in the fallback method too
                        const isComplete = 
                          validJson.status === 'complete' || 
                          validJson.stage === 'complete';
                          
                        const isBatchComplete = 
                          validJson.status === 'batch_complete' || 
                          validJson.stage === 'batch_complete';
                          
                        const isError = 
                          validJson.status === 'error' || 
                          validJson.status === 'failure' ||
                          validJson.stage === 'error' ||
                          validJson.stage === 'failure';

                        if (isComplete) {
                          console.log(
                            '[STREAM DEBUG] Complete status detected in fallback parser',
                          );
                          if (options.onCompleted) {
                            options.onCompleted();
                          }
                          // Clean up after completion
                          setIsProcessing(false);
                          setAbortController(null);
                          if (newReader) {
                            try {
                              newReader.releaseLock();
                            } catch (e) {
                              console.error('[STREAM DEBUG] Error releasing reader lock:', e);
                            }
                            setReader(null);
                          }
                        } else if (
                          isBatchComplete &&
                          options.onBatchComplete &&
                          validJson.processedCount
                        ) {
                          console.log(
                            '[STREAM DEBUG] Batch complete status detected in fallback parser:',
                            validJson.processedCount,
                          );
                          options.onBatchComplete(validJson.processedCount);
                        } else if (isError && validJson.message) {
                          console.log(
                            '[STREAM DEBUG] Error status detected in fallback parser:',
                            validJson.message,
                          );
                          errorDetails.push(validJson.message);
                        }

                        // Backward compatibility
                        if (validJson.isFinalBatch) {
                          console.log(
                            '[STREAM DEBUG] Legacy final batch detected in fallback parser',
                          );
                          if (options.onCompleted) {
                            options.onCompleted();
                          }
                          // Clean up after completion
                          setIsProcessing(false);
                          setAbortController(null);
                          if (newReader) {
                            try {
                              newReader.releaseLock();
                            } catch (e) {
                              console.error('[STREAM DEBUG] Error releasing reader lock:', e);
                            }
                            setReader(null);
                          }
                        } else if (
                          validJson.isBatchComplete &&
                          !validJson.isFinalBatch &&
                          options.onBatchComplete &&
                          validJson.processedCount
                        ) {
                          console.log(
                            '[STREAM DEBUG] Legacy batch complete detected in fallback parser:',
                            validJson.processedCount,
                          );
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
          }

          console.log('[STREAM DEBUG] Finished reading from stream');
          // Clean up reader
          newReader.releaseLock();
          setReader(null);
          // Stream completed normally, set processing to false
          setIsProcessing(false);
        } catch (error) {
          console.error('[STREAM DEBUG] Stream reading error:', error);
          if (options.onError) {
            options.onError(error);
          }
        } finally {
          console.log('[STREAM DEBUG] Stream reading finally block');
          // If the stream ended normally, call onCompleted if provided
          if (!newReader.closed) {
            try {
              console.log(
                '[STREAM DEBUG] Cancelling reader as it was not closed',
              );
              await newReader.cancel();
            } catch (error) {
              console.error('[STREAM DEBUG] Error cancelling reader:', error);
            }
            newReader.releaseLock();
          }
          setReader(null);
          setAbortController(null);
          setIsProcessing(false);
          console.log(
            '[STREAM DEBUG] Stream processing completed, isProcessing set to false',
          );
        }
      } catch (error) {
        console.error('[STREAM DEBUG] Error starting stream:', error);
        if (options.onError) {
          options.onError(error);
        }
        setAbortController(null);
        setIsProcessing(false);
        console.log(
          '[STREAM DEBUG] Stream error caught, isProcessing set to false',
        );
      }
    },
    [],
  );

  // Function to cancel the current processing
  const stopProcessing = useCallback(async () => {
    console.log('[STREAM DEBUG] stopProcessing called');
    if (abortController) {
      console.log('[STREAM DEBUG] Aborting controller');
      abortController.abort();
      setAbortController(null);
    }

    if (reader) {
      try {
        console.log('[STREAM DEBUG] Cancelling reader');
        await reader.cancel();
        reader.releaseLock();
        setReader(null);
      } catch (error) {
        console.error('[STREAM DEBUG] Error cancelling stream reader:', error);
      }
    }

    setIsProcessing(false);
    console.log(
      '[STREAM DEBUG] stopProcessing completed, isProcessing set to false',
    );
  }, [abortController, reader]);

  return {
    isProcessing,
    progress,
    startProcessing,
    stopProcessing,
  };
}
