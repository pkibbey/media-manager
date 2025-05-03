'use server';

import {
  markProcessingError,
  markProcessingSuccess,
  sendProgress,
} from '@/lib/processing-helpers';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { ProgressType } from '@/types/progress-types';
import type { Method, UnifiedStats } from '@/types/unified-stats';
import { generateThumbnail } from './generate-thumbnail';

/**
 * Process all unprocessed thumbnails with streaming updates
 * Returns a ReadableStream that emits progress updates
 */
export async function streamThumbnails({
  batchSize = 100,
  method = 'default',
}: {
  batchSize?: number;
  method?: Method;
}) {
  const encoder = new TextEncoder();
  const MAX_FETCH_SIZE = 1000; // Supabase's limit for fetch operations

  // Create a transform stream to send progress updates
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start processing in the background - DO NOT await this call
  processUnprocessedThumbnailsInternal({
    writer,
    batchSize,
    method,
  }).catch(async (error) => {
    console.error('Background processing error:', error);
    try {
      await sendProgress(encoder, writer, {
        status: 'failure',
        message: `Critical server error during processing: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processedCount: 0,
        successCount: 0,
        failureCount: 0,
        totalCount: 0,
        progressType: 'thumbnail',
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

  // Set up a cleanup function on the stream
  const originalCancel = stream.readable.cancel;
  stream.readable.cancel = async (message) => {
    // Call the original cancel method
    return originalCancel?.call(stream.readable, message);
  };

  // Return the readable stream immediately
  return stream.readable;

  async function processUnprocessedThumbnailsInternal({
    writer,
    batchSize,
    method,
  }: {
    writer: WritableStreamDefaultWriter;
    batchSize: number;
    method: Method;
  }) {
    try {
      // Single stats object to track all counters
      const counters: UnifiedStats['counts'] & {
        totalAvailable: number; // Total available files in the database
        processedCount: number; // Count of files processed in this session
        currentBatch: number; // Current batch number
      } = {
        total: 0, // Will be set from the database query
        success: 0, // Successfully processed
        failed: 0, // Failed processing
        totalAvailable: 0, // Total files discovered
        processedCount: 0, // Files processed in this session
        currentBatch: 1, // Current batch number
      };

      function getCommonProperties() {
        return {
          totalCount: counters.totalAvailable,
          processedCount: counters.processedCount,
          successCount: counters.success,
          failureCount: counters.failed,
          currentBatch: counters.currentBatch,
          batchSize: Math.min(batchSize, MAX_FETCH_SIZE), // Ensure batch size doesn't exceed max fetch size
          progressType: 'thumbnail' as ProgressType,
        };
      }

      // For Infinity mode, we'll use a loop to process in chunks
      const isInfinityMode = batchSize === Number.POSITIVE_INFINITY;
      const fetchSize = isInfinityMode ? MAX_FETCH_SIZE : batchSize;
      let hasMoreItems = true;

      while (hasMoreItems) {
        // Get this batch of unprocessed files
        const unprocessed = await getUnprocessedFilesForThumbnails({
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

        // Process each file in this batch
        for (const media of unprocessedFiles) {
          try {
            // Send update before processing each file
            await sendProgress(encoder, writer, {
              status: 'processing',
              message: isInfinityMode
                ? `Batch ${counters.currentBatch}: Processing: ${media.file_name}`
                : `Processing: ${media.file_name}`,
              ...getCommonProperties(),
              metadata: {
                method,
              },
            });

            // Generate thumbnail with the specified method
            const result = await generateThumbnail(media.id, { method });

            // Update counters
            counters.processedCount++;

            if (result.success) {
              counters.success++;
              // Mark as success
              await markProcessingSuccess({
                mediaItemId: media.id,
                progressType: 'thumbnail',
                errorMessage:
                  result.message || 'Thumbnail generated successfully',
              });
            } else {
              counters.failed++;
              console.error(
                `[streamThumbnails] [Batch ${counters.currentBatch}] Failed: ${media.file_name} - ${result.message}`,
              );
              // Mark as error in the database using our helper
              await markProcessingError({
                mediaItemId: media.id,
                progressType: 'thumbnail',
                errorMessage:
                  result.message || 'Unknown thumbnail generation error',
              });
            }

            // Send progress update
            await sendProgress(encoder, writer, {
              status: 'processing',
              message: result.message,
              ...getCommonProperties(),
              metadata: {
                method,
              },
            });
          } catch (error: any) {
            counters.processedCount++;
            counters.failed++;
            console.error(
              `[streamThumbnails] [Batch ${counters.currentBatch}] Exception for ${media.file_name}:`,
              error,
            );
            // Update the processing state to error using our helper
            await markProcessingError({
              mediaItemId: media.id,
              progressType: 'thumbnail',
              errorMessage:
                error.message || 'Unknown error during thumbnail generation',
            });

            // Send error update
            await sendProgress(encoder, writer, {
              status: 'failure',
              message: `Error generating thumbnail: ${error.message}`,
              ...getCommonProperties(),
              metadata: {
                method,
              },
            });
          }
        }

        // After finishing a batch, if we're in infinity mode and have more batches to go
        // If not infinity mode, exit the loop after the first batch
        if (!isInfinityMode || unprocessedFiles.length < fetchSize) {
          hasMoreItems = false;
        } else {
          counters.currentBatch++;
          // Send a batch completion update
          await sendProgress(encoder, writer, {
            status: 'batch_complete',
            message: `Finished batch ${counters.currentBatch - 1}. Continuing with next batch...`,
            ...getCommonProperties(),
            progressType: 'thumbnail',
            metadata: {
              method,
            },
          });
        }
      }

      // Send final progress update
      const finalMessage = isInfinityMode
        ? `All processing completed. Generated ${counters.success} thumbnails (${counters.failed} failed) using ${method}`
        : `Thumbnail generation completed. Generated ${counters.success} thumbnails (${counters.failed} failed) using ${method}`;

      await sendProgress(encoder, writer, {
        status: 'complete',
        message: finalMessage,
        ...getCommonProperties(),
        progressType: 'thumbnail',
        metadata: {
          method,
        },
      });
    } catch (error: any) {
      // Log the error caught within the processing function
      console.error(
        '[streamThumbnails] Unhandled error in batch processing:',
        error,
      );
      // Send a failure progress update through the stream
      await sendProgress(encoder, writer, {
        status: 'failure',
        message:
          error?.message ||
          'An unknown error occurred during thumbnail generation',
        processedCount: 0,
        successCount: 0,
        failureCount: 0,
        totalCount: 0,
        progressType: 'thumbnail',
        metadata: {
          method,
        },
      });
    } finally {
      // Close the stream to signal completion to the client
      if (!writer.closed) {
        try {
          await writer.close();
        } catch (closeError) {
          console.error(
            '[streamThumbnails] Error closing writer in finally block:',
            closeError,
          );
        }
      }
    }
  }
}

// Helper function to get unprocessed files specifically for thumbnails
async function getUnprocessedFilesForThumbnails({ limit }: { limit: number }) {
  const supabase = createServerSupabaseClient();

  // First, get media items with no thumbnail path and no processing state
  return await supabase
    .from('media_items')
    .select(
      '*, file_types!inner(category, ignore), processing_states!inner(type)', // Select relevant fields
      {
        count: 'exact',
      },
    )
    .eq('file_types.category', 'image')
    .is('file_types.ignore', false)
    .is('thumbnail_path', null)
    .not('processing_states.type', 'eq', 'thumbnail')
    .limit(limit);
}
