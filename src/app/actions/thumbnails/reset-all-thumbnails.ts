'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action } from '@/types/db-types';

/**
 * Reset all thumbnails by:
 * 1. Clearing the thumbnail_path in the media_items table.
 * 2. Clearing any thumbnail processing states.
 */
export async function resetAllThumbnails(): Action<null> {
  const supabase = createServerSupabaseClient();

  // Clear thumbnail_path from all media items
  const { error: clearPathsError, count: clearedCount } = await supabase
    .from('media_items')
    .update({ thumbnail_path: null })
    .not('thumbnail_path', 'is', null);

  // Clear processing states related to thumbnails
  const { error: processingStatesError } = await supabase
    .from('processing_states')
    .delete()
    .eq('type', 'thumbnail');

  // Check for errors
  const hasErrors = Boolean(clearPathsError || processingStatesError);
  if (hasErrors) {
    return {
      data: null,
      error: clearPathsError || processingStatesError,
      count: null,
    };
  }

  return {
    data: null,
    error: null,
    count: clearedCount,
  };
}
