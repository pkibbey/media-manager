'use server';

import { createSupabase } from '@/lib/supabase';

/**
 * Get statistics about thumbnail processing
 *
 * @returns Object with thumbnail processing statistics
 */
export async function getThumbnailStats() {
  try {
    const supabase = createSupabase();

    // Get the total count of all media items
    const { count: totalCount, error: totalError } = await supabase
      .from('media')
      .select('id', { count: 'exact', head: true });

    if (totalError) {
      throw new Error(`Failed to get total count: ${totalError.message}`);
    }

    // Get count of items with thumbnails
    const { count: processedCount, error: processedError } = await supabase
      .from('media')
      .select('is_thumbnail_processed', { count: 'exact', head: true })
      .is('is_thumbnail_processed', true);

    if (processedError) {
      throw new Error(
        `Failed to get processed count: ${processedError.message}`,
      );
    }

    // Calculate remaining items
    const remainingCount = (totalCount || 0) - (processedCount || 0);
    const percentComplete = totalCount
      ? Math.round(((processedCount || 0) / totalCount) * 100)
      : 0;

    return {
      stats: {
        total: totalCount || 0,
        processed: processedCount || 0,
        remaining: remainingCount,
        percentComplete,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error getting thumbnail stats:', error);
    return {
      stats: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
