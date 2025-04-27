'use server';

import { getUnprocessedFiles } from '@/lib/exif-utils';
import { fileTypeCache } from '@/lib/file-type-cache';
import {
  markProcessingError,
  markProcessingStarted,
} from '@/lib/processing-helpers';
import type { ExtractionMethod } from '@/types/exif';
import type { UnifiedStats } from '@/types/unified-stats';
import { sendProgress } from '../processing/send-progress';
import { processExifData } from './processExifData';

/**
 * Process all unprocessed items with streaming updates
 * This function returns a ReadableStream that emits progress updates
 */
export async function streamExifData({
  extractionMethod,
  batchSize,
}: {
  extractionMethod: ExtractionMethod;
  batchSize: number;
}) {
  console.log(
    '[SERVER] streamExifData called with method:',
    extractionMethod,
    'batchSize:',
    batchSize,
  );

  const encoder = new TextEncoder();
  const MAX_FETCH_SIZE = 1000; // Supabase's limit for fetch operations
  let aborted = false;

  // Create a transform stream to send progress updates
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  console.log('[SERVER] Created TransformStream');

  // Start processing in the background - passing options as a single object
  processUnprocessedItemsInternal({
    writer,
    extractionMethod,
    batchSize,
  }).catch((error) => {
    console.error('[SERVER] Error in processUnprocessedItemsInternal:', error);

    // If the error is an abort, mark it accordingly
    const isAbortError =
      error?.name === 'AbortError' || error?.message?.includes('abort');

    sendProgress(encoder, writer, {
      stage: 'failure',
      message: isAbortError
        ? 'Processing aborted by user'
        : error?.message || 'An unknown error occurred during EXIF processing',
      metadata: {
        processingType: 'exif',
        extractionMethod,
      },
    }).finally(() => {
      if (!writer.closed) {
        console.log('[SERVER] Closing writer from error handler');
        writer.close().catch(console.error);
      }
    });
  });

  // Set up a cleanup function on the stream
  console.log('[SERVER] Setting up cleanup function on stream');
  const originalCancel = stream.readable.cancel;
  stream.readable.cancel = async (message) => {
    console.log('[SERVER] Stream cancel called with message:', message);
    aborted = true;
    console.log('[SERVER] Abort flag set to true');
    return originalCancel?.call(stream.readable, message);
  };

  // Return the readable stream
  console.log('[SERVER] Returning readable stream');
  return stream.readable;

  async function processUnprocessedItemsInternal({
    writer,
    extractionMethod,
    batchSize,
  }: {
    writer: WritableStreamDefaultWriter;
    extractionMethod?: ExtractionMethod;
    batchSize: number;
  }) {
    console.log('[SERVER] processUnprocessedItemsInternal started');

    try {
      // Single stats object to track all counters
      const counters: UnifiedStats['counts'] & {
        discovered: number; // Add discovered property to track total discovered files
        currentBatch: number; // Track current batch number
      } = {
        total: 0, // Total processed (success + failed)
        success: 0, // Successfully processed
        failed: 0, // Failed processing
        discovered: 0, // Total files discovered
        currentBatch: 1, // Current batch number
      };

      // Helper function to get common properties for progress messages
      function getCommonProperties() {
        return {
          processedCount: counters.total,
          totalCount: counters.discovered,
          successCount: counters.success,
          failureCount: counters.failed,
        };
      }

      // Check abort immediately before starting the fetch process
      if (aborted) {
        console.log('[SERVER] Aborted before starting batch processing');
        await sendProgress(encoder, writer, {
          stage: 'failure',
          message: 'Processing aborted by user',
          ...getCommonProperties(),
        });
        return;
      }

      // For Infinity mode, we'll use a loop to process in chunks
      const isInfinityMode = batchSize === Number.POSITIVE_INFINITY;
      const fetchSize = isInfinityMode ? MAX_FETCH_SIZE : batchSize;
      let hasMoreItems = true;

      console.log(
        '[SERVER] Starting batch processing with fetchSize:',
        fetchSize,
      );

      while (hasMoreItems) {
        // Check abort status at the start of each batch
        if (aborted) {
          console.log('[SERVER] Aborted at start of batch loop');
          await sendProgress(encoder, writer, {
            stage: 'failure',
            message: 'Processing aborted by user',
            ...getCommonProperties(),
          });
          return;
        }

        console.log('[SERVER] Processing batch', counters.currentBatch);

        // Get this batch of unprocessed files
        console.log('[SERVER] Fetching unprocessed files, limit:', fetchSize);
        const unprocessedFiles = await getUnprocessedFiles({
          limit: fetchSize,
        });
        console.log('unprocessedFiles: ', unprocessedFiles[0])

        // Check abort state again after the potentially long database operation
        if (aborted) {
          console.log('[SERVER] Aborted after fetching files');
          await sendProgress(encoder, writer, {
            stage: 'failure',
            message: 'Processing aborted by user',
            ...getCommonProperties(),
          });
          return;
        }

        console.log(
          '[SERVER] Fetched',
          unprocessedFiles.length,
          'unprocessed files',
        );

        // If no files were returned and we're on batch 1, nothing to process at all
        if (unprocessedFiles.length === 0 && counters.currentBatch === 1) {
          console.log('[SERVER] No files to process');
          await sendProgress(encoder, writer, {
            stage: 'failure',
            message: 'No files to process',
            totalCount: 0,
            successCount: 0,
            failureCount: 0,
            metadata: {
              processingType: 'exif',
              extractionMethod,
            },
          });
          return;
        }

        // Check if we got back fewer than the maximum possible items
        hasMoreItems =
          isInfinityMode &&
          unprocessedFiles.length > 0 &&
          unprocessedFiles.length >= fetchSize;

        counters.discovered += unprocessedFiles.length;
        console.log('[SERVER] Total files discovered:', counters.discovered);

        for (const media of unprocessedFiles) {
          // Check for abort signal at the start of processing each file
          if (aborted) {
            console.log(
              '[SERVER] Processing aborted before file:',
              media.file_name,
            );
            // Mark this item as aborted using our helper function
            await markProcessingError({
              mediaItemId: media.id,
              type: 'exif',
              error: 'Processing aborted by user',
            });

            await sendProgress(encoder, writer, {
              stage: 'failure',
              message: 'Processing aborted by user',
              ...getCommonProperties(),
            });
            return;
          }

          try {
            console.log('[SERVER] Processing file:', media.file_name);
            // Check for ignored or unsupported file types
            let errorReason: string | null = null;
            const fileTypeId = media.file_type_id ?? media.file_types?.id;
            const fileExt = media.file_types?.extension;
            if (fileTypeId) {
              const fileType = await fileTypeCache.getFileTypeById(fileTypeId);
              if (fileType?.ignore) {
                errorReason = 'Ignored file type';
              }
            } else if (fileExt) {
              // If no fileTypeId, fallback to extension check
              const info = await fileTypeCache.getDetailedInfo();
              if (info?.ignoredExtensions.includes(fileExt.toLowerCase())) {
                errorReason = 'Ignored file type';
              } else if (
                !info ||
                !info.extensionToCategory[fileExt.toLowerCase()]
              ) {
                errorReason = 'Unsupported file type';
              }
            } else {
              errorReason = 'Unknown or missing file type';
            }

            // Check for abort again after file type checks
            if (aborted) {
              console.log('[SERVER] Aborted during file type checks');
              await markProcessingError({
                mediaItemId: media.id,
                type: 'exif',
                error: 'Processing aborted by user',
              });

              await sendProgress(encoder, writer, {
                stage: 'failure',
                message: 'Processing aborted by user',
                ...getCommonProperties(),
              });
              return;
            }

            // If errorReason is set, mark as errored and continue
            if (errorReason) {
              console.log('[SERVER] File has error reason:', errorReason);
              await markProcessingError({
                mediaItemId: media.id,
                type: 'exif',
                error: `Errored due to ${errorReason}`,
              });

              counters.total++;
              counters.failed++;

              await sendProgress(encoder, writer, {
                stage: 'failure',
                message: `Errored: ${errorReason} (${media.file_name})`,
                processedCount: counters.total,
                totalCount: counters.discovered,
                successCount: counters.success,
                failureCount: counters.failed,
                metadata: {
                  processingType: 'exif',
                  extractionMethod,
                  fileType: media.file_types?.extension,
                },
              });
              continue;
            }

            // Mark as processing before we begin
            console.log(
              '[SERVER] Marking file as processing:',
              media.file_name,
            );

            // Check abort again before marking as processing
            if (aborted) {
              console.log('[SERVER] Aborted before marking as processing');
              await sendProgress(encoder, writer, {
                stage: 'failure',
                message: 'Processing aborted by user',
                ...getCommonProperties(),
              });
              return;
            }

            await markProcessingStarted({
              mediaItemId: media.id,
              type: 'exif',
              message: `Processing started for ${media.file_name}`,
            });

            // Send update before processing each file
            console.log(
              '[SERVER] Sending progress update for file:',
              media.file_name,
            );
            await sendProgress(encoder, writer, {
              stage: 'processing',
              message: `Processing ${counters.total + 1}: ${media.file_name}`,
              metadata: {
                processingType: 'exif',
                extractionMethod,
                fileType: media.file_types?.extension,
              },
              ...getCommonProperties(),
            });

            if (media.id) {
              // Check abort before starting the actual EXIF processing
              if (aborted) {
                console.log('[SERVER] Aborted before EXIF processing');
                await markProcessingError({
                  mediaItemId: media.id,
                  type: 'exif',
                  error: 'Processing aborted by user',
                });

                await sendProgress(encoder, writer, {
                  stage: 'failure',
                  message: 'Processing aborted by user',
                  ...getCommonProperties(),
                });
                return;
              }

              console.log(
                '[SERVER] Calling processExifData for:',
                media.file_name,
              );
              const result = await processExifData({
                mediaId: media.id,
                method: extractionMethod || 'default',
                progressCallback: async (message) => {
                  // Check for abort again during processing
                  if (aborted) {
                    console.log('[SERVER] Aborted during processing callback');
                    throw new Error('Processing aborted by user');
                  }

                  // Send granular progress updates with only message change
                  console.log('[SERVER] Progress callback:', message);
                  await sendProgress(encoder, writer, {
                    stage: 'processing',
                    message: `${message} - ${media.file_name}`,
                    metadata: {
                      processingType: 'exif',
                      extractionMethod,
                      fileType: media.file_types?.extension,
                    },
                    ...getCommonProperties(),
                  });
                },
              });
              console.log(
                '[SERVER] processExifData result for',
                media.file_name,
                ':',
                result,
              );

              // Update counters
              counters.total++;
              if (result.success) {
                counters.success++;
              } else {
                counters.failed++;
              }
              console.log(
                '[SERVER] Updated counters - processed:',
                counters.total,
                'success:',
                counters.success,
                'failed:',
                counters.failed,
              );
            }
          } catch (error: any) {
            // Check if this was an abort error
            if (
              error.name === 'AbortError' ||
              error.message?.includes('aborted')
            ) {
              aborted = true;

              // Mark this item as aborted using our helper function
              await markProcessingError({
                mediaItemId: media.id,
                type: 'exif',
                error: 'Processing aborted by user',
              });

              await sendProgress(encoder, writer, {
                stage: 'failure',
                message: 'EXIF processing aborted by user',
                metadata: {
                  processingType: 'exif',
                  extractionMethod,
                  fileType: media.file_types?.extension,
                },
                ...getCommonProperties(),
              });

              return;
            }

            console.error(`Error processing file ${media.file_path}:`, error);

            // Use our helper function for error processing
            await markProcessingError({
              mediaItemId: media.id,
              type: 'exif',
              error: error?.message || 'Unknown error during EXIF processing',
            });

            counters.total++;
            counters.failed++;

            // Send error update with only changed properties
            await sendProgress(encoder, writer, {
              stage: 'failure',
              message: `Error processing file: ${error.message}`,
              metadata: {
                processingType: 'exif',
                extractionMethod,
                fileType: media.file_types?.extension,
              },
              ...getCommonProperties(),
            });
          }
        }

        // Check for abortion after batch processing
        if (aborted) {
          console.log('[SERVER] Processing aborted after batch');
          await sendProgress(encoder, writer, {
            stage: 'failure',
            message: 'Processing aborted by user',
            metadata: {
              processingType: 'exif',
              extractionMethod,
            },
            ...getCommonProperties(),
          });
          return;
        }

        // After finishing a batch, if we're in infinity mode and have more batches to go
        if (hasMoreItems) {
          console.log(
            '[SERVER] Batch',
            counters.currentBatch,
            'completed, more items available',
          );
          counters.currentBatch++;

          // Send a batch completion update with minimal properties
          await sendProgress(encoder, writer, {
            stage: 'batch_complete', // Use status instead of a separate flag
            message: `Finished batch ${counters.currentBatch - 1}. Continuing with next batch...`,
            ...getCommonProperties(),
          });
        } else {
          console.log('[SERVER] All batches processed, no more items');
        }
      }

      if (aborted) {
        console.log('[SERVER] Final aborted check, returning early');
        await sendProgress(encoder, writer, {
          stage: 'failure',
          message: 'Processing aborted by user',
          ...getCommonProperties(),
        });
        return;
      }

      // Prepare final message after all batches are processed
      const finalMessage = `EXIF processing completed. Processed ${counters.total} files: ${counters.success} successful, ${counters.failed} failed.`;
      console.log('[SERVER] Sending final progress update:', finalMessage);

      // Send final progress update with a clear completion status
      await sendProgress(encoder, writer, {
        stage: 'complete', // Use status instead of a separate flag
        message: finalMessage,
        ...getCommonProperties(),
      });
      console.log('[SERVER] Final progress update sent');
    } catch (error: any) {
      console.error('[SERVER] Error during EXIF processing:', error);

      // Check if this was an abort
      const isAbortError =
        error.name === 'AbortError' || error.message?.includes('aborted');

      await sendProgress(encoder, writer, {
        stage: 'failure',
        message: isAbortError
          ? 'Processing aborted by user'
          : error?.message ||
            'An unknown error occurred during EXIF processing',
        // Reset counts on final error
        processedCount: 0,
        successCount: 0,
        failureCount: 0,
      });
    } finally {
      // Close the stream to signal completion to the client
      console.log('[SERVER] Closing writer in finally block');
      if (!writer.closed) {
        await writer.close();
        console.log('[SERVER] Writer closed');
      }
    }
  }
}
