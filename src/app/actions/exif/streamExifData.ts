'use server';

import { fileTypeCache } from '@/lib/file-type-cache';
import {
  markProcessingError,
  markProcessingStarted,
  sendProgress,
} from '@/lib/processing-helpers';
import type { ExtractionMethod } from '@/types/exif';
import type { ProgressType } from '@/types/progress-types';
import type { UnifiedStats } from '@/types/unified-stats';
import { getUnprocessedFiles } from './get-unprocessed-files';
import { processExifData } from './processExifData';

/**
 * Process all unprocessed items with streaming updates
 * This function returns a ReadableStream that emits progress updates
 */
export async function streamExifData({
  method,
  batchSize,
}: {
  method: ExtractionMethod;
  batchSize: number;
}) {
  const encoder = new TextEncoder();
  const MAX_FETCH_SIZE = 1000; // Supabase's limit for fetch operations
  let aborted = false;

  // Create a transform stream to send progress updates
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start processing in the background - passing options as a single object
  processUnprocessedItemsInternal({
    writer,
    method,
    batchSize,
  }).catch((error) => {
    console.error('[SERVER] Error in processUnprocessedItemsInternal:', error);

    // If the error is an abort, mark it accordingly
    const isAbortError =
      error?.name === 'AbortError' || error?.message?.includes('abort');

    sendProgress(encoder, writer, {
      status: 'failure',
      message: isAbortError
        ? 'Processing aborted by user'
        : error?.message || 'An unknown error occurred during EXIF processing',
      progressType: 'exif',
      metadata: {
        method,
      },
    }).finally(() => {
      if (!writer.closed) {
        writer.close().catch(console.error);
      }
    });
  });

  // Set up a cleanup function on the stream
  const originalCancel = stream.readable.cancel;
  stream.readable.cancel = async (message) => {
    aborted = true;
    return originalCancel?.call(stream.readable, message);
  };

  // Return the readable stream
  return stream.readable;

  async function processUnprocessedItemsInternal({
    writer,
    method,
    batchSize,
  }: {
    writer: WritableStreamDefaultWriter;
    method?: ExtractionMethod;
    batchSize: number;
    progressType?: ProgressType;
  }) {
    try {
      // Single stats object to track all counters
      const counters: UnifiedStats['counts'] = {
        total: 0, // Total processed (success + failed)
        success: 0, // Successfully processed
        failed: 0, // Failed processing
        currentBatch: 1, // Current batch number
      };

      // Helper function to get common properties for progress messages
      function getCommonProperties() {
        return {
          totalCount: counters.total,
          successCount: counters.success,
          failureCount: counters.failed,
          currentBatch: counters.currentBatch,
          batchSize: Math.min(batchSize, MAX_FETCH_SIZE), // Ensure batch size doesn't exceed max fetch size
          progressType: 'exif' as ProgressType,
        };
      }

      // Check abort immediately before starting the fetch process
      if (aborted) {
        await sendProgress(encoder, writer, {
          status: 'failure',
          message: 'Processing aborted by user',
          ...getCommonProperties(),
        });
        return;
      }

      // For Infinity mode, we'll use a loop to process in chunks
      const isInfinityMode = batchSize === Number.POSITIVE_INFINITY;
      const fetchSize = isInfinityMode ? MAX_FETCH_SIZE : batchSize;
      let hasMoreItems = true;

      while (hasMoreItems) {
        // Check abort status at the start of each batch
        if (aborted) {
          await sendProgress(encoder, writer, {
            status: 'failure',
            message: 'Processing aborted by user',
            ...getCommonProperties(),
          });
          return;
        }

        // Get this batch of unprocessed files
        const unprocessed = await getUnprocessedFiles({
          limit: fetchSize,
        });

        // Check for errors in the response
        if (unprocessed.error) {
          // Send error progress update
          await sendProgress(encoder, writer, {
            status: 'failure',
            message: `Error fetching files: ${unprocessed.error.message}. Please try again later.`,
            ...getCommonProperties(),
            metadata: {
              method,
            },
          });

          return; // Exit processing due to this critical error
        }

        const unprocessedFiles = unprocessed.data || [];

        // Set the total count of unprocessed files
        counters.total = unprocessed.count || 0;

        // If no files were returned and we're on batch 1, nothing to process at all
        if (unprocessedFiles.length === 0 && counters.currentBatch === 1) {
          await sendProgress(encoder, writer, {
            status: 'failure',
            message: 'No files to process',
            ...getCommonProperties(),
            metadata: {
              method,
            },
          });
          return;
        }

        // Check if we got back fewer than the maximum possible items
        hasMoreItems =
          isInfinityMode &&
          unprocessedFiles.length > 0 &&
          unprocessedFiles.length >= fetchSize;

        for (const media of unprocessedFiles) {
          // Check for abort signal at the start of processing each file
          if (aborted) {
            // Mark this item as aborted using our helper function
            await markProcessingError({
              mediaItemId: media.id,
              progressType: 'exif',
              errorMessage: 'Processing aborted by user',
            });

            await sendProgress(encoder, writer, {
              status: 'failure',
              message: 'Processing aborted by user',
              ...getCommonProperties(),
            });
            return;
          }

          try {
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
              await markProcessingError({
                mediaItemId: media.id,
                progressType: 'exif',
                errorMessage: 'Processing aborted by user',
              });

              await sendProgress(encoder, writer, {
                status: 'failure',
                message: 'Processing aborted by user',
                ...getCommonProperties(),
              });
              return;
            }

            // If errorReason is set, mark as errored and continue
            if (errorReason) {
              await markProcessingError({
                mediaItemId: media.id,
                progressType: 'exif',
                errorMessage: `Errored due to ${errorReason}`,
              });

              counters.total++;
              counters.failed++;

              await sendProgress(encoder, writer, {
                status: 'failure',
                message: `Errored: ${errorReason} (${media.file_name})`,
                ...getCommonProperties(),
                metadata: {
                  method,
                  fileType: media.file_types?.extension,
                },
              });
              continue;
            }

            // Check abort again before marking as processing
            if (aborted) {
              await sendProgress(encoder, writer, {
                status: 'failure',
                message: 'Processing aborted by user',
                ...getCommonProperties(),
              });
              return;
            }

            // Mark as processing before we begin
            await markProcessingStarted({
              mediaItemId: media.id,
              progressType: 'exif',
              errorMessage: `Processing started for ${media.file_name}`,
            });

            // Send update before processing each file
            await sendProgress(encoder, writer, {
              status: 'processing',
              message: `Processing ${counters.total + 1}: ${media.file_name}`,
              ...getCommonProperties(),
              metadata: {
                method,
                fileType: media.file_types?.extension,
              },
            });

            if (media.id) {
              // Check abort before starting the actual EXIF processing
              if (aborted) {
                await markProcessingError({
                  mediaItemId: media.id,
                  progressType: 'exif',
                  errorMessage: 'Processing aborted by user',
                });

                await sendProgress(encoder, writer, {
                  status: 'failure',
                  message: 'Processing aborted by user',
                  ...getCommonProperties(),
                });
                return;
              }

              const result = await processExifData({
                mediaId: media.id,
                method: method || 'default',
                progressCallback: async (message) => {
                  // Check for abort again during processing
                  if (aborted) {
                    throw new Error('Processing aborted by user');
                  }

                  // Send granular progress updates with only message change
                  await sendProgress(encoder, writer, {
                    status: 'processing',
                    message: `${message} - ${media.file_name}`,
                    ...getCommonProperties(),
                    metadata: {
                      method,
                      fileType: media.file_types?.extension,
                    },
                  });
                },
              });

              // Update counters
              counters.total++;
              if (result.success) {
                counters.success++;
              } else {
                counters.failed++;
              }
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
                progressType: 'exif',
                errorMessage: 'Processing aborted by user',
              });

              await sendProgress(encoder, writer, {
                status: 'failure',
                message: 'EXIF processing aborted by user',
                ...getCommonProperties(),
                metadata: {
                  method,
                  fileType: media.file_types?.extension,
                },
              });

              return; // Only return from processing for abort errors
            }

            console.error(`Error processing file ${media.file_path}:`, error);

            // Use our helper function for error processing
            await markProcessingError({
              mediaItemId: media.id,
              progressType: 'exif',
              errorMessage:
                error?.message || 'Unknown error during EXIF processing',
            });

            counters.total++;
            counters.failed++;

            // Send error update with only changed properties
            await sendProgress(encoder, writer, {
              status: 'failure', // Changed from 'failure' to 'error' to indicate individual file error
              message: `Error processing file ${media.file_name}: ${error.message}. Continuing with next file...`,
              ...getCommonProperties(),
              metadata: {
                method,
                fileType: media.file_types?.extension,
              },
            });

            // No return statement here - this allows processing to continue with the next file
          }
        }

        // Check for abortion after batch processing
        if (aborted) {
          await sendProgress(encoder, writer, {
            status: 'failure',
            message: 'Processing aborted by user',
            ...getCommonProperties(),
            metadata: {
              method,
            },
          });
          return;
        }

        // After finishing a batch, if we're in infinity mode and have more batches to go
        if (hasMoreItems) {
          // Send a batch completion update with minimal properties
          await sendProgress(encoder, writer, {
            status: 'batch_complete', // Use status instead of a separate flag
            message: `Finished batch ${Number(counters.currentBatch)}. Continuing with next batch...`,
            ...getCommonProperties(),
          });
        }
      }

      if (aborted) {
        await sendProgress(encoder, writer, {
          status: 'failure',
          message: 'Processing aborted by user',
          ...getCommonProperties(),
        });
        return;
      }

      // Prepare final message after all batches are processed
      const finalMessage = `EXIF processing completed. Processed ${counters.total} files: ${counters.success} successful, ${counters.failed} failed.`;

      // Send final progress update with a clear completion status
      await sendProgress(encoder, writer, {
        status: 'complete', // Use status instead of a separate flag
        message: finalMessage,
        ...getCommonProperties(),
      });
    } catch (error: any) {
      console.error('[SERVER] Error during EXIF processing:', error);

      // Check if this was an abort
      const isAbortError =
        error.name === 'AbortError' || error.message?.includes('aborted');

      await sendProgress(encoder, writer, {
        status: 'failure',
        message: isAbortError
          ? 'Processing aborted by user'
          : error?.message ||
            'An unknown error occurred during EXIF processing',
        // Reset counts on final error
        processedCount: 0,
        successCount: 0,
        failureCount: 0,
        totalCount: 0,
      });
    } finally {
      // Close the stream to signal completion to the client
      if (!writer.closed) {
        await writer.close();
      }
    }
  }
}
