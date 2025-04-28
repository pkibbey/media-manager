'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action, MediaItem } from '@/types/db-types';

/**
 * Check if a file exists in the database
 * @param filePath Path of the file to check
 * @returns Query result with media item data if found
 */
export async function checkFileExists(filePath: string): Action<MediaItem> {
  const supabase = createServerSupabaseClient();

  return await supabase
    .from('media_items')
    .select('*')
    .eq('file_path', filePath)
    .maybeSingle();
}
