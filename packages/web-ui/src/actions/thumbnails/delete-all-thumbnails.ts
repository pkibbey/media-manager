'use server';

import { createSupabase } from 'shared/supabase';

/**
 * Delete all media data
 *
 * @returns Boolean indicating success
 */
export async function deleteAllThumbnails(): Promise<boolean> {
  try {
    const supabase = createSupabase();
    let totalDeleted = 0;

    // Delete media items in batches until no more items are left
    while (true) {
      const { error: updateError, count } = await supabase
        .from('media')
        .update({ thumbnail_url: null })
        .not('id', 'is', null);

      if (updateError) {
        console.error('Error deleting thumbnail data:', updateError);
        return false;
      }

      const affectedRows = count || 0;
      totalDeleted += affectedRows;

      console.log(
        `Successfully deleted ${affectedRows} media items. Total deleted: ${totalDeleted}`,
      );

      if (affectedRows === 0) {
        // Empty the storage bucket for thumbnails
        try {
          await supabase.storage.from('thumbnails').remove(['*']);
        } catch (e) {
          console.error('Exception while emptying thumbnails bucket:', e);
        }

        break;
      }
    }

    console.log('Finished deleting all media items.');
    return true;
  } catch (err) {
    console.error('Unexpected error during media items deletion:', err);
    return false;
  }
}
