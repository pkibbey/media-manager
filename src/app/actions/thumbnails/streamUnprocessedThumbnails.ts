'use server';

import { includeMedia } from '@/lib/mediaFilters';
import {
  markProcessingAborted,
  markProcessingError,
  markProcessingSkipped,
  markProcessingSuccess,
} from '@/lib/processing-helpers';
import { sendProgress } from '@/lib/query-helpers';
import { createServerSupabaseClient } from '@/lib/supabase';
import { generateThumbnail } from './generateThumbnail';

/**
 * Process all unprocessed thumbnails with streaming updates
 * Returns a ReadableStream that emits progress updates
 */
export async function streamUnprocessedThumbnails({
  batchSize = 100,
}: {
  batchSize?: number;
}) {
  const encoder = new TextEncoder();
  const MAX_FETCH_SIZE = 1000; // Supabase's limit for fetch operations
  let aborted = false;

  // Create a transform stream to send progress updates
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start processing in the background
  processUnprocessedThumbnailsInternal({
    writer,
    batchSize,
  })
    .catch(async (error) => {
      const isAbortError =
        error?.name === 'AbortError' || error?.message?.includes('abort');

      await sendProgress(encoder, writer, {
        status: isAbortError ? 'aborted' : 'error',
        message: isAbortError
          ? 'Thumbnail generation aborted'
          : 'Error during thumbnail generation',
        error: isAbortError
          ? 'Processing aborted by user'
          : error?.message ||
            'An unknown error occurred during thumbnail generation',
      });
    })
    .finally(() => {
      writer.close().catch(console.error);
    });

  // Set up a cleanup function on the stream
  const originalCancel = stream.readable.cancel;
  stream.readable.cancel = async (reason) => {
    aborted = true;
    // Call the original cancel method
    return originalCancel?.call(stream.readable, reason);
  };

  // Return the readable stream
  return stream.readable;

  async function processUnprocessedThumbnailsInternal({
    writer,
    batchSize,
  }: {
    writer: WritableStreamDefaultWriter;
    batchSize: number;
  }) {
    try {
      // Track overall statistics across multiple batches if Infinity is selected
      let totalItemsProcessed = 0;
      let totalSuccessCount = 0;
      let totalFailedCount = 0;
      let totalSkippedLargeFilesCount = 0;
      let totalFilesDiscovered = 0;

      // For Infinity mode, we'll use a loop to process in chunks
      const isInfinityMode = batchSize === Number.POSITIVE_INFINITY;
      const fetchSize = isInfinityMode ? MAX_FETCH_SIZE : batchSize;
      let hasMoreItems = true;
      let currentBatch = 1;

      while (hasMoreItems && !aborted) {
        // Get this batch of unprocessed files
        const { unprocessedFiles, totalItems } =
          await getUnprocessedFilesForThumbnails({
            limit: fetchSize,
          });

        // If no files were returned and we're on batch 1, nothing to process at all
        if (
          unprocessedFiles === undefined ||
          (unprocessedFiles.length === 0 && currentBatch === 1)
        ) {
          await sendProgress(encoder, writer, {
            status: 'success',
            message: 'No files to process',
            totalItems,
            processed: 0,
            successCount: 0,
            failedCount: 0,
            skippedLargeFiles: 0,
          });
          return;
        }

        // If we're in Infinity mode, we'll keep going until no more files are found
        hasMoreItems =
          isInfinityMode &&
          unprocessedFiles.length > 0 &&
          unprocessedFiles.length >= fetchSize;

        totalFilesDiscovered += unprocessedFiles.length;

        // Process each media file in this batch
        let batchProcessedCount = 0;
        let batchSuccessCount = 0;
        let batchFailedCount = 0;
        let batchSkippedLargeFilesCount = 0;

        // Send initial progress update for this batch
        await sendProgress(encoder, writer, {
          status: 'processing',
          message: isInfinityMode
            ? `Starting batch ${currentBatch}: Processing ${unprocessedFiles.length} files...`
            : `Starting thumbnail generation for ${unprocessedFiles.length} files...`,
          totalItems: isInfinityMode
            ? totalFilesDiscovered
            : unprocessedFiles.length,
          processed: totalItemsProcessed,
          successCount: totalSuccessCount,
          failedCount: totalFailedCount,
          skippedLargeFiles: totalSkippedLargeFilesCount,
          metadata: {
            processingType: 'thumbnail',
            fileType: unprocessedFiles[0]?.file_types?.extension,
          },
        });

        for (const media of unprocessedFiles) {
          // Check for abort signal at the start of each iteration
          if (aborted) {
            // Mark this item as aborted using our helper
            await markProcessingAborted({
              mediaItemId: media.id,
              type: 'thumbnail',
              reason: 'Thumbnail generation aborted by user',
            });
            break;
          }

          try {
            // Send update before processing each file
            await sendProgress(encoder, writer, {
              status: 'processing',
              message: isInfinityMode
                ? `Batch ${currentBatch}: Processing: ${media.file_name}`
                : `Processing: ${media.file_name}`,
              totalItems,
              processed: isInfinityMode
                ? totalItemsProcessed
                : batchProcessedCount,
              successCount: isInfinityMode
                ? totalSuccessCount
                : batchSuccessCount,
              failedCount: isInfinityMode ? totalFailedCount : batchFailedCount,
              skippedLargeFiles: isInfinityMode
                ? totalSkippedLargeFilesCount
                : batchSkippedLargeFilesCount,
              currentItem: media.id,
              metadata: {
                processingType: 'thumbnail',
                fileType: media.file_types?.extension,
              },
            });

            // Generate thumbnail - pass along the abort token
            const result = await generateThumbnail(media.id);

            // Update counters
            batchProcessedCount++;
            totalItemsProcessed++;

            if (result.success) {
              if (result.skipped) {
                batchSkippedLargeFilesCount++;
                totalSkippedLargeFilesCount++;

                // Mark explicitly as skipped in the database using our helper
                await markProcessingSkipped({
                  mediaItemId: media.id,
                  type: 'thumbnail',
                  reason: result.message || 'Skipped large file',
                });
              } else {
                batchSuccessCount++;
                totalSuccessCount++;

                // Mark as success
                await markProcessingSuccess({
                  mediaItemId: media.id,
                  type: 'thumbnail',
                  message: result.message || 'Thumbnail generated successfully',
                });
              }
            } else {
              batchFailedCount++;
              totalFailedCount++;

              // Mark as error in the database using our helper
              await markProcessingError({
                mediaItemId: media.id,
                type: 'thumbnail',
                error: result.message || 'Unknown thumbnail generation error',
              });
            }

            // Send progress update
            await sendProgress(encoder, writer, {
              status: 'processing',
              message: result.message,
              totalItems: isInfinityMode
                ? totalFilesDiscovered
                : unprocessedFiles.length,
              processed: isInfinityMode
                ? totalItemsProcessed
                : batchProcessedCount,
              successCount: isInfinityMode
                ? totalSuccessCount
                : batchSuccessCount,
              failedCount: isInfinityMode ? totalFailedCount : batchFailedCount,
              skippedLargeFiles: isInfinityMode
                ? totalSkippedLargeFilesCount
                : batchSkippedLargeFilesCount,
              currentItem: media.id,
              metadata: {
                processingType: 'thumbnail',
                fileType: media.file_types?.extension,
              },
            });
          } catch (error: any) {
            // Check if this was an abort error
            if (
              error.message?.includes('aborted') ||
              error.name === 'AbortError'
            ) {
              aborted = true;

              // Mark this item as aborted using our helper
              await markProcessingAborted({
                mediaItemId: media.id,
                type: 'thumbnail',
              });

              await sendProgress(encoder, writer, {
                status: 'aborted',
                message: 'Thumbnail generation aborted',
                totalItems: isInfinityMode
                  ? totalFilesDiscovered
                  : unprocessedFiles.length,
                processed: totalItemsProcessed,
                successCount: totalSuccessCount,
                failedCount: totalFailedCount,
                skippedLargeFiles: totalSkippedLargeFilesCount,
                currentItem: media.id,
                metadata: {
                  processingType: 'thumbnail',
                  fileType: media.file_types?.extension,
                },
              });

              break;
            }

            console.error(
              `Error processing thumbnail for ${media.file_path}:`,
              error,
            );

            batchProcessedCount++;
            batchFailedCount++;
            totalItemsProcessed++;
            totalFailedCount++;

            // Update the processing state to error using our helper
            await markProcessingError({
              mediaItemId: media.id,
              type: 'thumbnail',
              error:
                error.message || 'Unknown error during thumbnail generation',
            });

            // Send error update
            await sendProgress(encoder, writer, {
              status: 'processing',
              message: `Error generating thumbnail: ${error.message}`,
              totalItems: isInfinityMode
                ? totalFilesDiscovered
                : unprocessedFiles.length,
              processed: isInfinityMode
                ? totalItemsProcessed
                : batchProcessedCount,
              successCount: isInfinityMode
                ? totalSuccessCount
                : batchSuccessCount,
              failedCount: isInfinityMode ? totalFailedCount : batchFailedCount,
              skippedLargeFiles: isInfinityMode
                ? totalSkippedLargeFilesCount
                : batchSkippedLargeFilesCount,
              error: error.message,
              currentItem: media.id,
              metadata: {
                processingType: 'thumbnail',
                fileType: media.file_types?.extension,
              },
            });
          }
        }

        // Check for abort after completing the batch
        if (aborted) {
          await sendProgress(encoder, writer, {
            status: 'aborted',
            message: 'Thumbnail generation aborted',
            totalItems: isInfinityMode
              ? totalFilesDiscovered
              : unprocessedFiles.length,
            processed: totalItemsProcessed,
            successCount: totalSuccessCount,
            failedCount: totalFailedCount,
            skippedLargeFiles: totalSkippedLargeFilesCount,
            metadata: {
              processingType: 'thumbnail',
            },
          });
          break;
        }

        // After finishing a batch, if we're in infinity mode and have more batches to go
        if (hasMoreItems) {
          currentBatch++;

          // Send a batch completion update
          await sendProgress(encoder, writer, {
            status: 'processing',
            message: `Finished batch ${currentBatch - 1}. Continuing with next batch...`,
            totalItems: totalFilesDiscovered,
            processed: totalItemsProcessed,
            successCount: totalSuccessCount,
            failedCount: totalFailedCount,
            skippedLargeFiles: totalSkippedLargeFilesCount,
            isBatchComplete: true,
            metadata: {
              processingType: 'thumbnail',
            },
          });
        }
      }

      if (aborted) {
        return; // Already sent the aborted status
      }

      // Send final progress update
      const finalMessage = isInfinityMode
        ? `All processing completed. Generated ${totalSuccessCount} thumbnails (${totalFailedCount} failed, ${totalSkippedLargeFilesCount} skipped)`
        : `Thumbnail generation completed. Generated ${totalSuccessCount} thumbnails (${totalFailedCount} failed, ${totalSkippedLargeFilesCount} skipped)`;

      await sendProgress(encoder, writer, {
        status: 'success',
        message: finalMessage,
        totalItems: isInfinityMode
          ? totalFilesDiscovered
          : totalFilesDiscovered,
        processed: totalItemsProcessed,
        successCount: totalSuccessCount,
        failedCount: totalFailedCount,
        skippedLargeFiles: totalSkippedLargeFilesCount,
        isBatchComplete: true,
        metadata: {
          processingType: 'thumbnail',
        },
      });
    } catch (error: any) {
      // Check if this was an abort error
      const isAbortError =
        error.message?.includes('aborted') || error.name === 'AbortError';

      await sendProgress(encoder, writer, {
        status: isAbortError ? 'aborted' : 'error',
        message: isAbortError
          ? 'Thumbnail generation aborted'
          : 'Error during thumbnail generation',
        error: isAbortError
          ? 'Processing aborted by user'
          : error?.message ||
            'An unknown error occurred during thumbnail generation',
        metadata: {
          processingType: 'thumbnail',
        },
      });
    }
  }
}

// Helper function to get unprocessed files specifically for thumbnails
async function getUnprocessedFilesForThumbnails({ limit }: { limit: number }) {
  const supabase = createServerSupabaseClient();

  // First, get media items with no thumbnail path
  const {
    data: filesWithNoThumbnail,
    error: noThumbError,
    count: totalItems,
  } = await includeMedia(
    supabase
      .from('media_items')
      .select('*, file_types!inner(*), processing_states!inner(*)', {
        count: 'exact',
      })
      .is('thumbnail_path', null)
      .neq('processing_states.type', 'thumbnail')
      .limit(limit),
  );

  if (noThumbError) {
    throw new Error('Failed to fetch files with no thumbnails');
  }

  // If we already have enough items, return them
  if (filesWithNoThumbnail && filesWithNoThumbnail.length >= limit) {
    return {
      unprocessedFiles: filesWithNoThumbnail || [],
      totalItems: totalItems || 0,
    };
  }

  // Otherwise, also look for items with unsuccessful processing states
  const remainingLimit = limit - (filesWithNoThumbnail?.length || 0);

  if (remainingLimit <= 0) {
    return {
      unprocessedFiles: filesWithNoThumbnail || [],
      totalItems: totalItems || 0,
    };
  }

  const { data: filesWithUnsuccessfulStates, error: statesError } =
    await includeMedia(
      supabase
        .from('media_items')
        .select('*, file_types!inner(*), processing_states!inner(*)', {
          count: 'exact',
        })
        .eq('processing_states.type', 'thumbnail')
        .neq('processing_states.status', '(success)'),
    );

  if (statesError) {
    console.error(
      'Error fetching files with unsuccessful states:',
      statesError,
    );
    // We still return the files we found earlier
    return {
      unprocessedFiles: filesWithNoThumbnail || [],
      totalItems: totalItems || 0,
    };
  }

  // Combine the results
  return {
    unprocessedFiles: [
      ...(filesWithNoThumbnail || []),
      ...(filesWithUnsuccessfulStates || []),
    ],
    totalItems: totalItems || 0,
  };
}
