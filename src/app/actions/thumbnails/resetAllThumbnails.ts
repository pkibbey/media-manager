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

  try {
    // 1. Call the database function to reset all thumbnails in a single operation
    // Only reset thumbnails for non-ignored file types
    const { error } = await supabase
      .from('media_items')
      .update({
        thumbnail_path: null,
      })
      .select('*, file_types!inner(*)');

    if (error) {
      throw new Error(`Failed to reset thumbnails: ${error.message}`);
    }

    // 2. Clear processing states related to thumbnails
    const { error: processingStatesError } = await supabase
      .from('processing_states')
      .delete()
      .eq('type', 'thumbnail');

    if (processingStatesError) {
      throw new Error(
        `Failed to clear processing states: ${processingStatesError.message}`,
      );
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
