'use server';

import { getUnprocessedFiles } from '@/lib/exif-utils';
import { fileTypeCache } from '@/lib/file-type-cache';
import { sendProgress, updateProcessingState } from '@/lib/query-helpers';
import type { ExtractionMethod } from '@/types/exif';
import { processExifData } from './processExifData';

/**
 * Process all unprocessed items with streaming updates
 * This function returns a ReadableStream that emits progress updates
 */
export async function streamProcessUnprocessedItems({
  extractionMethod,
  batchSize,
}: {
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
    extractionMethod,
    batchSize,
  }).catch((error) => {
    console.error('Error in processUnprocessedItemsInternal:', error);
    sendProgress(encoder, writer, {
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
    extractionMethod,
    batchSize,
  }: {
    writer: WritableStreamDefaultWriter;
    extractionMethod?: ExtractionMethod;
    batchSize: number;
  }) {
    try {
      // Track overall statistics across multiple batches if Infinity is selected
      let totalItemsProcessed = 0;
      let totalSuccessCount = 0;
      let totalFailedCount = 0;
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
          await sendProgress(encoder, writer, {
            status: 'completed',
            message: 'No files to process',
            filesProcessed: 0,
            filesDiscovered: 0,
            successCount: 0,
            failedCount: 0,
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

        // First update to show how many items were discovered
        await sendProgress(encoder, writer, {
          status: 'processing',
          message: isInfinityMode
            ? `Processing all files (batch ${currentBatch})...`
            : `Processing ${unprocessedFiles.length} files...`,
          filesProcessed: totalItemsProcessed,
          filesDiscovered: totalFilesDiscovered,
          successCount: totalSuccessCount,
          failedCount: totalFailedCount,
        });

        for (const media of unprocessedFiles) {
          try {
            // Check for ignored or unsupported file types
            let skipReason: string | null = null;
            const fileTypeId = media.file_type_id ?? media.file_types?.id;
            const fileExt = media.file_types?.extension;
            if (fileTypeId) {
              const fileType = await fileTypeCache.getFileTypeById(fileTypeId);
              if (fileType?.ignore) {
                skipReason = 'Ignored file type';
              }
            } else if (fileExt) {
              // If no fileTypeId, fallback to extension check
              const info = await fileTypeCache.getDetailedInfo();
              if (info?.ignoredExtensions.includes(fileExt.toLowerCase())) {
                skipReason = 'Ignored file type';
              } else if (
                !info ||
                !info.extensionToCategory[fileExt.toLowerCase()]
              ) {
                skipReason = 'Unsupported file type';
              }
            } else {
              skipReason = 'Unknown or missing file type';
            }
            // If skipReason is set, mark as skipped and continue
            if (skipReason) {
              updateProcessingState(
                media.id,
                'skipped',
                'exif',
                `Skipped due to ${skipReason}`,
              );

              batchProcessedCount++;
              totalItemsProcessed++;
              await sendProgress(encoder, writer, {
                status: 'processing',
                message: `Skipped: ${skipReason} (${media.file_name})`,
                filesProcessed: totalItemsProcessed,
                filesDiscovered: totalFilesDiscovered,
                successCount: totalSuccessCount,
                failedCount: totalFailedCount,
                currentFilePath: media.file_path,
              });
              continue;
            }

            // Send update before processing each file
            await sendProgress(encoder, writer, {
              status: 'processing',
              message: `Processing ${totalItemsProcessed + 1}: ${media.file_name}`,
              filesProcessed: totalItemsProcessed,
              filesDiscovered: totalFilesDiscovered,
              successCount: totalSuccessCount,
              failedCount: totalFailedCount,
              currentFilePath: media.file_path,
            });

            if (media.id) {
              const result = await processExifData({
                mediaId: media.id,
                method: extractionMethod || 'default',
                progressCallback: async (message) => {
                  // Send granular progress updates
                  await sendProgress(encoder, writer, {
                    status: 'processing',
                    message: `${message} - ${media.file_name}`,
                    filesProcessed: totalItemsProcessed,
                    filesDiscovered: totalFilesDiscovered,
                    successCount: totalSuccessCount,
                    failedCount: totalFailedCount,
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
              await sendProgress(encoder, writer, {
                status: 'processing',
                message: isInfinityMode
                  ? `Processed ${totalItemsProcessed} of ${totalFilesDiscovered}+ files (${totalSuccessCount} successful, ${totalFailedCount} failed)`
                  : `Processed ${batchProcessedCount} of ${unprocessedFiles.length} files (${batchSuccessCount} successful, ${batchFailedCount} failed)`,
                filesProcessed: totalItemsProcessed,
                filesDiscovered: totalFilesDiscovered,
                successCount: totalSuccessCount,
                failedCount: totalFailedCount,
              });
            }
          } catch (error: any) {
            console.error(`Error processing file ${media.file_path}:`, error);

            // Insert error state into processing_states table
            await updateProcessingState(
              media.id,
              'error',
              'exif',
              error?.message || 'Unknown error during EXIF processing',
            );

            batchProcessedCount++;
            batchFailedCount++;
            totalItemsProcessed++;
            totalFailedCount++;

            // Send error update
            await sendProgress(encoder, writer, {
              status: 'processing',
              message: `Error processing file: ${error.message}`,
              filesProcessed: totalItemsProcessed,
              filesDiscovered: totalFilesDiscovered,
              successCount: totalSuccessCount,
              failedCount: totalFailedCount,
              error: error.message,
              currentFilePath: media.file_path,
            });
          }
        }

        // After finishing a batch, if we're in infinity mode and have more batches to go
        if (hasMoreItems) {
          currentBatch++;

          // Send a batch completion update
          await sendProgress(encoder, writer, {
            status: 'processing',
            message: `Finished batch ${currentBatch - 1}. Continuing with next batch...`,
            filesProcessed: totalItemsProcessed,
            filesDiscovered: totalFilesDiscovered,
            successCount: totalSuccessCount,
            failedCount: totalFailedCount,
          });
        }
      }

      // Prepare final message after all batches are processed
      const finalMessage = `EXIF processing completed. Processed ${totalItemsProcessed} files: ${totalSuccessCount} successful, ${totalFailedCount} failed`;

      // Send final progress update
      await sendProgress(encoder, writer, {
        status: 'completed',
        message: finalMessage,
        filesProcessed: totalItemsProcessed,
        filesDiscovered: totalFilesDiscovered,
        successCount: totalSuccessCount,
        failedCount: totalFailedCount,
        method: extractionMethod,
      });
    } catch (error: any) {
      console.error('Error during EXIF processing:', error);
      // Insert error state into processing_states table

      await sendProgress(encoder, writer, {
        status: 'error',
        message: 'Error during EXIF processing',
        error:
          error?.message || 'An unknown error occurred during EXIF processing',
        filesProcessed: 0,
        successCount: 0,
        failedCount: 0,
        method: extractionMethod,
      });
    } finally {
      // Close the stream to signal completion to the client
      await writer.close();
    }
  }
}
