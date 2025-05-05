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
  try {
    const supabase = createServerSupabaseClient();

    // Use a SQL join to find media items (images) that don't have analysis data
    // or that have failed analysis
    const { data, error, count } = await supabase
      .from('media_items')
      .select(
        `
        id, 
        file_name,
        file_path,
        file_types(*),
        image_analysis!left(processing_state)
      `,
        { count: 'exact' },
      )
      .eq('file_types->>category', 'image')
      .or('image_analysis.is.null,image_analysis.processing_state.eq.error')
      .limit(limit);

    if (error) {
      console.error('[Analysis] Error getting unprocessed files:', error);
      return { data: [], error, count: 0 };
    }

    return { data: data || [], error: null, count: count || 0 };
  } catch (error) {
    console.error('[Analysis] Exception getting unprocessed files:', error);
    return { data: [], error, count: 0 };
  }
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
  // Setup transform stream for progress updates
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
    // Track overall counts for this batch
    const counters = {
      processedCount: 0,
      success: 0,
      failed: 0,
    };

    try {
      // Get unprocessed files
      const {
        data: unprocessedFiles,
        count: totalCount,
        error,
      } = await getUnprocessedAnalysisFiles({ limit: batchSize });

      if (error) {
        await writer.write({
          type: 'error',
          message: `Failed to fetch unprocessed files: ${error}`,
          metadata: { method },
        });
        if (!writer.closed) {
          try {
            await writer.close();
          } catch (closeError) {
            console.error('Error closing writer in finally block:', closeError);
          }
        }
        return;
      }

      // Common properties for progress updates
      const getCommonProperties = () => ({
        type: 'progress',
        method,
        count: counters.processedCount,
        total: totalCount || unprocessedFiles.length,
        success: counters.success,
        failed: counters.failed,
      });

      // Send initial progress
      await writer.write({
        ...getCommonProperties(),
        message: `Starting analysis of ${unprocessedFiles.length} images`,
      });

      if (unprocessedFiles.length === 0) {
        await writer.write({
          ...getCommonProperties(),
          message: 'No images to analyze',
        });
        if (!writer.closed) {
          try {
            await writer.close();
          } catch (closeError) {
            console.error('Error closing writer in finally block:', closeError);
          }
        }
        return;
      }

      // Process each file
      for (const media of unprocessedFiles) {
        try {
          // Send progress update
          await writer.write({
            ...getCommonProperties(),
            message: `Analyzing: ${media.file_path}`,
            metadata: {
              method,
              fileType: media.file_types?.extension,
            },
          });

          // Process the file with progress callback
          const result = await processImageAnalysis({
            mediaId: media.id,
            method,
            progressCallback: async (message) => {
              await sendStreamProgress(encoder, writer, {
                status: 'processing',
                message: `${message} - ${media.file_name}`,
                ...getCommonProperties(),
                metadata: {
                  method,
                },
              });
            },
          });

          // Update counters
          counters.processedCount++;
          if (result.success) {
            counters.success++;
          } else {
            counters.failed++;
          }

          // Send progress update after each file
          await writer.write({
            ...getCommonProperties(),
            message: result.success
              ? `Successfully analyzed: ${media.file_name}`
              : `Failed to analyze: ${media.file_name} - ${result.message}`,
            metadata: {
              method,
              fileType: media.file_types?.extension,
            },
          });

          // For testing - add a small delay between files
          // Remove this in production
          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (error) {
          // Handle unexpected errors during processing
          counters.processedCount++;
          counters.failed++;

          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

          await writer.write({
            ...getCommonProperties(),
            type: 'error',
            message: `Error analyzing ${media.file_name}: ${errorMessage}`,
            metadata: {
              method,
              fileType: media.file_types?.extension,
            },
          });
        }
      }

      // Final progress update
      await writer.write({
        ...getCommonProperties(),
        message: `Completed analysis of ${unprocessedFiles.length} images. Success: ${counters.success}, Failed: ${counters.failed}`,
      });
    } catch (error) {
      // Handle unexpected errors in the entire process
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await writer.write({
        type: 'error',
        message: `Error during batch processing: ${errorMessage}`,
        errorDetails: [errorMessage],
      });
    } finally {
      // Always close the writer when done
      if (!writer.closed) {
        try {
          await writer.close();
        } catch (closeError) {
          console.error('Error closing writer in finally block:', closeError);
        }
      }
    }
  }
}
