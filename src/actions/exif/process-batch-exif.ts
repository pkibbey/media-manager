'use server';

import { processInChunks } from '@/lib/batch-processing';
import { createSupabase } from '@/lib/supabase';
import { type ExifData, extractExifData } from './process-exif';

/**
 * Process EXIF data for multiple media items in batch with optimized database operations
 *
 * This implementation uses grouped database operations:
 * 1. Extracts all EXIF data in parallel first (CPU-intensive work)
 * 2. Groups all database inserts into a single batch operation
 * 3. Groups all media status updates into a single batch operation
 *
 * This approach significantly reduces database load when processing large numbers
 * of media items, as it moves from 2*N operations (where N is the number of items)
 * to just 2 operations total regardless of batch size.
 *
 * @param limit - Maximum number of items to process
 * @param concurrency - Number of items to process in parallel
 * @returns Object with count of processed items and any errors
 */
export async function processBatchExif(limit = 10, concurrency = 3) {
  try {
    const supabase = createSupabase();

    // Find media items that need EXIF processing
    const { data: mediaItems, error: findError } = await supabase
      .from('media')
      .select('*, exif_data(*), media_types!inner(*)')
      .is('is_exif_processed', false)
      .is('media_types.is_ignored', false)
      .limit(limit);

    if (findError) {
      throw new Error(`Failed to find unprocessed items: ${findError.message}`);
    }

    if (!mediaItems || mediaItems.length === 0) {
      return {
        success: true,
        processed: 0,
        failed: 0,
        total: 0,
        message: 'No items to process',
      };
    }

    // Extract EXIF data for all media items in parallel chunks
    const extractionResults = await processInChunks(
      mediaItems,
      extractExifData,
      concurrency,
    );

    // Prepare database operations
    const exifDataToInsert: ExifData[] = [];
    const mediaIdsToUpdate: string[] = [];
    let failed = 0;

    // Process results and prepare batch operations
    extractionResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        const extractionResult = result.value;

        // Always mark the media as processed
        mediaIdsToUpdate.push(extractionResult.mediaId);

        if (!extractionResult.success) {
          failed++;
          return;
        }

        // Add EXIF data to batch if available
        if (
          !extractionResult.noData &&
          'exifData' in extractionResult &&
          extractionResult.exifData
        ) {
          exifDataToInsert.push(extractionResult.exifData);
        }
      } else {
        // Promise was rejected
        failed++;
      }
    });

    // Perform batch database operations

    // 1. Insert EXIF data in batches if there are any to insert
    if (exifDataToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('exif_data')
        .upsert(exifDataToInsert, {
          onConflict: 'media_id',
          ignoreDuplicates: false,
        });

      if (insertError) {
        throw new Error(
          `Failed to batch insert EXIF data: ${insertError.message}`,
        );
      }
    }

    // 2. Update all processed media items in a single operation
    if (mediaIdsToUpdate.length > 0) {
      const { error: updateError } = await supabase
        .from('media')
        .update({ is_exif_processed: true })
        .in('id', mediaIdsToUpdate);

      if (updateError) {
        throw new Error(
          `Failed to batch update media items: ${updateError.message}`,
        );
      }
    }

    const succeeded = mediaIdsToUpdate.length;

    return {
      success: true,
      processed: succeeded,
      failed,
      total: mediaItems.length,
    };
  } catch (error) {
    console.error('Error in batch EXIF processing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      failed: 0,
      total: 0,
      processed: 0,
    };
  }
}
