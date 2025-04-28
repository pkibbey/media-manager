'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Count the number of media items missing thumbnails
 */

export async function countMissingThumbnails() {
  const supabase = createServerSupabaseClient();

  // Count items that need thumbnail processing
  return await supabase
    .from('media_items')
    .select('*, processing_states!inner(*), file_types!inner(*)', {
      count: 'exact',
      head: true,
    })
    .in('file_types.category', ['image'])
    .is('file_types.ignore', false)
    .neq('processing_states.type', 'thumbnail');
}
