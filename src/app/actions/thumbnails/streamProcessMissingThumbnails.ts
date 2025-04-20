'use server';

import { addAbortToken, isAborted, removeAbortToken } from '@/lib/abort-tokens';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { ThumbnailOptions } from '@/types/thumbnail-types';
import { generateThumbnail } from './generateThumbnail';

/**
 * Stream process missing thumbnails with progress updates
 */
export async function streamProcessMissingThumbnails(
  options: ThumbnailOptions = {},
) {
  const encoder = new TextEncoder();

  // Create a transform stream to send progress updates
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start processing in the background
  processAllMissingThumbnails(writer, options);

  // Return the readable stream
  return stream.readable;

  async function processAllMissingThumbnails(
    writer: WritableStreamDefaultWriter,
    options: ThumbnailOptions,
  ) {
    try {
      const supabase = createServerSupabaseClient();
      const { skipLargeFiles = true, abortToken } = options;

      // Define supported image formats
      const supportedImageFormats = [
        'jpg',
        'jpeg',
        'png',
        'webp',
        'gif',
        'tiff',
        'tif',
        'heic',
        'avif',
        'bmp',
      ];

      // Add abort token to active tokens
      if (abortToken) {
        await addAbortToken(abortToken);
      }

      // Send initial progress
      await sendProgress(writer, {
        status: 'started',
        message: 'Starting thumbnail generation',
      });

      // Query to get items that need thumbnails using processing_states table
      const { data: items, error } = await supabase
        .from('media_items')
        .select('id, file_path, file_name, extension, size_bytes')
        .in('extension', supportedImageFormats)
        .not(
          'id',
          'in',
          supabase
            .from('processing_states')
            .select('media_item_id')
            .eq('type', 'thumbnail')
            .in('status', ['success', 'skipped']),
        )
        .order('id');

      if (error) {
        await sendProgress(writer, {
          status: 'error',
          message: `Error fetching media items: ${error.message}`,
          error: error.message,
        });
        await writer.close();
        return;
      }

      if (!items || items.length === 0) {
        await sendProgress(writer, {
          status: 'completed',
          message: 'No items need thumbnail processing',
          totalItems: 0,
          processed: 0,
        });
        await writer.close();
        return;
      }

      await sendProgress(writer, {
        status: 'generating',
        message: `Found ${items.length} items that need thumbnails`,
        totalItems: items.length,
        processed: 0,
      });

      // Process items in batches
      let processed = 0;
      let successCount = 0;
      let failedCount = 0;
      let skippedLargeFiles = 0;

      for (const item of items) {
        try {
          // Check for abort request
          if (abortToken && (await isAborted(abortToken))) {
            await sendProgress(writer, {
              status: 'error',
              message: 'Thumbnail generation aborted by user',
              totalItems: items.length,
              processed,
              successCount,
              failedCount,
              skippedLargeFiles,
            });
            await writer.close();
            return;
          }

          await sendProgress(writer, {
            status: 'generating',
            message: `Generating thumbnail for file ${processed + 1} of ${items.length}`,
            currentFilePath: item.file_path,
            currentFileName: item.file_name,
            fileType: item.extension,
            totalItems: items.length,
            processed,
            successCount,
            failedCount,
            skippedLargeFiles,
          });

          // Generate thumbnail
          const result = await generateThumbnail(item.id, { skipLargeFiles });

          if (result.skipped) {
            skippedLargeFiles++;
          } else if (result.success) {
            successCount++;
          } else {
            failedCount++;
          }

          processed++;

          // Send progress update
          await sendProgress(writer, {
            status: 'generating',
            message: `${processed} of ${items.length} processed (${successCount} success, ${failedCount} failed, ${skippedLargeFiles} skipped)`,
            totalItems: items.length,
            processed,
            successCount,
            failedCount,
            skippedLargeFiles,
            currentFilePath: result.filePath,
            currentFileName: result.fileName,
            fileType: result.fileType,
          });
        } catch (itemError: any) {
          failedCount++;
          processed++;

          console.error(`Error processing item ${item.id}:`, itemError);
          await sendProgress(writer, {
            status: 'error',
            message: `Error processing item: ${itemError.message}`,
            error: itemError.message,
            currentFilePath: item.file_path,
            currentFileName: item.file_name,
            fileType: item.extension,
            totalItems: items.length,
            processed,
            successCount,
            failedCount,
            skippedLargeFiles,
          });
        }
      }

      // Remove abort token now that processing is complete
      if (abortToken) {
        await removeAbortToken(abortToken);
      }

      // Send final progress
      await sendProgress(writer, {
        status: 'completed',
        message: `Thumbnail generation completed: ${processed} processed, ${successCount} successful, ${failedCount} failed, ${skippedLargeFiles} skipped`,
        totalItems: items.length,
        processed,
        successCount,
        failedCount,
        skippedLargeFiles,
      });

      await writer.close();
    } catch (error: any) {
      console.error('Error processing thumbnails:', error);
      await sendProgress(writer, {
        status: 'error',
        message: `Error processing thumbnails: ${error.message}`,
        error: error.message,
      });
      await writer.close();
    }
  }

  async function sendProgress(
    writer: WritableStreamDefaultWriter,
    progress: Record<string, any>,
  ) {
    await writer.write(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
  }
}
