'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action, MediaItem } from '@/types/db-types';

/**
 * Get random media items that have thumbnails
 * @param limit Number of random items to fetch
 * @returns Query result with media items and success status
 */
export async function getRandomImages(limit = 5): Action<MediaItem[]> {
  const supabase = createServerSupabaseClient();

  return await supabase
    .from('media_items')
    .select('*, file_types!inner(*)')
    .not('thumbnail_path', 'is', null)
    .eq('file_types.category', 'image')
    // .order('random()', { ascending: true })
    .limit(limit);
}
