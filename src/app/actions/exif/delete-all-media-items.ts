'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action, MediaItem } from '@/types/db-types';

/**
 * Delete all media items from the database
 * @returns Delete operation result
 */
export async function deleteAllMediaItems(): Action<MediaItem[]> {
  const supabase = createServerSupabaseClient();

  // Delete all media items
  return await supabase
    .from('media_items')
    .delete({ count: 'exact' })
    .not('id', 'is', null);
}
