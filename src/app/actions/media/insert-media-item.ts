'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

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
}): Promise<{
  data: { id: string } | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  const result = await supabase
    .from('media_items')
    .insert(fileData)
    .select('id')
    .single();

  return result;
}
