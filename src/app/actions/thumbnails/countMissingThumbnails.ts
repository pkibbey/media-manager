'use server';

import { includeMedia } from '@/lib/media-filters';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Count the number of media items missing thumbnails
 */

export async function countMissingThumbnails() {
  const supabase = createServerSupabaseClient();

  // Count items that need thumbnail processing
  const { count: missingThumbnailsCount, error: countError } =
    await includeMedia(
      supabase
        .from('media_items')
        .select('*, processing_states!inner(*), file_types!inner(*)', {
          count: 'exact',
          head: true,
        })
        .neq('processing_states.type', 'thumbnail'),
    );

  if (countError) throw countError;

  return missingThumbnailsCount || 0;
}
