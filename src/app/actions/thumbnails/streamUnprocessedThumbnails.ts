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

      // Get a batch of unprocessed files
      const unprocessedFiles = await getUnprocessedFilesForThumbnails({
        limit: batchSize,
      });

      if (!unprocessedFiles.length) {
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

      // Process each media file
      let processedCount = 0;
      let successCount = 0;
      let failedCount = 0;
      let skippedLargeFilesCount = 0;
      const totalItems = unprocessedFiles.length;

      // Send initial progress
      await sendProgress(writer, {
        status: 'processing',
        message: `Starting thumbnail generation for ${totalItems} files...`,
        totalItems,
        processed: processedCount,
        successCount,
        failedCount,
        skippedLargeFiles: skippedLargeFilesCount,
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
              processedCount++;
              skippedLargeFilesCount++;

              // Send progress update for skipped file
              await sendProgress(writer, {
                status: 'processing',
                message: `Skipped large file: ${media.file_name}`,
                totalItems,
                processed: processedCount,
                successCount,
                failedCount,
                skippedLargeFiles: skippedLargeFilesCount,
                currentFilePath: media.file_path,
                fileType: media.file_types?.extension,
              });

              continue; // Skip to the next file
            }
          }

          // Send update before processing each file
          await sendProgress(writer, {
            status: 'processing',
            message: `Generating thumbnail ${processedCount + 1}/${totalItems}: ${media.file_name}`,
            totalItems,
            processed: processedCount,
            successCount,
            failedCount,
            skippedLargeFiles: skippedLargeFilesCount,
            currentFilePath: media.file_path,
            fileType: media.file_types?.extension,
          });

          // Generate thumbnail
          const result = await generateThumbnail(media.id, {
            skipLargeFiles,
          });

          // Update counters
          processedCount++;

          if (result.success) {
            if (result.skipped) {
              skippedLargeFilesCount++;
            } else {
              successCount++;
            }
          } else {
            failedCount++;
          }

          // Send progress update
          await sendProgress(writer, {
            status: 'processing',
            message: result.message,
            totalItems,
            processed: processedCount,
            successCount,
            failedCount,
            skippedLargeFiles: skippedLargeFilesCount,
            currentFilePath: media.file_path,
            fileType: media.file_types?.extension,
          });

          // Check if we've processed all items in this batch
          if (processedCount >= batchSize) {
            await sendProgress(writer, {
              status: 'completed',
              message: `Batch complete: Generated ${successCount} thumbnails (${failedCount} failed, ${skippedLargeFilesCount} skipped)`,
              totalItems,
              processed: processedCount,
              successCount,
              failedCount,
              skippedLargeFiles: skippedLargeFilesCount,
              isBatchComplete: true,
            });
            break;
          }
        } catch (error: any) {
          console.error(
            `Error processing thumbnail for ${media.file_path}:`,
            error,
          );

          processedCount++;
          failedCount++;

          // Send error update
          await sendProgress(writer, {
            status: 'processing',
            message: `Error generating thumbnail: ${error.message}`,
            totalItems,
            processed: processedCount,
            successCount,
            failedCount,
            skippedLargeFiles: skippedLargeFilesCount,
            error: error.message,
            currentFilePath: media.file_path,
            fileType: media.file_types?.extension,
          });
        }
      }

      // Send final progress update
      const finalMessage =
        processedCount < totalItems
          ? `Batch complete: Processed ${processedCount} of ${totalItems} files`
          : `Thumbnail generation completed. Generated ${successCount} thumbnails (${failedCount} failed, ${skippedLargeFilesCount} skipped)`;

      await sendProgress(writer, {
        status: 'completed',
        message: finalMessage,
        totalItems,
        processed: processedCount,
        successCount,
        failedCount,
        skippedLargeFiles: skippedLargeFilesCount,
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
