'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action, MediaItem } from '@/types/db-types';

/**
 * Insert a new media item
 * @param fileData Media item data
 * @returns Query result with inserted media item ID
 */
export async function insertMediaItem(fileData: {
  file_name: string;
  file_path: string;
  created_date: string;
  modified_date: string;
  size_bytes: number;
  file_type_id: number;
  folder_path: string;
}): Action<MediaItem> {
  const supabase = createServerSupabaseClient();

  return await supabase
    .from('media_items')
    .insert(fileData)
    .select('id')
    .single();
}
