'use server';

import fs from 'node:fs/promises';
import { LARGE_FILE_THRESHOLD } from '@/lib/consts';
import { createServerSupabaseClient } from '@/lib/supabase';
import { isSkippedLargeFile } from '@/lib/utils';
import type { ExifProgress, ExtractionMethod } from '@/types/exif';
import { processExifData } from './processExifData';

/**
 * Process all unprocessed items with streaming updates
 * This function returns a ReadableStream that emits progress updates
 */
export async function streamProcessUnprocessedItems({
  skipLargeFiles,
  extractionMethod,
  batchSize,
}: {
  skipLargeFiles: boolean;
  extractionMethod: ExtractionMethod;
  batchSize: number;
}) {
  const encoder = new TextEncoder();

  // Create a transform stream to send progress updates
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start processing in the background - passing options as a single object
  processUnprocessedItemsInternal({
    writer,
    skipLargeFiles,
    extractionMethod,
    batchSize,
  }).catch((error) => {
    console.error('Error in processUnprocessedItemsInternal:', error);
    sendProgress(writer, {
      status: 'error',
      message: 'Error during EXIF processing',
      error:
        error?.message || 'An unknown error occurred during EXIF processing',
    }).finally(() => {
      writer.close().catch(console.error);
    });
  });

  // Return the readable stream
  return stream.readable;

  async function processUnprocessedItemsInternal({
    writer,
    skipLargeFiles,
    extractionMethod,
    batchSize,
  }: {
    writer: WritableStreamDefaultWriter;
    skipLargeFiles: boolean;
    extractionMethod?: ExtractionMethod;
    batchSize: number;
  }) {
    try {
      const supabase = createServerSupabaseClient();

      // Get only batchSize number of unprocessed files instead of all of them
      const unprocessedFiles = await getUnprocessedFiles({ limit: batchSize });

      // Process each media file in this batch
      let processedCount = 0;
      let successCount = 0;
      let failedCount = 0;
      let itemsProcessed = 0;
      let largeFilesSkipped = 0;

      for (const media of unprocessedFiles) {
        try {
          // Check if we should skip this file due to size
          if (skipLargeFiles && media.file_path) {
            try {
              const stats = await fs.stat(media.file_path);
              if (isSkippedLargeFile(stats.size)) {
                // Insert skipped state into processing_states table
                await supabase.from('processing_states').upsert({
                  media_item_id: media.id,
                  type: 'exif',
                  status: 'skipped',
                  processed_at: new Date().toISOString(),
                  error_message: `Large file (over ${Math.round(stats.size / (1024 * 1024))}MB)`,
                });

                // Update counters
                processedCount++;
                itemsProcessed++;
                largeFilesSkipped++;

                // Send progress update for skipped file
                await sendProgress(writer, {
                  status: 'processing',
                  message: `Skipped large file (over 100MB): ${media.file_name}`,
                  filesProcessed: itemsProcessed,
                  filesDiscovered: unprocessedFiles.length,
                  successCount: successCount,
                  failedCount: failedCount,
                  largeFilesSkipped: largeFilesSkipped,
                  currentFilePath: media.file_path,
                });

                continue; // Skip to the next file
              }
            } catch (statError) {
              console.error(
                `Error getting file stats for ${media.file_path}:`,
                statError,
              );
              // Continue with processing if we can't get the file stats
            }
          }

          // Send update before processing each file
          await sendProgress(writer, {
            status: 'processing',
            message: `Processing ${processedCount + 1}: ${media.file_name}`,
            filesProcessed: itemsProcessed,
            filesDiscovered: unprocessedFiles.length,
            successCount: successCount,
            failedCount: failedCount,
            largeFilesSkipped: largeFilesSkipped,
            currentFilePath: media.file_path,
          });

          if (media.id) {
            const result = await processExifData({
              mediaId: media.id,
              method: extractionMethod || 'default',
              progressCallback: async (message) => {
                // Send granular progress updates
                await sendProgress(writer, {
                  status: 'processing',
                  message: `${message} - ${media.file_name}`,
                  filesProcessed: itemsProcessed,
                  filesDiscovered: unprocessedFiles.length,
                  successCount: successCount,
                  failedCount: failedCount,
                  largeFilesSkipped: largeFilesSkipped,
                  currentFilePath: media.file_path,
                });
              },
            });

            // Update counters
            processedCount++;
            itemsProcessed++;
            if (result.success) {
              successCount++;
            } else {
              failedCount++;
            }
          }

          // Send regular progress updates
          if (
            processedCount % 5 === 0 ||
            processedCount === unprocessedFiles.length
          ) {
            await sendProgress(writer, {
              status: 'processing',
              message: `Processed ${processedCount} of ${unprocessedFiles.length} files (${successCount} successful, ${failedCount} failed)`,
              filesProcessed: itemsProcessed,
              filesDiscovered: unprocessedFiles.length,
              successCount: successCount,
              failedCount: failedCount,
            });
          }
        } catch (error: any) {
          console.error(`Error processing file ${media.file_path}:`, error);

          processedCount++;
          itemsProcessed++;
          failedCount++;

          // Send error update
          await sendProgress(writer, {
            status: 'processing',
            message: `Error processing file: ${error.message}`,
            filesProcessed: itemsProcessed,
            filesDiscovered: unprocessedFiles.length,
            successCount: successCount,
            failedCount: failedCount,
            error: error.message,
            currentFilePath: media.file_path,
          });
        }
      }

      // Prepare final message
      let finalMessage = `EXIF processing completed. Processed ${processedCount} files: ${successCount} successful, ${failedCount} failed`;

      if (largeFilesSkipped) {
        finalMessage += `, ${largeFilesSkipped} large files skipped`;
      }

      // Send final progress update
      await sendProgress(writer, {
        status: 'completed',
        message: finalMessage,
        filesProcessed: itemsProcessed,
        filesDiscovered: unprocessedFiles.length,
        successCount: successCount,
        failedCount: failedCount,
        largeFilesSkipped: largeFilesSkipped,
        method: extractionMethod,
      });
    } catch (error: any) {
      console.error('Error during EXIF processing:', error);
      await sendProgress(writer, {
        status: 'error',
        message: 'Error during EXIF processing',
        error:
          error?.message || 'An unknown error occurred during EXIF processing',
        filesProcessed: 0,
        successCount: 0,
        failedCount: 0,
        largeFilesSkipped: 0,
        method: extractionMethod,
      });
    } finally {
      // Close the stream to signal completion to the client
      await writer.close();
    }
  }

  async function sendProgress(
    writer: WritableStreamDefaultWriter,
    progress: ExifProgress,
  ) {
    await writer.write(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
  }
}

// Helper function to get unprocessed files with a limit
async function getUnprocessedFiles({ limit }: { limit: number }) {
  const supabase = createServerSupabaseClient();

  // Query your database to get only up to 'limit' number of unprocessed files
  const { data: files, error } = await supabase
    .from('media_items')
    .select('*, processing_states()')
    // Filter out processing states that are an empty length
    .is('processing_states', null)
    .lte('size_bytes', LARGE_FILE_THRESHOLD)
    .limit(limit);

  if (error) {
    console.error('Error fetching unprocessed files:', error);
    throw new Error('Failed to fetch unprocessed files');
  }

  return files;
}
