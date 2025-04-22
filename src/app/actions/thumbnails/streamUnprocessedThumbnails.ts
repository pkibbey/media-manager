'use server';
import { LARGE_FILE_THRESHOLD } from '@/lib/consts';
import { createServerSupabaseClient } from '@/lib/supabase';
import { isSkippedLargeFile } from '@/lib/utils';
import type { ThumbnailProgress } from '@/types/thumbnail-types';
import { generateThumbnail } from './generateThumbnail';

/**
 * Process all unprocessed thumbnails with streaming updates
 * Returns a ReadableStream that emits progress updates
 */
export async function streamUnprocessedThumbnails({
  skipLargeFiles = true,
  batchSize = 100,
}: {
  skipLargeFiles?: boolean;
  batchSize?: number;
}) {
  const encoder = new TextEncoder();
  const MAX_FETCH_SIZE = 1000; // Supabase's limit for fetch operations

  // Create a transform stream to send progress updates
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start processing in the background
  processUnprocessedThumbnailsInternal({
    writer,
    skipLargeFiles,
    batchSize,
  }).catch((error) => {
    console.error('Error in processUnprocessedThumbnailsInternal:', error);
    sendProgress(writer, {
      status: 'error',
      message: 'Error during thumbnail generation',
      error:
        error?.message ||
        'An unknown error occurred during thumbnail generation',
    }).finally(() => {
      writer.close().catch(console.error);
    });
  });

  // Return the readable stream
  return stream.readable;

  async function processUnprocessedThumbnailsInternal({
    writer,
    skipLargeFiles,
    batchSize,
  }: {
    writer: WritableStreamDefaultWriter;
    skipLargeFiles: boolean;
    batchSize: number;
  }) {
    try {
      const supabase = createServerSupabaseClient();

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

      while (hasMoreItems) {
        // Get this batch of unprocessed files
        const unprocessedFiles = await getUnprocessedFilesForThumbnails({
          limit: fetchSize,
        });

        // If no files were returned and we're on batch 1, nothing to process at all
        if (unprocessedFiles.length === 0 && currentBatch === 1) {
          await sendProgress(writer, {
            status: 'completed',
            message: 'No files to process',
            totalItems: 0,
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
        await sendProgress(writer, {
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
        });

        for (const media of unprocessedFiles) {
          try {
            // Check if file is too large and we should skip it
            if (skipLargeFiles && media.file_path && media.size_bytes) {
              if (isSkippedLargeFile(media.size_bytes)) {
                // Mark as skipped in processing_states table
                await supabase.from('processing_states').upsert({
                  media_item_id: media.id,
                  type: 'thumbnail',
                  status: 'skipped',
                  processed_at: new Date().toISOString(),
                  error_message: `Large file (over ${Math.round(LARGE_FILE_THRESHOLD / (1024 * 1024))}MB)`,
                });

                // Update counters
                batchProcessedCount++;
                batchSkippedLargeFilesCount++;
                totalItemsProcessed++;
                totalSkippedLargeFilesCount++;

                // Send progress update for skipped file
                await sendProgress(writer, {
                  status: 'processing',
                  message: `Skipped large file: ${media.file_name}`,
                  totalItems: isInfinityMode
                    ? totalFilesDiscovered
                    : unprocessedFiles.length,
                  processed: isInfinityMode
                    ? totalItemsProcessed
                    : batchProcessedCount,
                  successCount: isInfinityMode
                    ? totalSuccessCount
                    : batchSuccessCount,
                  failedCount: isInfinityMode
                    ? totalFailedCount
                    : batchFailedCount,
                  skippedLargeFiles: isInfinityMode
                    ? totalSkippedLargeFilesCount
                    : batchSkippedLargeFilesCount,
                  currentFilePath: media.file_path,
                  fileType: media.file_types?.extension,
                });

                continue; // Skip to the next file
              }
            }

            // Send update before processing each file
            await sendProgress(writer, {
              status: 'processing',
              message: isInfinityMode
                ? `Batch ${currentBatch}: Generating thumbnail ${batchProcessedCount + 1}/${unprocessedFiles.length} (${totalItemsProcessed + 1} total): ${media.file_name}`
                : `Generating thumbnail ${batchProcessedCount + 1}/${unprocessedFiles.length}: ${media.file_name}`,
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
              currentFilePath: media.file_path,
              fileType: media.file_types?.extension,
            });

            // Generate thumbnail
            const result = await generateThumbnail(media.id, {
              skipLargeFiles,
            });

            // Update counters
            batchProcessedCount++;
            totalItemsProcessed++;

            if (result.success) {
              if (result.skipped) {
                batchSkippedLargeFilesCount++;
                totalSkippedLargeFilesCount++;
              } else {
                batchSuccessCount++;
                totalSuccessCount++;
              }
            } else {
              batchFailedCount++;
              totalFailedCount++;
            }

            // Send progress update
            await sendProgress(writer, {
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
              currentFilePath: media.file_path,
              fileType: media.file_types?.extension,
            });
          } catch (error: any) {
            console.error(
              `Error processing thumbnail for ${media.file_path}:`,
              error,
            );

            batchProcessedCount++;
            batchFailedCount++;
            totalItemsProcessed++;
            totalFailedCount++;

            // Add this code to update the processing state
            await supabase.from('processing_states').upsert({
              media_item_id: media.id,
              type: 'thumbnail',
              status: 'error',
              processed_at: new Date().toISOString(),
              error_message:
                error.message || 'Unknown error during thumbnail generation',
            });

            // Send error update
            await sendProgress(writer, {
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
              currentFilePath: media.file_path,
              fileType: media.file_types?.extension,
            });
          }
        }

        // After finishing a batch, if we're in infinity mode and have more batches to go
        if (hasMoreItems) {
          currentBatch++;

          // Send a batch completion update
          await sendProgress(writer, {
            status: 'processing',
            message: `Finished batch ${currentBatch - 1}. Continuing with next batch...`,
            totalItems: totalFilesDiscovered,
            processed: totalItemsProcessed,
            successCount: totalSuccessCount,
            failedCount: totalFailedCount,
            skippedLargeFiles: totalSkippedLargeFilesCount,
            isBatchComplete: false,
          });
        }
      }

      // Send final progress update
      const finalMessage = isInfinityMode
        ? `All processing completed. Generated ${totalSuccessCount} thumbnails (${totalFailedCount} failed, ${totalSkippedLargeFilesCount} skipped)`
        : `Thumbnail generation completed. Generated ${totalSuccessCount} thumbnails (${totalFailedCount} failed, ${totalSkippedLargeFilesCount} skipped)`;

      await sendProgress(writer, {
        status: 'completed',
        message: finalMessage,
        totalItems: isInfinityMode
          ? totalFilesDiscovered
          : totalFilesDiscovered,
        processed: totalItemsProcessed,
        successCount: totalSuccessCount,
        failedCount: totalFailedCount,
        skippedLargeFiles: totalSkippedLargeFilesCount,
        isBatchComplete: true,
      });
    } catch (error: any) {
      console.error('Error during thumbnail processing:', error);
      await sendProgress(writer, {
        status: 'error',
        message: 'Error during thumbnail generation',
        error:
          error?.message ||
          'An unknown error occurred during thumbnail generation',
      });
    } finally {
      // Close the stream to signal completion to the client
      await writer.close();
    }
  }

  async function sendProgress(
    writer: WritableStreamDefaultWriter,
    progress: ThumbnailProgress,
  ) {
    await writer.write(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
  }
}

// Helper function to get unprocessed files specifically for thumbnails
async function getUnprocessedFilesForThumbnails({ limit }: { limit: number }) {
  const supabase = createServerSupabaseClient();

  // First, get media items with no thumbnail path
  const { data: filesWithNoThumbnail, error: noThumbError } = await supabase
    .from('media_items')
    .select(`
      *,
      file_types!inner(*),
      processing_states(*)
    `)
    .eq('file_types.category', 'image')
    // .is('thumbnail_path', null)
    .limit(limit);

  if (noThumbError) {
    console.error('Error fetching files with no thumbnails:', noThumbError);
    throw new Error('Failed to fetch files with no thumbnails');
  }

  // If we already have enough items, return them
  if (filesWithNoThumbnail && filesWithNoThumbnail.length >= limit) {
    return filesWithNoThumbnail;
  }

  // Otherwise, also look for items with unsuccessful processing states
  const remainingLimit = limit - (filesWithNoThumbnail?.length || 0);

  if (remainingLimit <= 0) {
    return filesWithNoThumbnail || [];
  }

  const { data: filesWithUnsuccessfulStates, error: statesError } =
    await supabase
      .from('media_items')
      .select(`
      *,
      file_types!inner(*),
      processing_states!inner(*)
    `)
      .eq('file_types.category', 'image')
      .not('thumbnail_path', 'is', null)
      .eq('processing_states.type', 'thumbnail')
      .not('processing_states.status', 'in', '("success","skipped")')
      .limit(remainingLimit);

  if (statesError) {
    console.error(
      'Error fetching files with unsuccessful states:',
      statesError,
    );
    // We still return the files we found earlier
    return filesWithNoThumbnail || [];
  }

  // Combine the results
  return [
    ...(filesWithNoThumbnail || []),
    ...(filesWithUnsuccessfulStates || []),
  ];
}
