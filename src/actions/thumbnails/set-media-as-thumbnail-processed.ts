'use server';
import { createSupabase } from '@/lib/supabase';

/**
 * Mark a media item as having its thumbnail processed
 *
 * @param mediaId - The ID of the media item to mark
 * @param thumbnailUrl - Optional URL to the generated thumbnail
 * @returns Object with success or error information
 */
export async function setMediaAsThumbnailProcessed(mediaId: string) {
  const supabase = createSupabase();

  const { error } = await supabase
    .from('media')
    .update({ is_thumbnail_processed: true })
    .eq('id', mediaId);

  if (error) {
    console.error(
      `Error marking media ${mediaId} as thumbnail processed:`,
      error,
    );
    return { success: false, error };
  }

  return { success: true };
}
