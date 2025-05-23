'use server';

import { countResults, processInChunks } from '@/lib/batch-processing';
import { createSupabase } from '@/lib/supabase';
import {
  processNativeThumbnail,
  processRawThumbnail,
} from '@/lib/thumbnail-generators';
import { storeThumbnail } from '@/lib/thumbnail-storage';
import type { MediaWithRelations } from '@/types/media-types';

/**
 * Generate a thumbnail for a single media item
 *
 * @param mediaItem - The media item to process
 * @returns Object with success status and any error message
 */
async function processMediaThumbnail(mediaItem: MediaWithRelations) {
  let thumbnailBuffer: Buffer | null = null;
  try {
    console.log('[processMediaThumbnail] Start processing mediaItem', {
      id: mediaItem.id,
      media_types: mediaItem.media_types,
    });
    // Choose appropriate thumbnail generation strategy based on media type
    if (mediaItem.media_types?.is_native) {
      console.log(
        `[processMediaThumbnail] Using processNativeThumbnail for media ${mediaItem.id}`,
      );
      thumbnailBuffer = await processNativeThumbnail(mediaItem);
    } else {
      console.log(
        `[processMediaThumbnail] Using processRawThumbnail for media ${mediaItem.id}`,
      );
      thumbnailBuffer = await processRawThumbnail(mediaItem);
    }
    console.log(
      `[processMediaThumbnail] Thumbnail buffer generated for media ${mediaItem.id}:`,
      {
        bufferType: typeof thumbnailBuffer,
        bufferLength: thumbnailBuffer?.length,
      },
    );
  } catch (processingError) {
    console.error(
      `[processMediaThumbnail] Error generating thumbnail for media ${mediaItem.id}:`,
      processingError,
      {
        mediaItem,
      },
    );
    return {
      success: false,
      error:
        processingError instanceof Error
          ? `Thumbnail generation failed: ${processingError.message}`
          : 'Thumbnail generation failed',
    };
  }

  if (!thumbnailBuffer) {
    console.warn(
      `[processMediaThumbnail] No thumbnail generated for media ${mediaItem.id}`,
    );
    return {
      success: false,
      error: 'No thumbnail generated',
    };
  }

  try {
    // Store the thumbnail and update database
    console.log(
      `[processMediaThumbnail] Storing thumbnail for media ${mediaItem.id}`,
    );
    const storageResult = await storeThumbnail(mediaItem.id, thumbnailBuffer);
    console.log(
      `[processMediaThumbnail] Storage result for media ${mediaItem.id}:`,
      storageResult,
    );
    return storageResult;
  } catch (storageError) {
    console.error(
      `[processMediaThumbnail] Error storing thumbnail for media ${mediaItem.id}:`,
      storageError,
      {
        mediaItem,
      },
    );
    return {
      success: false,
      error:
        storageError instanceof Error
          ? `Thumbnail storage failed: ${storageError.message}`
          : 'Thumbnail storage failed',
    };
  }
}

/**
 * Process thumbnails for multiple media items in batch
 *
 * @param limit - Maximum number of items to process
 * @param concurrency - Number of items to process in parallel
 * @returns Object with count of processed items and any errors
 */
export async function processBatchThumbnails(limit = 10, concurrency = 3) {
  try {
    const supabase = createSupabase();

    // Find media items that need thumbnail processing
    const { data: mediaItems, error: findError } = await supabase
      .from('media')
      .select(
        '*, media_types!inner(*), exif_data(*), thumbnail_data(*), analysis_data(*)',
      )
      .is('is_exif_processed', true)
      .is('is_thumbnail_processed', false)
      .ilike('media_types.mime_type', '%image%')
      .is('media_types.is_ignored', false)
      .limit(limit);

    if (findError) {
      throw new Error(`Failed to find unprocessed items: ${findError.message}`);
    }

    if (!mediaItems || mediaItems.length === 0) {
      console.log('No items found for thumbnail processing');
      return {
        success: true,
        failed: 0,
        processed: 0,
        total: 0,
        message: 'No items to process',
      };
    }

    console.log(
      `Found ${mediaItems.length} items for thumbnail processing:`,
      mediaItems.map((item) => item.id),
    );

    // Process items in batches with controlled concurrency
    const results = await processInChunks(
      mediaItems,
      async (mediaItem) => {
        console.log(`Processing media item ID: ${mediaItem.id}`);
        const result = await processMediaThumbnail(mediaItem);
        if (result.success) {
          console.log(`Successfully processed media item ID: ${mediaItem.id}`);
        } else {
          console.error(
            `Failed to process media item ID: ${mediaItem.id}`,
            result.error,
          );
        }
        return result;
      },
      concurrency,
    );

    // Log any rejected promises for debugging
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `Failed to process item ${index} (mediaId: ${mediaItems[index]?.id}):`,
          result.reason,
        );
      }
    });

    // Count succeeded and failed results
    const { succeeded, failed } = countResults(
      results,
      (value) => value.success,
    );

    return {
      success: true,
      processed: succeeded,
      failed,
      total: mediaItems.length,
      message: 'Batch processing completed',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      total: 0,
      failed: 0,
      processed: 0,
      message: 'Batch processing failed',
    };
  }
}
