'use server';

import { createSupabase } from '@/lib/supabase';
import { processExif } from './process-exif';

/**
 * Process EXIF data for multiple media items in batch
 *
 * @param limit - Maximum number of items to process
 * @returns Object with count of processed items and any errors
 */
export async function processBatchExif(limit = 10) {
  try {
    const supabase = createSupabase();

    // Find media items that need EXIF processing
    const { data: mediaItems, error: findError } = await supabase
      .from('media')
      .select('*, exif_data(*)')
      .is('is_exif_processed', false)
      .limit(limit);

    if (findError) {
      throw new Error(`Failed to find unprocessed items: ${findError.message}`);
    }

    if (!mediaItems || mediaItems.length === 0) {
      return { success: true, processed: 0, message: 'No items to process' };
    }

    // Process each item
    const results = await Promise.allSettled(mediaItems.map(processExif));

    const succeeded = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success,
    ).length;
    const failed = results.length - succeeded;

    return {
      success: true,
      processed: succeeded,
      failed,
      total: results.length,
    };
  } catch (error) {
    console.error('Error in batch EXIF processing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processed: 0,
    };
  }
}
