'use server';

import fs from 'node:fs/promises';
import { addAbortToken, isAborted, removeAbortToken } from '@/lib/abort-tokens';
import { BATCH_SIZE } from '@/lib/consts';
import { createServerSupabaseClient } from '@/lib/supabase';
import { isSkippedLargeFile } from '@/lib/utils';
import type { MediaItem } from '@/types/db-types';
import type {
  ExifProcessingOptions,
  ExifProgress,
  ExtractionMethod,
} from '@/types/exif';
import type { PostgrestError } from '@supabase/supabase-js';
import { processExifData } from './processExifData';

/**
 * Process all unprocessed items with streaming updates
 * This function returns a ReadableStream that emits progress updates
 */
export async function streamProcessUnprocessedItems(
  options: ExifProcessingOptions,
) {
  const encoder = new TextEncoder();
  const {
    skipLargeFiles = false,
    abortToken,
    extractionMethod,
    batchSize = BATCH_SIZE,
  } = options;

  // Create a transform stream to send progress updates
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start processing in the background - passing options as a single object
  processUnprocessedItemsInternal({
    writer,
    skipLargeFiles,
    abortToken,
    extractionMethod,
    batchSize,
  });

  // Return the readable stream
  return stream.readable;

  async function processUnprocessedItemsInternal({
    writer,
    skipLargeFiles,
    abortToken,
    extractionMethod,
    batchSize,
  }: {
    writer: WritableStreamDefaultWriter;
    skipLargeFiles: boolean;
    abortToken?: string;
    extractionMethod?: ExtractionMethod;
    batchSize: number;
  }) {
    try {
      const supabase = createServerSupabaseClient();

      // First, make sure any existing token with the same name is removed
      // This ensures we don't accidentally detect an old abort signal
      if (abortToken) {
        await removeAbortToken(abortToken);
      }

      // Add abort token to active tokens if provided
      if (abortToken) {
        await addAbortToken(abortToken);
      }

      // Send initial progress update with options info
      const methodInfo =
        extractionMethod && extractionMethod !== 'default'
          ? ` using ${extractionMethod} extraction method`
          : '';

      await sendProgress(writer, {
        status: 'started',
        message: `Starting EXIF processing${methodInfo}${skipLargeFiles ? ' (skipping files over 100MB)' : ''} with batch size ${batchSize}`,
        method: extractionMethod,
      });

      // Create a subquery to get all media IDs that have been successfully processed or skipped
      const { data: processedItems, error: processedItemsError } =
        await supabase
          .from('processing_states')
          .select('media_item_id')
          .eq('type', 'exif')
          .in('status', ['success', 'skipped']);

      if (processedItemsError) {
        await sendProgress(writer, {
          status: 'error',
          message: `Error getting processed items: ${processedItemsError.message}`,
          error: processedItemsError.message,
          largeFilesSkipped: 0,
          filesDiscovered: 0,
          filesProcessed: 0,
          successCount: 0,
          failedCount: 0,
          method: extractionMethod,
        });
        await writer.close();
        return;
      }

      // Extract the IDs of processed items
      const processedIds = (processedItems || []).map(
        (item) => item.media_item_id,
      );

      // First, count the total number of unprocessed items
      let totalCount: number | null = 0;

      try {
        // Try to use the count_unprocessed_exif_files function first
        const { count, error: countError } = await supabase
          .from('media_items')
          .select('*', { count: 'exact', head: true });

        if (countError) {
          throw countError;
        }

        totalCount = count;
      } catch (countError: any) {
        await sendProgress(writer, {
          status: 'error',
          message: `Error counting unprocessed items: ${countError.message}`,
          error: countError.message,
          largeFilesSkipped: 0,
          filesDiscovered: 0,
          filesProcessed: 0,
          successCount: 0,
          failedCount: 0,
          method: extractionMethod,
        });
        await writer.close();
        return;
      }

      // Calculate how many items we'll actually process
      const effectiveTotal = totalCount || 0;

      await sendProgress(writer, {
        status: 'processing',
        message: `Found ${totalCount} total items to check`,
        filesDiscovered: effectiveTotal,
        largeFilesSkipped: 0,
        filesProcessed: 0,
        successCount: 0,
        failedCount: 0,
        method: extractionMethod,
      });

      // Process items in chunks to handle large datasets
      const pageSize = 500;
      let processedCount = 0;
      let successCount = 0;
      let failedCount = 0;
      let itemsProcessed = 0;
      let largeFilesSkipped = 0;

      // Variable to track if we've started processing items
      // This helps prevent false abort detection at the beginning
      const processingStarted = false;

      // Process in pages
      for (let page = 0; page * pageSize < (totalCount || 0); page++) {
        // Only check for abort after we've processed some items
        // This prevents false abort detection at the beginning
        if (processingStarted && abortToken) {
          const isAbortedResult = await isAborted(abortToken);
          if (isAbortedResult) {
            await sendProgress(writer, {
              status: 'error',
              message: 'Processing cancelled by user',
            });
            await writer.close();
            return;
          }
        }

        // Calculate how many items to fetch for this page
        const currentPageSize = pageSize;

        // Get a chunk of unprocessed items
        let unprocessedItems: Partial<MediaItem>[] | null = null;
        let unprocessedError: PostgrestError | null = null;

        try {
          // Get the next batch of media items that haven't been processed yet
          const unprocessedQuery = supabase
            .from('media_items')
            .select('id, file_path, file_type_id, file_name');

          // Only apply the processed IDs filter if it's safe to do so (not too many IDs)
          if (processedIds.length > 0 && processedIds.length < 100) {
            const processedFilterExpr = `(${processedIds.join(',')})`;
            unprocessedQuery.not('id', 'in', processedFilterExpr);
          }

          // Add range for pagination
          unprocessedQuery.range(
            page * pageSize,
            page * pageSize + currentPageSize - 1,
          );

          const result = await unprocessedQuery;
          unprocessedItems = result.data;
          unprocessedError = result.error;
        } catch (error: any) {
          unprocessedError = error;
        }

        if (unprocessedError) {
          await sendProgress(writer, {
            status: 'error',
            message: `Error fetching unprocessed items: ${unprocessedError.message}`,
            error: unprocessedError.message,
          });
          await writer.close();
          return;
        }

        // Update progress for this page
        await sendProgress(writer, {
          status: 'processing',
          message: `Processing page ${page + 1} (items ${page * pageSize + 1}-${Math.min(page * pageSize + currentPageSize, totalCount || 0)})`,
          filesDiscovered: effectiveTotal,
          filesProcessed: itemsProcessed,
          successCount: successCount,
          failedCount: failedCount,
        });

        if (!unprocessedItems || unprocessedItems.length === 0) {
          break; // No more items to process
        }

        // Process all items without filtering by file type
        const itemsToProcess = unprocessedItems;

        // Process each media file in this batch
        for (let i = 0; i < itemsToProcess.length; i += batchSize) {
          // Check for abort signal
          if (abortToken && (await isAborted(abortToken))) {
            await sendProgress(writer, {
              status: 'error',
              message: 'Processing cancelled by user',
            });
            await writer.close();
            return;
          }

          // Get the current batch
          const batch = itemsToProcess.slice(i, i + batchSize);

          // Process each media file in the batch
          for (const media of batch) {
            try {
              // Check for abort signal - checking frequently for responsive cancellation
              if (abortToken && (await isAborted(abortToken))) {
                await sendProgress(writer, {
                  status: 'error',
                  message: 'Processing cancelled by user',
                });
                await writer.close();
                return;
              }

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
                      filesDiscovered: effectiveTotal,
                      filesProcessed: itemsProcessed,
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
                filesDiscovered: effectiveTotal,
                filesProcessed: itemsProcessed,
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
                      filesDiscovered: effectiveTotal,
                      filesProcessed: itemsProcessed,
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
                processedCount === effectiveTotal
              ) {
                // Check for abort signal
                if (abortToken && (await isAborted(abortToken))) {
                  await sendProgress(writer, {
                    status: 'error',
                    message: 'Processing cancelled by user',
                  });
                  await writer.close();
                  return;
                }

                await sendProgress(writer, {
                  status: 'processing',
                  message: `Processed ${processedCount} of ${effectiveTotal} files (${successCount} successful, ${failedCount} failed)`,
                  filesDiscovered: effectiveTotal,
                  filesProcessed: itemsProcessed,
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
                filesDiscovered: effectiveTotal,
                filesProcessed: itemsProcessed,
                successCount: successCount,
                failedCount: failedCount,
                error: error.message,
                currentFilePath: media.file_path,
              });
            }
          }
        }
      }

      // Final check for abort signal before completing
      if (abortToken && (await isAborted(abortToken))) {
        await sendProgress(writer, {
          status: 'error',
          message: 'Processing cancelled by user',
        });
        await writer.close();
        return;
      }

      // Prepare final message
      let finalMessage = `EXIF processing completed. Found ${totalCount} total items, processed ${processedCount} files: ${successCount} successful, ${failedCount} failed`;

      if (largeFilesSkipped) {
        finalMessage += `, ${largeFilesSkipped} large files skipped`;
      }

      // Send final progress update
      await sendProgress(writer, {
        status: 'completed',
        message: finalMessage,
        filesDiscovered: effectiveTotal,
        filesProcessed: itemsProcessed,
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
        largeFilesSkipped: 0,
        filesDiscovered: 0,
        filesProcessed: 0,
        successCount: 0,
        failedCount: 0,
        method: extractionMethod,
      });
    } finally {
      // Close the stream if it hasn't been closed yet
      try {
        if (!writer.closed) {
          await writer.close();
        }
      } catch (error) {
        console.error('Error closing stream writer:', error);
        // Don't rethrow - we're in finally block
      }
    }
  }

  async function sendProgress(
    writer: WritableStreamDefaultWriter,
    progress: ExifProgress,
  ) {
    await writer.write(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
  }
}
