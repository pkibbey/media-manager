'use server';

import { createSupabase } from '@/lib/supabase';

/**
 * Get statistics about EXIF data processing
 *
 * @returns Object with EXIF processing statistics
 */
export async function getExifStats() {
  try {
    const supabase = createSupabase();

    // Get the total count of all media items
    const { count: totalCount, error: totalError } = await supabase
      .from('media')
      .select('*, media_types!inner(*)', {
        count: 'exact',
        head: true,
      })
      .is('media_types.is_ignored', false);

    if (totalError) {
      throw new Error(`Failed to get total count: ${totalError.message}`);
    }

    // Get count of items with EXIF data
    const { count: processedCount, error: processedError } = await supabase
      .from('media')
      .select('is_exif_processed, media_types!inner(is_ignored)', {
        count: 'exact',
        head: true,
      })
      .is('is_exif_processed', true)
      .is('media_types.is_ignored', false);

    if (processedError) {
      throw new Error(
        `Failed to get processed count: ${processedError.message}`,
      );
    }

    // Calculate remaining items
    const remaining = totalCount ? totalCount - (processedCount || 0) : 0;
    const percentComplete = totalCount
      ? ((processedCount || 0) / totalCount) * 100
      : 0;

    return {
      stats: {
        total: totalCount || 0,
        processed: processedCount || 0,
        remaining,
        percentComplete: Math.round(percentComplete * 100) / 100,
      },
    };
  } catch (error) {
    console.error('Error getting EXIF stats:', error);
    return {
      stats: {
        total: 0,
        processed: 0,
        remaining: 0,
        percentComplete: 0,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
