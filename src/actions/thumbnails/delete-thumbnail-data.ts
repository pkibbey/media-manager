'use server';

import { createSupabase } from '@/lib/supabase';

/**
 * Delete thumbnail data and reset processing flags
 *
 * @returns Object with count of reset items and any error
 */
export async function deleteThumbnailData() {
  try {
    const supabase = createSupabase();

    // Empty the storage bucket for thumbnails
    await supabase.storage.from('thumbnails').remove(['*']);

    // Delete thumbnail data from the database
    await supabase.from('thumbnail_data').delete().not('id', 'is', null);

    // Reset the is_thumbnail_processed flag in the media table
    return await supabase
      .from('media')
      .update({ is_thumbnail_processed: false })
      .not('id', 'is', null);
  } catch (error) {
    console.error('Error deleting thumbnail data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      count: 0,
    };
  }
}
