'use server';

import { createSupabase } from '@/lib/supabase';

/**
 * Delete thumbnail data and reset processing flags in batches
 *
 * @param batchSize Number of items to process in each batch
 * @returns Object with count of reset items and any error
 */
export async function deleteThumbnailData(batchSize = 1000) {
  try {
    const supabase = createSupabase();
    let totalReset = 0;
    let batchCount = 0;
    let hasMore = true;

    // Empty the storage bucket for thumbnails (optional: comment out if not needed every run)
    await supabase.storage.from('thumbnails').remove(['*']);

    while (hasMore) {
      // 1. Get a batch of media IDs where is_thumbnail_processed is true
      const { data: mediaBatch, error: selectError } = await supabase
        .from('media')
        .select('id')
        .eq('is_thumbnail_processed', true)
        .limit(batchSize);
      if (selectError)
        throw new Error(`Failed to select media: ${selectError.message}`);
      if (!mediaBatch || mediaBatch.length === 0) break;
      const ids = mediaBatch.map((m) => m.id);

      // 2. Delete thumbnail_data for these media items
      const { error: deleteError } = await supabase
        .from('thumbnail_data')
        .delete()
        .in('media_id', ids);
      if (deleteError)
        throw new Error(
          `Failed to delete thumbnail_data: ${deleteError.message}`,
        );

      // 3. Reset is_thumbnail_processed flag for these media items
      const { error: updateError } = await supabase
        .from('media')
        .update({ is_thumbnail_processed: false })
        .in('id', ids);
      if (updateError)
        throw new Error(`Failed to reset media flags: ${updateError.message}`);

      totalReset += ids.length;
      batchCount++;
      hasMore = ids.length === batchSize;
    }

    return {
      success: true,
      message: `Thumbnail data deleted and reset in ${batchCount} batches (${totalReset} items).`,
      count: totalReset,
    };
  } catch (error) {
    console.error('Error deleting thumbnail data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      count: 0,
    };
  }
}
