'use server';

import { createSupabase } from '@/lib/supabase';

/**
 * Delete all media data
 *
 * @returns Boolean indicating success
 */
export async function deleteAllMediaItems(): Promise<boolean> {
  try {
    const supabase = createSupabase();
    let totalDeleted = 0;

    // Delete media items in batches until no more items are left
    while (true) {
      const { error: deleteError, count } = await supabase
        .from('media')
        .delete()
        .not('id', 'is', null);

      if (deleteError) {
        console.error('Error deleting media items:', deleteError);
        return false;
      }

      const affectedRows = count || 0;
      totalDeleted += affectedRows;

      console.log(
        `Successfully deleted ${affectedRows} media items. Total deleted: ${totalDeleted}`,
      );

      if (affectedRows === 0) {
        // No more items to delete
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
