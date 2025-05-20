'use server';

import { createSupabase } from '@/lib/supabase';

/**
 * Get statistics about media analysis processing
 *
 * This should only process images that already have
 * thumbnail data, since we need a jpeg image in order
 * to proces it with the Vision LLM
 *
 * @returns Object with analysis processing statistics
 */
export async function getAnalysisStats() {
  try {
    const supabase = createSupabase();

    // Get the total count of media items
    const { count: totalCount, error: totalError } = await supabase
      .from('media')
      .select('*, media_types!inner(*)', {
        count: 'exact',
        head: true,
      })
      .is('is_thumbnail_processed', true)
      .is('media_types.is_ignored', false);

    if (totalError) {
      throw new Error(`Failed to get total count: ${totalError.message}`);
    }

    // Get count of items with processed analysis
    const { count: processedCount, error: processedError } = await supabase
      .from('media')
      .select('*, media_types(is_ignored)', {
        count: 'exact',
        head: true,
      })
      .eq('is_basic_processed', true)
      .is('is_thumbnail_processed', true)
      .is('media_types.is_ignored', false);

    if (processedError) {
      throw new Error(
        `Failed to get processed count: ${processedError.message}`,
      );
    }

    // Calculate remaining items and percentage
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
    console.error('Error getting analysis stats:', error);
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
