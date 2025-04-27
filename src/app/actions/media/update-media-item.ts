'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { MediaItem } from '@/types/db-types';

/**
 * Update an existing media item
 * @param id Media item ID
 * @param mediaItem Media item data to update
 * @returns Query result
 */
export async function updateMediaItem(
  id: string,
  mediaItem: Partial<MediaItem>,
): Promise<{
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  const result = await supabase
    .from('media_items')
    .update(mediaItem)
    .eq('id', id);

  return result;
}
