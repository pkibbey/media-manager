'use server';

import { getUnprocessedFiles } from '@/lib/exif-utils';
import { fileTypeCache } from '@/lib/file-type-cache';
import {
  markProcessingAborted,
  markProcessingError,
  markProcessingSkipped,
  markProcessingStarted,
} from '@/lib/processing-helpers';
import { sendProgress } from '@/lib/query-helpers';
import type { ExtractionMethod } from '@/types/exif';
import { processExifData } from './processExifData';

/**
 * Process all unprocessed items with streaming updates
 * This function returns a ReadableStream that emits progress updates
 */
export async function streamExifUnprocessed({
  extractionMethod,
  batchSize,
}: {
  extractionMethod: ExtractionMethod;
  batchSize: number;
}) {
  const encoder = new TextEncoder();
  const MAX_FETCH_SIZE = 1000; // Supabase's limit for fetch operations
  let aborted = false;

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

    // If the error is an abort, mark it accordingly
    const isAbortError =
      error?.name === 'AbortError' || error?.message?.includes('abort');

    sendProgress(encoder, writer, {
      status: isAbortError ? 'aborted' : 'error',
      message: isAbortError
        ? 'EXIF processing aborted'
        : 'Error during EXIF processing',
      error: isAbortError
        ? 'Processing aborted by user'
        : error?.message || 'An unknown error occurred during EXIF processing',
    }).finally(() => {
      if (!writer.closed) {
        writer.close().catch(console.error);
      }
    });
  });

  // Set up a cleanup function on the stream
  const originalCancel = stream.readable.cancel;
  stream.readable.cancel = async (reason) => {
    aborted = true;
    return originalCancel?.call(stream.readable, reason);
  };

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
      let totalSkippedCount = 0;

      // For Infinity mode, we'll use a loop to process in chunks
      const isInfinityMode = batchSize === Number.POSITIVE_INFINITY;
      const fetchSize = isInfinityMode ? MAX_FETCH_SIZE : batchSize;
      let hasMoreItems = true;
      let currentBatch = 1;

      while (hasMoreItems && !aborted) {
        // Get this batch of unprocessed files
        const unprocessedFiles = await getUnprocessedFiles({
          limit: fetchSize,
        });

        // If no files were returned and we're on batch 1, nothing to process at all
        if (unprocessedFiles.length === 0 && currentBatch === 1) {
          await sendProgress(encoder, writer, {
            status: 'success',
            message: 'No files to process',
            filesProcessed: 0,
            filesDiscovered: 0,
            successCount: 0,
            failedCount: 0,
            skippedCount: 0,
            totalFiles: 0,
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
        let batchSkippedCount = 0;

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
          skippedCount: totalSkippedCount,
          totalFiles: 0,
          metadata: {
            processingType: 'exif',
            fileType:
              unprocessedFiles[(currentBatch - 1) * batchSize]?.file_types
                ?.extension || 'unknown',
          },
        });

        for (const media of unprocessedFiles) {
          // Check for abort signal
          if (aborted) {
            // Mark this item as aborted using our helper function
            await markProcessingAborted({
              mediaItemId: media.id,
              type: 'exif',
            });
            break;
          }

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
              await markProcessingSkipped({
                mediaItemId: media.id,
                type: 'exif',
                reason: `Skipped due to ${skipReason}`,
              });

              batchProcessedCount++;
              totalItemsProcessed++;
              batchSkippedCount++;
              totalSkippedCount++;

              await sendProgress(encoder, writer, {
                status: 'processing',
                message: `Skipped: ${skipReason} (${media.file_name})`,
                filesProcessed: totalItemsProcessed,
                filesDiscovered: totalFilesDiscovered,
                successCount: totalSuccessCount,
                failedCount: totalFailedCount,
                skippedCount: totalSkippedCount,
                totalFiles: totalFilesDiscovered,
                currentItem: media.id,
              });
              continue;
            }

            // Mark as processing before we begin
            await markProcessingStarted({
              mediaItemId: media.id,
              type: 'exif',
              message: `Processing started for ${media.file_name}`,
            });

            // Send update before processing each file
            await sendProgress(encoder, writer, {
              status: 'processing',
              message: `Processing ${totalItemsProcessed + 1}: ${media.file_name}`,
              filesProcessed: totalItemsProcessed,
              filesDiscovered: totalFilesDiscovered,
              successCount: totalSuccessCount,
              failedCount: totalFailedCount,
              skippedCount: totalSkippedCount,
              totalFiles: totalFilesDiscovered,
              currentItem: media.id,
            });

            if (media.id) {
              const result = await processExifData({
                mediaId: media.id,
                method: extractionMethod || 'default',
                progressCallback: async (message) => {
                  // Check for abort again during processing
                  if (aborted) {
                    throw new Error('Processing aborted by user');
                  }

                  // Send granular progress updates
                  await sendProgress(encoder, writer, {
                    status: 'processing',
                    message: `${message} - ${media.file_name}`,
                    filesProcessed: totalItemsProcessed,
                    filesDiscovered: totalFilesDiscovered,
                    totalFiles: totalFilesDiscovered,
                    successCount: totalSuccessCount,
                    failedCount: totalFailedCount,
                    skippedCount: totalSkippedCount,
                    currentItem: media.id,
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
                  ? `Processed ${totalItemsProcessed} of ${totalFilesDiscovered}+ files (${totalSuccessCount} successful, ${totalFailedCount} failed, ${totalSkippedCount} skipped)`
                  : `Processed ${batchProcessedCount} of ${unprocessedFiles.length} files (${batchSuccessCount} successful, ${batchFailedCount} failed, ${batchSkippedCount} skipped)`,
                filesProcessed: totalItemsProcessed,
                filesDiscovered: totalFilesDiscovered,
                successCount: totalSuccessCount,
                failedCount: totalFailedCount,
                skippedCount: totalSkippedCount,
                totalFiles: totalFilesDiscovered,
              });
            }
          } catch (error: any) {
            // Check if this was an abort error
            if (
              error.message?.includes('aborted') ||
              error.name === 'AbortError'
            ) {
              aborted = true;

              // Mark this item as aborted using our helper function
              await markProcessingAborted({
                mediaItemId: media.id,
                type: 'exif',
              });

              await sendProgress(encoder, writer, {
                status: 'aborted',
                message: 'EXIF processing aborted by user',
                filesProcessed: totalItemsProcessed,
                filesDiscovered: totalFilesDiscovered,
                successCount: totalSuccessCount,
                failedCount: totalFailedCount,
                skippedCount: totalSkippedCount,
                totalFiles: totalFilesDiscovered,
                currentItem: media.id,
              });

              break;
            }

            console.error(`Error processing file ${media.file_path}:`, error);

            // Use our helper function for error processing
            await markProcessingError({
              mediaItemId: media.id,
              type: 'exif',
              error: error?.message || 'Unknown error during EXIF processing',
            });

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
              skippedCount: totalSkippedCount,
              error: error.message,
              totalFiles: totalFilesDiscovered,
              currentItem: media.id,
            });
          }
        }

        // Check for abortion after batch processing
        if (aborted) {
          await sendProgress(encoder, writer, {
            status: 'aborted',
            message: 'Processing aborted by user',
            filesProcessed: totalItemsProcessed,
            filesDiscovered: totalFilesDiscovered,
            successCount: totalSuccessCount,
            failedCount: totalFailedCount,
            skippedCount: totalSkippedCount,
            totalFiles: totalFilesDiscovered,
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
            filesProcessed: totalItemsProcessed,
            filesDiscovered: totalFilesDiscovered,
            successCount: totalSuccessCount,
            failedCount: totalFailedCount,
            skippedCount: totalSkippedCount,
            totalFiles: totalFilesDiscovered,
            isBatchComplete: true,
          });
        }
      }

      if (aborted) {
        return; // Already sent aborted status earlier
      }

      // Prepare final message after all batches are processed
      const finalMessage = `EXIF processing completed. Processed ${totalItemsProcessed} files: ${totalSuccessCount} successful, ${totalFailedCount} failed, ${totalSkippedCount} skipped`;

      // Send final progress update
      await sendProgress(encoder, writer, {
        status: 'success',
        message: finalMessage,
        filesProcessed: totalItemsProcessed,
        filesDiscovered: totalFilesDiscovered,
        successCount: totalSuccessCount,
        failedCount: totalFailedCount,
        skippedCount: totalSkippedCount,
        method: extractionMethod,
        totalFiles: totalFilesDiscovered,
        isBatchComplete: true,
      });
    } catch (error: any) {
      console.error('Error during EXIF processing:', error);

      // Check if this was an abort
      const isAbortError =
        error.message?.includes('aborted') || error.name === 'AbortError';

      await sendProgress(encoder, writer, {
        status: isAbortError ? 'aborted' : 'error',
        message: isAbortError
          ? 'EXIF processing aborted'
          : 'Error during EXIF processing',
        error: isAbortError
          ? 'Processing aborted by user'
          : error?.message ||
            'An unknown error occurred during EXIF processing',
        filesProcessed: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        method: extractionMethod,
        totalFiles: 0,
      });
    } finally {
      // Close the stream to signal completion to the client
      await writer.close();
    }
  }
}
