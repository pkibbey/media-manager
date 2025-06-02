'use server';

import { createSupabase } from 'shared/supabase';

/**
 * Delete thumbnail data and reset processing flags
 *
 * @returns Boolean indicating success
 */
export async function deleteThumbnailData(): Promise<boolean> {
  try {
    const supabase = createSupabase();

    // Empty the storage bucket for thumbnails
    try {
      await supabase.storage.from('thumbnails').remove(['*']);
    } catch (e) {
      console.error('Exception while emptying thumbnails bucket:', e);
    }

    // Reset is_thumbnail_processed for all processed items in batches
    let totalReset = 0;

    while (true) {
      const { error: updateError, count } = await supabase
        .from('media')
        .update({ is_thumbnail_processed: false })
        .eq('is_thumbnail_processed', true);

      if (updateError) {
        console.error('Failed to reset thumbnail data:', updateError);
        return false;
      }

      const affectedRows = count || 0;
      totalReset += affectedRows;

      console.log(
        `Successfully reset ${affectedRows} media items. Total reset: ${totalReset}`,
      );

      if (affectedRows === 0) {
        // No more items to update
        break;
      }
    }

    console.log('Finished resetting thumbnail data for media items.');
    return true;
  } catch (error) {
    console.error('Exception during update of media items:', error);
    return false;
  }
}
