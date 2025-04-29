'use server';

import {
  markProcessingError,
  markProcessingSuccess,
  sendProgress,
} from '@/lib/processing-helpers';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { UnifiedStats } from '@/types/unified-stats';
import { generateThumbnail } from './generate-thumbnail';

/**
 * Process all unprocessed thumbnails with streaming updates
 * Returns a ReadableStream that emits progress updates
 */
export async function streamThumbnails({
  batchSize = 100,
}: {
  batchSize?: number;
}) {
  const encoder = new TextEncoder();
  const MAX_FETCH_SIZE = 1000; // Supabase's limit for fetch operations

  // Create a transform stream to send progress updates
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start processing in the background
  await processUnprocessedThumbnailsInternal({
    writer,
    batchSize,
  });

  // Set up a cleanup function on the stream
  const originalCancel = stream.readable.cancel;
  stream.readable.cancel = async (message) => {
    // Call the original cancel method
    return originalCancel?.call(stream.readable, message);
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
        };
      }

      // For Infinity mode, we'll use a loop to process in chunks
      const isInfinityMode = batchSize === Number.POSITIVE_INFINITY;
      const fetchSize = isInfinityMode ? MAX_FETCH_SIZE : batchSize;
      let hasMoreItems = true;

      while (hasMoreItems) {
        // Get this batch of unprocessed files
        const { unprocessedFiles, totalItems } =
          await getUnprocessedFilesForThumbnails({
            limit: fetchSize,
          });

        // If no files were returned and we're on batch 1, nothing to process at all
        if (
          unprocessedFiles === undefined ||
          (unprocessedFiles.length === 0 && counters.currentBatch === 1)
        ) {
          await sendProgress(encoder, writer, {
            status: 'failure',
            message: 'No files to process',
            totalCount: totalItems,
            processedCount: 0,
            successCount: 0,
            failureCount: 0,
            progressType: 'thumbnail',
          });
          return;
        }

        // If we're in Infinity mode, we'll keep going until no more files are found
        hasMoreItems =
          isInfinityMode &&
          unprocessedFiles.length > 0 &&
          unprocessedFiles.length >= fetchSize;

        counters.totalAvailable = totalItems || 0;
        counters.total = counters.totalAvailable;

        // Send initial progress update for this batch
        await sendProgress(encoder, writer, {
          status: 'processing',
          message: isInfinityMode
            ? `Starting batch ${counters.currentBatch}: Processing ${unprocessedFiles.length} files...`
            : `Starting thumbnail generation for ${unprocessedFiles.length} files...`,
          ...getCommonProperties(),
          progressType: 'thumbnail',
          metadata: {
            fileType: unprocessedFiles[0]?.file_types?.extension,
          },
        });

        for (const media of unprocessedFiles) {
          try {
            // Send update before processing each file
            await sendProgress(encoder, writer, {
              status: 'processing',
              message: isInfinityMode
                ? `Batch ${counters.currentBatch}: Processing: ${media.file_name}`
                : `Processing: ${media.file_name}`,
              totalCount: counters.totalAvailable,
              processedCount: counters.processedCount,
              successCount: counters.success,
              failureCount: counters.failed,
              progressType: 'thumbnail',
              metadata: {
                fileType: media.file_types?.extension,
              },
            });

            // Generate thumbnail
            const result = await generateThumbnail(media.id);

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
              totalCount: counters.totalAvailable,
              processedCount: counters.processedCount,
              successCount: counters.success,
              failureCount: counters.failed,
              progressType: 'thumbnail',
              metadata: {
                fileType: media.file_types?.extension,
              },
            });
          } catch (error: any) {
            counters.processedCount++;
            counters.failed++;

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
              totalCount: counters.totalAvailable,
              processedCount: counters.processedCount,
              successCount: counters.success,
              failureCount: counters.failed,
              progressType: 'thumbnail',
              metadata: {
                fileType: media.file_types?.extension,
              },
            });
          }
        }

        // After finishing a batch, if we're in infinity mode and have more batches to go
        if (hasMoreItems) {
          counters.currentBatch++;

          // Send a batch completion update
          await sendProgress(encoder, writer, {
            status: 'batch_complete',
            message: `Finished batch ${counters.currentBatch - 1}. Continuing with next batch...`,
            ...getCommonProperties(),
            progressType: 'thumbnail',
          });
        }
      }

      // Send final progress update
      const finalMessage = isInfinityMode
        ? `All processing completed. Generated ${counters.success} thumbnails (${counters.failed} failed)`
        : `Thumbnail generation completed. Generated ${counters.success} thumbnails (${counters.failed} failed)`;

      await sendProgress(encoder, writer, {
        status: 'complete',
        message: finalMessage,
        ...getCommonProperties(),
        progressType: 'thumbnail',
      });
    } catch (error: any) {
      await sendProgress(encoder, writer, {
        status: 'failure',
        message:
          error?.message ||
          'An unknown error occurred during thumbnail generation',
        progressType: 'thumbnail',
      });
    }
  }
}

// Helper function to get unprocessed files specifically for thumbnails
async function getUnprocessedFilesForThumbnails({ limit }: { limit: number }) {
  const supabase = createServerSupabaseClient();

  try {
    // First, get media items with no thumbnail path
    const {
      data: filesWithNoThumbnail,
      error: noThumbError,
      count: totalItems,
    } = await supabase
      .from('media_items')
      .select('*, file_types!inner(*), processing_states!inner(*)', {
        count: 'exact',
      })
      // Only generate thumbnails for images
      // video thumbnails should be handled separately
      .eq('file_types.category', 'image')
      .in('file_types.category', ['image'])
      .is('file_types.ignore', false)
      .neq('processing_states.type', 'thumbnail')
      .limit(limit);

    if (noThumbError) {
      console.error('Error fetching files with no thumbnail:', noThumbError);

      return {
        success: false,
        unprocessedFiles: [],
        totalItems: 0,
        error: `Database error: ${noThumbError.message || 'Unknown database error'}`,
      };
    }

    // If we already have enough items, return them
    if (filesWithNoThumbnail && filesWithNoThumbnail.length >= limit) {
      return {
        success: true,
        unprocessedFiles: filesWithNoThumbnail || [],
        totalItems: totalItems || 0,
      };
    }

    // Otherwise, also look for items with unsuccessful processing states
    const remainingLimit = limit - (filesWithNoThumbnail?.length || 0);

    if (remainingLimit <= 0) {
      return {
        success: true,
        unprocessedFiles: filesWithNoThumbnail || [],
        totalItems: totalItems || 0,
      };
    }

    const { data: filesWithUnsuccessfulStates, error: statesError } =
      await supabase
        .from('media_items')
        .select('*, file_types!inner(*), processing_states!inner(*)', {
          count: 'exact',
        })
        .in('file_types.category', ['image'])
        .is('file_types.ignore', false)
        .eq('processing_states.type', 'thumbnail')
        .neq('processing_states.status', '(success)');

    if (statesError) {
      console.error(
        'Error fetching files with unsuccessful states:',
        statesError,
      );

      // We still return the files we found earlier
      return {
        success: true,
        unprocessedFiles: filesWithNoThumbnail || [],
        totalItems: totalItems || 0,
        error: `Warning: Could not fetch files with unsuccessful states: ${statesError.message}`,
      };
    }

    // Combine the results
    return {
      success: true,
      unprocessedFiles: [
        ...(filesWithNoThumbnail || []),
        ...(filesWithUnsuccessfulStates || []),
      ],
      totalItems: totalItems || 0,
    };
  } catch (error) {
    console.error(
      'Unexpected error fetching unprocessed files for thumbnails:',
      error,
    );
    return {
      success: false,
      unprocessedFiles: [],
      totalItems: 0,
      error: `Failed to fetch unprocessed files: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
