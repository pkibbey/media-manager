'use server';

import { TransformStream } from 'node:stream/web';
import { sendStreamProgress } from '@/lib/processing-helpers';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { ProgressType } from '@/types/progress-types';
import type { Method } from '@/types/unified-stats';
import { processImageAnalysis } from './process-image-analysis';

/**
 * Get unprocessed images for analysis
 */
async function getUnprocessedAnalysisFiles({ limit = 100 }: { limit: number }) {
  const supabase = createServerSupabaseClient();

  // Use a SQL join to find media items (images) that don't have analysis data
  // or that have failed analysis
  return await supabase
    .from('media_items')
    .select(
      `
        id, 
        file_name,
        file_path,
        file_types!inner(*),
        image_analysis!left(processing_state)
      `,
      { count: 'exact' },
    )
    .eq('file_types.category', 'image')
    .is('image_analysis', null)
    .limit(limit);
}

/**
 * Process all unprocessed items with streaming updates
 * This function returns a ReadableStream that emits progress updates
 */
export async function streamAnalysisData({
  method = 'default',
  batchSize = 100,
}: {
  method: Method;
  batchSize: number;
}) {
  console.log(
    `[Analysis] Starting streamAnalysisData with method=${method}, batchSize=${batchSize}`,
  );

  const MAX_FETCH_SIZE = 1000; // Supabase's limit for fetch operations
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Process items in the background
  processUnprocessedItemsInternal({
    writer,
    method,
    batchSize,
  }).catch((error) => {
    console.error('[Analysis] Error in background processing:', error);
  });

  console.log('[Analysis] Returning readable stream');
  return readable;

  async function processUnprocessedItemsInternal({
    writer,
    method,
    batchSize,
  }: {
    writer: WritableStreamDefaultWriter;
    method: Method;
    batchSize: number;
    progressType?: ProgressType;
  }) {
    console.log('[Analysis] Starting processUnprocessedItemsInternal');

    // Track overall counts across all batches
    const counters = {
      processedCount: 0,
      success: 0,
      failed: 0,
      currentBatch: 1,
      totalAvailable: 0,
    };

    try {
      // For Infinity mode, we'll use a loop to process in chunks
      const isInfinityMode = batchSize === Number.POSITIVE_INFINITY;
      const fetchSize = isInfinityMode ? MAX_FETCH_SIZE : batchSize;
      let hasMoreItems = true;

      // Common properties for progress updates
      const getCommonProperties = () => ({
        method,
        count: counters.processedCount,
        total: counters.totalAvailable,
        errorCount: counters.failed,
        processedCount: counters.processedCount,
        totalCount: counters.totalAvailable,
        batchSize: Math.min(batchSize, MAX_FETCH_SIZE),
        successCount: counters.success,
        failureCount: counters.failed,
        currentBatch: counters.currentBatch,
        progressType: 'analysis' as ProgressType,
      });

      // Process batches until no more items or not in infinity mode
      while (hasMoreItems) {
        console.log(
          `[Analysis] Fetching unprocessed files for batch ${counters.currentBatch} with fetchSize=${fetchSize}`,
        );

        // Get unprocessed files
        const {
          data: unprocessedFiles,
          count: totalCount,
          error,
        } = await getUnprocessedAnalysisFiles({ limit: fetchSize });

        // Update total available count from the first query result
        if (counters.currentBatch === 1) {
          counters.totalAvailable = totalCount || 0;
        }

        console.log(
          `[Analysis] Batch ${counters.currentBatch}: Got ${unprocessedFiles?.length || 0} unprocessed files, total available: ${counters.totalAvailable}`,
        );

        if (error) {
          console.error('[Analysis] Error fetching unprocessed files:', error);
          await sendStreamProgress(encoder, writer, {
            status: 'failure',
            message: `Failed to fetch unprocessed files: ${error}`,
            ...getCommonProperties(),
            metadata: { method },
          });
          break; // Exit the loop on error
        }

        // Send initial progress for this batch
        await sendStreamProgress(encoder, writer, {
          status: 'processing',
          ...getCommonProperties(),
          message: `Starting analysis batch ${counters.currentBatch}: ${unprocessedFiles?.length || 0} images`,
        });

        // Check if we have any files to process in this batch
        if (!unprocessedFiles || unprocessedFiles.length === 0) {
          console.log('[Analysis] No more images to analyze');
          await sendStreamProgress(encoder, writer, {
            status: counters.processedCount > 0 ? 'complete' : 'failure',
            ...getCommonProperties(),
            message:
              counters.processedCount > 0
                ? `No more images to analyze. Processed ${counters.processedCount} total.`
                : 'No images to analyze',
          });
          break; // Exit the loop when no more files
        }

        // Process each file in this batch
        for (const [index, media] of unprocessedFiles.entries()) {
          console.log(
            `[Analysis] Batch ${counters.currentBatch}, Processing file ${index + 1}/${unprocessedFiles.length}: ${media.file_path}`,
          );

          try {
            // Send progress update
            await sendStreamProgress(encoder, writer, {
              status: 'processing',
              ...getCommonProperties(),
              message: `Analyzing: ${media.file_path}`,
              metadata: {
                method,
                fileType: media.file_types?.extension,
              },
            });

            console.log(
              `[Analysis] Starting processImageAnalysis for ${media.file_name}`,
            );
            console.time(`analysis-${media.id}`);

            // Process the file with progress callback
            const result = await processImageAnalysis({
              mediaId: media.id,
              method,
              progressCallback: async (message) => {
                console.log(
                  `[Analysis] Progress callback: ${message} - ${media.file_name}`,
                );
                await sendStreamProgress(encoder, writer, {
                  status: 'processing',
                  ...getCommonProperties(),
                  message: `${message} - ${media.file_name}`,
                });
              },
            });

            console.timeEnd(`analysis-${media.id}`);
            console.log(
              `[Analysis] processImageAnalysis result for ${media.file_name}:`,
              result,
            );

            // Update counters
            counters.processedCount++;
            if (result.success) {
              counters.success++;
            } else {
              counters.failed++;
            }

            // Send progress update after each file
            console.log(
              `[Analysis] Sending progress update: success=${result.success}, processed=${counters.processedCount}/${counters.totalAvailable}`,
            );
            await sendStreamProgress(encoder, writer, {
              ...getCommonProperties(),
              status: result.success ? 'processing' : 'failure',
              message: result.success
                ? `Successfully analyzed: ${media.file_name}`
                : `Failed to analyze: ${media.file_name} - ${result.message}`,
              metadata: {
                method,
                fileType: media.file_types?.extension,
              },
            });
          } catch (error) {
            // Handle unexpected errors during processing
            console.error(
              `[Analysis] Unexpected error processing ${media.file_name}:`,
              error,
            );

            counters.processedCount++;
            counters.failed++;

            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';

            await sendStreamProgress(encoder, writer, {
              status: 'failure',
              ...getCommonProperties(),
              message: `Error analyzing ${media.file_name}: ${errorMessage}`,
              metadata: {
                method,
                fileType: media.file_types?.extension,
              },
            });
          }
        }

        // Check if we need to continue with another batch
        if (isInfinityMode && unprocessedFiles.length >= fetchSize) {
          // There are potentially more items to process
          counters.currentBatch++;

          // Send batch completion message
          await sendStreamProgress(encoder, writer, {
            status: 'batch_complete',
            message: `Finished batch ${counters.currentBatch - 1}. Continuing with next batch...`,
            ...getCommonProperties(),
          });

          hasMoreItems = true;
        } else {
          // No more batches to process
          hasMoreItems = false;

          // Final progress update for all batches
          console.log(
            '[Analysis] All batches processing complete, sending final update',
          );
          await sendStreamProgress(encoder, writer, {
            ...getCommonProperties(),
            status: 'complete',
            message: `Completed analysis of ${counters.processedCount} images across ${counters.currentBatch} batches. Success: ${counters.success}, Failed: ${counters.failed}`,
          });
        }
      }
    } catch (error) {
      // Handle unexpected errors in the entire process
      console.error('[Analysis] Fatal error in batch processing:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await sendStreamProgress(encoder, writer, {
        status: 'failure',
        message: `Error during batch processing: ${errorMessage}`,
        progressType: 'analysis' as ProgressType,
      });
    } finally {
      // Always close the writer when done with all batches
      console.log('[Analysis] Processing complete, closing writer');
      if (!writer.closed) {
        try {
          await writer.close();
        } catch (closeError) {
          console.error(
            '[Analysis] Error closing writer in finally block:',
            closeError,
          );
        }
      }
    }
  }
}
