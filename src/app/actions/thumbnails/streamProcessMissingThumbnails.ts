'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { ThumbnailGenerationOptions } from '@/types/thumbnail-types';
import { generateThumbnail } from './generateThumbnail';

/**
 * Stream process missing thumbnails with progress updates
 */
export async function streamProcessMissingThumbnails(
  options: ThumbnailGenerationOptions = {},
) {
  const encoder = new TextEncoder();

  // Create a transform stream to send progress updates
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  async function sendProgress(
    writer: WritableStreamDefaultWriter,
    progress: Record<string, any>,
  ) {
    try {
      const message = `data: ${JSON.stringify(progress)}\n\n`;
      await writer.write(encoder.encode(message));
    } catch (error) {
      console.error('[StreamThumbnails] Error writing to stream:', error);
      try {
        if (!writer.closed) {
          await writer.close();
        }
      } catch (closeError) {
        console.error(
          '[StreamThumbnails] Error closing stream after write error:',
          closeError,
        );
      }
    }
  }

  // Wrap the async processing logic in a self-invoking function
  // to handle errors and ensure the stream is closed.
  (async () => {
    try {
      const supabase = createServerSupabaseClient();
      const { skipLargeFiles = true } = options;

      await sendProgress(writer, {
        status: 'started',
        message: 'Starting thumbnail generation',
      });

      // Get count of all media items regardless of type
      const { count: totalCount, error: countError } = await supabase
        .from('media_items')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error(
          '[StreamThumbnails] Error counting media items:',
          countError,
        );
        await sendProgress(writer, {
          status: 'error',
          message: `Error counting media items: ${countError.message}`,
          error: countError.message,
        });
        await writer.close();
        return;
      }
      const totalItems = totalCount || 0;

      await sendProgress(writer, {
        status: 'generating',
        message: `Found ${totalItems} items to process`,
        totalItems,
        processed: 0,
      });

      const MAX_BATCH_SIZE = 100;
      let processed = 0;
      let successCount = 0;
      let failedCount = 0;
      let skippedLargeFiles = 0;
      let lastId = '0';
      let hasMoreItems = true;
      let batchNumber = 0;

      while (hasMoreItems) {
        batchNumber++;

        // 1. Fetch next batch of items without file type filtering
        let query = supabase
          .from('media_items')
          .select('id, file_path, file_name, file_type_id, size_bytes') // Select necessary fields
          .order('id')
          .limit(MAX_BATCH_SIZE);

        // Only apply the .gt filter *after* the first batch
        if (batchNumber > 1) {
          query = query.gt('id', lastId);
        }

        const { data: candidateItems, error: candidateError } = await query;

        if (candidateError) {
          console.error(
            `[StreamThumbnails] Error fetching candidate batch ${batchNumber}:`,
            candidateError,
          );
          await sendProgress(writer, {
            status: 'error',
            message: `Error fetching candidate media items batch: ${candidateError.message}`,
            error: candidateError.message,
          });
          if (!writer.closed) await writer.close();
          return;
        }

        if (!candidateItems || candidateItems.length === 0) {
          hasMoreItems = false;
          continue;
        }

        // Update lastId for the *next* candidate fetch
        lastId = candidateItems[candidateItems.length - 1].id;

        const candidateIds = candidateItems.map((item) => item.id);

        // 2. Find which candidates are ALREADY processed

        const { data: processedStates, error: stateError } = await supabase
          .from('processing_states')
          .select('media_item_id')
          .eq('type', 'thumbnail')
          .in('status', ['success', 'skipped'])
          .in('media_item_id', candidateIds); // Check only within the candidate batch

        if (stateError) {
          console.error(
            `[StreamThumbnails] Error fetching processing states for batch ${batchNumber}:`,
            stateError,
          );
          // Optionally send progress update about the error
          await sendProgress(writer, {
            status: 'warning', // Or 'error' if you want to stop
            message: `Error checking processing states for batch ${batchNumber}: ${stateError.message}. Skipping check for this batch.`,
          });
          // Decide whether to skip batch or stop. Let's try processing all candidates if state check fails.
          // itemsToProcess = candidateItems; // Process all candidates if state check fails
          // Or skip the batch:
          console.warn(
            `[StreamThumbnails] Skipping batch ${batchNumber} due to error fetching processing states.`,
          );
          continue; // Skip this batch
        }

        const processedIdsInBatch = new Set(
          processedStates?.map((s) => s.media_item_id) || [],
        );

        // 3. Filter candidates to get items needing processing
        const itemsToProcess = candidateItems.filter(
          (item) => !processedIdsInBatch.has(item.id),
        );

        // 4. Process the filtered items
        for (const item of itemsToProcess) {
          try {
            const fileExtension = item.file_name
              ? item.file_name.split('.').pop() || 'unknown'
              : 'unknown';

            await sendProgress(writer, {
              status: 'generating',
              message: `Generating thumbnail for file ${processed + 1}`,
              currentFilePath: item.file_path,
              currentFileName: item.file_name,
              fileType: fileExtension,
              totalItems,
              processed,
              successCount,
              failedCount,
              skippedLargeFiles,
            });

            const result = await generateThumbnail(item.id, { skipLargeFiles });

            if (result.skipped) {
              skippedLargeFiles++;
            } else if (result.success) {
              successCount++;
            } else {
              failedCount++;
              console.warn(
                `[StreamThumbnails] Thumbnail generation failed for item ${item.id}: ${result.message}`,
              );
            }

            processed++;

            const fileExtensionResult =
              typeof result.fileType === 'string'
                ? result.fileType
                : result.fileName
                  ? result.fileName.split('.').pop() || 'unknown'
                  : 'unknown';

            await sendProgress(writer, {
              status: 'generating',
              message: `${processed} processed (${successCount} success, ${failedCount} failed, ${skippedLargeFiles} skipped)`,
              totalItems,
              processed,
              successCount,
              failedCount,
              skippedLargeFiles,
              currentFilePath: result.filePath,
              currentFileName: result.fileName,
              fileType: fileExtensionResult,
            });
          } catch (itemError: any) {
            failedCount++;
            processed++;
            console.error(
              `[StreamThumbnails] CRITICAL ERROR processing item ${item.id}:`,
              itemError,
            );
            await sendProgress(writer, {
              status: 'error',
              message: `Critical error processing item: ${itemError.message}`,
              error: itemError.message,
              currentFilePath: item.file_path,
              currentFileName: item.file_name,
              fileType: item.file_name
                ? item.file_name.split('.').pop() || 'unknown'
                : 'unknown',
              totalItems,
              processed,
              successCount,
              failedCount,
              skippedLargeFiles,
            });
          }
        }

        // Check if the *candidate* fetch returned less than the limit
        if (candidateItems.length < MAX_BATCH_SIZE) {
          hasMoreItems = false;
        }
      }

      await sendProgress(writer, {
        status: 'completed',
        message: `Thumbnail generation completed: ${processed} processed, ${successCount} successful, ${failedCount} failed, ${skippedLargeFiles} skipped`,
        totalItems,
        processed,
        successCount,
        failedCount,
        skippedLargeFiles,
      });

      if (!writer.closed) {
        await writer.close();
      }
    } catch (error: any) {
      console.error(
        '[StreamThumbnails] UNHANDLED EXCEPTION in processAllMissingThumbnails:',
        error,
      );
      try {
        await sendProgress(writer, {
          status: 'error',
          message: `Unhandled exception during thumbnail processing: ${error.message}`,
          error: error.message,
        });
        if (!writer.closed) {
          await writer.close();
        }
      } catch (writeError) {
        console.error(
          '[StreamThumbnails] Failed to send final error progress or close stream:',
          writeError,
        );
      }
    }
  })(); // Immediately invoke the async function

  // Return the readable stream
  return stream.readable;
}
