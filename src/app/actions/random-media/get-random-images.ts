'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { MediaItem } from '@/types/db-types';

/**
 * Get random media items that have thumbnails
 * @param limit Number of random items to fetch
 * @returns Query result with media items
 */
export async function getRandomImages(limit = 5): Promise<{
  data: MediaItem[] | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  // First, retrieve media_item IDs with successful thumbnail processing
  const { data: thumbData, error: thumbError } = await supabase
    .from('processing_states')
    .select('media_item_id, status, type')
    .eq('type', 'thumbnail')
    .eq('status', 'success');

  if (thumbError || !thumbData) {
    return { data: null, error: thumbError };
  }

  const thumbnailMediaIds = thumbData
    .map((item) => item.media_item_id || '')
    .filter(Boolean);

  // Query media_items using the retrieved IDs
  return supabase
    .from('media_items')
    .select('*, file_types!inner(*)')
    .in('file_types.category', ['image'])
    .eq('file_types.ignore', false)
    .in('id', thumbnailMediaIds)
    .gte('size_bytes', Math.floor(Math.random() * 50000 + 10000))
    .order('size_bytes', { ascending: false })
    .limit(limit);
}
