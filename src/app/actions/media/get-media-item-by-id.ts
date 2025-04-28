'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action, MediaItem } from '@/types/db-types';

/**
 * Get a media item by ID
 * @param id Media item ID
 * @returns Query result with media item data
 */
export async function getMediaItemById(id: string): Action<MediaItem> {
  const supabase = createServerSupabaseClient();

  return await supabase
    .from('media_items')
    .select('*, file_types(*)')
    .eq('id', id)
    .single();
}
