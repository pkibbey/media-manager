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
  const MAX_FETCH_SIZE = 1000; // Supabase's limit for fetch operations

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

      // Track overall statistics across multiple batches if Infinity is selected
      let totalItemsProcessed = 0;
      let totalSuccessCount = 0;
      let totalFailedCount = 0;
      let totalLargeFilesSkipped = 0;
      let totalFilesDiscovered = 0;

      // For Infinity mode, we'll use a loop to process in chunks
      const isInfinityMode = batchSize === Number.POSITIVE_INFINITY;
      const fetchSize = isInfinityMode ? MAX_FETCH_SIZE : batchSize;
      let hasMoreItems = true;
      let currentBatch = 1;

      while (hasMoreItems) {
        // Get this batch of unprocessed files
        const unprocessedFiles = await getUnprocessedFiles({
          limit: fetchSize,
        });

        // If no files were returned and we're on batch 1, nothing to process at all
        if (unprocessedFiles.length === 0 && currentBatch === 1) {
          await sendProgress(writer, {
            status: 'completed',
            message: 'No files to process',
            filesProcessed: 0,
            filesDiscovered: 0,
            successCount: 0,
            failedCount: 0,
            largeFilesSkipped: 0,
          });
          return;
        }

        // Check if we got back fewer than the maximum possible items
        hasMoreItems =
          isInfinityMode &&
          unprocessedFiles.length > 0 &&
          unprocessedFiles.length >= fetchSize;

        totalFilesDiscovered += unprocessedFiles.length;

        // Process each media file in this batch
        let batchProcessedCount = 0;
        let batchSuccessCount = 0;
        let batchFailedCount = 0;
        let batchLargeFilesSkipped = 0;

        // First update to show how many items were discovered
        await sendProgress(writer, {
          status: 'processing',
          message: isInfinityMode
            ? `Processing all files (batch ${currentBatch})...`
            : `Processing ${unprocessedFiles.length} files...`,
          filesProcessed: totalItemsProcessed,
          filesDiscovered: totalFilesDiscovered,
          successCount: totalSuccessCount,
          failedCount: totalFailedCount,
          largeFilesSkipped: totalLargeFilesSkipped,
        });

        for (const media of unprocessedFiles) {
          try {
            // Check if we should skip this file due to size
            if (skipLargeFiles && media.file_path) {
              try {
                const stats = await fs.stat(media.file_path);
                if (isSkippedLargeFile(stats.size)) {
                  // Insert skipped state into processing_states table
                  await supabase.from('processing_states').upsert(
                    {
                      media_item_id: media.id,
                      type: 'exif',
                      status: 'skipped',
                      processed_at: new Date().toISOString(),
                      error_message: `Large file (over ${Math.round(stats.size / (1024 * 1024))}MB)`,
                    },
                    {
                      onConflict: 'media_item_id,type',
                      ignoreDuplicates: false,
                    },
                  );

                  // Update counters
                  batchProcessedCount++;
                  batchLargeFilesSkipped++;
                  totalItemsProcessed++;
                  totalLargeFilesSkipped++;

                  // Send progress update for skipped file
                  await sendProgress(writer, {
                    status: 'processing',
                    message: `Skipped large file (over 100MB): ${media.file_name}`,
                    filesProcessed: totalItemsProcessed,
                    filesDiscovered: totalFilesDiscovered,
                    successCount: totalSuccessCount,
                    failedCount: totalFailedCount,
                    largeFilesSkipped: totalLargeFilesSkipped,
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
              message: `Processing ${totalItemsProcessed + 1}: ${media.file_name}`,
              filesProcessed: totalItemsProcessed,
              filesDiscovered: totalFilesDiscovered,
              successCount: totalSuccessCount,
              failedCount: totalFailedCount,
              largeFilesSkipped: totalLargeFilesSkipped,
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
                    filesProcessed: totalItemsProcessed,
                    filesDiscovered: totalFilesDiscovered,
                    successCount: totalSuccessCount,
                    failedCount: totalFailedCount,
                    largeFilesSkipped: totalLargeFilesSkipped,
                    currentFilePath: media.file_path,
                  });
                },
              });

              // Update counters
              batchProcessedCount++;
              totalItemsProcessed++;
              if (result.success) {
                batchSuccessCount++;
                totalSuccessCount++;
              } else {
                batchFailedCount++;
                totalFailedCount++;
              }
            }

            // Send regular progress updates
            if (
              totalItemsProcessed % 5 === 0 ||
              totalItemsProcessed === totalFilesDiscovered
            ) {
              await sendProgress(writer, {
                status: 'processing',
                message: isInfinityMode
                  ? `Processed ${totalItemsProcessed} of ${totalFilesDiscovered}+ files (${totalSuccessCount} successful, ${totalFailedCount} failed, ${totalLargeFilesSkipped} large files skipped)`
                  : `Processed ${batchProcessedCount} of ${unprocessedFiles.length} files (${batchSuccessCount} successful, ${batchFailedCount} failed, ${batchLargeFilesSkipped} large files skipped)`,
                filesProcessed: totalItemsProcessed,
                filesDiscovered: totalFilesDiscovered,
                successCount: totalSuccessCount,
                failedCount: totalFailedCount,
                largeFilesSkipped: totalLargeFilesSkipped,
              });
            }
          } catch (error: any) {
            console.error(`Error processing file ${media.file_path}:`, error);

            batchProcessedCount++;
            batchFailedCount++;
            totalItemsProcessed++;
            totalFailedCount++;

            // Send error update
            await sendProgress(writer, {
              status: 'processing',
              message: `Error processing file: ${error.message}`,
              filesProcessed: totalItemsProcessed,
              filesDiscovered: totalFilesDiscovered,
              successCount: totalSuccessCount,
              failedCount: totalFailedCount,
              error: error.message,
              currentFilePath: media.file_path,
              largeFilesSkipped: totalLargeFilesSkipped,
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
            filesProcessed: totalItemsProcessed,
            filesDiscovered: totalFilesDiscovered,
            successCount: totalSuccessCount,
            failedCount: totalFailedCount,
            largeFilesSkipped: totalLargeFilesSkipped,
          });
        }
      }

      // Prepare final message after all batches are processed
      let finalMessage = `EXIF processing completed. Processed ${totalItemsProcessed} files: ${totalSuccessCount} successful, ${totalFailedCount} failed`;

      if (totalLargeFilesSkipped) {
        finalMessage += `, ${totalLargeFilesSkipped} large files skipped`;
      }

      // Send final progress update
      await sendProgress(writer, {
        status: 'completed',
        message: finalMessage,
        filesProcessed: totalItemsProcessed,
        filesDiscovered: totalFilesDiscovered,
        successCount: totalSuccessCount,
        failedCount: totalFailedCount,
        largeFilesSkipped: totalLargeFilesSkipped,
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
    .select('*, processing_states(*)')
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
