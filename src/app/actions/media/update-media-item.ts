'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action, MediaItem } from '@/types/db-types';

/**
 * Update an existing media item
 * @param id Media item ID
 * @param mediaItem Media item data to update
 * @returns Query result
 */
export async function updateMediaItem(
  id: string,
  mediaItem: Partial<MediaItem>,
): Action<null> {
  const supabase = createServerSupabaseClient();

  return await supabase.from('media_items').update(mediaItem).eq('id', id);
}
