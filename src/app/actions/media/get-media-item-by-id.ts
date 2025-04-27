'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { MediaItem } from '@/types/db-types';

/**
 * Get a media item by ID with file type information and optional fields
 * @param id Media item ID
 * @returns Query result with media item data
 */
export async function getMediaItemById(id: string): Promise<{
  data: MediaItem | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  return supabase
    .from('media_items')
    .select('*, file_types!inner(*)')
    .eq('id', id)
    .eq('file_types.ignore', false)
    .single();
}
