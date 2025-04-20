'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Reset all thumbnails by clearing paths and removing files from storage
 */
export async function resetAllThumbnails(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // Delete all thumbnail processing states
    const { error: deleteError, count } = await supabase
      .from('processing_states')
      .delete({ count: 'exact' })
      .eq('type', 'thumbnail');

    if (deleteError) {
      throw new Error(
        `Failed to reset thumbnail states: ${deleteError.message}`,
      );
    }

    return {
      success: true,
      message: `Successfully reset thumbnails for ${count || 0} files`,
    };
  } catch (error: any) {
    console.error('Error resetting thumbnails:', error);
    return {
      success: false,
      message: `Failed to reset thumbnails: ${error.message}`,
    };
  }
}
