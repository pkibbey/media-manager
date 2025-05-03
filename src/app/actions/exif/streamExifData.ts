'use server';

import {
  markProcessingError,
  markProcessingStarted,
  markProcessingSuccess,
  sendProgress,
} from '@/lib/processing-helpers';
import type { ProgressType } from '@/types/progress-types';
import type { Method } from '@/types/unified-stats';
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
  method: Method;
  batchSize: number;
}) {
  const encoder = new TextEncoder();
  const MAX_FETCH_SIZE = 1000; // Supabase's limit for fetch operations

  // Create a transform stream to send progress updates
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start processing in the background - DO NOT await this call
  processUnprocessedItemsInternal({
    writer,
    method,
    batchSize,
  }).catch(async (error) => {
    // Catch errors from the background processing and send a final error message
    console.error('Background processing error:', error);
    try {
      await sendProgress(encoder, writer, {
        status: 'failure',
        message: `Critical server error during processing: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processedCount: 0,
        successCount: 0,
        failureCount: 0,
        totalCount: 0,
      });
    } catch (sendError) {
      console.error('Error sending final error progress:', sendError);
    } finally {
      // Ensure the writer is closed even if sending the error fails
      if (!writer.closed) {
        try {
          await writer.close();
        } catch (closeError) {
          console.error(
            'Error closing writer after background error:',
            closeError,
          );
        }
      }
    }
  });

  // Return the readable stream immediately
  return stream.readable;

  async function processUnprocessedItemsInternal({
    writer,
    method,
    batchSize,
  }: {
    writer: WritableStreamDefaultWriter;
    method?: Method;
    batchSize: number;
    progressType?: ProgressType;
  }) {
    try {
      // Single stats object to track all counters
      const counters: UnifiedStats['counts'] & {
        totalAvailable: number; // Total available files in the database
        processedCount: number; // Count of files processed in this session
      } = {
        total: 0, // Will be set from the database query
        success: 0, // Successfully processed
        failed: 0, // Failed processing
        processedCount: 0, // Files processed in this session
        totalAvailable: 0, // Total available for processing
        currentBatch: 1, // Current batch number
      };

      // Helper function to get common properties for progress messages
      function getCommonProperties() {
        return {
          totalCount: counters.totalAvailable,
          processedCount: counters.processedCount,
          successCount: counters.success,
          failureCount: counters.failed,
          currentBatch: counters.currentBatch,
          batchSize: Math.min(batchSize, MAX_FETCH_SIZE), // Ensure batch size doesn't exceed max fetch size
          progressType: 'exif' as ProgressType,
        };
      }

      // For Infinity mode, we'll use a loop to process in chunks
      const isInfinityMode = batchSize === Number.POSITIVE_INFINITY;
      const fetchSize = isInfinityMode ? MAX_FETCH_SIZE : batchSize;
      let hasMoreItems = true;

      while (hasMoreItems) {
        // Before fetching files
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

        // Set the total count of unprocessed files from database
        counters.totalAvailable = unprocessed.count || 0;
        counters.total = counters.totalAvailable; // Update the standard total as well

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
          try {
            // Time database operations
            await markProcessingStarted({
              mediaItemId: media.id,
              progressType: 'exif',
              errorMessage: `Processing started for ${media.file_name}`,
            });

            if (media.id) {
              const result = await processExifData({
                mediaId: media.id,
                method: method || 'default',
                progressCallback: async (message) => {
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
              counters.processedCount++;
              if (result.success) {
                counters.success++;
                // Double-check that the success state is set
                // This is a safety check in case processExifData didn't set it for some reason
                await markProcessingSuccess({
                  mediaItemId: media.id,
                  progressType: 'exif',
                  errorMessage: `EXIF data processed successfully for ${media.file_name}`,
                });
              } else {
                counters.failed++;
                // Double-check that the error state is set
                // processExifData should have set this, but adding here for safety
                await markProcessingError({
                  mediaItemId: media.id,
                  progressType: 'exif',
                  errorMessage:
                    result?.message ||
                    `Failed to process EXIF data for ${media.file_name}`,
                });
              }
            }
          } catch (error: any) {
            // Use our helper function for error processing
            await markProcessingError({
              mediaItemId: media.id,
              progressType: 'exif',
              errorMessage:
                error?.message || 'Unknown error during EXIF processing',
            });

            counters.processedCount++;
            counters.failed++;

            // Send error update with only changed properties
            await sendProgress(encoder, writer, {
              status: 'failure',
              message: `Error processing file ${media.file_name}: ${error.message}. Continuing with next file...`,
              ...getCommonProperties(),
              metadata: {
                method,
                fileType: media.file_types?.extension,
              },
            });
          }
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

      // Prepare final message after all batches are processed
      const finalMessage = `EXIF processing completed. Processed ${counters.processedCount} files: ${counters.success} successful, ${counters.failed} failed.`;

      // Send final progress update with a clear completion status
      await sendProgress(encoder, writer, {
        status: 'complete', // Use status instead of a separate flag
        message: finalMessage,
        ...getCommonProperties(),
      });
    } catch (error: any) {
      // Log the error caught within the processing function
      console.error(
        'Error within processUnprocessedItemsInternal try block:',
        error,
      );
      // Send a failure progress update through the stream
      await sendProgress(encoder, writer, {
        status: 'failure',
        message:
          error?.message || 'An unknown error occurred during EXIF processing',
        // Reset counts on final error
        processedCount: 0,
        successCount: 0,
        failureCount: 0,
        totalCount: 0,
      });
    } finally {
      // Close the stream to signal completion to the client
      if (!writer.closed) {
        try {
          await writer.close();
        } catch (closeError) {
          console.error('Error closing writer in finally block:', closeError);
        }
      }
    }
  }
}
