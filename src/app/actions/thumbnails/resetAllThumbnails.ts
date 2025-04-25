'use server';

import { includeMedia } from '@/lib/mediaFilters';
import { markProcessingStarted } from '@/lib/processing-helpers';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Reset all thumbnails by:
 * 1. Clearing the thumbnail_path in the media_items table.
 * 2. Clearing any thumbnail processing states.
 */
export async function resetAllThumbnails(): Promise<{
  success: boolean;
  message: string;
  count?: number;
}> {
  const supabase = createServerSupabaseClient();

  try {
    // Get the media items first so we can mark them as being processed
    const { data: mediaItems, error: fetchError } = await includeMedia(
      supabase.from('media_items').select('id, file_types!inner(*)'),
    );

    if (fetchError) {
      throw new Error(`Failed to fetch media items: ${fetchError.message}`);
    }

    // Track the count of items being reset
    const count = mediaItems?.length || 0;

    // 1. Call the database function to reset all thumbnails in a single operation
    // Only reset thumbnails for non-ignored file types
    const { error } = await supabase
      .from('media_items')
      .update({
        thumbnail_path: null,
      })
      .select('*');

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

    // 3. Set all items back to processing state
    // This step marks items as needing thumbnail processing again
    if (mediaItems) {
      for (const item of mediaItems) {
        await markProcessingStarted({
          mediaItemId: item.id,
          type: 'thumbnail',
          message: 'Reset for reprocessing',
        });
      }
    }

    return {
      success: true,
      message: `All thumbnails have been reset successfully. ${count} items are ready for reprocessing.`,
      count,
    };
  } catch (error: any) {
    console.error('[ResetThumbnails] Error during reset process:', error);
    return {
      success: false,
      message: `Failed to reset thumbnails: ${error.message}`,
    };
  }
}
