'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Reset all thumbnails by:
 * 1. Clearing the thumbnail_path in the media_items table.
 * 2. Clearing any thumbnail processing states.
 * 3. The storage files will be cleaned up later when new thumbnails are generated.
 */
export async function resetAllThumbnails(): Promise<{
  success: boolean;
  message: string;
}> {
  const supabase = createServerSupabaseClient();

  try {
    // Call the database function to reset all thumbnails in a single operation
    const { error } = await supabase.rpc('reset_all_thumbnails');

    if (error) {
      throw new Error(`Failed to reset thumbnails: ${error.message}`);
    }

    return {
      success: true,
      message: 'All thumbnails have been reset successfully.',
    };
  } catch (error: any) {
    console.error('[ResetThumbnails] Error during reset process:', error);
    return {
      success: false,
      message: `Failed to reset thumbnails: ${error.message}`,
    };
  }
}
