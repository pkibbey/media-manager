'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Reset all thumbnails by:
 * 1. Clearing the thumbnail_path in the media_items table.
 * 2. Clearing any thumbnail processing states.
 */
export async function resetAllThumbnails(): Promise<{
  success: boolean;
  message: string;
}> {
  const supabase = createServerSupabaseClient();

  // 1. Call the database function to reset all thumbnails that are not null
  const { error, count } = await supabase
    .from('media_items')
    .update({
      thumbnail_path: null,
    })
    .neq('thumbnail_path', null)
    .select('*, file_types!inner(*)');
  if (error) throw Error;

  // 2. Clear processing states related to thumbnails
  const { error: processingStatesError } = await supabase
    .from('processing_states')
    .delete()
    .eq('type', 'thumbnail');
  if (processingStatesError) throw Error;

  return {
    success: true,
    message: `${count} thumbnails have been reset successfully.`,
  };
}
